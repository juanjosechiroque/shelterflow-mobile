# ADR-004 — Separate Person from Candidate

**Status:** Accepted
**Date:** 2026-08-31

## Context

The same person often shows interest in more than one animal, sometimes months apart. Their
contact details should not be retyped, but their adoption process for one animal must not be
confused with their process for another.

## Decision

`Person` stores minimal reusable identity and contact data. `Candidate` represents one person's
adoption process for one animal. One person may therefore be a candidate for several animals
without duplicating contact data.

## Alternatives considered

- **A single `Candidate` record carrying contact fields.** Rejected: the same phone number and
  email would be duplicated per animal and would drift out of sync.
- **A generic CRM `Contact` entity with pipelines and custom fields.** Rejected: it conflicts with
  the animal-centered product model and reintroduces the CRM scope the product excludes.

## Consequences

- Candidate state describes a process, not a person.
- `Person` must stay intentionally smaller than a CRM contact model.
- Archiving rules apply separately to a person and to their candidate processes.

## Related documentation

- [Domain model — Person and Candidate](../DOMAIN.md#person-and-candidate)
- [ADR-001 — Start the product after external screening](001-start-after-external-screening.md)
