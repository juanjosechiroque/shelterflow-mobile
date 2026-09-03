# ADR-012 — Make the follow-up plan configurable

**Status:** Accepted
**Date:** 2026-08-31

## Context

Seven, thirty, and sixty days are a common post-adoption cadence, but shelters adapt it to the
animal, the distance to the adopter, and their own capacity.

## Decision

Follow-ups are first-class records created by adoption confirmation from a caller-provided plan.
Seven, thirty, and sixty days are user-interface defaults only. The plan must contain at least one
non-null, unique due date, and every due date must fall after the adoption date.

## Alternatives considered

- **Fixed 7/30/60 intervals in the domain.** Rejected: shelters would work around the tool rather
  than with it, and the intervals are not an invariant of adoption.
- **Date fields on the adoption row.** Rejected: a follow-up has an outcome, notes, a photo, a
  completion time, and a reschedule history, none of which fit in a date column.

## Consequences

- The follow-up plan is validated server-side, because an empty or duplicated plan would produce an
  adoption nobody follows up on.
- Changing the default intervals is a presentation change and requires no domain or database work.

## Related documentation

- [Domain model — FollowUp](../DOMAIN.md#followup)
- [Domain model — Confirm adoption](../DOMAIN.md#confirm-adoption)
