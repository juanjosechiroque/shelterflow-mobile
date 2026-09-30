# ADR-016 — Use Supabase as the V1 backend platform

**Status:** Accepted (recorded retroactively)
**Date:** 2026-09-01

## Context

ShelterFlow needs authentication, a relational store with real constraints, per-tenant
authorization, transactional multi-record operations, and file storage — delivered by one
developer alongside a React Native application, and reproducible locally so the repository can be
cloned and run.

This ADR was written after the decision was already implemented. It records the reasoning the
repository supports rather than a contemporaneous evaluation.

## Decision

Supabase is the V1 backend: Supabase Auth for identity, PostgreSQL for the domain schema and its
constraints, Row Level Security for tenant isolation, `SECURITY DEFINER` PostgreSQL functions for
atomic domain mutations, and Supabase Storage for images. The backend is defined by versioned
migrations under `supabase/migrations/` and deterministic fixtures in `supabase/seed.sql`, so a
local stack is reproducible with a single reset.

## Alternatives considered

- **A custom server-side API (for example Node or NestJS) in front of PostgreSQL.** It would give
  full control over the request surface, but it adds a service to build, host, secure, and keep in
  sync with the schema — for authorization and transactional guarantees PostgreSQL can already
  enforce.
- **A document backend such as Firebase.** The domain depends on multi-row invariants (one active
  adoption per animal, a selected candidate implies an adoption, cross-shelter referential
  integrity) that relational constraints and transactions express directly and a document store
  does not.
- **Client-only persistence.** Ruled out by the need for shelter data isolation and by follow-up
  reminders that must survive a reinstall.

## Consequences

- The authorization boundary lives in the database, which makes RLS and RPC ownership checks the
  primary security controls (see [ADR-017](017-enforce-tenant-isolation-with-rls.md) and
  [ADR-018](018-client-read-only-atomic-mutations.md)).
- No production table may depend on manual dashboard setup; every schema change is a migration.
- The hosted development project is a separate environment from the local stack and is updated by
  applying the same migrations.
- Migrating away from Supabase would mean replacing Auth and re-homing the RPCs, not rewriting the
  domain schema.

## Related documentation

- [Architecture — Backend and data boundaries](../ARCHITECTURE.md#backend-and-data-boundaries)
- [Security model](../SECURITY.md)
