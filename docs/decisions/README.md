# ShelterFlow Decision Records

This directory records the accepted product, domain, architecture, and process decisions that
materially constrain how ShelterFlow is implemented. Each record states the context, the decision,
the alternatives that were rejected or deferred, and the consequences the project has to live with.

An ADR exists only for a decision with real alternatives or trade-offs. Preferences with no
practical alternative belong in the canonical document they affect, not here.

## How to use these records

- A record explains **why**. What the rule _is_ lives in [PRODUCT](../PRODUCT.md),
  [DOMAIN](../DOMAIN.md), [ARCHITECTURE](../ARCHITECTURE.md), or [SECURITY](../SECURITY.md).
- New evidence may change a decision. Changing one means updating its record — including its status
  — and every canonical document it affects, in the same change.
- A superseded record is kept and marked `Superseded`, with a pointer to its replacement. Records
  are never deleted.
- Statuses in use: `Accepted`, `Proposed`, `Superseded`.
- To add one, copy the shape of any existing record: heading, `**Status:**`, `**Date:**`,
  then Context / Decision / Alternatives considered / Consequences / Related documentation.

## Product and domain

| ADR                                                        | Title                                                              | Status   |
| ---------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| [001](001-start-after-external-screening.md)               | Start the product after external screening                         | Accepted |
| [002](002-single-shelter-with-shelter-scoped-isolation.md) | Model a single-shelter experience with shelter-scoped isolation    | Accepted |
| [003](003-separate-actor-identity-from-data-ownership.md)  | Keep actor identity separate from data ownership                   | Accepted |
| [004](004-separate-person-from-candidate.md)               | Separate Person from Candidate                                     | Accepted |
| [005](005-separate-animal-and-candidate-state-machines.md) | Keep the Animal and Candidate state machines separate              | Accepted |
| [006](006-in-process-at-first-scheduled-meeting.md)        | Enter IN_PROCESS at the first scheduled meeting                    | Accepted |
| [007](007-adoption-as-independent-historical-entity.md)    | Model Adoption as an independent historical entity                 | Accepted |
| [008](008-returned-belongs-to-adoption.md)                 | Record RETURNED on the adoption and represent returns explicitly   | Accepted |
| [009](009-return-cancels-only-pending-followups.md)        | Cancel only pending follow-ups when an adoption is returned        | Accepted |
| [010](010-persist-selected-only-in-atomic-confirmation.md) | Persist SELECTED only inside atomic adoption confirmation          | Accepted |
| [011](011-multiple-meetings-with-reschedule-history.md)    | Allow multiple meetings and preserve rescheduling history          | Accepted |
| [012](012-configurable-followup-plan.md)                   | Make the follow-up plan configurable                               | Accepted |
| [013](013-preserve-history-and-restrict-deletion.md)       | Preserve history and restrict deletion                             | Accepted |
| [014](014-timeline-as-domain-projection.md)                | Use TimelineEvent as a domain projection, not an audit platform    | Accepted |
| [015](015-spanish-first-and-no-automatic-translation.md)   | Make Spanish the explicit default and never translate user content | Accepted |

## Architecture and security

| ADR                                                   | Title                                                                            | Status                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| [016](016-use-supabase-as-backend-platform.md)        | Use Supabase as the V1 backend platform                                          | Accepted (retroactive) |
| [017](017-enforce-tenant-isolation-with-rls.md)       | Enforce tenant isolation with Row Level Security                                 | Accepted               |
| [018](018-client-read-only-atomic-mutations.md)       | Keep the mobile client read-only and mutate through atomic PostgreSQL operations | Accepted               |
| [019](019-provision-users-and-shelters-externally.md) | Provision users and shelters externally                                          | Accepted               |
| [020](020-separate-remote-state-from-ui-state.md)     | Separate remote state from UI state and add no global client-state library       | Accepted               |
| [021](021-keep-implementation-feature-local.md)       | Keep implementation feature-local                                                | Accepted               |
| [022](022-expo-router-with-development-builds.md)     | Use Expo Router with development builds and per-variant identifiers              | Accepted               |
| [023](023-fictitious-reproducible-fixtures.md)        | Model local fixtures as clearly fictitious and reproducible                      | Accepted               |

## Process and documentation

| ADR                                                                 | Title                                                          | Status   |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | -------- |
| [024](024-test-throughout-delivery.md)                              | Test throughout delivery                                       | Accepted |
| [025](025-separate-canonical-documentation-from-execution-notes.md) | Separate canonical documentation from internal execution notes | Accepted |
