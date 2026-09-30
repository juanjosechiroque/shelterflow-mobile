# ADR-021 — Keep implementation feature-local

**Status:** Accepted
**Date:** 2026-08-31

## Context

The obvious alternative to organizing by feature is organizing by layer, usually with a
clean-architecture skeleton of entities, use cases, gateways, and presenters created up front. At
this size that produces directories of indirection around one screen each, and it settles boundary
questions before the boundaries are known.

## Decision

Components, schemas, hooks, repositories, mappers, and tests live inside their feature directory
until sharing is actually demonstrated. Repositories and query layers are feature-local: the
animals feature owns its own read layer rather than consuming a shared data-access module. Shared
directories (`components/`, `hooks/`, `lib/`, `services/`, `types/`) exist for code that is already
used by more than one feature. Empty folders and speculative base classes are not architecture.

## Alternatives considered

- **A generic clean-architecture framework applied from the start.** Rejected: unnecessary before
  feature boundaries exist, and it forces every feature through abstractions that only one feature
  needs.
- **A single shared data-access layer for all entities.** Rejected: it couples unrelated features
  through one file and grows a generic query interface nobody owns.
- **A shared domain package outside the features.** Deferred: domain rules that must be shared are
  documented in [DOMAIN.md](../DOMAIN.md) and enforced in the database, which is where cross-feature
  agreement actually matters.

## Consequences

- Some mapping and query-key code is similar across features; that duplication is accepted until a
  concrete need justifies extracting it.
- Promoting code to a shared directory is a deliberate step with a stated reason.
- Domain invariants must be enforced outside React components — in the database and in server-side
  operations — precisely because the client code is deliberately unstructured by layer.

## Related documentation

- [Architecture — Source organization](../ARCHITECTURE.md#source-organization)
- [ADR-018 — Keep the mobile client read-only](018-client-read-only-atomic-mutations.md)
