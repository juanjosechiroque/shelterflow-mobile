# ADR-025 — Separate canonical documentation from internal execution notes

**Status:** Accepted; supersedes the earlier "canonical documentation is README, DOMAIN, and ARCHITECTURE only" decision
**Date:** 2026-09-03

## Context

Several agents and sessions work on this repository, each starting without the previous session's
context. When product scope, domain rules, delivery status, and task instructions live in the same
documents, the same rule acquires several sources of truth and a stale planning note can silently
override a domain invariant.

An earlier decision kept `README.md`, `docs/DOMAIN.md`, and `docs/ARCHITECTURE.md` as the only
versioned documentation and placed product definition, decision log, and demo specification in the
Git-ignored `docs/internal/` directory. In practice that hid durable, non-sensitive contracts —
what the product is, why decisions were made, how security works — from the repository that agents
and reviewers actually read.

## Decision

Documentation is split by durability, not by audience:

**Canonical and versioned** — describes what is true about the product and the system:

| Document               | Answers                                            |
| ---------------------- | -------------------------------------------------- |
| `README.md`            | How to run the repository and where everything is  |
| `AGENTS.md`            | How agents must work in this repository            |
| `docs/PRODUCT.md`      | What we are building and what is out of scope      |
| `docs/DOMAIN.md`       | How the business works and what its invariants are |
| `docs/ARCHITECTURE.md` | How the system is built technically                |
| `docs/SECURITY.md`     | What the security model is                         |
| `docs/decisions/`      | Why significant decisions were made                |
| `docs/DEMO.md`         | What the product demonstration must show           |

**Internal and Git-ignored** — describes the state and mechanics of execution:
`docs/internal/ROADMAP.md`, `docs/internal/PHASE_PLAN.md`, `docs/internal/phases/`,
`docs/internal/tasks/`, `docs/internal/reviews/`, and `docs/internal/templates/`.

Precedence, highest first: canonical domain and product invariants; architecture and security;
accepted decisions; `AGENTS.md` for engineering process; a phase specification; a task
specification; a review. No internal document may silently redefine a canonical rule. When a review
or a task uncovers a durable rule, the canonical document is updated and the internal document
refers to it.

## Alternatives considered

- **Keep everything internal and Git-ignored.** Rejected: a public repository with no product,
  security, or decision documentation cannot be evaluated, and each agent session would have to
  rediscover the same constraints.
- **Publish everything, including delivery status.** Rejected: phase status, task prompts, and
  review findings change several times a day and would turn the repository history into a work
  journal.
- **One large document per area.** Rejected: a single decision log makes it impossible to reference
  one decision precisely, and a single plan document mixes "what we will build" with "where we are
  today".

## Consequences

- `.gitignore` keeps ignoring `/docs/internal/`; publishing a document means moving it out of that
  directory, not editing the ignore rules.
- `docs/internal/ROADMAP.md` owns intent and order; `docs/internal/PHASE_PLAN.md` owns current
  status. Neither restates the other.
- Reviews are temporary evidence, not a knowledge base.
- Public documentation must distinguish implemented behavior from planned and deferred work, and
  must never describe future behavior as existing.

## Related documentation

- [AGENTS.md](../../AGENTS.md)
- [README — Documentation](../../README.md#documentation)

## Appendix — traceability from the previous decision log

The records in [docs/decisions/](README.md) replace the single internal decision log (`docs/internal/DECISIONS.md`, entries
`D-001`–`D-027`). No decision was changed during the migration; several closely related entries were
merged into one record because they describe one trade-off.

| Previous     | Now                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| D-001        | [ADR-001](001-start-after-external-screening.md)                                                             |
| D-002, D-003 | [ADR-002](002-single-shelter-with-shelter-scoped-isolation.md)                                               |
| D-004        | [ADR-003](003-separate-actor-identity-from-data-ownership.md)                                                |
| D-005        | [ADR-004](004-separate-person-from-candidate.md)                                                             |
| D-006        | [ADR-005](005-separate-animal-and-candidate-state-machines.md)                                               |
| D-007        | [ADR-006](006-in-process-at-first-scheduled-meeting.md)                                                      |
| D-008, D-009 | [ADR-008](008-returned-belongs-to-adoption.md)                                                               |
| D-010, D-011 | [ADR-010](010-persist-selected-only-in-atomic-confirmation.md)                                               |
| D-012        | [ADR-007](007-adoption-as-independent-historical-entity.md)                                                  |
| D-013        | [ADR-011](011-multiple-meetings-with-reschedule-history.md)                                                  |
| D-014        | [ADR-012](012-configurable-followup-plan.md)                                                                 |
| D-015        | [ADR-013](013-preserve-history-and-restrict-deletion.md)                                                     |
| D-016        | [ADR-014](014-timeline-as-domain-projection.md)                                                              |
| D-017        | [ADR-020](020-separate-remote-state-from-ui-state.md), [ADR-022](022-expo-router-with-development-builds.md) |
| D-018, D-019 | [ADR-022](022-expo-router-with-development-builds.md)                                                        |
| D-020        | [ADR-015](015-spanish-first-and-no-automatic-translation.md)                                                 |
| D-021        | [ADR-024](024-test-throughout-delivery.md)                                                                   |
| D-022        | Superseded by [ADR-025](025-separate-canonical-documentation-from-execution-notes.md)                        |
| D-023        | [ADR-019](019-provision-users-and-shelters-externally.md)                                                    |
| D-024, D-026 | [ADR-023](023-fictitious-reproducible-fixtures.md)                                                           |
| D-025        | [ADR-009](009-return-cancels-only-pending-followups.md)                                                      |
| D-027        | [ADR-017](017-enforce-tenant-isolation-with-rls.md), [ADR-018](018-client-read-only-atomic-mutations.md)     |

[ADR-016](016-use-supabase-as-backend-platform.md) and
[ADR-021](021-keep-implementation-feature-local.md) had no entry in the previous log. They record
decisions the repository already depends on and were written retroactively from the implemented
state and from the deferred alternatives listed in [ARCHITECTURE.md](../ARCHITECTURE.md).
