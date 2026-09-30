# ADR-007 — Model Adoption as an independent historical entity

**Status:** Accepted
**Date:** 2026-08-31

## Context

Selection is not merely a label on a candidate. An adoption has its own date, handover
information, photo, follow-up plan, and possible return. An animal may be adopted, returned, and
adopted again by a different person.

## Decision

`Adoption` is an independent entity linking exactly one animal and one selected candidate. Its
only V1 states are `ACTIVE` and `RETURNED`. There is no `CLOSED` state: completion of every
follow-up is derived from the follow-up records and does not change the validity of an active
adoption.

## Alternatives considered

- **Store adoption data as fields on the animal or the candidate.** Rejected: a second adoption
  after a return would overwrite the previous adopter and journey.
- **Add a `CLOSED` state once all follow-ups finish.** Rejected: it duplicates information already
  derivable from the follow-ups, and it introduces a transition with no operational meaning — a
  shelter never stops being responsible for an adoption record.

## Consequences

- An animal may have several adoptions over time but at most one `ACTIVE` adoption.
- A candidate has at most one adoption over its lifetime, including after a return.
- "All follow-ups completed" is a derived presentation concern, not a stored status.

## Related documentation

- [Domain model — Adoption](../DOMAIN.md#adoption)
- [ADR-008 — Record RETURNED on the adoption](008-returned-belongs-to-adoption.md)
