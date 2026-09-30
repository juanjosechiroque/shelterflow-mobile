# ADR-022 — Use Expo Router with development builds and per-variant identifiers

**Status:** Accepted
**Date:** 2026-08-31

## Context

The project targets Expo SDK 57 and will need native modules for camera access, notifications, and
deep links. Expo Go from Google Play targets an older SDK, and a single native application
identifier would let a local build overwrite or target the production application.

## Decision

Expo Router provides file-based navigation from `src/app`. Local native development uses an Expo
development build (Expo Dev Client) rather than the store version of Expo Go. `APP_VARIANT` selects
the display name and native identifiers:

```text
development: com.juanjosechiroque.shelterflow.dev
preview:     com.juanjosechiroque.shelterflow.preview
production:  com.juanjosechiroque.shelterflow
```

The shared slug is `shelterflow-mobile` and the URL scheme is `shelterflow`. `APP_VARIANT` is
build-time configuration, not a secret, and must never hold credentials.

## Alternatives considered

- **Expo Go for local development.** Rejected: it cannot load the SDK 57 runtime this project
  targets or the native modules it will add.
- **A bare React Native project with manual native configuration.** Rejected: it gives up the
  SDK-managed upgrade path for control the project does not currently need.
- **One native identifier for every environment.** Rejected: a local build could replace the
  production app on a device and receive its deep links and notifications.

## Consequences

- Contributors install the development build once and then use the JavaScript workflow; rebuilds
  are needed only after native dependency or configuration changes.
- Preview and production delivery will use EAS when release builds are introduced.
- Route parameters identify which resource a screen loads; they never carry domain state.

## Related documentation

- [Architecture — Environments and delivery](../ARCHITECTURE.md#environments-and-delivery)
- [README — Application variants](../../README.md#application-variants)
