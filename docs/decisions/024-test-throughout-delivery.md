# ADR-024 — Test throughout delivery

**Status:** Accepted
**Date:** 2026-08-31

## Context

A dedicated testing phase at the end of a roadmap tends to become the phase where testing starts,
which means every earlier phase was validated only by hand and every regression is discovered late.

## Decision

Each delivery increment adds tests at the level that matches its trust boundary: unit tests for
transition rules and pure logic, component tests for forms and visible interaction behavior, and
repository tests that fake the Supabase client for query shape and error handling. The later
Testing Hardening phase reviews gaps rather than introducing testing for the first time.

Database-level and RLS tests were part of this approach until the local Supabase / Docker tooling
was removed ([ADR-026](026-remove-local-supabase-test-stack.md)). Persistence and authorization
correctness now rests on the migrations and on review.

## Alternatives considered

- **A single testing phase after feature delivery.** Rejected: it defers all regression discovery
  and leaves earlier phases unverifiable.
- **Full end-to-end coverage from the start.** Rejected: disproportionate cost and slow feedback
  for a product whose critical guarantees are enforced in the database by forced RLS and
  constraints.

## Consequences

- The same assertion is not duplicated across every layer without a concrete reason.
- Structural regressions that a normal test cannot catch are covered by dedicated guard tests.
- Type checking, linting, formatting, and tests must never be disabled to make a change pass.

## Related documentation

- [Architecture — Testing strategy](../ARCHITECTURE.md#testing-strategy)
- [AGENTS.md — Documentation and validation](../../AGENTS.md)
- [ADR-026 — Remove the local Supabase test stack and its Docker dependency](026-remove-local-supabase-test-stack.md)
