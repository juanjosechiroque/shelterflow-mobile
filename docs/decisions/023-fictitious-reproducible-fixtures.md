# ADR-023 — Model local fixtures as clearly fictitious and reproducible

**Status:** Accepted
**Date:** 2026-09-01

## Context

The repository is public and reviewable. Development and any by-hand check of the shelter boundary
need predictable data, and a tenant-scoped product cannot exercise isolation with a single shelter.

## Decision

Fixture data uses only invented names and `example.com` email addresses and is deterministic.
`supabase/seed.sql` is the reference definition and describes two shelters: one login-capable
administrator for the primary demo shelter, and a second fictitious user in another shelter that
exists so the cross-shelter boundary can be exercised. Any credentials shown are local development
values and are not used in any other environment. The linked hosted development project has its own
separate, manually run fixture loader (`hosted-dev-seed.sql`) that creates no users, shelters, or
credentials.

## Alternatives considered

- **Anonymized real shelter data.** Rejected: anonymization is easy to get wrong and the
  repository is public.
- **A single shelter fixture.** Rejected: cross-shelter denial cannot be exercised without a second
  tenant.
- **Randomly generated fixtures.** Rejected: predictable shapes and counts make the fixture set
  usable as a reference and easy to check by hand.

## Consequences

- Documented local fixture credentials are the one deliberate exception to the rule that
  credentials never appear in the repository, and they must be described as local-only wherever
  they are published.
- Demo contacts must never represent real people.
- With the local stack removed ([ADR-026](026-remove-local-supabase-test-stack.md)), the fixture
  set is applied to the hosted development project through `hosted-dev-seed.sql` rather than by a
  local reset. `seed.sql` is kept as the canonical description of that data.

## Related documentation

- [Security model — Secrets](../SECURITY.md#secrets)
- [Demo specification](../DEMO.md)
- [ADR-019 — Provision users and shelters externally](019-provision-users-and-shelters-externally.md)
- [ADR-026 — Remove the local Supabase test stack and its Docker dependency](026-remove-local-supabase-test-stack.md)
