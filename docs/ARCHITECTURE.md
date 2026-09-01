# ShelterFlow Architecture

## Status and scope

This document describes the intended V1 architecture and the boundaries that guide incremental implementation. The current prototype includes an interactive in-memory adoption journey: users can record an evaluation, schedule and complete a meeting, mark a decision, confirm an adoption, and complete a follow-up. These mutations update a shared in-memory store and are reset on reload. The backend, authentication, real persistence, and the future dependencies described here are not yet implemented.

The current application uses Expo SDK 57, React Native, TypeScript, Expo Router, a development client, i18next, AsyncStorage, Jest, ESLint, and Prettier. Animal, candidate, and timeline data in the prototype are fictitious fixtures used to demonstrate the interactive flow.

## Architectural goals

- Keep the product centered on the adoption domain rather than generic CRM abstractions.
- Make domain behavior testable outside React components.
- Preserve the ability to use mock data before Supabase is introduced.
- Enforce critical multi-record invariants atomically in PostgreSQL.
- Treat shelter ownership as a backend authorization boundary.
- Keep mobile-specific concerns at the application edge.
- Add abstractions and dependencies only when implemented functionality creates a concrete need.

## Target system shape

```text
React Native / Expo UI
        │
        ├── Expo Router navigation
        ├── Feature forms and presentation
        └── Mobile integrations
                │
                ▼
Feature application layer
        │
        ├── domain transitions and validation
        ├── query and mutation orchestration
        └── repository contracts where useful
                │
        ┌───────┴────────┐
        ▼                ▼
Mock repositories    Supabase repositories
                         │
                         ▼
Supabase
├── Auth
├── PostgreSQL tables and constraints
├── Row Level Security
├── PostgreSQL functions / RPC
└── Storage
```

Mock and Supabase implementations are introduced incrementally. They must not be forced to coexist through a premature framework before persistence creates a concrete need.

## Navigation is not business state

Expo Router maps files under `src/app` to application routes. Layout files compose navigation and providers, while route parameters identify which resource a screen should load.

Navigation state answers questions such as:

- Which screen is visible?
- Which animal or candidate route is open?
- Where should a notification deep link navigate?

Business state answers different questions:

- Is an animal ready, in process, adopted, or under reevaluation?
- Is a candidate awaiting evaluation or a decision?
- Does a selected candidate have a corresponding adoption?

Changing routes must never be the mechanism that changes persisted domain state. Business transitions occur through explicit use cases or backend operations and remain valid if the UI is closed midway.

## Source organization

The target structure grows by feature as the product requires it:

```text
src/
  app/              Route entry points and layouts
  features/
    animals/
    candidates/
    evaluations/
    meetings/
    adoptions/
    followups/
  components/       Truly shared presentation components
  hooks/            Truly shared hooks
  lib/              Framework and library setup
  services/         External service adapters
  types/            Cross-feature types only when justified
  i18n/             Locale resources and formatting
  providers/        Application-level providers
```

Feature-local components, schemas, hooks, and tests should remain inside their feature until sharing is demonstrated. Empty folders and speculative base classes are not architecture.

## State ownership

### Server state

Once persistence exists, TanStack Query will own remote loading, caching, retries, invalidation, and mutation status. Supabase remains the source of truth.

### Form and screen state

React state and, when introduced, React Hook Form own temporary input and interaction state. Selecting a candidate on an adoption-confirmation screen is temporary form state until the atomic backend operation succeeds.

### Persisted local preferences

AsyncStorage is appropriate for small device-local preferences such as selected language. It is not a substitute for shelter domain persistence.

### Global client state

A global client-state library is not part of the baseline. Redux, Zustand, or an equivalent may be introduced only for a concrete state-sharing requirement not already served by navigation, React context, form state, TanStack Query, or local persistence.

The prototype uses a lightweight in-memory store (`src/features/prototype-flow`) built on React Context and `useReducer`. It holds animals, candidates, evaluations, meetings, adoptions, follow-ups, and timeline events, and it owns the domain transition rules. Screens read from it through selectors and invoke expressive commands; the reusable pure reducer and selectors are decoupled from React so transitions are testable in isolation. Data originates behind a mock repository contract: the only production file allowed to import the fictitious `mock-*` fixtures is `mock-repository.ts`, which returns deep-cloned snapshot state so loads and resets never reuse references. This store is a stopgap to make the adoption journey interactive before persistence exists; it is not intended to replace the backend and resets on reload. It is mounted once in the root layout and is deliberately not a generic CRM or global state abstraction.

## Domain layer

Domain states and allowed transitions are defined in `DOMAIN.md`. React components may request a transition and present its result, but they must not be the only place enforcing invariants.

The implementation path is incremental:

1. Mocked UI establishes mobile interaction and navigation.
2. A small in-memory domain store owns transition rules and removes direct fixture coupling. A pure reducer, pure selectors, and a mock repository contract isolate screens from fictitious data and expose them through commands. ([state ownership](#state-ownership), [domain layer](#domain-layer))
3. Supabase repositories replace the in-memory store by vertical slice.
4. Critical cross-record operations move to PostgreSQL functions.

Simple single-record validation can exist in shared domain code and database constraints. Security and multi-record atomicity must be enforced by the backend even when the client also validates for user experience.

## Backend and data boundaries

### Authentication

Supabase Auth identifies the actor through `auth.uid()`. A profile maps that user to exactly one shelter in V1.

### Authorization

Row Level Security compares the current profile's `shelter_id` with each row's `shelter_id`. Client-side filtering is never authorization.

### Database integrity

Foreign keys, checks, unique constraints, and server-side operations must prevent:

- cross-shelter relationships;
- multiple active adoptions for one animal;
- a persisted selected candidate without an adoption;
- invalid state transitions;
- a second return for one adoption.

Exact SQL design and indexes are decided alongside Supabase migrations, not in mobile components.

### Atomic operations

At minimum, these operations require PostgreSQL transactions:

- `create_shelter_account()`;
- `confirm_adoption()`;
- `return_adoption()`.

The client makes one request and handles one success or failure result. It must not orchestrate a sequence of independent updates that could leave partial domain state.

### Storage

Animal, handover, and follow-up images will use shelter-scoped Supabase Storage policies. Database records should not claim a completed image attachment until the chosen upload workflow can recover safely from failure.

## Internationalization

All user-facing application strings use the i18n layer. Spanish is the explicit default and English is supported. The current language is persisted locally and controls locale-sensitive formatting through standard internationalization APIs.

The architecture does not translate user-generated content. Notes, descriptions, outcomes, and return reasons are stored and displayed as entered.

Longer English strings, pluralization, dynamic text size, and accessibility labels must be considered when building components.

## Mobile integrations

Mobile capabilities remain behind feature-level adapters where platform behavior or failure handling matters:

- image picker or camera;
- WhatsApp and telephone URL schemes;
- local notifications and later push notifications if justified;
- deep links into follow-up routes;
- secure session persistence.

Opening an external URL records only that ShelterFlow attempted to open it. It does not prove that a call connected or a message was sent.

## Error and network behavior

ShelterFlow is not offline-first, but meaningful mutations must provide:

- loading and disabled states that prevent duplicate submissions;
- explicit success and failure feedback;
- retry behavior appropriate to idempotency;
- input preservation for recoverable form failures;
- clear distinction between cached data and confirmed server state.

Complex synchronization queues are out of scope unless real requirements demonstrate their need.

## Security and privacy

- The Supabase service-role key must never be included in the application.
- Public mobile configuration is not secret merely because it is stored in environment variables.
- Tokens, phone numbers, private notes, personal documents, and other PII must not be written to logs or crash reports.
- RLS and Storage policies must be tested using at least two shelters.
- Domain RPCs must derive or validate shelter ownership from the authenticated actor rather than trusting arbitrary client input.

## Testing strategy

Testing accompanies each implementation increment:

- unit tests for transition rules and pure formatting or validation;
- component tests for forms and visible interaction behavior;
- database integration tests for constraints, RLS, and transactional operations;
- end-to-end tests only for critical paths where their cost is justified.

A later testing-hardening pass reviews gaps; it is not when testing begins.

## Environments and delivery

Development, preview, and production builds use separate native identifiers selected by `APP_VARIANT`. The development client is used instead of Expo Go because the project targets Expo SDK 57 and will require native modules.

Preview and production delivery will use EAS when release builds are introduced. No secret or production credential should be required for ordinary local foundation checks.

## Alternatives deliberately deferred

- A generic clean-architecture framework: unnecessary before feature boundaries exist.
- Generic CRM entities such as `Lead` or `Activity`: conflict with the product model.
- Many-to-many shelter membership: invitations and multi-shelter users are out of V1 scope.
- A global state library: no current unmet requirement.
- Offline-first synchronization: disproportionate to V1 needs.
- Client-orchestrated adoption updates: cannot guarantee atomicity or authorization.
