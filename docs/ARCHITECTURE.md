# ShelterFlow Architecture

This document is the canonical description of how ShelterFlow is built: its runtime shape, layer
boundaries, state ownership, backend contracts, and testing strategy.

It answers _how the system is built_. It does not redefine domain rules, and it does not track
delivery progress.

- What we are building: [PRODUCT.md](PRODUCT.md)
- How the business works: [DOMAIN.md](DOMAIN.md) — authoritative for states, transitions, and
  invariants
- Security model: [SECURITY.md](SECURITY.md) — authoritative for authentication, authorization,
  tenant isolation, secrets, and the threat model
- Why a technical choice was made: [decisions/](decisions/README.md)

## Implementation status

The application is authenticated and shelter-scoped. Distinguishing what exists from what is
planned matters here, so the whole document uses these labels.

**Implemented**

- Expo SDK 57, React Native, TypeScript strict mode, Expo Router, development client.
- Supabase Auth sign-in, session restoration, logout, and protected navigation.
- Shelter-scoped reads of animals, timelines, candidates, people, evaluations, meetings, adoptions,
  and follow-ups through feature-local Supabase repositories and TanStack Query.
- Atomic PostgreSQL operations for evaluation recording, contact advancement, meeting scheduling
  and completion, decision advancement, adoption confirmation, follow-up completion, adoption
  return, and reevaluation.
- Row Level Security on every public domain table, with direct mobile-client table writes denied.
- Spanish-first i18n with English support, and a persisted language preference.
- Jest unit, component, structural, and repository tests. Database-level tests run against a local
  stack were removed with the local Supabase / Docker tooling ([ADR-026](decisions/026-remove-local-supabase-test-stack.md)).

**Planned**

- Supabase Storage buckets and the image upload workflow.
- Native contact actions, local notifications, and follow-up deep links.
- Network-resilience work beyond per-mutation loading and error states.
- Error boundaries, structured error reporting, and redaction-enforced observability.
- EAS preview and production builds.

**Deferred by decision**

- A generic layered framework, generic CRM entities, a global client-state library, offline-first
  synchronization, and client-orchestrated multi-record updates. See
  [Deliberately deferred alternatives](#deliberately-deferred-alternatives).

A legacy in-memory prototype remains in the tree for the original interactive walkthrough. It is
not part of the target architecture; see [The legacy prototype store](#the-legacy-prototype-store).

## Architectural goals

- Keep the product centered on the adoption domain rather than generic CRM abstractions.
- Make domain behavior testable outside React components.
- Enforce critical multi-record invariants atomically in PostgreSQL.
- Treat shelter ownership as a backend authorization boundary, never a client filter.
- Keep mobile-specific concerns at the application edge, behind adapters.
- Add abstractions and dependencies only when implemented functionality creates a concrete need.

## System shape

```text
React Native / Expo UI
        │
        ├── Expo Router navigation
        ├── Feature screens, forms, and presenters
        └── Mobile integrations (adapters)
                │
                ▼
Feature application layer
        │
        ├── TanStack Query keys, queries, and mutations
        ├── Feature-local repositories and row mappers
        └── Client-side validation for user experience
                │
                ▼
Supabase
├── Auth
├── PostgreSQL tables, constraints, and triggers
├── Row Level Security (reads)
├── SECURITY DEFINER functions / RPC (writes)
└── Storage (planned)
```

Reads go through RLS-protected queries. Writes go exclusively through RPCs
([ADR-018](decisions/018-client-read-only-atomic-mutations.md)).

## Navigation is not business state

Expo Router maps files under `src/app` to application routes. Layout files compose navigation and
providers, while route parameters identify which resource a screen should load.

Navigation state answers questions such as:

- Which screen is visible?
- Which animal or candidate route is open?
- Where should a notification deep link navigate?

Business state answers different questions:

- Is an animal ready, in process, adopted, or under reevaluation?
- Is a candidate awaiting evaluation or a decision?
- Does a selected candidate have a corresponding adoption?

Changing routes must never be the mechanism that changes persisted domain state. Business
transitions occur through explicit backend operations and remain valid if the UI is closed midway.

## Source organization

Structure grows by feature ([ADR-021](decisions/021-keep-implementation-feature-local.md)):

```text
src/
  app/              Route entry points and layouts
  features/
    adoptions/      Confirmation, adoption detail, returns, follow-up completion
    animals/        Animal list and detail, timeline presentation, reevaluation
    auth/           Session provider, login, auth loading
    candidates/     Candidate detail, queries, mutations
    evaluations/    Evaluation form, queries, presenters
    followups/      Follow-up presentation
    meetings/       Meeting scheduling and completion
    today/          Actionable work overview
    prototype-flow/ Legacy in-memory walkthrough (not target architecture)
  components/       Truly shared presentation components
  constants/        Foundation-level visual constants
  hooks/            Truly shared hooks
  lib/              Framework and library setup, generated database types
  i18n/             Locale resources, persistence, and formatting
  providers/        Application-level providers
```

Feature-local components, schemas, hooks, repositories, and tests stay inside their feature until
sharing is demonstrated. Empty folders and speculative base classes are not architecture.

Each feature that reads persisted data owns its own repository, row mappers, query keys, and query
hooks. Similar mapping code across features is accepted duplication until a concrete need justifies
extraction.

## Dependencies

Dependencies are deliberately limited, and each one is present because implemented functionality
needs it.

| Dependency                                 | Purpose                                             |
| ------------------------------------------ | --------------------------------------------------- |
| Expo and React Native                      | SDK-managed cross-platform mobile runtime           |
| Expo Router and Linking                    | File-based navigation and deep-link-ready routing   |
| Expo Dev Client                            | Native development build compatible with SDK 57     |
| Supabase JS client                         | Auth, RLS-protected reads, and RPC invocation       |
| TanStack Query                             | Cached authenticated queries and mutation status    |
| AsyncStorage                               | Session persistence and the selected UI language    |
| i18next and react-i18next                  | Typed Spanish and English UI resources              |
| React Native Screens and Safe Area Context | Native navigation primitives and safe screen layout |
| Jest and React Native Testing Library      | Unit, component, and structural validation          |
| TypeScript, ESLint, and Prettier           | Static types and consistent code quality            |

## State ownership

Four kinds of state with four different lifecycles
([ADR-020](decisions/020-separate-remote-state-from-ui-state.md)).

### Server state

TanStack Query owns remote loading, caching, retries, invalidation, and mutation status for
authenticated feature slices. Supabase remains the source of truth. The provider is mounted once at
the application root.

`AuthProvider` owns the single active Supabase client and exposes it to feature code; repositories
and mutations use that client rather than a global singleton.

Each mutation invalidates the query keys it affects after the atomic operation succeeds. Evaluation
and meeting mutations invalidate on the `animalKeys` prefix (`['animals', shelterId]`) so the
animal, its candidates, and its timeline refresh together.

### Form and screen state

React state and, when introduced, React Hook Form own temporary input and interaction state.
Selecting a candidate on an adoption-confirmation screen is temporary form state until the atomic
backend operation succeeds.

### Persisted local preferences

AsyncStorage holds small device-local values: the Supabase session and the selected language. It is
not a substitute for shelter domain persistence.

### Global client state

A global client-state library is not part of the baseline. Redux, Zustand, or an equivalent may be
introduced only for a concrete state-sharing requirement not already served by navigation, React
context, form state, TanStack Query, or local persistence.

### The legacy prototype store

`src/features/prototype-flow` is a lightweight in-memory store built on React Context and
`useReducer`, retained for the original interactive walkthrough. It holds animals, candidates,
evaluations, meetings, adoptions, follow-ups, and timeline events, and owns its own transition
rules. A pure reducer, pure selectors, and an injectable clock keep those transitions testable
outside React; a repository contract isolates screens from the fixtures, and `mock-repository.ts` is
the only production file permitted to import `mock-*` data — enforced by a guard test. It returns
deep-cloned snapshots so loads and resets never reuse references.

The store resets on reload and is not the target architecture. Persisted screens do not use it.

## Domain layer

Domain states, transitions, preconditions, and invariants are defined in [DOMAIN.md](DOMAIN.md).
React components may request a transition and present its result, but they must never be the only
place enforcing an invariant.

Responsibilities are layered by trust:

| Concern                                                 | Enforced by                             |
| ------------------------------------------------------- | --------------------------------------- |
| Field shape and required values, for immediate feedback | Client validation                       |
| Single-record value ranges and controlled values        | Database check constraints              |
| Cross-record referential and shelter integrity          | Foreign keys, unique indexes, triggers  |
| Multi-record transitions and their preconditions        | `SECURITY DEFINER` PostgreSQL functions |
| Who may read or write a row                             | Row Level Security and function grants  |

Client-side validation exists for user experience only. Security and multi-record atomicity are
enforced by the backend even when the client also validates.

## Backend and data boundaries

Supabase is the V1 backend ([ADR-016](decisions/016-use-supabase-as-backend-platform.md)). The
backend is defined by versioned migrations in `supabase/migrations/`, applied to the linked hosted
project with `supabase db push`. `supabase/seed.sql` is the reference definition of the two-shelter
fixture set; `supabase/hosted-dev-seed.sql` is the loader run once against the hosted development
project. No production table depends on manual dashboard setup.

[SECURITY.md](SECURITY.md) is authoritative for the security properties of everything in this
section; what follows is the structural view.

### Authentication

Supabase Auth identifies the actor through `auth.uid()`. V1 has no signup, no shelter creation, no
password recovery, and no social login: users, profiles, and shelters are provisioned externally
([ADR-019](decisions/019-provision-users-and-shelters-externally.md)). The mobile application
exposes only email-and-password sign-in, session restoration, and logout.

The Supabase React Native client (`src/lib/supabase.ts`) reads `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from environment variables, persists the session through
`@react-native-async-storage/async-storage`, and ties `startAutoRefresh`/`stopAutoRefresh` to React
Native `AppState` so the refresh loop only runs while the app is in the foreground. The session
storage key is namespaced by the client. SecureStore is intentionally not used as the session
adapter.

### Authorization

Row Level Security compares the current profile's `shelter_id` with each row's `shelter_id`
([ADR-017](decisions/017-enforce-tenant-isolation-with-rls.md)). A single-purpose `SECURITY DEFINER`
helper (`public.auth_shelter_id()`) resolves the authenticated user's shelter inside policy
expressions while bypassing RLS, so policies avoid recursive profile lookups.

Every public domain table enables `rowsecurity` and `forcerowsecurity`, exposes only `SELECT` to the
`authenticated` role, and revokes all privileges from `anon` — including the schema default
privileges for the Data API roles. Direct mobile-client `INSERT`, `UPDATE`, and `DELETE` paths are
denied; domain mutations arrive only through reviewed server-side operations.

The Expo Router root layout mounts the tabs and settings routes inside
`<Stack.Protected guard={isAuthenticated}>` and the login screen inside
`<Stack.Protected guard={!isAuthenticated}>`. The guard flips when the auth provider emits
`SIGNED_IN` or `SIGNED_OUT`, so navigation stays in sync with the session and expired tokens return
the user to the login screen automatically.

### Database integrity

Foreign keys, checks, unique indexes, and triggers prevent:

- cross-shelter relationships;
- multiple active adoptions for one animal;
- a persisted selected candidate without an adoption, and an adoption referencing a non-selected
  candidate — enforced bidirectionally by triggers plus a unique index of one adoption per
  candidate;
- invalid status values;
- two simultaneously scheduled meetings for one candidate;
- a second return for one adoption.

Where a rule requires it, a migration prevalidates existing rows and refuses to install the
constraint rather than modifying historical data automatically.

### Atomic domain operations

Every workflow transition that touches more than one row, a status, or timeline history runs as a
`SECURITY DEFINER` PostgreSQL function
([ADR-018](decisions/018-client-read-only-atomic-mutations.md)). The domain contract for each one —
its preconditions and effects — is in
[DOMAIN.md](DOMAIN.md#atomic-domain-operations). The technical contract is:

| Function                                     | Signature                                                                                                                      | Returns            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `public.record_evaluation`                   | `(p_candidate_id uuid, p_overall_fit text, p_positive_factors text[], p_concerns text[], p_recommendation text, p_notes text)` | evaluation id      |
| `public.bridge_evaluated_to_contact_pending` | `(p_candidate_id uuid)`                                                                                                        | candidate id       |
| `public.schedule_meeting`                    | `(p_candidate_id uuid, p_type text, p_scheduled_at timestamptz, p_notes text)`                                                 | meeting id         |
| `public.complete_meeting`                    | `(p_meeting_id uuid, p_result text, p_notes text)`                                                                             | meeting id         |
| `public.mark_decision_pending`               | `(p_candidate_id uuid)`                                                                                                        | candidate id       |
| `public.confirm_adoption`                    | `(p_candidate_id uuid, p_adoption_date date, p_handover_notes text, p_followup_due_dates date[])`                              | adoption id        |
| `public.return_adoption`                     | `(p_adoption_id uuid, p_reason text, p_notes text)`                                                                            | adoption return id |
| `public.complete_followup`                   | `(p_followup_id uuid, p_outcome text, p_notes text)`                                                                           | follow-up id       |
| `public.complete_reevaluation`               | `(p_animal_id uuid, p_next_status text)`                                                                                       | animal id          |

Every function:

- pins `search_path` and runs as `SECURITY DEFINER`;
- is revoked from `public` and `anon` and granted only to `authenticated`;
- derives `shelter_id` from the authenticated profile and never accepts a shelter, actor, or
  adoption owner identifier from the client;
- rejects a caller whose profile has no shelter;
- locks the rows it mutates with `FOR UPDATE`, then validates every precondition inside the same
  transaction;
- writes its own timeline events with display-safe metadata only;
- raises a specific error the client can present, and rolls back completely.

Concurrency rules that a single lock cannot express:

- `schedule_meeting()` is guarded against duplicate active meetings for a candidate by a partial
  unique index, and reports the collision as a friendly error.
- `complete_meeting()` rejects a second completion of the same meeting.
- `complete_followup()` and `return_adoption()` lock the adoption row **before** the follow-up
  rows, so the two operations cannot leave a follow-up completed after its adoption was returned.
  Either operation rejects a follow-up whose adoption is no longer `ACTIVE`, which also prevents
  duplicate cancellations.
- A unique index of one adoption per candidate, plus triggers on both `candidates` and `adoptions`,
  make the selected-candidate invariant unbypassable by any future write path.

The client makes one request and handles one success or one failure. It must not orchestrate a
sequence of independent updates that could leave partial domain state.

### Storage

**Implemented: bucket and shelter-scoped policies.** The private `shelter-media` bucket and the
`storage.objects` Row Level Security policies are in place. Every object key follows the convention
`<shelter_id>/<entity>/<entity_id>/<filename>`; the first path segment is the owning shelter. The
four policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) compare that prefix with the caller's shelter
resolved through `public.auth_shelter_id()`, so a user can only read or write objects under their
own shelter. `anon` has no access.

**Planned.** The image upload UI, the binary upload preflight, the signed-URL read path, and the
`set_animal_primary_photo` / `set_adoption_photo` / `set_followup_photo` attach RPCs are still
pending. A database record must not claim a completed image attachment until the chosen upload
workflow can recover safely from failure.

## Internationalization

All user-facing application strings use the i18n layer. Spanish is the explicit default and English
is supported ([ADR-015](decisions/015-spanish-first-and-no-automatic-translation.md)). UI strings
live in `src/i18n/resources`; the current language is persisted locally and controls
locale-sensitive formatting through standard internationalization APIs.

The architecture does not translate user-generated content. Notes, descriptions, outcomes, and
return reasons are stored and displayed as entered.

Longer English strings, pluralization, dynamic text size, and accessibility labels must be
considered when building components.

## Mobile integrations

Mobile capabilities stay behind feature-level adapters where platform behavior or failure handling
matters:

- image picker or camera _(planned)_;
- WhatsApp and telephone URL schemes _(planned)_;
- local notifications, and push notifications later only if justified _(planned)_;
- deep links into follow-up routes _(planned)_;
- session persistence _(implemented)_.

Opening an external URL records only that ShelterFlow attempted to open it. It never proves that a
call connected or a message was sent.

## Error and network behavior

ShelterFlow is not offline-first, but meaningful mutations must provide:

- loading and disabled states that prevent duplicate submissions;
- explicit success and failure feedback;
- retry behavior appropriate to idempotency — the atomic operations are not idempotent and reject
  a repeated transition rather than applying it twice;
- input preservation for recoverable form failures;
- a clear distinction between cached data and confirmed server state.

Complex synchronization queues are out of scope unless real requirements demonstrate their need.

## Testing strategy

Tests are added with each increment, at the level that matches the trust boundary
([ADR-024](decisions/024-test-throughout-delivery.md)). All automated tests run under Jest with no
external services:

- unit tests for transition rules and pure formatting or validation;
- component tests for forms and visible interaction behavior;
- repository and mapper tests for PostgREST response handling and RPC payload mapping, exercised
  against a fake Supabase client that returns canned `{ data, error }` results;
- end-to-end tests only for critical paths where their cost is justified.

Database-level tests (pgTAP for constraints, RLS policies, and atomic-operation rollback) and the
real-session RLS integration script were removed together with the local Supabase / Docker tooling
([ADR-026](decisions/026-remove-local-supabase-test-stack.md)). Constraint, RLS, and atomicity
correctness now rests on the migrations and on review, not on an automated suite; repository tests
assert only that the client builds the right query and handles the error path.

The same assertion is not duplicated across every layer without a concrete reason. Type checking,
linting, formatting, and tests are never disabled to make a change pass.

### Structural regression guards

Some defects are structural rather than behavioral: they come from file layout or JSX shape, and a
normal test cannot reach them. These guards exist because each one corresponds to a real failure
that reached a device.

| Guard                                  | Prevents                                                                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/route-structure.test.ts`    | A dynamic route file (`[x].tsx`) coexisting with a sibling directory `[x]/`, which Expo Router cannot map to the same segment                                                       |
| `__tests__/link-aschild-style.test.ts` | An array-literal `style` on a direct child of `<Link asChild>`, which makes expo-router throw at render time; the detector skips JSX whitespace instead of assuming the first child |
| `__tests__/mock-import-guard.test.ts`  | Any production file other than `mock-repository.ts` importing a `mock-*` data module                                                                                                |

Guard tests that inspect the file system or use the TypeScript compiler API need Node globals, so
type contexts are split: `tsconfig.json` excludes `__tests__` and `jest.setup.ts` to keep the
application free of Node types, and `tsconfig.test.json` extends it with `jest` and `node`. The
`typecheck` script runs both.

## Environments and delivery

Development, preview, and production builds use separate native identifiers selected by
`APP_VARIANT` ([ADR-022](decisions/022-expo-router-with-development-builds.md)). The development
client is used instead of Expo Go because the project targets Expo SDK 57 and requires native
modules.

`APP_VARIANT` is a build-time configuration value read by `app.config.ts`. It is not a secret and
must never store credentials.

Two environments exist:

| Environment            | Backend                        | Fixtures                                          |
| ---------------------- | ------------------------------ | ------------------------------------------------- |
| Development            | Linked hosted Supabase project | `supabase/hosted-dev-seed.sql`, run manually once |
| Preview and production | Not yet provisioned            | —                                                 |

Local development uses the linked hosted development project directly; there is no local database
and no Docker ([ADR-026](decisions/026-remove-local-supabase-test-stack.md)). Migrations are applied
to the hosted project deliberately with `supabase db push`, and its fixture loader
(`hosted-dev-seed.sql`) is run once in the SQL Editor, never through `supabase db push`.
`supabase/seed.sql` is kept only as the reference definition of the two-shelter fixture set.

Preview and production delivery will use EAS when release builds are introduced. No secret or
production credential is required for ordinary local checks.

## Deliberately deferred alternatives

| Alternative                                          | Why it is not used                                                                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A generic clean-architecture framework               | Unnecessary before feature boundaries exist ([ADR-021](decisions/021-keep-implementation-feature-local.md))                                                                         |
| Generic CRM entities such as `Lead` or `Activity`    | Conflict with the animal-centered product model ([ADR-004](decisions/004-separate-person-from-candidate.md), [ADR-011](decisions/011-multiple-meetings-with-reschedule-history.md)) |
| Many-to-many shelter membership                      | Invitations and multi-shelter users are out of V1 scope ([ADR-002](decisions/002-single-shelter-with-shelter-scoped-isolation.md))                                                  |
| A global state library                               | No current unmet requirement ([ADR-020](decisions/020-separate-remote-state-from-ui-state.md))                                                                                      |
| Offline-first synchronization                        | Disproportionate to V1 needs                                                                                                                                                        |
| Client-orchestrated adoption updates                 | Cannot guarantee atomicity or authorization ([ADR-018](decisions/018-client-read-only-atomic-mutations.md))                                                                         |
| A separate application server in front of PostgreSQL | The transaction, ownership check, and data are already in one place ([ADR-016](decisions/016-use-supabase-as-backend-platform.md))                                                  |
