# ShelterFlow Product Definition

This document defines what ShelterFlow is, who it is for, and what it deliberately does not do. It
is the canonical answer to product scope questions.

It describes intent, not delivery status. What exists today is in
[README.md](../README.md); the order of delivery is planned internally.

- How the business works: [DOMAIN.md](DOMAIN.md)
- How the system is built: [ARCHITECTURE.md](ARCHITECTURE.md)
- Why significant decisions were made: [decisions/](decisions/README.md)

## The problem

Small animal shelters and independent rescuers do not lose adoptions for lack of interested people.
They lose them in the gap between interest and handover: candidate details spread across WhatsApp
threads, Instagram messages, and spreadsheets; evaluations remembered rather than recorded; meetings
that nobody logged; follow-ups that quietly never happen; and returned animals whose history
disappears when someone edits a row.

Existing tools are the wrong shape. A CRM models a sales pipeline, not an animal that several
people are competing to adopt. A shelter ERP asks a two-person rescue to maintain modules it will
never use. A spreadsheet has no rules, so nothing prevents two people from being told they can
adopt the same animal.

## Primary user

V1 has one functional user type: the shelter administrator or adoption manager. The normal product
experience represents one shelter and one administrator, although the data model allows more than
one authenticated user to belong to that shelter later.

ShelterFlow is a **single-shelter mobile application with shelter-scoped data isolation**, not a
multi-tenant SaaS product.

## Value proposition

ShelterFlow is the operational record of an animal's adoption journey, on the phone the shelter
already carries.

- **The animal is the unit of work, not the lead.** Every candidate, meeting, decision, adoption,
  and return is read from the animal's timeline.
- **The workflow cannot end in a half-finished state.** Confirming an adoption either happens
  completely or does not happen at all.
- **History survives.** A returned adoption is recorded alongside its adopter, follow-ups, and
  reasons. Nothing is erased to make the current state simpler.
- **Decisions stay human.** The product organizes work and enforces rules; it never selects an
  adopter or declares an animal ready again.

## Product boundary

ShelterFlow begins after a shelter has completed its initial external screening and decided that a
person is worth tracking as a candidate.

External channels remain responsible for candidate acquisition and initial screening, including:

- Instagram, Facebook, or other social channels;
- WhatsApp conversations;
- Google Forms or another adoption form;
- informal shelter-specific screening.

## User journeys

### Primary journey — from shortlisted candidate to settled adoption

```text
External application and screening
              ↓
Candidate shortlisted for an animal
              ↓
Evaluation
              ↓
Contact and one or more meetings
              ↓
Decision
              ↓
Adoption
              ↓
Post-adoption follow-up
```

### Return journey — an adoption that does not work out

```text
Active adoption
        ↓
Return recorded with its reason and history preserved
        ↓
Animal awaits reevaluation
        ↓
Human review decides readiness
        ↓
Available again, or unavailable
```

### Daily journey — what needs attention today

The shelter opens the application to a short list of work that is actually due: candidates awaiting
evaluation, scheduled meetings, pending decisions, follow-ups due, and animals awaiting
reevaluation.

The state transitions behind these journeys are defined in
[DOMAIN.md](DOMAIN.md#complete-happy-path).

## V1 capabilities

ShelterFlow V1 covers:

- minimal animal records and adoption availability;
- a minimal reusable person record;
- one candidate process per person and animal pairing;
- structured candidate evaluation;
- significant meetings such as interviews, meet-and-greets, and home visits;
- candidate selection and atomic adoption confirmation;
- configurable follow-up dates, with 7, 30, and 60 days offered only as defaults;
- post-adoption outcomes and optional photos;
- returned-adoption history and human reevaluation;
- an animal-centered domain timeline;
- native contact actions for WhatsApp and phone calls;
- reminders and deep links for follow-ups;
- a fictitious demo shelter suitable for independent product review.

## Deliberate exclusions

ShelterFlow V1 is not:

- a CRM, shelter ERP, or general contact manager;
- a public pet marketplace or adoption browsing application;
- an initial application or form-building system;
- a replacement for WhatsApp, social media, or Google Forms;
- a veterinary, medication, or medical-record system;
- an inventory, donation, accounting, or billing system;
- a volunteer management system;
- an internal chat or social network;
- an AI matching or automatic translation system;
- a document management platform;
- a multi-shelter switching, invitation, membership, or role-management product.

These exclusions protect the animal-centered adoption workflow from becoming a broad
shelter-management platform.

## Product principles

These principles decide the cases this document does not name.

### Preserve history

Completed evaluations, meetings, adoptions, returns, follow-ups, and timeline events are historical
records. A returned adoption is recorded; it is never erased or overwritten.

### Keep the workflow operational

The home experience prioritizes work that needs attention over dashboards and summary metrics.

### Require human decisions

ShelterFlow may guide the workflow, but it does not automatically select adopters or return an
animal to availability. Selection, adoption confirmation, and post-return readiness require an
explicit shelter action.

### Use the phone as a tool

V1 uses appropriate mobile capabilities — camera or gallery, call and WhatsApp links,
notifications, and deep links — without pretending that an external contact action proves a
conversation occurred.

### Prefer credible behavior over feature count

Atomic adoption confirmation, shelter data isolation, return-history preservation, and recoverable
error states have higher priority than adding more modules.

## Language and locale

The product is Spanish-first and supports English from V1:

- Spanish (`es`) is always the first-launch default;
- English (`en`) can be selected in Settings;
- the selected language persists locally;
- device locale does not automatically change the V1 language;
- dates, times, pluralization, and accessibility labels use the selected locale;
- user-generated notes, reasons, and descriptions remain exactly as entered;
- automatic or AI translation is out of scope.

Repository documentation and code remain in English.

## Success criteria

The V1 product is successful when a small shelter can plausibly:

1. register an animal and shortlisted candidates;
2. evaluate candidates and record meaningful meetings;
3. confirm exactly one adoption without leaving partial state;
4. generate and complete configurable follow-ups;
5. record a return while retaining the complete prior adoption history;
6. understand current work from an actionable home view;
7. use the application in Spanish or English;
8. keep one shelter's data inaccessible to users from another shelter.

## Future work boundary

The following are possible V2 topics, not unfinished V1 work:

- Google Forms or WhatsApp API integrations;
- multiple staff roles and invitations;
- configurable evaluation templates;
- advanced notification automation;
- document generation and analytics;
- volunteer, medical, donation, or inventory workflows.

Adding one of these areas requires an explicit product and roadmap decision.
