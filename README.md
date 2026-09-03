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
- Docker (Docker Desktop for Mac or an equivalent Docker Engine) running locally, required only for
  the local Supabase backend
- Android Studio and an Android emulator, or a physical Android device with USB debugging enabled

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

## Local Supabase backend

The project ships a reproducible local Supabase backend under `supabase/`. Docker must be running
before any of these commands:

```bash
npm run supabase:start       # start the local stack (migrations applied)
npm run supabase:status      # show local service URLs and ports and keys
npm run supabase:reset       # reset to migrations and reapply supabase/seed.sql
npm run supabase:test        # run database tests (pgTAP) against the local database
npm run supabase:test:rls    # run the real Auth + RLS integration test against the local stack
npm run supabase:stop        # stop the local stack
```

Schema changes are versioned migrations in `supabase/migrations/`; local fixtures live in
`supabase/seed.sql` and are reapplied by every reset. Run a reset only when migrations or seed data
change, or when explicitly verifying reproducibility.

### Local environment variables

The mobile application reads two `EXPO_PUBLIC_*` variables for Supabase. Copy `.env.example` to
`.env` and fill them from `npm run supabase:status`:

```bash
cp .env.example .env
npm run supabase:status -o env   # print key/value pairs
```

`EXPO_PUBLIC_SUPABASE_URL` is the API URL (default `http://127.0.0.1:54321`).
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the publishable key printed under "Authentication Keys".
The Supabase **secret** key is server-side only and must never be embedded in the mobile app — see
[docs/SECURITY.md](docs/SECURITY.md#secrets).

### Local fixtures and sign-in

A fresh `npm run supabase:reset` always produces the same two shelters, animals, candidates,
evaluations, meetings, adoptions, follow-ups, and timeline events, plus two login-capable local
users:

| Account                                        | Shelter          | Purpose                               |
| ---------------------------------------------- | ---------------- | ------------------------------------- |
| `admin@shelter.com` / `shelter2026`            | Huellitas Rescue | The account to sign in with locally   |
| `rls-fixture@example.com` / `rls-fixture-2026` | Patitas Felices  | Reserved for the RLS integration test |

**These are local development fixtures only.** They exist solely in the local stack, are clearly
fictitious, and are never used in any other environment. Seed data uses invented names and
`example.com` addresses.

### Hosted development fixture data

The linked hosted development project is intentionally separate from the local stack. Its one-time,
manually run fixture loader is [`supabase/hosted-dev-seed.sql`](supabase/hosted-dev-seed.sql); run
it in that project's SQL Editor, never with `supabase db push`. It refuses to run unless the project
has exactly one shelter named `Huellitas Peru` and an existing `admin@shelter.com` profile. It does
not create users, shelters, Storage objects, or any credentials. Rerunning it updates its stable
core records but deliberately preserves records created by manual tests.

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
supabase/     Migrations, pgTAP tests, and deterministic local fixtures
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
