# ADR-018 — Keep the mobile client read-only and mutate the domain through atomic PostgreSQL operations

**Status:** Accepted
**Date:** 2026-09-01

## Context

Almost every meaningful ShelterFlow transition touches several rows at once: a candidate status, an
animal status, a new record, and a timeline event. A mobile client cannot hold a transaction across
requests, and it can be interrupted at any point by a lost connection or a terminated process.
Granting the client table-level write access would also make every invariant a client-side
promise.

## Decision

The mobile client has no `INSERT`, `UPDATE`, or `DELETE` privilege on any domain table. Every
workflow transition that touches more than one row, a status, or timeline history runs as a
`SECURITY DEFINER` PostgreSQL function that derives `shelter_id` from the authenticated profile,
validates shelter ownership of every referenced row, validates its preconditions inside the same
transaction that performs the change, locks the rows it mutates, writes its own timeline event with
display-safe metadata, and rolls back completely on any failure.

The client makes one request and handles one success or one failure. It must never orchestrate a
sequence of independent updates.

## Alternatives considered

- **Grant scoped table writes and orchestrate the sequence in the client.** Rejected: partial
  state after an interruption, no server-side precondition check, and no way to enforce
  multi-row invariants.
- **Enforce transitions with database triggers only.** Rejected: triggers cannot express the
  preconditions of an operation as a whole (which rows to lock, in which order, and what to reject)
  and produce error messages the client cannot act on. Triggers are used to back the invariants,
  not to drive the workflow.
- **Put the transaction in a separate application server.** Rejected as unnecessary: the
  transaction, the ownership check, and the data are already in one place. See
  [ADR-016](016-use-supabase-as-backend-platform.md).

## Consequences

- Adding a workflow transition means adding a reviewed migration, not a client mutation.
- Operations that can race must agree on a lock order; `complete_followup()` and
  `return_adoption()` both lock the adoption row first.
- Concurrency guarantees that a lock cannot express are backed by constraints, such as the partial
  unique index preventing two scheduled meetings for one candidate.
- Client-side validation exists for user experience only and is never the enforcement point.

## Related documentation

- [Domain model — Atomic domain operations](../DOMAIN.md#atomic-domain-operations)
- [Architecture — Atomic domain operations](../ARCHITECTURE.md#atomic-domain-operations)
- [Security model — Database access model](../SECURITY.md#database-access-model)
