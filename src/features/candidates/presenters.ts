import type { TFunction } from 'i18next';

import type { ContactChannel } from './contact-actions';
import type { ContactOutcome } from './local-contact-log';
import type { CandidateSource } from './types';

const sourceKeys: Record<
  CandidateSource,
  | 'candidates.sourceLabels.referral'
  | 'candidates.sourceLabels.application'
  | 'candidates.sourceLabels.walkIn'
  | 'candidates.sourceLabels.previousAdopter'
  | 'candidates.sourceLabels.unknown'
> = {
  APPLICATION: 'candidates.sourceLabels.application',
  PREVIOUS_ADOPTER: 'candidates.sourceLabels.previousAdopter',
  REFERRAL: 'candidates.sourceLabels.referral',
  UNKNOWN: 'candidates.sourceLabels.unknown',
  WALK_IN: 'candidates.sourceLabels.walkIn',
};

export function getCandidateSourceLabel(
  t: TFunction,
  source: string | null,
): string {
  if (source && source in sourceKeys) {
    return t(sourceKeys[source as CandidateSource]);
  }
  return source ?? t(sourceKeys.UNKNOWN);
}

const contactOutcomeKeys: Record<
  ContactOutcome,
  | 'candidates.contact.outcomes.reached'
  | 'candidates.contact.outcomes.noAnswer'
  | 'candidates.contact.outcomes.wrongNumber'
  | 'candidates.contact.outcomes.callbackRequested'
> = {
  CALLBACK_REQUESTED: 'candidates.contact.outcomes.callbackRequested',
  NO_ANSWER: 'candidates.contact.outcomes.noAnswer',
  REACHED: 'candidates.contact.outcomes.reached',
  WRONG_NUMBER: 'candidates.contact.outcomes.wrongNumber',
};

export function getContactOutcomeLabel(
  t: TFunction,
  outcome: ContactOutcome,
): string {
  return t(contactOutcomeKeys[outcome]);
}

export function getContactChannelLabel(
  t: TFunction,
  channel: ContactChannel,
): string {
  return channel === 'whatsapp'
    ? t('candidates.contact.whatsapp')
    : t('candidates.contact.call');
}
