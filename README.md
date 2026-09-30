# ShelterFlow Mobile

ShelterFlow is a Spanish-first React Native application for small animal shelters and independent
rescuers. It manages the operational adoption journey after a candidate has already been
shortlisted: evaluation, meetings, decision, adoption, follow-up, return, and reevaluation.

ShelterFlow begins after a shelter has already shortlisted a person for an animal. V1 deliberately
excludes initial application forms, generic CRM functionality, veterinary records, inventory,
donations, volunteers, accounting, internal messaging, and public pet browsing. The full scope and
its boundaries are in [docs/PRODUCT.md](docs/PRODUCT.md).

## What works today

The application is authenticated and shelter-scoped against Supabase: sign-in with session
restoration, shelter-scoped reads of every domain entity, and the complete persisted workflow —
evaluation, contact, meeting scheduling and completion, decision, adoption confirmation, follow-up
completion, return, and reevaluation — each through one atomic PostgreSQL operation. Row Level
Security protects every table and direct mobile-client table writes are denied.

Images, native contact actions, notifications and deep links, and the demo shelter are planned and
**not implemented**. A legacy in-memory prototype (`src/features/prototype-flow`) remains for the
original walkthrough; it resets on reload and is not the target architecture.

The full breakdown of implemented, planned, and deferred is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#implementation-status).

## Requirements

- Node.js 24 LTS recommended (`.nvmrc`)
- npm 10 or newer
- Android Studio and an Android emulator, or a physical Android device with USB debugging enabled
- A Supabase account with access to the linked hosted development project (backend for local
  development; no local database or Docker is used)

Expo SDK 57 requires Node.js 22.13 or newer. The project pins the recommended development line to
Node.js 24 LTS while allowing compatible Node.js versions through the `engines` field.

## Setup

```bash
npm install
npm start
```

Expo Go from Google Play currently targets an older SDK than this project. ShelterFlow therefore
uses a development build instead of Expo Go. Install the Android development build for the first
time with:

```bash
npm run android:device
```

The command generates the native Android project, compiles it, installs ShelterFlow Dev on the
selected USB-connected device, and starts Metro. After the development build is installed, use
`npm start` for normal JavaScript and asset changes. Rebuild only after changing native dependencies
or native app configuration.

Useful scripts:

```bash
npm run android
npm run android:device
npm run ios
npm run web
npm run typecheck
npm run lint
npm run format:check
npm test
```

## Supabase backend

Local development runs against the **linked hosted Supabase development project**. There is no
local database and no Docker: the mobile app talks to the hosted project directly. Schema changes
are versioned migrations in `supabase/migrations/`.

```bash
npm run supabase:push        # apply pending migrations to the linked hosted project
npm run supabase:types       # regenerate src/lib/database.types.ts from the linked project
```

Both commands use the Supabase CLI against the linked remote project (`supabase link` once, with a
project ref and database password) and never start a local stack. Database-level tests (pgTAP) and
the real-session RLS integration script were removed — see
[ADR-026](docs/decisions/026-remove-local-supabase-test-stack.md). Automated tests are Jest only
([Testing strategy](docs/ARCHITECTURE.md#testing-strategy)); Supabase responses are covered by
faking the client in repository tests.

### Environment variables

The mobile application reads two `EXPO_PUBLIC_*` variables for Supabase. Copy `.env.example` to
`.env` and fill them from the hosted project's API settings:

```bash
cp .env.example .env
```

`EXPO_PUBLIC_SUPABASE_URL` is the hosted project's API URL.
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is its publishable (anon) key.
The Supabase **secret** key is server-side only and must never be embedded in the mobile app — see
[docs/SECURITY.md](docs/SECURITY.md#secrets).

### Fixture data and sign-in

The hosted development project's one-time, manually run fixture loader is
[`supabase/hosted-dev-seed.sql`](supabase/hosted-dev-seed.sql); run it in that project's SQL
Editor, never with `supabase db push`. It refuses to run unless the project has exactly one shelter
named `Huellitas Peru` and an existing `admin@shelter.com` profile. It does not create users,
shelters, Storage objects, or any credentials. Rerunning it updates its stable core records but
deliberately preserves records created by manual tests.

Sign in with the `admin@shelter.com` account provisioned in that project. `supabase/seed.sql`
remains as the reference definition of the deterministic two-shelter fixture set; it is no longer
applied automatically.

## Application variants

The app configuration reads `APP_VARIANT` and keeps native application identifiers separate:

| Variant     | Display name        | Application ID / Bundle ID                 |
| ----------- | ------------------- | ------------------------------------------ |
| Development | ShelterFlow Dev     | `com.juanjosechiroque.shelterflow.dev`     |
| Preview     | ShelterFlow Preview | `com.juanjosechiroque.shelterflow.preview` |
| Production  | ShelterFlow         | `com.juanjosechiroque.shelterflow`         |

The local native scripts use the development variant. Preview and production profiles will be
introduced separately so local development cannot accidentally target a production identifier.

## Internationalization

Spanish (`es`) is the default language and English (`en`) is supported. UI strings live in
`src/i18n/resources`, and the selected language is persisted locally. User-entered content is never
translated automatically.

## Project structure

```text
src/          Mobile application (see docs/ARCHITECTURE.md#source-organization)
supabase/     Migrations and the reference fixture definitions
docs/         Canonical product, domain, architecture, security, and decision records
```

Expo Router maps files in `src/app` to routes; `src/app/(tabs)/index.tsx` is the Today tab and
`src/app/settings.tsx` is `/settings`. Navigation only determines which screen is visible — it never
represents domain state such as an animal being adopted.

## Documentation

| Document                                     | Answers                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| [docs/PRODUCT.md](docs/PRODUCT.md)           | What we are building, for whom, and what is out of scope              |
| [docs/DOMAIN.md](docs/DOMAIN.md)             | How the business works: entities, states, transitions, invariants     |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system is built technically                                   |
| [docs/SECURITY.md](docs/SECURITY.md)         | Authentication, authorization, tenant isolation, and the threat model |
| [docs/decisions/](docs/decisions/README.md)  | Why significant decisions were made, and what was rejected            |
| [docs/DEMO.md](docs/DEMO.md)                 | What the product demonstration must show                              |
| [AGENTS.md](AGENTS.md)                       | How agents and contributors must work in this repository              |

Domain rules are maintained with the code because implementation correctness depends on them.
Delivery planning, phase status, task specifications, and review findings are internal working notes
under `docs/internal/`, which is intentionally ignored by Git.

## Continuous integration

GitHub Actions runs `npm ci`, type checking, linting, formatting validation, and tests for pull
requests and pushes to `main`. The workflow uses the Node.js version pinned in `.nvmrc` and has
read-only repository permissions.
