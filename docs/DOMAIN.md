# ShelterFlow Domain Model

## Purpose

This document is the canonical definition of the ShelterFlow V1 domain. Screens may present this model, but navigation and UI state do not define or replace its business state.

## Domain language

- **Shelter**: the owner and security boundary for operational data.
- **Profile**: the authenticated user's shelter association and display identity.
- **Animal**: an animal managed by the shelter through an adoption lifecycle.
- **Person**: minimal reusable identity and contact information.
- **Candidate**: one person's adoption process for one animal.
- **Evaluation**: the shelter's structured operational assessment of a candidate.
- **Meeting**: a significant interaction in a candidate process.
- **Adoption**: the historical record linking an animal to the selected candidate.
- **FollowUp**: one scheduled post-adoption check.
- **AdoptionReturn**: the immutable record of a returned adoption.
- **TimelineEvent**: an animal-centered projection of meaningful domain events.

## Ownership and actor identity

V1 presents one shelter to the user, but all principal domain records are explicitly shelter-scoped.

```text
Auth User
    │ auth.uid()
    ▼
Profile
    │ shelter_id
    ▼
Shelter
    └── Shelter-owned domain data
```

`shelter_id` and `user_id` have different meanings:

- `shelter_id` identifies who owns a record and forms the authorization boundary;
- `user_id` identifies the authenticated actor and may be stored in fields such as `created_by_user_id` for attribution.

An animal belongs to a shelter, not personally to the user who created it. Cross-shelter relationships are invalid even when every referenced row exists.

V1 uses one shelter per profile. Shelter switching, invitations, roles, and many-to-many memberships are out of scope.

Minimum identity data:

```text
Shelter
id
name
country
created_at

Profile
id                 // same identifier as auth.users.id
shelter_id
display_name
created_at
updated_at
```

There is no registration flow in V1. Shelters and profiles are provisioned externally by the product owners, not through the mobile application. Exact database defaults, indexes, and foreign-key behavior are defined alongside the database migrations.

## Entity relationships

```text
Shelter
├── Profiles[]
├── Animals[]
├── People[]
├── Candidates[]
├── Evaluations[]
├── Meetings[]
├── Adoptions[]
├── AdoptionReturns[]
├── FollowUps[]
└── TimelineEvents[]

Person 1 ── N Candidate N ── 1 Animal
Candidate 1 ── 0..1 Evaluation
Candidate 1 ── N Meetings
Animal 1 ── N Adoptions over time
Candidate 1 ── 0..1 Adoption in its candidate process
Adoption 1 ── N FollowUps
Adoption 1 ── 0..1 AdoptionReturn
Animal 1 ── N TimelineEvents
```

Every relationship must remain within one `shelter_id`.

## Animal

Minimum data:

```text
id
shelter_id
name
species
sex
approximate_age_months?
size
primary_photo_path?
notes?
status
archived_at?
created_at
updated_at
```

Controlled values:

```text
Species: DOG | CAT | OTHER | UNKNOWN
Sex:     MALE | FEMALE | UNKNOWN
Size:    SMALL | MEDIUM | LARGE | UNKNOWN
```

Approximate age is stored as nullable months. `NULL` means unknown; display conversion into months or years is a localization concern.

### Image references

Persisted image fields (`primary_photo_path`, `adoption_photo_path`, `followup.photo_path`) store storage paths that identify the uploaded object, not signed or public URLs. A signed or public URL must never be persisted as the canonical attachment reference because it can expire or change. Storage buckets, upload handling, and image UI are separate concerns.

### Animal states

```text
PREPARING
READY
IN_PROCESS
ADOPTED
REEVALUATION
NOT_AVAILABLE
```

`RETURNED` is intentionally not an animal state. It describes an adoption outcome. A returned animal moves directly from `ADOPTED` to `REEVALUATION` as part of the return operation.

### Allowed animal transitions

| From            | To              | Trigger                                             |
| --------------- | --------------- | --------------------------------------------------- |
| `PREPARING`     | `READY`         | A shelter actor confirms adoption readiness.        |
| `PREPARING`     | `NOT_AVAILABLE` | The shelter pauses or removes availability.         |
| `READY`         | `IN_PROCESS`    | The first candidate reaches `MEETING_SCHEDULED`.    |
| `READY`         | `NOT_AVAILABLE` | The shelter pauses the process.                     |
| `IN_PROCESS`    | `READY`         | No viable candidate remains in an advanced stage.   |
| `IN_PROCESS`    | `ADOPTED`       | `confirm_adoption()` succeeds.                      |
| `IN_PROCESS`    | `NOT_AVAILABLE` | The shelter pauses the process.                     |
| `ADOPTED`       | `REEVALUATION`  | `return_adoption()` succeeds.                       |
| `REEVALUATION`  | `READY`         | A human reevaluation explicitly approves readiness. |
| `REEVALUATION`  | `NOT_AVAILABLE` | A human reevaluation does not approve readiness.    |
| `NOT_AVAILABLE` | `PREPARING`     | Preparation restarts.                               |
| `NOT_AVAILABLE` | `READY`         | A shelter actor explicitly restores availability.   |

Having early-stage candidates does not move an animal out of `READY`. `IN_PROCESS` begins when at least one candidate reaches `MEETING_SCHEDULED`.

For returning from `IN_PROCESS` to `READY`, advanced active stages are `MEETING_SCHEDULED` and `DECISION_PENDING`. Terminal candidates are not viable. Earlier-stage candidates may remain while the animal is `READY`.

## Person and Candidate

`Person` stores deliberately minimal reusable identity data:

```text
Person
id
shelter_id
name
phone
email?
archived_at?
created_at
updated_at
```

`Candidate` represents the person's process for a particular animal:

```text
Candidate
id
shelter_id
person_id
animal_id
source?
notes?
status
archived_at?
created_at
updated_at
```

One person may therefore be a candidate for different animals without duplicating contact data. `Person` must not grow into a generic CRM contact model.

### Candidate states

```text
NEEDS_EVALUATION
EVALUATED
CONTACT_PENDING
MEETING_SCHEDULED
DECISION_PENDING
SELECTED
NOT_SELECTED
WITHDRAWN
```

### Normal candidate transitions

| From                | To                  |
| ------------------- | ------------------- |
| `NEEDS_EVALUATION`  | `EVALUATED`         |
| `NEEDS_EVALUATION`  | `WITHDRAWN`         |
| `EVALUATED`         | `CONTACT_PENDING`   |
| `EVALUATED`         | `NOT_SELECTED`      |
| `EVALUATED`         | `WITHDRAWN`         |
| `CONTACT_PENDING`   | `MEETING_SCHEDULED` |
| `CONTACT_PENDING`   | `NOT_SELECTED`      |
| `CONTACT_PENDING`   | `WITHDRAWN`         |
| `MEETING_SCHEDULED` | `DECISION_PENDING`  |
| `MEETING_SCHEDULED` | `WITHDRAWN`         |
| `DECISION_PENDING`  | `NOT_SELECTED`      |
| `DECISION_PENDING`  | `WITHDRAWN`         |

`SELECTED`, `NOT_SELECTED`, and `WITHDRAWN` are terminal for that candidate process.

`DECISION_PENDING → SELECTED` is excluded from ordinary candidate updates. It occurs only inside `confirm_adoption()` after the adoption record can be created in the same transaction.

When an adoption is confirmed, the same operation moves every other nonterminal candidate for that animal to `NOT_SELECTED`. This operation-level terminalization is allowed regardless of the candidate's current nonterminal stage because the animal is no longer available.

## Evaluation

An evaluation captures the shelter's operational assessment, not a copy of the external application.

```text
Evaluation
id
shelter_id
candidate_id
overall_fit
positive_factors[]
concerns[]
notes?
recommendation
created_by_user_id
created_at
updated_at
```

Controlled values:

```text
OverallFit:    STRONG | POSSIBLE | CONCERNS
Recommendation: CONTINUE | MORE_INFORMATION | DO_NOT_CONTINUE
```

Persisting the first valid evaluation moves the candidate from `NEEDS_EVALUATION` to `EVALUATED`. A recommendation informs the shelter's next explicit decision; it does not select an adopter automatically.

## Meeting

A candidate can have many meetings so significant interaction history is preserved without a generic `Activity` entity.

```text
Meeting
id
shelter_id
candidate_id
type
scheduled_at
status
result?
notes?
rescheduled_from_meeting_id?
created_at
updated_at
```

Meeting types cover interviews, visits, meet-and-greets, and home visits. Status and result values are:

```text
Status: SCHEDULED | COMPLETED | CANCELED | RESCHEDULED
Result: STRONG_MATCH | GOOD | CONCERNS | NOT_RECOMMENDED
```

Rescheduling must preserve history. The original meeting becomes `RESCHEDULED`, a new meeting is created, and the new record may reference the original through `rescheduled_from_meeting_id`.

Scheduling the first relevant meeting moves the candidate to `MEETING_SCHEDULED` and, if necessary, moves the animal from `READY` to `IN_PROCESS`. After the shelter has enough completed-meeting information, it explicitly advances the candidate to `DECISION_PENDING`.

## Adoption

An adoption is an independent historical entity linking exactly one animal and one selected candidate.

```text
Adoption
id
shelter_id
animal_id
candidate_id
adoption_date
handover_notes?
adoption_photo_path?
status
created_at
```

States:

```text
ACTIVE
RETURNED
```

There is no `CLOSED` state in V1. Completion of all follow-ups is derived from the follow-up records and does not change the validity of an active adoption.

An animal may have multiple adoptions over its lifetime after returns, but it can have at most one active adoption at a time. A candidate can have exactly one adoption over its lifetime, including after a return. A persisted `SELECTED` candidate has exactly one associated adoption, and every adoption must reference a `SELECTED` candidate. A candidate used by an adoption must belong to the same animal and shelter.

## FollowUp

Follow-ups are first-class records rather than date fields on an adoption.

```text
FollowUp
id
shelter_id
adoption_id
due_date
status
outcome?
notes?
photo_path?
completed_at?
cancelled_at?
cancellation_reason?
rescheduled_from_followup_id?
created_at
updated_at
```

Controlled values:

```text
Status:  PENDING | COMPLETED | RESCHEDULED | MISSED | CANCELLED
Outcome: EXCELLENT | GOOD | CONCERNS | INTERVENTION_REQUIRED
```

`CANCELLED` is used only by the return workflow. When `return_adoption()` runs, historical follow-ups are preserved unchanged, and only pending follow-ups are moved to `CANCELLED`, preventing further reminders. A cancelled follow-up always records `cancelled_at` and the controlled reason `ADOPTION_RETURNED` in `cancellation_reason`; no other reason value is valid. On any status other than `CANCELLED`, both `cancelled_at` and `cancellation_reason` must be null.

The application may offer 7, 30, and 60 days as defaults, but the shelter can change the plan during adoption confirmation. These intervals are not fixed domain rules.

## AdoptionReturn

An adoption can have at most one explicit return record:

```text
AdoptionReturn
id
shelter_id
adoption_id
returned_at
reason
notes?
created_by_user_id
created_at
```

The return record, previous adopter, adoption, follow-ups, and timeline remain available permanently.

## TimelineEvent

Timeline events make meaningful animal history easy to query and present. They are created by important domain operations, such as readiness changes, candidate milestones, adoption confirmation, follow-up completion, and returns.

Conceptually, a timeline event identifies its shelter, animal, event type, occurrence time, relevant domain record, and display-safe event data. Exact event types and payload representation will be defined with the operations that create them rather than as a generic free-form logging API.

Timeline is not a generic audit system. Security auditing and operational logs are separate concerns.

Timeline event types observed by the mobile application:

```text
ANIMAL_READY
ANIMAL_NOT_AVAILABLE
CANDIDATE_CREATED
EVALUATION_RECORDED
MEETING_SCHEDULED
ANIMAL_IN_PROCESS
DECISION_PENDING
ADOPTION_CONFIRMED
FOLLOW_UPS_PLANNED
FOLLOW_UP_COMPLETED
ADOPTION_RETURNED
REEVALUATION_REQUIRED
```

`FOLLOW_UP_COMPLETED` carries the recorded `outcome` in its `data` payload.

## Domain invariants

1. Every principal domain row belongs to one shelter.
2. Related rows must have the same `shelter_id`; cross-shelter references are forbidden.
3. An authenticated actor may access only rows belonging to the shelter in their profile.
4. A candidate always links one person and one animal within the same shelter.
5. Animal and candidate statuses can change only through allowed transitions or documented atomic domain operations.
6. A persisted candidate with `status = SELECTED` has exactly one corresponding adoption, and every adoption references a candidate with `status = SELECTED`.
7. Selecting a candidate in a confirmation screen is temporary UI state and must not persist `SELECTED`.
8. An animal with an active adoption is `ADOPTED` and cannot have a second active adoption.
9. An `ACTIVE` adoption cannot have an `AdoptionReturn`; a `RETURNED` adoption has exactly one return record.
10. A return never creates `Animal.status = RETURNED`; it moves the animal to `REEVALUATION`.
11. `REEVALUATION → READY` always requires an explicit human review.
12. Historical evaluations, completed meetings, adoptions, returns, follow-ups, and timeline events are never hard-deleted by the mobile application.
13. Archiving an animal with an active adoption is forbidden.
14. User-entered content is preserved exactly as entered and is never automatically translated.

## Atomic domain operations

Shelters and profiles are provisioned externally by the product owners; there is no account-creation operation in the mobile application.

### Confirm adoption

RPC contract:

```text
public.confirm_adoption(
  p_candidate_id uuid,
  p_adoption_date date,
  p_handover_notes text,
  p_followup_due_dates date[]
) returns uuid
```

Only authenticated actors may execute the RPC. It derives `shelter_id` from
the authenticated profile; clients never provide a shelter identifier. The
follow-up plan must contain at least one non-null, unique due date and every
due date must be after `p_adoption_date`.

Preconditions:

```text
Candidate.status = DECISION_PENDING
Animal.status = IN_PROCESS
Candidate belongs to Animal
Candidate and Animal belong to the authenticated user's shelter
No active adoption exists for Animal
```

`confirm_adoption(candidate_id, followup_plan, ...)` performs:

```text
BEGIN
validate all preconditions
create ACTIVE Adoption
selected Candidate: DECISION_PENDING → SELECTED
other nonterminal candidates for Animal → NOT_SELECTED
Animal: IN_PROCESS → ADOPTED
create configurable FollowUps
create adoption TimelineEvent
COMMIT
```

Any failure rolls back every change.

### Return adoption

RPC contract:

```text
public.return_adoption(
  p_adoption_id uuid,
  p_reason text,
  p_notes text
) returns uuid
```

Only authenticated actors may execute the RPC. It derives both `shelter_id`
and `created_by_user_id` from the authenticated session; clients never provide
either value. `p_reason` is required after trimming for validation, while the
stored reason and optional notes preserve the user-entered values. The returned
`uuid` identifies the created `AdoptionReturn`, whose `returned_at` is the
execution time of the RPC.

Preconditions:

```text
Adoption.status = ACTIVE
Adoption belongs to the authenticated user's shelter
Animal.status = ADOPTED
No return record exists
```

`return_adoption(adoption_id, reason, notes)` performs:

```text
BEGIN
validate all preconditions
create AdoptionReturn
Adoption: ACTIVE → RETURNED
Animal: ADOPTED → REEVALUATION
pending FollowUps: PENDING → CANCELLED (preserve completed/rescheduled/missed)
create return TimelineEvent
COMMIT
```

Any failure rolls back every change. Returning an animal preserves historical follow-ups and moves only pending follow-ups to `CANCELLED`, preventing further reminders. It never deletes follow-up records.

### Complete follow-up

RPC contract:

```text
public.complete_followup(
  p_followup_id uuid,
  p_outcome text,
  p_notes text
) returns uuid
```

Only authenticated actors may execute the RPC. It derives `shelter_id` from
the authenticated profile and never accepts a shelter, adoption, or user
identifier from the client.

Preconditions:

```text
Follow-up exists in the authenticated shelter
Follow-up status = PENDING
Adoption status = ACTIVE
Animal status = ADOPTED
p_outcome in ('EXCELLENT', 'GOOD', 'CONCERNS', 'INTERVENTION_REQUIRED')
```

`complete_followup(followup_id, outcome, notes, …)` performs:

```text
BEGIN
  lock the adoption row
  lock the follow-up row
  validate every precondition
  update follow-up: status = COMPLETED, outcome, notes, completed_at = now(), updated_at = now()
  insert timeline_event FOLLOW_UP_COMPLETED on the animal referencing the follow-up
COMMIT
```

Any failure rolls back every change.

To avoid races with `return_adoption()`, the RPC locks the adoption row
before the follow-up row. A concurrent `return_adoption()` therefore cancels
pending follow-ups first, and `complete_followup()` rejects any follow-up
whose status is no longer `PENDING`.

The stored notes preserve the value provided by the caller, including
leading or trailing whitespace chosen by the user.

### Complete reevaluation

After a return, an explicit shelter decision moves the animal from `REEVALUATION` to either `READY` or `NOT_AVAILABLE` and records a timeline event. No automatic timer or completed form can silently make the animal available.

## Complete happy path

The domain happy path, independent of screens, is:

```text
Animal PREPARING
→ shelter confirms readiness
Animal READY

Person and Candidate created
Candidate NEEDS_EVALUATION
→ Evaluation recorded
Candidate EVALUATED
→ shelter continues contact
Candidate CONTACT_PENDING
→ Meeting scheduled
Candidate MEETING_SCHEDULED
Animal IN_PROCESS
→ relevant meeting history completed and reviewed
Candidate DECISION_PENDING
→ confirm_adoption() succeeds atomically
Candidate SELECTED
Animal ADOPTED
Adoption ACTIVE
Other candidates NOT_SELECTED
FollowUps PENDING
→ FollowUps completed, missed, or rescheduled over time
Adoption remains ACTIVE
```

## Complete return path

The return path, independent of screens, is:

```text
Adoption ACTIVE + Animal ADOPTED
→ return_adoption() succeeds atomically
Adoption RETURNED
AdoptionReturn preserved
Animal REEVALUATION
Pending follow-ups CANCELLED; historical follow-ups preserved
Previous candidate, adoption, follow-ups, and timeline preserved
→ human reevaluation
Animal READY or NOT_AVAILABLE
→ if READY, a new candidate process may eventually produce a new Adoption
```

## Why the states are separate

`Animal.status` answers where the animal is in its operational availability lifecycle. `Candidate.status` answers where one person-animal process is in its evaluation and decision lifecycle. They cannot be combined because one animal can have several candidates at different stages simultaneously.

`Adoption` is independent because selection is not merely a candidate label. An adoption has its own date, status, handover information, photos, follow-ups, and possible return. Keeping it as a historical entity allows an animal to be returned and later adopted again without overwriting the previous adopter or journey.
