import {
  buildTelephoneUrl,
  buildWhatsAppUrl,
  normalizePhoneNumber,
  openContactUrl,
  type LinkingLike,
} from '@/features/candidates/contact-actions';

function createLinking(
  canOpen: boolean | Error,
  open: 'resolve' | Error = 'resolve',
): { linking: LinkingLike; canOpenURL: jest.Mock; openURL: jest.Mock } {
  const canOpenURL = jest.fn(() =>
    canOpen instanceof Error
      ? Promise.reject(canOpen)
      : Promise.resolve(canOpen),
  );
  const openURL = jest.fn(() =>
    open instanceof Error ? Promise.reject(open) : Promise.resolve(undefined),
  );
  return { linking: { canOpenURL, openURL }, canOpenURL, openURL };
}

describe('contact-actions', () => {
  describe('normalizePhoneNumber', () => {
    it('keeps the leading plus and removes separators', () => {
      expect(normalizePhoneNumber('+51 999 111 222')).toEqual({
        digits: '51999111222',
        dialable: '+51999111222',
      });
    });

    it('accepts a local number without a leading plus', () => {
      expect(normalizePhoneNumber('(999) 111-222')).toEqual({
        digits: '999111222',
        dialable: '999111222',
      });
    });

    it('rejects non-numeric input and numbers outside the dialable length', () => {
      expect(normalizePhoneNumber('call me')).toBeNull();
      expect(normalizePhoneNumber('12345')).toBeNull();
      expect(normalizePhoneNumber('+1234567890123456')).toBeNull();
      expect(normalizePhoneNumber('')).toBeNull();
      expect(normalizePhoneNumber(null)).toBeNull();
    });
  });

  describe('link builders', () => {
    it('builds a valid telephone link', () => {
      expect(buildTelephoneUrl('+51 999 111 222')).toBe('tel:+51999111222');
    });

    it('builds a valid WhatsApp link with digits only', () => {
      expect(buildWhatsAppUrl('+51 999 111 222')).toBe(
        'https://wa.me/51999111222',
      );
    });

    it('returns null for an invalid number', () => {
      expect(buildTelephoneUrl('not-a-number')).toBeNull();
      expect(buildWhatsAppUrl('not-a-number')).toBeNull();
    });
  });

  describe('openContactUrl', () => {
    it('reports opened when the platform can handle the URL', async () => {
      const { linking, openURL } = createLinking(true);

      await expect(
        openContactUrl('tel:+51999111222', linking),
      ).resolves.toEqual({ status: 'opened' });
      expect(openURL).toHaveBeenCalledWith('tel:+51999111222');
    });

    it('reports unsupported without opening when the platform cannot handle it', async () => {
      const { linking, openURL } = createLinking(false);

      await expect(
        openContactUrl('https://wa.me/51999111222', linking),
      ).resolves.toEqual({ status: 'unsupported' });
      expect(openURL).not.toHaveBeenCalled();
    });

    it('reports an error when canOpenURL fails', async () => {
      const { linking } = createLinking(new Error('cannot query'));

      await expect(openContactUrl('tel:999', linking)).resolves.toEqual({
        status: 'error',
        message: 'cannot query',
      });
    });

    it('reports an error when openURL fails', async () => {
      const { linking } = createLinking(true, new Error('boom'));

      await expect(openContactUrl('tel:999', linking)).resolves.toEqual({
        status: 'error',
        message: 'boom',
      });
    });
  });
});
