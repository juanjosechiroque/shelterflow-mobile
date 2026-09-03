# ADR-005 — Keep the Animal and Candidate state machines separate

**Status:** Accepted
**Date:** 2026-08-31

## Context

An animal can have several candidates at different stages at the same time. A single combined
status would have to describe both the animal's availability and the progress of every candidate
process attached to it.

## Decision

`Animal.status` describes operational availability. `Candidate.status` describes one person-animal
evaluation and decision process. The two state machines are independent and are advanced by
different triggers.

## Alternatives considered

- **One combined status on the animal.** Rejected: it cannot represent two candidates at different
  stages, and every candidate transition would have to rewrite the animal.
- **Derive the animal status from its candidates.** Rejected: availability is also affected by
  shelter decisions that have nothing to do with candidates, such as pausing a process or
  finishing preparation.

## Consequences

- Some operations legitimately move both machines in one transaction, which is one of the reasons
  domain mutations are atomic server-side operations.
- The animal timeline, not a status field, is where the combined story is read.

## Related documentation

- [Domain model — Animal states](../DOMAIN.md#animal-state-machine)
- [Domain model — Candidate states](../DOMAIN.md#candidate-state-machine)
- [ADR-006 — Enter IN_PROCESS at the first scheduled meeting](006-in-process-at-first-scheduled-meeting.md)
