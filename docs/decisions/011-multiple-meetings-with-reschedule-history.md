# ADR-011 — Allow multiple meetings and preserve rescheduling history

**Status:** Accepted
**Date:** 2026-08-31

## Context

An adoption decision is usually based on more than one interaction: a phone interview, a
meet-and-greet, sometimes a home visit. Meetings are also rescheduled often, and the fact that a
candidate cancelled twice is itself relevant information.

## Decision

A candidate may have many meetings. Rescheduling marks the prior meeting `RESCHEDULED`, creates a
new meeting, and may link the replacement to its predecessor through
`rescheduled_from_meeting_id`. A candidate may have at most one `SCHEDULED` meeting at a time.

## Alternatives considered

- **One meeting field on the candidate.** Rejected: it overwrites history and cannot represent
  distinct meeting types.
- **A generic `Activity` entity covering calls, notes, and meetings.** Rejected: it is the CRM
  abstraction the product excludes, and it would make "a meaningful meeting happened" unqueryable.
- **Edit the meeting date in place when rescheduling.** Rejected: it silently erases the original
  commitment.

## Consequences

- The single-active-meeting rule needs a database guarantee, not only an application check,
  because two rapid submissions could otherwise both succeed.
- The candidate advances to `DECISION_PENDING` through an explicit shelter action, not
  automatically when a meeting is completed.

## Related documentation

- [Domain model — Meeting](../DOMAIN.md#meeting)
- [Architecture — Atomic domain operations](../ARCHITECTURE.md#atomic-domain-operations)
