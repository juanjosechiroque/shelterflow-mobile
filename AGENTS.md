# ShelterFlow Engineering Rules

## Workflow

- Work on `main`, one explicitly requested vertical slice at a time.
- Do not commit or stage files; the user validates, stages, and commits.
- Keep increments small and reviewable. When ready, report checks, manual validation, and a tentative English commit message.

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
- Do not disable TypeScript, linting, or tests to pass an increment.

## UI and data

- Spanish is the default UI language and English is supported. Put every UI string in both locale resources; do not translate user-entered content.
- Use pressable native controls with clear pressed or disabled states. Support scrolling, safe areas, and keyboard access where content can overflow.
- Demo data must be clearly fictitious: never use real personal data and use `example.com` for sample email addresses.

## Documentation and validation

- Keep repository documentation, identifiers, comments, and commit messages in English. Update public docs only for behavior, architecture, or domain-contract changes; update the local roadmap only for delivery status.
- Before presenting an increment as ready, run:

  ```bash
  npm run typecheck
  npm run lint
  npm run format:check
  npm test
  git diff --check
  ```

- Describe remaining manual checks. For significant technical decisions, explain the choice, alternatives, implications, and failure scenarios.
