# ADR-001 — Start the product after external screening

**Status:** Accepted
**Date:** 2026-08-31

## Context

Small shelters and independent rescuers already receive adoption interest through Instagram,
Facebook, WhatsApp, Google Forms, and informal conversations. Those channels also perform the
first, largely social filtering step. A product that tried to own acquisition would have to
compete with tools the shelter already uses and trusts.

## Decision

ShelterFlow begins after a shelter has decided that a person is worth tracking as a candidate for
a specific animal. External channels keep ownership of candidate acquisition and initial
screening.

## Alternatives considered

- **Own the intake form and the public application flow.** Rejected: it turns the product into a
  form builder and a public marketplace, both of which are explicitly out of V1 scope.
- **Import applications from Google Forms or the WhatsApp API.** Deferred to V2: it adds an
  external integration surface before the operational journey itself is credible.

## Consequences

- The first domain state of a candidate is `NEEDS_EVALUATION`, not "applied".
- `Person` stays minimal and must not grow into a CRM contact record.
- The product boundary is a stated product principle, not an implementation gap.

## Related documentation

- [Product definition](../PRODUCT.md)
- [ADR-004 — Separate Person from Candidate](004-separate-person-from-candidate.md)
