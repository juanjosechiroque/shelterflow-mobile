# ShelterFlow Engineering Rules

## Current delivery workflow

- Work directly on `main` unless the user explicitly changes the workflow.
- Do not create commits. The user validates and commits each increment.
- When an increment is ready, report automated checks, provide manual validation steps, and suggest an English commit message.
- Keep increments small, coherent, and reviewable.

## Required canonical context

Read these files before implementing business features once they exist:

- `README.md`
- `docs/DOMAIN.md`
- `docs/ARCHITECTURE.md`

For Expo implementation, use the exact SDK documentation matching the installed version. This project currently uses Expo SDK 57:

- <https://docs.expo.dev/versions/v57.0.0/>

## Scope control

- Work on one coherent vertical slice at a time.
- Do not implement future roadmap features unless explicitly requested.
- Do not introduce a dependency without explaining why it is needed.
- Do not create generic CRM concepts such as Lead, Opportunity, Activity, or Task unless the public product scope is explicitly updated.
- Do not create veterinary, medication, volunteer, donation, accounting, or inventory functionality.

## Domain and data

- Do not add or change domain states without updating `docs/DOMAIN.md`.
- Do not place business invariants only in React Native components.
- Important multi-record domain operations must be atomic server-side.
- Do not bypass Supabase Row Level Security.
- Never place the Supabase service-role key in the mobile application.
- Keep shelter ownership (`shelter_id`) separate from authenticated actor identity (`user_id`).
- A persisted candidate with `status = SELECTED` must have a corresponding adoption.

## Mobile architecture

- Prefer TanStack Query for server state when persistence is introduced.
- Do not introduce global client state without a concrete requirement.
- Prefer feature-local code over premature shared abstractions.
- Every meaningful mutation must have loading, disabled, success, and failure behavior.
- Do not disable TypeScript, ESLint, or tests to make an implementation pass.

## Internationalization

- Spanish (`es`) is the default application language; English (`en`) is also supported.
- Never hardcode user-facing strings in screens or components.
- Add every UI string to both Spanish and English resources.
- Do not translate user-generated content.
- Keep repository documentation, identifiers, code comments, and commit messages in English.

## Validation

Before presenting an increment as ready:

- run type checking;
- run linting;
- run relevant tests;
- describe manual validation still required;
- update affected documentation.

When implementing something technically significant, explain how it works, why it was chosen, alternatives considered, mobile implications, backend implications, and failure scenarios.
