# ADR-020 — Separate remote state from UI state and add no global client-state library

**Status:** Accepted
**Date:** 2026-08-31

## Context

Navigation, cached server data, temporary form input, and device preferences have different
lifecycles, different sources of truth, and different failure modes. Putting them in one global
store makes every one of them look like the others.

## Decision

- TanStack Query owns remote loading, caching, retries, invalidation, and mutation status for
  authenticated feature slices. Supabase remains the source of truth.
- Expo Router owns navigation state. Changing routes must never be the mechanism that changes
  persisted domain state.
- React state (and React Hook Form when introduced) owns temporary input and interaction state.
  Selecting a candidate on an adoption-confirmation screen is form state until the atomic
  operation succeeds.
- AsyncStorage holds small device-local preferences such as the selected language.
- A global client-state library is not part of the baseline. Redux, Zustand, or an equivalent may
  be introduced only for a concrete state-sharing requirement that none of the above serves.

## Alternatives considered

- **A single global store (Redux or Zustand) for server and UI state.** Rejected: it reimplements
  caching, invalidation, and request status, and it makes stale cached data indistinguishable from
  confirmed server state.
- **Ad-hoc `useEffect` fetching per screen.** Rejected: no shared cache, no consistent
  invalidation after a mutation, and duplicate requests across screens.
- **Encoding domain state in route parameters.** Rejected: navigation would become the transition
  mechanism, and a closed screen would leave the domain half-advanced.

## Consequences

- Each mutation explicitly invalidates the query keys it affects after the atomic operation
  succeeds.
- The Supabase client is owned by the auth provider and passed to feature code rather than
  imported as a global singleton.
- Screens must distinguish cached data from confirmed server state in what they show the user.

## Related documentation

- [Architecture — State ownership](../ARCHITECTURE.md#state-ownership)
- [Architecture — Navigation is not business state](../ARCHITECTURE.md#navigation-is-not-business-state)
