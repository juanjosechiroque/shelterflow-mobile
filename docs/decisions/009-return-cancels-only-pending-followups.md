# ADR-009 — Cancel only pending follow-ups when an adoption is returned

**Status:** Accepted
**Date:** 2026-09-01

## Context

After a return, future follow-up reminders are meaningless and would ask the shelter to check on
an animal that is no longer with that adopter. The follow-ups that already happened, however, are
part of the adoption's history and often explain why the return occurred.

## Decision

`return_adoption()` preserves every historical follow-up unchanged and moves only `PENDING`
follow-ups to `CANCELLED`. A cancelled follow-up always records `cancelled_at` and the single
controlled reason `ADOPTION_RETURNED`. Follow-up records are never deleted.

## Alternatives considered

- **Delete pending follow-ups.** Rejected: the planned follow-up schedule is itself evidence of
  what the shelter committed to.
- **Cancel every follow-up regardless of status.** Rejected: it destroys completed outcomes, which
  are the most valuable part of the record.
- **Leave pending follow-ups untouched and filter them in the UI.** Rejected: reminders and
  notifications read the records, not the screens, so the stop must be persisted.

## Consequences

- `cancellation_reason` is a closed set with one member; any other value is invalid.
- On any status other than `CANCELLED`, both `cancelled_at` and `cancellation_reason` must be null.
- `complete_followup()` and `return_adoption()` must lock the adoption row in the same order so a
  follow-up cannot be completed after its adoption was returned.

## Related documentation

- [Domain model — FollowUp](../DOMAIN.md#followup)
- [ADR-013 — Preserve history and restrict deletion](013-preserve-history-and-restrict-deletion.md)
