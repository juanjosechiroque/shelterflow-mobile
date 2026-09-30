# ADR-002 — Model a single-shelter experience with shelter-scoped isolation

**Status:** Accepted
**Date:** 2026-08-31

## Context

The product serves one small shelter or one independent rescuer at a time, and V1 has a single
functional user type: the shelter administrator or adoption manager. The data, however, must be
protected as if several shelters shared the same database, because they do.

## Decision

The V1 user experience represents exactly one shelter. There is no shelter switcher, billing,
plan, invitation system, or organization administration. Internally, every principal domain row
carries `shelter_id`, and authorization derives the current shelter from the authenticated
profile. `profiles.id` matches `auth.users.id` and `profiles.shelter_id` identifies the user's one
shelter.

ShelterFlow is described as a single-shelter mobile application with shelter-scoped data
isolation, not as a multi-tenant SaaS product.

## Alternatives considered

- **A many-to-many `shelter_members` table with a role column.** Rejected for V1: there is one
  functional role and no joining, invitation, or switching workflow, so the abstraction would be
  unused complexity that still has to be secured and tested.
- **No tenancy at all (one database per shelter, or a single implicit shelter).** Rejected: it
  removes the ability to demonstrate a credible authorization boundary and would require a
  migration before any second shelter, including test fixtures.

## Consequences

- Two shelters must exist in local fixtures so isolation can be tested.
- Adding multi-shelter membership, roles, or invitations is a V2 product decision, not a
  refactor.
- Every relationship between domain rows must stay inside one `shelter_id`.

## Related documentation

- [Domain model — Ownership and actor identity](../DOMAIN.md#ownership-and-actor-identity)
- [Security model — Tenant isolation](../SECURITY.md#tenant-isolation)
- [ADR-017 — Enforce tenant isolation with Row Level Security](017-enforce-tenant-isolation-with-rls.md)
