# ADR-015 — Make Spanish the explicit default and never translate user content

**Status:** Accepted
**Date:** 2026-08-31

## Context

The target users are Spanish-speaking shelters and rescuers, primarily in Peru. The repository is
also a portfolio artifact that English-speaking reviewers will read and run.

## Decision

Every user-facing string lives in the `es` and `en` i18n resources. Spanish is the first-launch
default regardless of device locale, the preference persists locally, and locale APIs format dates,
times, and pluralization. User-generated notes, reasons, and descriptions are stored and displayed
exactly as entered and are never translated automatically. Repository documentation, identifiers,
and commit messages stay in English.

## Alternatives considered

- **Follow the device locale on first launch.** Rejected: a Spanish-speaking user on an
  English-configured phone would get the wrong default, and the demo must be reproducibly
  Spanish-first.
- **Spanish-only UI.** Rejected: it makes the product unreviewable by part of its intended
  audience.
- **Machine-translate user content.** Rejected: a mistranslated evaluation concern or return reason
  is a factual corruption of a shelter's record.

## Consequences

- Longer English labels, dynamic text size, and accessibility labels must be considered in every
  component.
- Adding a string in one locale only is a defect.

## Related documentation

- [Product definition — Language and locale](../PRODUCT.md#language-and-locale)
- [Architecture — Internationalization](../ARCHITECTURE.md#internationalization)
