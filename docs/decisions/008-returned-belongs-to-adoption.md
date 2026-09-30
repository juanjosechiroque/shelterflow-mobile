# ADR-008 — Record RETURNED on the adoption and represent returns explicitly

**Status:** Accepted; supersedes the original draft animal flow
**Date:** 2026-08-31

## Context

An early draft treated `RETURNED` as an animal status. That conflates the outcome of one specific
adoption with the animal's current operational condition, and it leaves no place for the return's
date, reason, and author.

## Decision

Returning an adoption atomically performs:

```text
Adoption: ACTIVE → RETURNED
Animal:   ADOPTED → REEVALUATION
```

The animal never has `status = RETURNED`. Each returned adoption has exactly one
`AdoptionReturn` record containing the time, reason, notes, shelter, and actor attribution.
`REEVALUATION → READY` always requires an explicit human review.

## Alternatives considered

- **`Animal.status = RETURNED`.** Rejected: the animal is not "returned", it is back at the
  shelter and needs reassessment. The state would also be ambiguous after a second adoption.
- **Store the return reason in the adoption's or animal's notes.** Rejected: return details are
  historical domain data with their own author and timestamp, and mutable notes lose them.
- **Return the animal directly to `READY`.** Rejected: readiness after a return is a judgement
  call that must not be implied by the return itself.

## Consequences

- `return_adoption()` is the only operation that produces `REEVALUATION`.
- A separate explicit operation (`complete_reevaluation()`) leaves `REEVALUATION`.
- The previous adopter, adoption, follow-ups, and timeline stay permanently readable.

## Related documentation

- [Domain model — AdoptionReturn](../DOMAIN.md#adoptionreturn)
- [Domain model — Return adoption](../DOMAIN.md#return-adoption)
- [ADR-009 — Cancel only pending follow-ups when an adoption is returned](009-return-cancels-only-pending-followups.md)
