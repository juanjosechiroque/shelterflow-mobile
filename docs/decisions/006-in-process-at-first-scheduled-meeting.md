# ADR-006 — Enter IN_PROCESS at the first scheduled meeting

**Status:** Accepted
**Date:** 2026-08-31

## Context

A shortlisted candidate does not mean the shelter is actively progressing toward an adoption
decision. Shelters routinely hold several early-stage candidates for an animal that is still
openly available.

## Decision

An animal stays `READY` while its candidates are only in early stages. It moves to `IN_PROCESS`
when the first candidate reaches `MEETING_SCHEDULED`. It can return to `READY` when no viable
candidate remains in `MEETING_SCHEDULED` or `DECISION_PENDING`.

## Alternatives considered

- **Move to `IN_PROCESS` when the first candidate is created.** Rejected: an animal with one
  unevaluated candidate would look unavailable, which discourages further interest.
- **Move to `IN_PROCESS` only at `DECISION_PENDING`.** Rejected: by then the shelter has already
  invested a meeting, and other candidates should be able to see the process is advancing.

## Consequences

- `schedule_meeting()` is the operation that may move the animal `READY → IN_PROCESS`.
- The definition of "advanced active stage" is a domain rule with exactly two members, and both
  the animal transition table and the operation contract must agree on it.

## Related documentation

- [Domain model — Allowed animal transitions](../DOMAIN.md#animal-state-machine)
- [Domain model — Schedule meeting](../DOMAIN.md#candidate-workflow-operations)
