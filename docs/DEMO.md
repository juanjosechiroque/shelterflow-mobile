# ShelterFlow Demo Specification

This document specifies what the V1 product demonstration must show and what its fictitious data
must contain.

**Status: planned.** It describes the target demonstration, not what the application does today.
The demo shelter, the reset mechanism, and several of the scenes below depend on capabilities that
are not implemented yet; each scene states what it needs. What currently works is described in
[README.md](../README.md).

The demo must let a recruiter, client, or shelter operator understand ShelterFlow without developer
guidance. All names, animals, contact details, notes, images, and events used by the demo must be
clearly fictitious ([ADR-023](decisions/023-fictitious-reproducible-fixtures.md)).

## Demo shelter

```text
Huellitas Rescue
Country: Peru
```

The complete seed should eventually contain approximately:

- 12–15 animals across active lifecycle states;
- 10–20 candidate processes;
- several evaluations and meetings;
- 2–3 active adoptions;
- pending and completed follow-ups;
- one returned adoption under reevaluation.

The application should provide `Try Demo Shelter` and, if practical, `Reset Demo` so a reviewer can
repeat the scenarios.

## Core fictitious records

### Luna

- Dog, medium size, approximately 24 months old.
- Starts `IN_PROCESS` for the decision scenario.
- Has multiple candidates at distinct stages.

Candidates:

- **Andrea** — the main adoption protagonist. Starts `NEEDS_EVALUATION` and carries the full
  journey: evaluation, contact, meeting, decision, and adoption confirmation.
- **Carlos** — another active candidate who becomes `NOT_SELECTED` when Andrea's adoption is
  confirmed.
- **Sofía** — a further active candidate who becomes `NOT_SELECTED` when Andrea's adoption is
  confirmed.

### Mia

- Cat with an `ACTIVE` adoption.
- Has a completed 7-day follow-up and a 30-day follow-up due today.
- Used to demonstrate reminders, deep links, outcome recording, and an optional photo.

### Bruno

- Dog with a prior `RETURNED` adoption.
- Current animal status is `REEVALUATION`.
- Prior adopter, follow-ups, return reason, and timeline remain visible.
- Used to demonstrate history preservation and explicit readiness review.

### Toby

- Animal in `READY` with no advanced candidate.
- Used to make the difference between availability and an active process understandable.

## Ninety-second walkthrough

Each scene names the expected domain result. Those results are defined in
[DOMAIN.md](DOMAIN.md#atomic-domain-operations); the demo must not invent a transition that the
domain does not allow.

### Scene 1 — Actionable work

Open the default Spanish home experience and show a small set of due work:

```text
2 candidate evaluations
1 adoption decision
2 follow-ups
1 animal awaiting reevaluation
```

The point is to establish that ShelterFlow organizes operational adoption work rather than
displaying a generic dashboard.

_Needs: the demo shelter fixture._

### Scene 2 — Candidate evaluation

Open Luna and Andrea. Record a structured strong fit with positive factors, one concern, and a
recommendation to continue.

Expected domain result:

```text
Evaluation created
Andrea: NEEDS_EVALUATION → EVALUATED
Timeline updated
```

The scenario should show mobile form behavior, validation, and translated labels without
reproducing the external application form.

_Needs: the demo shelter fixture. The underlying flow is implemented._

### Scene 3 — Atomic adoption

Open Luna and Andrea, walk her through her adoption journey until she reaches `DECISION_PENDING`,
then choose adjustable follow-up dates and confirm the adoption.

Expected atomic result:

```text
Adoption ACTIVE created
Andrea: DECISION_PENDING → SELECTED
Other nonterminal Luna candidates → NOT_SELECTED
Luna: IN_PROCESS → ADOPTED
Follow-ups created
Timeline updated
```

The demonstration must never briefly show a persisted selected candidate without the adoption
([ADR-010](decisions/010-persist-selected-only-in-atomic-confirmation.md)).

_Needs: the demo shelter fixture. The underlying flow is implemented._

### Scene 4 — Follow-up notification

Open Mia's due follow-up from a notification deep link. Record an outcome and an optional photo.

Expected domain result:

```text
FollowUp: PENDING → COMPLETED
Outcome and completion time recorded
Adoption remains ACTIVE
Timeline updated
```

_Needs: local notifications, follow-up deep links, and image upload — all planned. Follow-up
completion itself is implemented._

### Scene 5 — Returned adoption

Open Bruno and show the prior adoption, its return record, and the current reevaluation state.
Complete a human review that makes Bruno ready again.

Expected domain journey:

```text
Existing Adoption RETURNED remains visible
Existing AdoptionReturn remains visible
Bruno: REEVALUATION → READY
New timeline event created
```

The demonstration should make clear that ShelterFlow preserved history instead of resetting Bruno.

_Needs: the demo shelter fixture. The underlying flow is implemented._

## Language review

The demo begins in Spanish and includes a brief switch to English in Settings. Reviewers should
verify:

- the language preference survives an application restart;
- longer English labels do not clip or overlap;
- dates use `es-PE` in Spanish and `en-US` in English;
- fictitious notes remain unchanged when the UI language changes.

## Failure demonstrations

At least one final product demonstration or test artifact should show:

- an adoption confirmation failure rolling back every domain change;
- unavailable-network feedback that preserves form input;
- an unavailable external contact application handled without claiming contact success;
- cross-shelter access denied by Row Level Security.

## Demo completion criteria

The final demo is ready when:

- it can be understood in 60–90 seconds;
- all data is obviously fictitious;
- the primary adoption and follow-up journey is coherent;
- the return scenario preserves history;
- Spanish-first and English-supported behavior is visible;
- no step depends on a developer manually repairing data.

## Validating the domain without screens

The happy path and the return path must be explainable purely as state transitions. Those
walkthroughs are maintained in [DOMAIN.md](DOMAIN.md#complete-happy-path) and are not repeated here.

If either path needs a screen name to explain why a state is valid, the domain documentation is
incomplete.
