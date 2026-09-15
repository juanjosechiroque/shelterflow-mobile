# ShelterFlow Mobile

ShelterFlow is a Spanish-first React Native application for small animal shelters and independent rescuers. It supports the operational adoption journey after a candidate has already been shortlisted: evaluation, meeting, decision, adoption, and post-adoption follow-up.

The repository is currently in Phase 0: project foundation. Business workflows and Supabase are intentionally out of scope for this phase.

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

## Project structure

```text
src/
  app/          Expo Router routes and layouts
  constants/    Foundation-level visual constants
  i18n/         Translation resources, persistence, and formatting
  providers/    Application-level providers
```

Feature folders will be introduced incrementally when their roadmap phase begins.
