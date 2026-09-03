# ShelterFlow Domain Model

This document is the canonical definition of the ShelterFlow V1 domain: its entities, states,
transitions, preconditions, and invariants. These rules hold independently of any user interface,
framework, or storage technology. Screens may present this model, but navigation and UI state do
not define or replace business state.

Where this document and any other document disagree about a domain rule, this document wins.

- What we are building and why: [PRODUCT.md](PRODUCT.md)
- How the rules are technically enforced: [ARCHITECTURE.md](ARCHITECTURE.md)
- Who may read or change what: [SECURITY.md](SECURITY.md)
- Why a rule is what it is: [decisions/](decisions/README.md)

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

V1 presents one shelter to the user, but all principal domain records are explicitly
shelter-scoped.

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
- `user_id` identifies the authenticated actor and may be stored in fields such as
  `created_by_user_id` for attribution.

An animal belongs to a shelter, not personally to the user who created it. Cross-shelter
relationships are invalid even when every referenced row exists.

V1 uses one shelter per profile. Shelter switching, invitations, roles, and many-to-many
memberships are out of scope. See
[ADR-002](decisions/002-single-shelter-with-shelter-scoped-isolation.md) and
[ADR-003](decisions/003-separate-actor-identity-from-data-ownership.md).

Minimum identity data:

```text
Shelter
id
name
country
created_at

Profile
id                 // same identifier as the authenticated user's id
shelter_id
display_name
created_at
updated_at
```

There is no registration flow in V1. Shelters and profiles are provisioned externally by the
product owners, not through the mobile application
([ADR-019](decisions/019-provision-users-and-shelters-externally.md)). Storage defaults, indexes,
and referential actions are defined alongside the database migrations.

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

Approximate age is stored as nullable months. `NULL` means unknown; display conversion into months
or years is a localization concern.

### Image references

Persisted image fields (`primary_photo_path`, `adoption_photo_path`, `followup.photo_path`) store
storage paths that identify the uploaded object, not signed or public URLs. A signed or public URL
must never be persisted as the canonical attachment reference because it can expire or change.

### Animal state machine

**Initial state:** `PREPARING`. **Terminal states:** none — an animal's availability lifecycle can
always continue.

```text
PREPARING
READY
IN_PROCESS
ADOPTED
REEVALUATION
NOT_AVAILABLE
```

`RETURNED` is intentionally not an animal state. It describes an adoption outcome. A returned
animal moves directly from `ADOPTED` to `REEVALUATION` as part of the return operation
([ADR-008](decisions/008-returned-belongs-to-adoption.md)).

| From            | To              | Trigger                                          | Precondition                                                             |
| --------------- | --------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| `PREPARING`     | `READY`         | A shelter actor confirms adoption readiness      | —                                                                        |
| `PREPARING`     | `NOT_AVAILABLE` | The shelter pauses or removes availability       | —                                                                        |
| `READY`         | `IN_PROCESS`    | The first candidate reaches `MEETING_SCHEDULED`  | A meeting is scheduled for a candidate of this animal                    |
| `READY`         | `NOT_AVAILABLE` | The shelter pauses the process                   | —                                                                        |
| `IN_PROCESS`    | `READY`         | No viable candidate remains in an advanced stage | No candidate of this animal is `MEETING_SCHEDULED` or `DECISION_PENDING` |
| `IN_PROCESS`    | `ADOPTED`       | Adoption confirmation succeeds                   | See [Confirm adoption](#confirm-adoption)                                |
| `IN_PROCESS`    | `NOT_AVAILABLE` | The shelter pauses the process                   | —                                                                        |
| `ADOPTED`       | `REEVALUATION`  | An adoption return succeeds                      | See [Return adoption](#return-adoption)                                  |
| `REEVALUATION`  | `READY`         | A human reevaluation approves readiness          | No active adoption exists for the animal                                 |
| `REEVALUATION`  | `NOT_AVAILABLE` | A human reevaluation does not approve readiness  | No active adoption exists for the animal                                 |
| `NOT_AVAILABLE` | `PREPARING`     | Preparation restarts                             | —                                                                        |
| `NOT_AVAILABLE` | `READY`         | A shelter actor explicitly restores availability | —                                                                        |

Having early-stage candidates does not move an animal out of `READY`; `IN_PROCESS` begins when at
least one candidate reaches `MEETING_SCHEDULED`
([ADR-006](decisions/006-in-process-at-first-scheduled-meeting.md)).

For returning from `IN_PROCESS` to `READY`, the **advanced active stages** are exactly
`MEETING_SCHEDULED` and `DECISION_PENDING`. Terminal candidates are not viable. Earlier-stage
candidates may remain while the animal is `READY`.

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

One person may therefore be a candidate for different animals without duplicating contact data.
`Person` must not grow into a generic CRM contact model
([ADR-004](decisions/004-separate-person-from-candidate.md)).

`source` records where the candidate came from and is not a controlled domain value; known values
are presented with a label and any other value is preserved and shown as entered.

### Candidate state machine

**Initial state:** `NEEDS_EVALUATION`. **Terminal states:** `SELECTED`, `NOT_SELECTED`,
`WITHDRAWN`.

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

| From                | To                  | Trigger                                       | Precondition                                                     |
| ------------------- | ------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| `NEEDS_EVALUATION`  | `EVALUATED`         | The first valid evaluation is recorded        | See [Record evaluation](#candidate-workflow-operations)          |
| `NEEDS_EVALUATION`  | `WITHDRAWN`         | The person withdraws                          | —                                                                |
| `EVALUATED`         | `CONTACT_PENDING`   | The shelter decides to continue               | See [Continue candidate contact](#candidate-workflow-operations) |
| `EVALUATED`         | `NOT_SELECTED`      | The shelter decides not to continue           | —                                                                |
| `EVALUATED`         | `WITHDRAWN`         | The person withdraws                          | —                                                                |
| `CONTACT_PENDING`   | `MEETING_SCHEDULED` | A meeting is scheduled                        | See [Schedule meeting](#candidate-workflow-operations)           |
| `CONTACT_PENDING`   | `NOT_SELECTED`      | The shelter decides not to continue           | —                                                                |
| `CONTACT_PENDING`   | `WITHDRAWN`         | The person withdraws                          | —                                                                |
| `MEETING_SCHEDULED` | `DECISION_PENDING`  | The shelter is ready to decide                | At least one meeting for the candidate is `COMPLETED`            |
| `MEETING_SCHEDULED` | `WITHDRAWN`         | The person withdraws                          | —                                                                |
| `DECISION_PENDING`  | `SELECTED`          | Adoption confirmation succeeds                | Only inside [Confirm adoption](#confirm-adoption)                |
| `DECISION_PENDING`  | `NOT_SELECTED`      | The shelter selects someone else, or declines | —                                                                |
| `DECISION_PENDING`  | `WITHDRAWN`         | The person withdraws                          | —                                                                |

`DECISION_PENDING → SELECTED` is excluded from ordinary candidate updates. It occurs only inside
adoption confirmation, after the adoption record can be created in the same transaction
([ADR-010](decisions/010-persist-selected-only-in-atomic-confirmation.md)).

When an adoption is confirmed, the same operation moves every other nonterminal candidate for that
animal to `NOT_SELECTED`. This operation-level terminalization is allowed regardless of the
candidate's current nonterminal stage, because the animal is no longer available.

## Evaluation

An evaluation captures the shelter's operational assessment, not a copy of the external
application.

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
OverallFit:     STRONG | POSSIBLE | CONCERNS
Recommendation: CONTINUE | MORE_INFORMATION | DO_NOT_CONTINUE
```

Persisting the first valid evaluation moves the candidate from `NEEDS_EVALUATION` to `EVALUATED`. A
recommendation informs the shelter's next explicit decision; it never selects an adopter or
advances a candidate on its own.

## Meeting

A candidate can have many meetings so significant interaction history is preserved without a
generic `Activity` entity ([ADR-011](decisions/011-multiple-meetings-with-reschedule-history.md)).

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

Meeting types cover interviews, visits, meet-and-greets, and home visits.

### Meeting state machine

**Initial state:** `SCHEDULED`. **Terminal states:** `COMPLETED`, `CANCELED`, `RESCHEDULED`.

```text
Status: SCHEDULED | COMPLETED | CANCELED | RESCHEDULED
Result: STRONG_MATCH | GOOD | CONCERNS | NOT_RECOMMENDED
```

| From        | To            | Trigger                          | Precondition                                               |
| ----------- | ------------- | -------------------------------- | ---------------------------------------------------------- |
| `SCHEDULED` | `COMPLETED`   | The meeting result is recorded   | The meeting is still `SCHEDULED`; a result is provided     |
| `SCHEDULED` | `CANCELED`    | The meeting does not take place  | —                                                          |
| `SCHEDULED` | `RESCHEDULED` | A replacement meeting is created | A new `SCHEDULED` meeting is created in the same operation |

A `result` is present only on a `COMPLETED` meeting. A candidate may have at most one `SCHEDULED`
meeting at a time. Rescheduling must preserve history: the original meeting becomes `RESCHEDULED`,
a new meeting is created, and the new record may reference the original through
`rescheduled_from_meeting_id`.

Scheduling the first relevant meeting moves the candidate to `MEETING_SCHEDULED` and, if necessary,
moves the animal from `READY` to `IN_PROCESS`. Completing a meeting does not advance the candidate;
after the shelter has enough completed-meeting information it explicitly advances the candidate to
`DECISION_PENDING`.

## Adoption

An adoption is an independent historical entity linking exactly one animal and one selected
candidate ([ADR-007](decisions/007-adoption-as-independent-historical-entity.md)).

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

### Adoption state machine

**Initial state:** `ACTIVE`. **Terminal state:** `RETURNED`.

| From     | To         | Trigger                        | Precondition                            |
| -------- | ---------- | ------------------------------ | --------------------------------------- |
| `ACTIVE` | `RETURNED` | An adoption return is recorded | See [Return adoption](#return-adoption) |

There is no `CLOSED` state in V1. Completion of all follow-ups is derived from the follow-up
records and does not change the validity of an active adoption.

An animal may have multiple adoptions over its lifetime after returns, but at most one active
adoption at a time. A candidate has exactly one adoption over its lifetime, including after a
return. A persisted `SELECTED` candidate has exactly one associated adoption, and every adoption
references a `SELECTED` candidate. A candidate used by an adoption must belong to the same animal
and shelter.

## FollowUp

Follow-ups are first-class records rather than date fields on an adoption
([ADR-012](decisions/012-configurable-followup-plan.md)).

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

### FollowUp state machine

**Initial state:** `PENDING`. **Terminal states:** `COMPLETED`, `RESCHEDULED`, `MISSED`,
`CANCELLED`.

```text
Status:  PENDING | COMPLETED | RESCHEDULED | MISSED | CANCELLED
Outcome: EXCELLENT | GOOD | CONCERNS | INTERVENTION_REQUIRED
```

| From      | To            | Trigger                            | Precondition                                               |
| --------- | ------------- | ---------------------------------- | ---------------------------------------------------------- |
| `PENDING` | `COMPLETED`   | The shelter records an outcome     | See [Complete follow-up](#complete-follow-up)              |
| `PENDING` | `RESCHEDULED` | A replacement follow-up is created | A new `PENDING` follow-up is created in the same operation |
| `PENDING` | `MISSED`      | The follow-up did not happen       | —                                                          |
| `PENDING` | `CANCELLED`   | The adoption is returned           | Only inside [Return adoption](#return-adoption)            |

`CANCELLED` is used only by the return workflow
([ADR-009](decisions/009-return-cancels-only-pending-followups.md)). A cancelled follow-up always
records `cancelled_at` and the controlled reason `ADOPTION_RETURNED` in `cancellation_reason`; no
other reason value is valid. On any status other than `CANCELLED`, both `cancelled_at` and
`cancellation_reason` must be null.

An `outcome` and `completed_at` are present only on a `COMPLETED` follow-up.

The application may offer 7, 30, and 60 days as defaults, but the shelter can change the plan
during adoption confirmation. These intervals are not domain rules.

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

An `AdoptionReturn` is immutable. The return record, previous adopter, adoption, follow-ups, and
timeline remain available permanently.

## TimelineEvent

Timeline events make meaningful animal history easy to query and present. They are created by
important domain operations and identify their shelter, animal, event type, occurrence time,
related domain record, and display-safe event data.

Timeline is not a generic audit system
([ADR-014](decisions/014-timeline-as-domain-projection.md)). Security auditing and operational logs
are separate concerns.

Event types are a closed set:

```text
ANIMAL_READY
ANIMAL_NOT_AVAILABLE
CANDIDATE_CREATED
EVALUATION_RECORDED
CONTACT_PENDING
MEETING_SCHEDULED
MEETING_COMPLETED
ANIMAL_IN_PROCESS
DECISION_PENDING
ADOPTION_CONFIRMED
FOLLOW_UPS_PLANNED
FOLLOW_UP_COMPLETED
ADOPTION_RETURNED
REEVALUATION_REQUIRED
```

`FOLLOW_UP_COMPLETED` carries the recorded `outcome` in its data payload.

**Timeline payloads must contain only display-safe workflow metadata.** Private notes, contact
details, and other personally identifying data remain on their domain records and must never be
copied into a timeline event.

## Domain invariants

1. Every principal domain row belongs to one shelter.
2. Related rows must have the same `shelter_id`; cross-shelter references are forbidden.
3. An authenticated actor may access only rows belonging to the shelter in their profile.
4. A candidate always links one person and one animal within the same shelter.
5. Animal and candidate statuses can change only through allowed transitions or the documented
   atomic domain operations.
6. A persisted candidate with `status = SELECTED` has exactly one corresponding adoption, and every
   adoption references a candidate with `status = SELECTED`.
7. Selecting a candidate in a confirmation screen is temporary UI state and must not persist
   `SELECTED`.
8. An animal with an active adoption is `ADOPTED` and cannot have a second active adoption.
9. An `ACTIVE` adoption cannot have an `AdoptionReturn`; a `RETURNED` adoption has exactly one
   return record.
10. A return never creates `Animal.status = RETURNED`; it moves the animal to `REEVALUATION`.
11. `REEVALUATION → READY` always requires an explicit human review.
12. Historical evaluations, completed meetings, adoptions, returns, follow-ups, and timeline events
    are never hard-deleted by the mobile application.
13. Archiving an animal with an active adoption is forbidden.
14. User-entered content is preserved exactly as entered and is never automatically translated.

## Atomic domain operations

Some transitions change several records at once. Each is one indivisible domain operation: it
validates every precondition, applies every change, records its timeline events, and either
succeeds completely or leaves the domain untouched. There is no valid intermediate state between
the start and the end of an operation.

**Rules every operation inherits.** They are not repeated per operation below:

- the acting shelter and actor come from the authenticated session, never from caller input;
- any referenced record outside that shelter is rejected, as is a caller whose profile has no
  shelter;
- every precondition is validated in the same transaction that performs the change;
- any failure rolls back every change;
- timeline events carry display-safe workflow metadata only — user-entered notes stay on their own
  domain record and are preserved exactly as entered.

There is no account-creation operation: shelters and profiles are provisioned externally.

How these guarantees are implemented — function signatures, transaction and locking mechanics, and
the constraints that back them under concurrency — is in
[ARCHITECTURE.md](ARCHITECTURE.md#atomic-domain-operations). The rules below are the domain
contract.

### Candidate workflow operations

| Operation                      | Inputs                                                                     | Distinctive preconditions                                                                                         | Effects                                                                                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Record evaluation**          | candidate, overall fit, positive factors, concerns, recommendation, notes? | Candidate is `NEEDS_EVALUATION`; overall fit and recommendation hold controlled values                            | Creates the evaluation attributed to the acting user; candidate `NEEDS_EVALUATION → EVALUATED`; `EVALUATION_RECORDED` event                                                                                   |
| **Continue candidate contact** | candidate                                                                  | Candidate is `EVALUATED`                                                                                          | Candidate `EVALUATED → CONTACT_PENDING`; `CONTACT_PENDING` event                                                                                                                                              |
| **Schedule meeting**           | candidate, type, scheduled time, notes?                                    | Candidate is `CONTACT_PENDING`; animal is `READY` or `IN_PROCESS`; the candidate has no other `SCHEDULED` meeting | Creates the `SCHEDULED` meeting; candidate `CONTACT_PENDING → MEETING_SCHEDULED`; animal `READY → IN_PROCESS` when it was still `READY`; `MEETING_SCHEDULED` and, when applicable, `ANIMAL_IN_PROCESS` events |
| **Complete meeting**           | meeting, result, notes?                                                    | Meeting is `SCHEDULED` and its candidate is `MEETING_SCHEDULED`; result holds a controlled value                  | Records result and notes; meeting `SCHEDULED → COMPLETED`; `MEETING_COMPLETED` event                                                                                                                          |
| **Mark decision pending**      | candidate                                                                  | Candidate is `MEETING_SCHEDULED` and at least one of its meetings is `COMPLETED`                                  | Candidate `MEETING_SCHEDULED → DECISION_PENDING`; `DECISION_PENDING` event                                                                                                                                    |

Two rules these operations deliberately do **not** contain: an evaluation recommendation never
advances a candidate on its own, and completing a meeting never advances the candidate. Both next
steps are explicit shelter decisions. A second completion of the same meeting is rejected.

### Confirm adoption

The operation that makes an adoption real. It is the only way a candidate becomes `SELECTED`.

**Inputs:** candidate, adoption date, optional handover notes, follow-up due dates.

**Preconditions:**

```text
Candidate.status = DECISION_PENDING
Animal.status = IN_PROCESS
Candidate belongs to Animal
No active adoption exists for Animal
The follow-up plan has at least one due date
Every due date is non-null, unique, and after the adoption date
```

**Effects:**

```text
create ACTIVE Adoption
selected Candidate: DECISION_PENDING → SELECTED
other nonterminal candidates for Animal → NOT_SELECTED
Animal: IN_PROCESS → ADOPTED
create the configured PENDING FollowUps
create adoption timeline events
```

### Return adoption

**Inputs:** adoption, reason, optional notes.

**Preconditions:**

```text
Adoption.status = ACTIVE
Animal.status = ADOPTED
No return record exists
A reason is present after trimming
```

**Effects:**

```text
create AdoptionReturn attributed to the acting user, timestamped at the moment of the return
Adoption: ACTIVE → RETURNED
Animal: ADOPTED → REEVALUATION
pending FollowUps: PENDING → CANCELLED (completed, rescheduled, and missed are preserved)
create return timeline events
```

Follow-up records are never deleted.

### Complete follow-up

**Inputs:** follow-up, outcome, optional notes.

**Preconditions:**

```text
FollowUp.status = PENDING
Adoption.status = ACTIVE
Animal.status = ADOPTED
The outcome holds a controlled value
```

**Effects:** sets the follow-up to `COMPLETED` with its outcome, notes, and completion time, and
records a `FOLLOW_UP_COMPLETED` timeline event on the animal referencing the follow-up.

A follow-up whose adoption has already been returned can no longer be completed: the return cancels
pending follow-ups, and completion rejects any follow-up that is no longer `PENDING`.

### Complete reevaluation

The explicit human decision after a return. No automatic timer or completed form can silently make
an animal available again.

**Inputs:** animal, next status (`READY` or `NOT_AVAILABLE`).

**Preconditions:**

```text
Animal.status = REEVALUATION
No active adoption exists for the animal
The next status is READY or NOT_AVAILABLE
```

**Effects:** moves the animal to the chosen status and records an `ANIMAL_READY` or
`ANIMAL_NOT_AVAILABLE` timeline event accordingly.

## Complete happy path

The domain happy path, independent of screens:

```text
Animal PREPARING
→ shelter confirms readiness
Animal READY

Person and Candidate created
Candidate NEEDS_EVALUATION
→ evaluation recorded
Candidate EVALUATED
→ shelter continues contact
Candidate CONTACT_PENDING
→ meeting scheduled
Candidate MEETING_SCHEDULED
Animal IN_PROCESS
→ relevant meeting history completed and reviewed
Candidate DECISION_PENDING
→ adoption confirmed atomically
Candidate SELECTED
Animal ADOPTED
Adoption ACTIVE
Other candidates NOT_SELECTED
FollowUps PENDING
→ FollowUps completed, missed, or rescheduled over time
Adoption remains ACTIVE
```

## Complete return path

The return path, independent of screens:

```text
Adoption ACTIVE + Animal ADOPTED
→ adoption returned atomically
Adoption RETURNED
AdoptionReturn preserved
Animal REEVALUATION
Pending follow-ups CANCELLED; historical follow-ups preserved
Previous candidate, adoption, follow-ups, and timeline preserved
→ human reevaluation
Animal READY or NOT_AVAILABLE
→ if READY, a new candidate process may eventually produce a new Adoption
```

If either path needs a screen name to explain why a state is valid, this document is incomplete.

## Why the states are separate

`Animal.status` answers where the animal is in its operational availability lifecycle.
`Candidate.status` answers where one person-animal process is in its evaluation and decision
lifecycle. They cannot be combined because one animal can have several candidates at different
stages simultaneously ([ADR-005](decisions/005-separate-animal-and-candidate-state-machines.md)).

`Adoption` is independent because selection is not merely a candidate label. An adoption has its
own date, status, handover information, photos, follow-ups, and possible return. Keeping it as a
historical entity allows an animal to be returned and later adopted again without overwriting the
previous adopter or journey.
