# ADR-013 — Preserve history and restrict deletion

**Status:** Accepted
**Date:** 2026-08-31

## Context

The value a shelter gets from ShelterFlow accumulates over time: who was evaluated, what a meeting
concluded, why an adoption was returned. A destructive edit made on a phone, possibly by mistake,
would remove exactly the evidence the product exists to keep.

## Decision

The mobile application never hard-deletes adoptions, adoption returns, evaluations, completed
meetings, follow-ups, or timeline events. Animals, people, and candidates may be archived when the
domain invariants permit it — archiving an animal with an active adoption is forbidden.
User-entered content is preserved exactly as entered.

## Alternatives considered

- **Allow deletion with a confirmation dialog.** Rejected: a confirmation does not restore an
  adoption history, and the mobile context makes accidental destructive taps more likely.
- **Soft-delete everything uniformly, including historical records.** Rejected: it invites hiding
  inconvenient history and makes "preserved" a query-filter promise rather than a data guarantee.

## Consequences

- Corrections are additive: a new evaluation, a rescheduled meeting, a return record.
- Archiving is a visibility concern with invariant preconditions, not a delete.
- Removing test or fixture data is a database-level operation, not an application feature.

## Related documentation

- [Domain model — Domain invariants](../DOMAIN.md#domain-invariants)
- [Product definition — Preserve history](../PRODUCT.md#preserve-history)
