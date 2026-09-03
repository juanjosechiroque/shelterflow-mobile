# ADR-010 — Persist SELECTED only inside atomic adoption confirmation

**Status:** Accepted; supersedes the earlier two-step selection interpretation
**Date:** 2026-08-31

## Context

An earlier interpretation let the shelter mark a candidate as selected and then create the
adoption as a second step. On a mobile device, the gap between those two steps can be interrupted
by a lost connection, a killed app, or a failed retry, leaving a selected candidate with no
adoption — a state the domain cannot explain or recover from.

## Decision

Before confirmation the candidate stays `DECISION_PENDING`; any selection on screen is temporary
form state. `confirm_adoption()` validates ownership and state, creates the `ACTIVE` adoption,
moves the accepted candidate `DECISION_PENDING → SELECTED`, moves the other nonterminal candidates
for that animal to `NOT_SELECTED`, moves the animal `IN_PROCESS → ADOPTED`, creates the configured
follow-ups, and records timeline history — all in one transaction. `DECISION_PENDING → SELECTED` is
excluded from ordinary candidate updates.

**Invariant:** a persisted `Candidate.status = SELECTED` always has exactly one corresponding
adoption, and every adoption references a `SELECTED` candidate.

## Alternatives considered

- **A sequence of client-orchestrated updates.** Rejected: mobile interruption, retries,
  concurrency, or network failure could leave partial domain state, and no client can hold a
  transaction across requests.
- **Persist `SELECTED` first and create the adoption later.** Rejected: it makes the invariant
  above unenforceable and requires a repair path for a state that should be impossible.

## Consequences

- The invariant is enforced by database triggers as well as by the operation, so no future write
  path can bypass it.
- The confirmation screen must treat selection as form state and disable itself while the single
  request is in flight.
- Any failure rolls back every change; the client handles one success or one failure.

## Related documentation

- [Domain model — Confirm adoption](../DOMAIN.md#confirm-adoption)
- [Domain model — Domain invariants](../DOMAIN.md#domain-invariants)
- [ADR-018 — Keep the mobile client read-only](018-client-read-only-atomic-mutations.md)
