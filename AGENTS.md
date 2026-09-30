# ShelterFlow Engineering Rules

How agents and contributors work in this repository. This document owns **process**. It does not
define product scope, domain rules, architecture, or the security model — it points to the
documents that do.

## Documentation hierarchy

| Document                                     | Owns                                                               |
| -------------------------------------------- | ------------------------------------------------------------------ |
| [docs/PRODUCT.md](docs/PRODUCT.md)           | What we build and what is out of scope                             |
| [docs/DOMAIN.md](docs/DOMAIN.md)             | Entities, states, transitions, preconditions, invariants           |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system is built                                            |
| [docs/SECURITY.md](docs/SECURITY.md)         | Authentication, authorization, isolation, threat model             |
| [docs/decisions/](docs/decisions/README.md)  | Why significant decisions were made                                |
| `AGENTS.md`                                  | How to work here                                                   |
| `docs/internal/`                             | Roadmap, current status, phase plans, tasks, reviews (Git-ignored) |

Precedence, highest first: canonical product and domain invariants; architecture and security;
accepted decisions; this file; a phase specification; a task specification; a review.

No document lower in that list may redefine a rule from a higher one. If an instruction you were
given conflicts with a canonical document, stop and report the conflict instead of resolving it
silently.

## Context — read what the task needs, not everything

Reading every canonical document before every task costs more context than most tasks are worth.
Read the row that matches what you are touching. When a task spans rows, take the union.

| You are touching                              | Read                                                                                                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A screen, form, navigation, or i18n string    | [ARCHITECTURE](docs/ARCHITECTURE.md) §state-ownership, §source-organization                                                                                                                                                                       |
| A persisted read (query, repository, mapper)  | the above + [DOMAIN](docs/DOMAIN.md) §for that entity + [ADR-021](docs/decisions/021-keep-implementation-feature-local.md)                                                                                                                        |
| A migration or a workflow RPC                 | [DOMAIN](docs/DOMAIN.md) §atomic-domain-operations + [ARCHITECTURE](docs/ARCHITECTURE.md) §atomic-domain-operations + [SECURITY](docs/SECURITY.md) §domain-mutation-security + [ADR-018](docs/decisions/018-client-read-only-atomic-mutations.md) |
| Auth, RLS, policies, grants, or Storage rules | [SECURITY](docs/SECURITY.md) in full + [ADR-017](docs/decisions/017-enforce-tenant-isolation-with-rls.md)                                                                                                                                         |
| A domain state, transition, or invariant      | [DOMAIN](docs/DOMAIN.md) in full + the ADR it cites                                                                                                                                                                                               |
| Product scope — is this in or out?            | [PRODUCT](docs/PRODUCT.md) §v1-capabilities, §deliberate-exclusions                                                                                                                                                                               |
| Setup, scripts, or environments               | [README](README.md)                                                                                                                                                                                                                               |

Always, regardless of the row:

- Before proposing a different technical approach, check
  [docs/decisions/](docs/decisions/README.md). Most architectural alternatives have already been
  considered and rejected there, with the reason.
- If a canonical document contradicts what you were asked to do, stop and report the conflict
  rather than resolving it silently.
- Use Expo SDK 57 documentation: <https://docs.expo.dev/versions/v57.0.0/>.

## Workflow

- Work on `main`, one explicitly requested vertical slice at a time.
- Do not commit or stage files; the user validates, stages, and commits.
- Keep changes small and reviewable. When ready, report checks, manual validation, and a tentative
  English commit message.
- Keep each request bounded and independently testable. Use one fresh implementation chat per
  request; do not ask an agent to complete a broad scope in one pass.
- Before an unfamiliar integration, resolve its technical constraints in a short preflight or
  research step. Do not combine open-ended discovery with a large implementation request.
- If the same external or tooling blocker remains after two focused attempts, stop and report the
  command, relevant output, changed files, and current hypothesis. Do not spend an unbounded turn
  repeatedly investigating it.

## Guardrails

- Do not build unrequested functionality or add a dependency without explaining why.
- Do not add generic CRM, veterinary, medication, volunteer, donation, accounting, or inventory
  features — see the exclusions in [docs/PRODUCT.md](docs/PRODUCT.md#deliberate-exclusions).
- Enforce domain invariants outside React Native components. The invariants themselves are in
  [docs/DOMAIN.md](docs/DOMAIN.md#domain-invariants); when they change, update that document in the
  same change.
- Multi-record operations are atomic server-side. Never grant the client table writes, bypass RLS,
  or ship a service-role key — see
  [docs/SECURITY.md](docs/SECURITY.md#database-access-model).
- Prefer feature-local code; add shared or global state only for a concrete need, and use TanStack
  Query for server state.
- Do not disable TypeScript, linting, or tests to pass checks.

## UI and data

- Spanish is the default UI language and English is supported. Put every UI string in both locale
  resources; do not translate user-entered content.
- Use pressable native controls with clear pressed or disabled states. Support scrolling, safe
  areas, and keyboard access where content can overflow.
- Demo data must be clearly fictitious: never use real personal data, and use `example.com` for
  sample email addresses, except the explicitly documented local authentication fixtures.

## Documentation and validation

- Keep repository documentation, identifiers, comments, and commit messages in English.
- Update canonical documentation when behavior, architecture, or a domain contract changes. Update
  `docs/internal/PHASE_PLAN.md` for delivery status only. A durable rule discovered in a task or a
  review belongs in its canonical document, not in the internal note.
- When writing an implementation prompt or reporting validation, use concise commands:
  `npm --silent run typecheck`, `npm --silent run lint`, `npm --silent run format:check`,
  `npm test -- --silent`, and `git diff --check`. Report only each command's final status and
  actionable failure output. Do not use test flags that mask lifecycle failures, such as
  `--forceExit`.
- Run focused checks during implementation and the full suite only before declaring work ready:

  ```bash
  npm --silent run typecheck
  npm --silent run lint
  npm --silent run format:check
  npm test -- --silent
  git diff --check
  ```

- The backend is the linked hosted Supabase project; there is no local stack or Docker
  ([ADR-026](docs/decisions/026-remove-local-supabase-test-stack.md)). Apply migrations with
  `npm run supabase:push` and regenerate types with `npm run supabase:types`, both against the
  linked project. Never reintroduce a `supabase start` / `supabase db reset` workflow.
- Match tests to the trust boundary: unit tests for pure logic, component tests for UI behavior,
  and repository tests that fake the Supabase client for query shape and error handling. Database
  and RLS correctness is not covered by automated tests; verify policy, constraint, and function
  changes by review. Do not duplicate the same assertion across all layers without a concrete
  reason.
- Describe remaining manual checks. For significant technical decisions, explain the choice,
  alternatives, implications, and failure scenarios — and if the decision outlives the task, record
  it as an [ADR](docs/decisions/README.md).
