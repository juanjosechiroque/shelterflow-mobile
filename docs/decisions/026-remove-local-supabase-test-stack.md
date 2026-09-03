# ADR-026 — Remove the local Supabase test stack and its Docker dependency

**Status:** Accepted
**Date:** 2026-09-03

## Context

Local development and part of the test suite depended on the Supabase CLI's local stack, which runs
Postgres, GoTrue, PostgREST, and Storage as Docker containers. Docker was a required tool for
contributors, and the database-level checks — the pgTAP suite in `supabase/tests/database/`, the
`scripts/supabase-rls-test.mjs` real-session RLS script, and a Storage isolation script — only ran
against that stack. `npm test` and CI never used it.

The Docker requirement is heavy for a project whose day-to-day work is the mobile client, and the
database tests were the only thing forcing it. A linked hosted development project already exists
and can serve as the sole backend for local development; migrations apply to it with
`supabase db push`, which needs no local stack.

## Decision

Remove the local Supabase stack from development and testing entirely.

- Delete `supabase/tests/database/` (pgTAP) and the `scripts/` integration scripts.
- Remove the `supabase:start` / `supabase:stop` / `supabase:status` / `supabase:reset` /
  `supabase:test*` npm scripts. Keep `supabase:push` (`supabase db push`) and `supabase:types`
  (`supabase gen types --linked`), which act on the linked hosted project.
- Local development points `EXPO_PUBLIC_SUPABASE_*` at the linked hosted development project.
- Keep `supabase/migrations/` unchanged and `supabase/seed.sql` as the reference fixture
  definition; `supabase/hosted-dev-seed.sql` stays the manually run loader for the hosted project.
- Automated tests are Jest only. Supabase responses are covered by faking the client in repository
  tests (the pattern already in `__tests__/persisted-repositories.test.ts`).

## Alternatives considered

- **Keep the pgTAP suite and run it against a non-Docker Postgres** (native install or an ephemeral
  hosted project). Rejected: it re-adds infrastructure and credentials to CI for the coverage this
  decision is accepting the loss of; it does not simplify anything.
- **Keep a subset of the SQL tests as manual, opt-in files.** Rejected for now in favor of a clean
  removal; the migrations remain the source of truth and can be re-tested later if the need returns.
- **Port the isolation intent to Jest.** A fake client can only assert that a repository builds the
  expected query and handles the error path, not that Postgres enforces the boundary, so it is not
  an equivalent replacement. Repository tests still do this for query shape.

## Consequences

- Docker is no longer a contributor requirement. The full local check is
  `typecheck` + `lint` + `format:check` + `npm test`, none of which need a database.
- There is no automated proof that RLS blocks cross-shelter access, that `CHECK` / foreign-key
  constraints reject invalid data, or that the atomic operations roll back. Changes to policies,
  constraints, grants, and `SECURITY DEFINER` functions are verified by review and, where needed,
  by hand against the hosted project. [SECURITY.md](../SECURITY.md) reflects this reduced coverage.
- Migrations are no longer exercised against a disposable local database before reaching the hosted
  project. A separate hosted staging project or Supabase branching is the mitigation if migration
  risk grows.
- This narrows the testing approach in [ADR-024](024-test-throughout-delivery.md): "database and
  RLS tests for persistence and authorization" no longer applies.
- [ADR-023](023-fictitious-reproducible-fixtures.md) still describes the two-shelter fixture set,
  now used for the hosted development project rather than a local reset.

## Related documentation

- [Architecture — Testing strategy](../ARCHITECTURE.md#testing-strategy)
- [Architecture — Environments and delivery](../ARCHITECTURE.md#environments-and-delivery)
- [Security model — Tenant isolation](../SECURITY.md#tenant-isolation)
- [ADR-016 — Use Supabase as the V1 backend platform](016-use-supabase-as-backend-platform.md)
- [ADR-017 — Enforce tenant isolation with Row Level Security](017-enforce-tenant-isolation-with-rls.md)
- [ADR-024 — Test throughout delivery](024-test-throughout-delivery.md)
