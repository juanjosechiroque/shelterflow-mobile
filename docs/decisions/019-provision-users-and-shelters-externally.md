# ADR-019 — Provision users and shelters externally

**Status:** Accepted
**Date:** 2026-09-01

## Context

A self-service signup flow would have to create an auth user, a shelter, and a profile, decide who
may create a shelter, and handle abandoned or duplicated organizations — before the product has a
single shelter using it.

## Decision

There is no self-service registration and no shelter creation in the mobile application. Product
owners provision shelters, auth users, and profiles directly. V1 authentication covers email and
password sign-in, session restoration, and logout only. Password resets and every other login
method are managed outside the application.

## Alternatives considered

- **Self-service signup with shelter creation.** Rejected for V1: it is the largest source of
  authorization edge cases in a tenant-scoped product and serves no current user.
- **Invitation-based onboarding.** Deferred with multi-user shelters; see
  [ADR-002](002-single-shelter-with-shelter-scoped-isolation.md).

## Consequences

- A `create_shelter_account()` operation is deliberately absent from the domain and architecture
  documents.
- A user without a profile row has no shelter, and every domain operation must reject that case
  explicitly rather than assuming a shelter exists.
- Local and hosted development environments need fixtures that create the accounts a reviewer signs
  in with.

## Related documentation

- [Security model — Authentication](../SECURITY.md#authentication)
- [Architecture — Authentication](../ARCHITECTURE.md#authentication)
- [ADR-023 — Model local fixtures as clearly fictitious and reproducible](023-fictitious-reproducible-fixtures.md)
