# ShelterFlow Security Model

This document is the canonical description of how ShelterFlow protects shelter data: how a user is
identified, how access is decided, how one shelter is isolated from another, and what the project
currently treats as a threat.

It describes the security model, not a vulnerability inventory. It is written to be safe in a
public repository: it contains no credentials, tokens, keys, or exploit recipes.

- How the system is built: [ARCHITECTURE.md](ARCHITECTURE.md)
- What the rules protect: [DOMAIN.md](DOMAIN.md)
- Why a control was chosen: [decisions/](decisions/README.md)

Each control below is marked **Implemented**, **Planned**, or **Not addressed yet** so the model
cannot be mistaken for a promise.

## Security principles

1. **The database is the authorization boundary.** A client-side filter is a request, never a
   permission.
2. **The client may read; only the server may change the domain.** The mobile application holds no
   write privilege on any domain table.
3. **Identity comes from the session, never from the payload.** Shelter and actor are derived
   server-side; a client cannot name the shelter it is acting for.
4. **Isolation is proven, not assumed.** The cross-shelter boundary is asserted by automated tests
   against at least two shelters.
5. **History is protected as data.** No application path hard-deletes historical records.
6. **The app ships no privileged credential.** Only publishable, non-secret configuration reaches
   the device.

## Authentication

**Implemented.**

Supabase Auth identifies the actor. The authenticated user id (`auth.uid()`) is the only accepted
statement of who is acting.

- Email-and-password sign-in is the only authentication method in V1.
- There is no signup, shelter creation, password recovery, or social login. Users, profiles, and
  shelters are provisioned externally by the product owners
  ([ADR-019](decisions/019-provision-users-and-shelters-externally.md)).
- The session is persisted through AsyncStorage under a client-namespaced key, so it survives an
  application restart.
- Token auto-refresh is bound to React Native `AppState` and runs only while the application is in
  the foreground.
- Signing out clears the session, and the Expo Router `Stack.Protected` guards remove the
  authenticated routes from the navigation tree. An expired session returns the user to the login
  screen automatically.

SecureStore is deliberately not used as the session adapter. The stored session is a
shelter-scoped, expiring access token plus a refresh token, protected by the platform's per-app
sandbox. Introducing SecureStore would be a hardening step, not a correction — see
[Known limitations](#known-limitations-and-future-hardening).

## Authorization

**Implemented.**

Authorization is decided in PostgreSQL, in two independent layers.

**Reads.** Row Level Security policies compare the row's `shelter_id` with the authenticated user's
shelter. The `authenticated` role holds `SELECT` and nothing else. `profiles` is further restricted
so a user reads only their own profile row.

**Writes.** There is no client write path. Every domain change is a `SECURITY DEFINER` function
that re-derives the acting shelter from the session and validates ownership of every referenced
record before changing anything
([ADR-018](decisions/018-client-read-only-atomic-mutations.md)).

There is one functional role in V1: the shelter administrator. Role-based permissions, per-record
sharing, and delegation do not exist and are not simulated
([ADR-002](decisions/002-single-shelter-with-shelter-scoped-isolation.md)).

## Tenant isolation

**Implemented.**

Every shelter's rows share the same tables, so isolation is a property of the database, not of the
application.

- Every principal domain row carries `shelter_id`
  ([ADR-003](decisions/003-separate-actor-identity-from-data-ownership.md)).
- Row Level Security is both **enabled** and **forced** on every public domain table, so the table
  owner cannot bypass the policies either.
- All privileges are revoked from `anon` and `authenticated` before being granted back explicitly;
  the schema's default privileges for the Data API roles are revoked as well, so a newly created
  object is not reachable by accident.
- Each policy resolves the caller's shelter through the single-purpose `SECURITY DEFINER` helper
  `public.auth_shelter_id()`, which has a pinned `search_path`, is revoked from `public`, and is
  granted only to `authenticated`. It exists to avoid recursive policy evaluation on `profiles`
  ([ADR-017](decisions/017-enforce-tenant-isolation-with-rls.md)).
- Cross-shelter references are rejected by shelter-scoped foreign keys and constraints, so a valid
  identifier from another shelter cannot be attached to a local record even if it is guessed.
- Isolation is asserted by pgTAP policy tests, by cross-shelter referential-integrity tests, by
  denial tests inside the operation test files, and by an integration script that signs a real
  second user in and attempts to read the first shelter's rows.

Every new domain table is unprotected until it enables RLS, forces it, revokes default privileges,
and adds its policy. That sequence is part of the migration, not a follow-up.

## Database access model

**Implemented.**

| Operation                                       | Client                               | Notes                                                  |
| ----------------------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| `SELECT` on domain tables                       | Allowed, RLS-filtered                | The only direct data access the client has             |
| `INSERT` / `UPDATE` / `DELETE` on domain tables | Denied                               | No grant exists for any role the client can use        |
| Domain workflow transitions                     | Through `SECURITY DEFINER` functions | Granted to `authenticated` only                        |
| Anything as `anon`                              | Denied                               | All privileges revoked                                 |
| Service-role access                             | Never from the client                | Not referenced, imported, or stored by the application |

The list of workflow functions and their signatures is in
[ARCHITECTURE.md](ARCHITECTURE.md#atomic-domain-operations).

Consequences that matter for security review:

- A compromised or modified client cannot fabricate a domain state; it can only invoke operations
  whose preconditions are checked server-side.
- Adding a new mutation is a reviewed migration, which makes the write surface enumerable.
- Read shaping (filters, ordering, paging) is a client concern with no security weight, because RLS
  applies underneath it.

## Domain mutation security

**Implemented.**

The mechanics of the workflow functions — locking, precondition validation, rollback, and the
constraints that back them — are in
[ARCHITECTURE.md](ARCHITECTURE.md#atomic-domain-operations). What matters for security is narrower:

- **Identity is never caller-supplied.** The acting shelter is resolved from the authenticated
  profile and actor attribution (`created_by_user_id`) is derived from the session. A client cannot
  name the shelter or the user it is acting for.
- **A caller with no profile row is rejected explicitly** rather than treated as unscoped. An
  unscoped mutation would touch every shelter.
- **A record outside the caller's shelter is reported as unavailable**, without revealing whether
  it exists elsewhere. This is what keeps a valid identifier from another shelter from confirming
  its own existence.
- **An already-applied transition is rejected** rather than applied twice, which is the control
  behind the duplicate-submission threat below.
- **`SECURITY DEFINER` is a deliberate privilege escalation and is treated as such:** each function
  pins `search_path`, is revoked from `public` and `anon`, is granted only to `authenticated`, and
  is kept narrow enough to review as a unit.

## Secrets

**Implemented.**

| Value                                          | May appear in the client | Notes                                                                                                       |
| ---------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`                     | Yes                      | Public API endpoint                                                                                         |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`         | Yes                      | Publishable key; carries no privilege beyond the `anon`/`authenticated` grants, which are minimal by design |
| `APP_VARIANT`                                  | Yes                      | Build-time configuration; must never hold a credential                                                      |
| Supabase secret / service-role key             | **Never**                | Server-side only; not referenced, imported, or stored by the application                                    |
| Database connection strings, admin credentials | **Never**                | Operator-side only                                                                                          |
| Signing keys, keystores, provisioning profiles | **Never**                | Excluded by `.gitignore`                                                                                    |

Two rules follow from this:

- A value is not secret merely because it is an environment variable, and it is not safe merely
  because it is prefixed `EXPO_PUBLIC_`. Anything bundled into a mobile application is readable by
  anyone holding the application.
- The publishable key is only safe because the roles it can assume have almost no privileges. Any
  broad grant to `anon` or `authenticated` turns it into a data breach.

**One deliberate exception.** Local development fixtures create login-capable accounts whose
credentials are documented in [README.md](../README.md#local-supabase-backend). They exist only in
the local stack, are clearly fictitious, and are never used in another environment
([ADR-023](decisions/023-fictitious-reproducible-fixtures.md)). Fixture credentials must never be
reused for the hosted development, preview, or production environments.

## Sensitive data

ShelterFlow stores modest but genuinely personal data about people who are not its users: adoption
candidates.

| Data                                         | Sensitivity                                    | Handling                                                          |
| -------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Person name, phone, email                    | Personal contact data about a third party      | Shelter-scoped; never copied into timeline payloads               |
| Evaluation notes, positive factors, concerns | The shelter's private judgement about a person | Stored on the evaluation record only; never in a timeline payload |
| Meeting and handover notes                   | Private operational notes, may describe a home | Stored on their own records only                                  |
| Return reason and notes                      | Can describe a personal or family situation    | Stored on the return record only                                  |
| Follow-up notes and photos                   | May show a home or a family                    | Storage paths only; no public URL is ever persisted               |
| Session and refresh tokens                   | Account access                                 | Persisted through AsyncStorage; never logged                      |

Rules:

- **Timeline payloads carry display-safe workflow metadata only.** Private notes, contact details,
  and identifying information stay on their domain records
  ([ADR-014](decisions/014-timeline-as-domain-projection.md)). A database test asserts that private
  notes do not reach timeline payloads.
- **Attachments are referenced by storage path, never by a signed or public URL**, so a leaked
  record cannot double as a durable public link.
- **User-entered content is preserved exactly as entered** and is never automatically translated or
  rewritten.
- **Demo and fixture data must never represent a real person.**

## Logging and observability

**Not addressed yet.** The application currently emits no application logging and integrates no
crash or error reporting service. That is why there is no data leak through logs today — and also
why the rules below must be in place _before_ observability is introduced.

When logging, crash reporting, or error tracking is added, these must never be recorded:

- access or refresh tokens, or any authorization header;
- passwords or anything typed into a password field;
- person names, phone numbers, or email addresses;
- evaluation, meeting, handover, return, or follow-up notes;
- photo contents, or URLs that grant access to them;
- full request or response bodies from domain queries and mutations.

What is safe and useful to record: the operation name, an error code or class, an anonymous or
shelter-level identifier, timing, and the application version. Record _that_ a mutation failed and
why in domain terms — not the payload that failed.

Server-side errors raised by the workflow functions are written for a user to read and must not
embed record contents.

## Threat model

Threats the project currently considers relevant, with the control that addresses each.

| Threat                                              | Scenario                                                                                                   | Control                                                                                                                                                                                         | Status              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Cross-shelter access**                            | A legitimate user of shelter A reads or changes shelter B's data                                           | Forced RLS on every table; shelter derived from the session; shelter-scoped foreign keys; two-shelter tests including a real-session integration test                                           | Implemented         |
| **ID enumeration**                                  | An attacker with a valid session guesses record identifiers from another shelter                           | Identifiers are UUIDs; RLS filters reads regardless of the identifier; operations report a foreign record as unavailable without confirming existence                                           | Implemented         |
| **Mutation forgery**                                | A modified client calls a write path directly, or names another shelter in the payload                     | No table write grants; every function derives shelter and actor from the session and ignores caller-supplied ownership                                                                          | Implemented         |
| **Invariant bypass**                                | A crafted or future write path produces a selected candidate with no adoption, or a second active adoption | Preconditions inside the transaction, plus triggers, unique indexes, and check constraints that hold independently of the caller                                                                | Implemented         |
| **Duplicate submission**                            | A double tap or a retry after a timeout applies a transition twice                                         | Preconditions reject an already-applied transition; row locks serialize concurrent calls; a partial unique index blocks a duplicate scheduled meeting; client mutations disable while in flight | Implemented         |
| **Race between concurrent operations**              | A follow-up is completed while the adoption is being returned                                              | Both operations lock the adoption row first and reject a follow-up whose adoption is no longer active                                                                                           | Implemented         |
| **Privilege escalation through a definer function** | A `SECURITY DEFINER` function is abused to act outside the caller's shelter                                | Functions are narrow and reviewed, pin `search_path`, are revoked from `public` and `anon`, and re-derive the shelter internally                                                                | Implemented         |
| **Anonymous data access**                           | An unauthenticated caller uses the publishable key against the Data API                                    | All privileges revoked from `anon`, including schema default privileges                                                                                                                         | Implemented         |
| **Private-data leakage through the timeline**       | Notes or contact details are copied into an animal timeline that is broadly read within the shelter        | Closed event-type set with display-safe payloads; a database test asserts notes are absent                                                                                                      | Implemented         |
| **Secret exposure**                                 | A privileged key is bundled into the application or committed                                              | Only publishable configuration is read by the client; the service-role key is never referenced; `.env` files and signing material are ignored by Git                                            | Implemented         |
| **Session theft from a device**                     | An attacker with the unlocked device or a compromised backup reads the stored session                      | Platform per-app sandbox; foreground-only refresh; sign-out clears the session                                                                                                                  | Partial — see below |
| **Sensitive data in logs or crash reports**         | Tokens or private notes reach a third-party service                                                        | No logging or reporting integration exists yet; the redaction rules above must be applied before one is added                                                                                   | Not addressed yet   |
| **Unauthorized image access**                       | A follow-up photo of an adopter's home is readable by another shelter                                      | Shelter-scoped Storage policies                                                                                                                                                                 | Planned             |
| **Destructive data loss**                           | Historical records are deleted from the application, by accident or on purpose                             | No application path hard-deletes historical records; archiving is invariant-checked ([ADR-013](decisions/013-preserve-history-and-restrict-deletion.md))                                        | Implemented         |

Out of scope for the current model: denial-of-service protection, rate limiting, and abuse
prevention at the API edge, which are properties of the hosting platform rather than of this
application; and insider threat within a single shelter, which V1 does not attempt to address
because it has one role.

## Known limitations and future hardening

Each item is backed by the current state of the repository or by existing planning. Nothing here is
a commitment to a date.

- **No observability, and therefore no enforced redaction.** Error boundaries, structured error
  handling, and error reporting are planned; the redaction rules in
  [Logging and observability](#logging-and-observability) must ship with them, not after.
- **Storage is not yet secured because it does not yet exist.** The schema models storage paths;
  buckets, upload handling, and shelter-scoped Storage policies are planned, and those policies
  must be tested with at least two shelters before any image is stored.
- **The session is not in hardware-backed storage.** AsyncStorage is the deliberate current choice;
  moving to SecureStore is a candidate hardening step.
- **No rate limiting on authentication or operations** beyond what the hosting platform provides.
- **No password policy or account recovery inside the product**, because accounts are provisioned
  externally. Credential strength is an operator responsibility.
- **Documented local fixture credentials are a deliberate public exception** and are the one place
  where credentials appear in this repository.
- **A dedicated security review is planned** to audit RLS, Storage policies, environment
  configuration, session handling, logging, shelter isolation, and ownership validation inside the
  workflow functions, and to update this document with its findings.

## Reporting a security issue

This is a portfolio project without a formal disclosure process. If you find a security problem,
open an issue describing the impact and how to reproduce it, without including real personal data.
