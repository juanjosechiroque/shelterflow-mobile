# ADR-003 — Keep actor identity separate from data ownership

**Status:** Accepted
**Date:** 2026-08-31

## Context

A single authenticated user creates almost every record in V1, which makes it tempting to treat
the creating user as the owner of the data. That shortcut breaks as soon as a shelter has a second
user, and it makes the authorization boundary depend on record history.

## Decision

`shelter_id` represents ownership and is the authorization boundary. `user_id` represents the
acting person and may be recorded for attribution in fields such as `created_by_user_id`.

## Alternatives considered

- **Use the creating `user_id` as the ownership key.** Rejected: records would become personally
  owned, a second shelter user could not read them, and authorization would depend on who
  happened to type first.
- **Store no actor at all.** Rejected: evaluations and returns are judgement calls, and knowing
  who recorded them is part of their historical value.

## Consequences

- An animal belongs to a shelter, never to the user who created it.
- Cross-shelter relationships are invalid even when every referenced row exists.
- Server-side domain operations derive both values from the session and never accept them from the
  client.

## Related documentation

- [Domain model — Ownership and actor identity](../DOMAIN.md#ownership-and-actor-identity)
- [Security model — Domain mutation security](../SECURITY.md#domain-mutation-security)
