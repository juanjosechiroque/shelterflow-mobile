# ADR-017 — Enforce tenant isolation with Row Level Security

**Status:** Accepted
**Date:** 2026-09-01

## Context

Every shelter's data lives in the same tables. The mobile client talks to the database through the
Supabase Data API, so any filter the client applies is a request, not a guarantee: an attacker with
a valid session and a record identifier could otherwise read another shelter's rows.

## Decision

Row Level Security is enabled and forced on every public domain table. The `authenticated` role
receives `SELECT` only; all privileges are revoked from `anon` and from the default privileges of
the Data API roles. Each policy compares the row's `shelter_id` with the authenticated user's
shelter, resolved by the single-purpose `SECURITY DEFINER` helper `public.auth_shelter_id()`;
`profiles` is restricted to the caller's own row. Client-side filtering is never authorization.

## Alternatives considered

- **Filter by `shelter_id` in application queries only.** Rejected: a forgotten filter or a
  crafted request is a full cross-tenant read, and there is no place to prove the boundary once.
- **Route every read through server-side functions.** Rejected for reads: it duplicates
  PostgREST's filtering, paging, and shaping for no additional guarantee, and RLS already applies
  to those reads.
- **Join `profiles` inline in every policy expression.** Rejected: the profile lookup is itself
  subject to RLS and produces recursive policy evaluation; a dedicated `SECURITY DEFINER` helper
  resolves the shelter once.

## Consequences

- `public.auth_shelter_id()` bypasses RLS by design and must stay single-purpose, with `search_path`
  pinned and no privileges granted to `public` or `anon`.
- The fixture set defines two shelters so isolation can be exercised by hand. The pgTAP and
  real-session tests that previously asserted the boundary were removed
  ([ADR-026](026-remove-local-supabase-test-stack.md)); policy changes are now verified by review.
- Any new domain table is insecure until it enables RLS, forces it, and adds its policy.

## Related documentation

- [Security model — Tenant isolation](../SECURITY.md#tenant-isolation)
- [Architecture — Authorization](../ARCHITECTURE.md#authorization)
- [ADR-002 — Single-shelter experience with shelter-scoped isolation](002-single-shelter-with-shelter-scoped-isolation.md)
- [ADR-026 — Remove the local Supabase test stack and its Docker dependency](026-remove-local-supabase-test-stack.md)
