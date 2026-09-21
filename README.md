# ShelterFlow Mobile

ShelterFlow is a Spanish-first React Native application for small animal shelters and independent rescuers. It supports the operational adoption journey after a candidate has already been shortlisted: evaluation, meeting, decision, adoption, and post-adoption follow-up.

The repository currently contains the mobile foundation, the canonical adoption domain model, and an interactive adoption prototype. The prototype keeps its data in memory and lets you walk an adoption journey end to end — evaluation, meeting, decision, adoption confirmation, and follow-up — but the data resets when the app reloads. Backend services and real persistence have not been implemented yet.

## Product scope

ShelterFlow begins after a shelter has already shortlisted a person for an animal. It manages evaluation, meaningful meetings, adoption decisions, adoption confirmation, follow-ups, and returned-adoption history.

V1 deliberately excludes initial application forms, generic CRM functionality, veterinary records, inventory, donations, volunteers, accounting, internal messaging, and public pet browsing. These boundaries keep the application focused on the animal's adoption journey.

## Requirements

- Node.js 24 LTS recommended (`.nvmrc`)
- npm 10 or newer
- Android Studio and an Android emulator, or a physical Android device with USB debugging enabled

Expo SDK 57 requires Node.js 22.13 or newer. The project pins the recommended development line to Node.js 24 LTS while allowing compatible Node.js versions through the `engines` field.

## Setup

```bash
npm install
npm start
```

Expo Go from Google Play currently targets an older SDK than this project. ShelterFlow therefore uses a development build instead of Expo Go. Install the Android development build for the first time with:

```bash
npm run android:device
```

The command generates the native Android project, compiles it, installs ShelterFlow Dev on the selected USB-connected device, and starts Metro. After the development build is installed, use `npm start` for normal JavaScript and asset changes. Rebuild only after changing native dependencies or native app configuration.

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

## Application variants

The app configuration reads `APP_VARIANT` and keeps native application identifiers separate:

| Variant     | Display name        | Application ID / Bundle ID                 |
| ----------- | ------------------- | ------------------------------------------ |
| Development | ShelterFlow Dev     | `com.juanjosechiroque.shelterflow.dev`     |
| Preview     | ShelterFlow Preview | `com.juanjosechiroque.shelterflow.preview` |
| Production  | ShelterFlow         | `com.juanjosechiroque.shelterflow`         |

The local native scripts use the development variant. Preview and production profiles will be introduced separately so local development cannot accidentally target a production identifier.

## Internationalization

Spanish (`es`) is the default language and English (`en`) is supported. UI strings live in `src/i18n/resources`, and the selected language is persisted locally. User-entered content will never be translated automatically.

## Foundation architecture

Expo Router maps files in `src/app` to application routes. For example, `src/app/(tabs)/index.tsx` is the Today tab and `src/app/settings.tsx` is `/settings`; the root layout composes navigation and application-level providers. Navigation only determines which screen is visible. It must not be used to represent domain state such as an animal being adopted or a candidate being selected.

TypeScript extends Expo's SDK-matched base configuration, enables strict mode, and exposes the `@/` alias for source imports. Generated Expo Router route types are included so invalid route references can be detected during development.

`APP_VARIANT` is a build-time configuration value read by `app.config.ts`. It selects the display name and native application identifiers for development, preview, or production. It is not a secret and must not be used to store credentials. Future public mobile configuration may use `EXPO_PUBLIC_` variables, while secrets and privileged backend keys must never be embedded in the app.

The initial dependencies are intentionally limited:

| Dependency                                 | Purpose                                             |
| ------------------------------------------ | --------------------------------------------------- |
| Expo and React Native                      | SDK-managed cross-platform mobile runtime           |
| Expo Router and Linking                    | File-based navigation and deep-link-ready routing   |
| Expo Dev Client                            | Native development build compatible with SDK 57     |
| AsyncStorage                               | Local persistence for the selected UI language      |
| i18next and react-i18next                  | Typed Spanish and English UI resources              |
| React Native Screens and Safe Area Context | Native navigation primitives and safe screen layout |
| Jest and React Native Testing Library      | Unit and component validation                       |
| TypeScript, ESLint, and Prettier           | Static types and consistent code quality            |

Server-state, authentication, database, and business-domain dependencies will be introduced only when the corresponding functionality requires them.

## Documentation

Public engineering documentation is intentionally concise:

- [Domain model](docs/DOMAIN.md)
- [Architecture](docs/ARCHITECTURE.md)

The domain model and architecture are maintained with the code because implementation correctness depends on them. Detailed planning notes remain local and are not part of the public repository.

## Continuous integration

GitHub Actions runs `npm ci`, type checking, linting, formatting validation, and tests for pull requests and pushes to `main`. The workflow uses the Node.js version pinned in `.nvmrc` and has read-only repository permissions.

## Project structure

```text
src/
  app/          Expo Router routes and layouts
  constants/    Foundation-level visual constants
  features/     Feature screens, mock data, and presenters
  i18n/         Translation resources, persistence, and formatting
  providers/    Application-level providers
```

The current `animals`, `candidates`, `evaluations`, `meetings`, `adoptions`, `followups`, and `today` feature folders support an interactive prototype whose state lives in memory. A shared in-memory store (`src/features/prototype-flow`) drives the screens; it is seeded with clearly fictitious data and reset on reload. Demo contacts use `example.com` addresses and must never represent real people. Additional feature folders will be introduced incrementally as their functionality is implemented.
