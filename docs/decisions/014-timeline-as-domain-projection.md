# ADR-014 — Use TimelineEvent as a domain projection, not an audit platform

**Status:** Accepted
**Date:** 2026-08-31

## Context

Reconstructing an animal's story by joining evaluations, meetings, adoptions, follow-ups, and
returns is expensive to query and awkward to present. A generic audit log would solve the query
problem but would also become a second, uncontrolled copy of every domain record — including
private notes and contact details.

## Decision

Important domain operations create animal-centered `TimelineEvent` rows with a closed set of event
types and display-safe workflow metadata only. Private notes, contact details, and other
personally identifying data stay on their domain records. Security auditing and diagnostic logging
are separate systems that ShelterFlow does not implement through the timeline.

## Alternatives considered

- **A generic, free-form audit table written by triggers.** Rejected: an open payload becomes a
  duplicate of sensitive data with weaker access review, and event types could not be relied on
  by the UI.
- **No timeline; derive the history from joins at read time.** Rejected: the animal history is a
  primary screen, and the join grows with every new domain entity.

## Consequences

- Every operation that writes a timeline event is responsible for keeping the payload display-safe.
- New event types are added deliberately with the operation that emits them.
- A database test asserts that private notes do not reach timeline payloads.

## Related documentation

- [Domain model — TimelineEvent](../DOMAIN.md#timelineevent)
- [Security model — Sensitive data](../SECURITY.md#sensitive-data)
