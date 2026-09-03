# ADR-023 — Model local fixtures as clearly fictitious and reproducible

**Status:** Accepted
**Date:** 2026-09-01

## Context

The repository is public and reviewable. Development, database tests, and the shelter-isolation
tests all need predictable data, and a tenant-scoped product cannot prove isolation with a single
shelter.

## Decision

Fixture data uses only invented names and `example.com` email addresses, is deterministic, and is
reapplied by a database reset. Local fixtures provision two shelters: one login-capable
administrator for the primary demo shelter, and a second fictitious user in another shelter used
solely to prove RLS isolation in automated tests. All credentials in fixtures are local
development values and are not used in any other environment. The hosted development project has
its own separate, manually run fixture loader that creates no users, shelters, or credentials.

## Alternatives considered

- **Anonymized real shelter data.** Rejected: anonymization is easy to get wrong and the
  repository is public.
- **A single shelter fixture.** Rejected: cross-shelter denial cannot be tested without a second
  tenant.
- **Randomly generated fixtures.** Rejected: database tests assert on shape and counts, which
  requires determinism.

## Consequences

- Documented local fixture credentials are the one deliberate exception to the rule that
  credentials never appear in the repository, and they must be described as local-only wherever
  they are published.
- Demo contacts must never represent real people.
- A reset is the supported way to return the local stack to a known state, and it is run only when
  migrations or seeds change or reproducibility is being verified.

## Related documentation

- [Security model — Secrets](../SECURITY.md#secrets)
- [Demo specification](../DEMO.md)
- [ADR-019 — Provision users and shelters externally](019-provision-users-and-shelters-externally.md)
