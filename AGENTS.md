# ShelterFlow Engineering Rules

## Workflow

- Work on `main`, one explicitly requested vertical slice at a time.
- Do not commit or stage files; the user validates, stages, and commits.
- Keep changes small and reviewable. When ready, report checks, manual validation, and a tentative English commit message.
- Keep each request bounded and independently testable. Use one fresh implementation chat for each such request; do not ask an agent to complete a broad scope in one pass.
- Before an unfamiliar integration, resolve its technical constraints in a short preflight or research step. Do not combine open-ended discovery with a large implementation request.
- If the same external or tooling blocker remains after two focused attempts, stop and report the command, relevant output, changed files, and current hypothesis. Do not spend an unbounded turn repeatedly investigating it.

## Context

- Before business work, read `README.md`, `docs/DOMAIN.md`, and `docs/ARCHITECTURE.md`.
- Use Expo SDK 57 documentation: <https://docs.expo.dev/versions/v57.0.0/>.

## Guardrails

- Do not build unrequested functionality or add a dependency without explaining why.
- Do not add generic CRM, veterinary, medication, volunteer, donation, accounting, or inventory features.
- Update `docs/DOMAIN.md` when domain states change; enforce invariants outside React Native components.
- When persistence exists, multi-record operations must be atomic server-side; never bypass RLS or ship a service-role key.
- Keep `shelter_id` distinct from `user_id`; a persisted `SELECTED` candidate requires an adoption.
- Prefer feature-local code; add shared or global state only for a concrete need, and use TanStack Query for server state.
- Do not disable TypeScript, linting, or tests to pass checks.

## UI and data

- Spanish is the default UI language and English is supported. Put every UI string in both locale resources; do not translate user-entered content.
- Use pressable native controls with clear pressed or disabled states. Support scrolling, safe areas, and keyboard access where content can overflow.
- Demo data must be clearly fictitious: never use real personal data and use `example.com` for sample email addresses, except explicitly documented local authentication fixtures.

## Documentation and validation

- Keep repository documentation, identifiers, comments, and commit messages in English. Update public docs only for behavior, architecture, or domain-contract changes; update the local delivery plan only for delivery status.
- Before presenting work as ready, run:

  ```bash
  npm run typecheck
  npm run lint
  npm run format:check
  npm test
  git diff --check
  ```

- During implementation, run the smallest relevant test or check first; reserve the full validation suite for the end of the requested work. Run `supabase db reset` only when migrations or seed data change, or when explicitly verifying reproducibility.
- Match tests to the trust boundary: component tests for UI behavior, database/RLS tests for persistence and authorization, and a focused integration test for a critical cross-boundary flow. Do not duplicate the same assertion across all layers without a concrete reason.
- Describe remaining manual checks. For significant technical decisions, explain the choice, alternatives, implications, and failure scenarios.
