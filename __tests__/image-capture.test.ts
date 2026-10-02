import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  captureImageWithCamera,
  pickImageFromGallery,
  validateImage,
} from '@/features/animals/image-capture';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const {
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
  launchImageLibraryAsync,
  launchCameraAsync,
} = jest.requireMock('expo-image-picker') as {
  requestMediaLibraryPermissionsAsync: jest.Mock;
  requestCameraPermissionsAsync: jest.Mock;
  launchImageLibraryAsync: jest.Mock;
  launchCameraAsync: jest.Mock;
};

describe('image-capture adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pickImageFromGallery', () => {
    it('returns permission_denied without opening the picker when permission is refused', async () => {
      requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      await expect(pickImageFromGallery()).resolves.toEqual({
        status: 'permission_denied',
      });
      expect(launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('returns cancelled when the user backs out of the picker', async () => {
      requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      launchImageLibraryAsync.mockResolvedValue({
        canceled: true,
        assets: null,
      });

      await expect(pickImageFromGallery()).resolves.toEqual({
        status: 'cancelled',
      });
    });

    it('normalizes the picked asset on success', async () => {
      requestMediaLibraryPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file://photo.jpg',
            mimeType: 'image/jpeg',
            fileSize: 2048,
            width: 1200,
            height: 900,
          },
        ],
      });

      await expect(pickImageFromGallery()).resolves.toEqual({
        status: 'success',
        asset: {
          uri: 'file://photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 2048,
          width: 1200,
          height: 900,
        },
      });
    });
  });

  describe('captureImageWithCamera', () => {
    it('returns permission_denied without opening the camera when permission is refused', async () => {
      requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await expect(captureImageWithCamera()).resolves.toEqual({
        status: 'permission_denied',
      });
      expect(launchCameraAsync).not.toHaveBeenCalled();
    });

    it('returns cancelled when the user backs out of the camera', async () => {
      requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
      launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });

      await expect(captureImageWithCamera()).resolves.toEqual({
        status: 'cancelled',
      });
    });
  });

  describe('validateImage', () => {
    const baseAsset = {
      uri: 'file://photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      width: 800,
      height: 600,
    };

    it('accepts every allowed mime type within the size limit', () => {
      for (const mimeType of ALLOWED_IMAGE_MIME_TYPES) {
        expect(validateImage({ ...baseAsset, mimeType })).toEqual({
          valid: true,
        });
      }
    });

    it('rejects a disallowed mime type', () => {
      expect(validateImage({ ...baseAsset, mimeType: 'image/gif' })).toEqual({
        valid: false,
        error: 'invalid_mime_type',
      });
    });

    it('rejects a file over the size limit', () => {
      expect(
        validateImage({
          ...baseAsset,
          sizeBytes: MAX_IMAGE_SIZE_BYTES + 1,
        }),
      ).toEqual({ valid: false, error: 'file_too_large' });
    });
  });
});
