import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  captureImageWithCamera,
  getPhotoSignedUrl,
  pickImageFromGallery,
  uploadImageToStorage,
  validateImage,
} from '@/lib/image-capture';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn(() => ({
      resize: jest.fn().mockReturnThis(),
      renderAsync: jest.fn().mockResolvedValue({
        saveAsync: jest.fn().mockResolvedValue({
          uri: 'file://downscaled.jpg',
        }),
      }),
    })),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  })),
}));

jest.mock('expo-modules-core', () => ({
  uuid: { v4: jest.fn(() => 'test-uuid-1234') },
  requireNativeModule: jest.fn(() => ({
    NativeResponse: class NativeResponse {},
  })),
  Platform: { OS: 'android' },
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

const { ImageManipulator } = jest.requireMock('expo-image-manipulator') as {
  ImageManipulator: { manipulate: jest.Mock };
};

const { File: MockFile } = jest.requireMock('expo-file-system') as {
  File: jest.Mock;
};

const { uuid } = jest.requireMock('expo-modules-core') as {
  uuid: { v4: jest.Mock };
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

  describe('uploadImageToStorage', () => {
    const baseAsset = {
      uri: 'file://photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      width: 800,
      height: 600,
    };

    function createStorageClient() {
      const uploadMock = jest.fn().mockResolvedValue({ error: null });
      const fromMock = jest.fn(() => ({ upload: uploadMock }));
      return {
        storageClient: {
          storage: { from: fromMock },
        } as unknown as import('@supabase/supabase-js').SupabaseClient<
          import('@/lib/database.types').Database
        >,
        mocks: { upload: uploadMock, from: fromMock },
      };
    }

    it('builds the path with the given entity segment for animals', async () => {
      const shelterId = 'shelter-1';
      const entityId = 'animal-1';
      const { storageClient, mocks } = createStorageClient();

      const path = await uploadImageToStorage(
        storageClient,
        baseAsset,
        shelterId,
        'animals',
        entityId,
      );

      expect(path).toBe(`${shelterId}/animals/${entityId}/test-uuid-1234.jpeg`);
      expect(mocks.from).toHaveBeenCalledWith('shelter-media');
      expect(mocks.upload).toHaveBeenCalledWith(
        `${shelterId}/animals/${entityId}/test-uuid-1234.jpeg`,
        expect.any(ArrayBuffer),
        { cacheControl: '3600', contentType: 'image/jpeg', upsert: false },
      );
    });

    it('builds the path with the given entity segment for adoptions', async () => {
      const shelterId = 'shelter-1';
      const entityId = 'adoption-1';
      const { storageClient, mocks } = createStorageClient();

      const path = await uploadImageToStorage(
        storageClient,
        baseAsset,
        shelterId,
        'adoptions',
        entityId,
      );

      expect(path).toBe(
        `${shelterId}/adoptions/${entityId}/test-uuid-1234.jpeg`,
      );
      expect(mocks.upload).toHaveBeenCalledWith(
        `${shelterId}/adoptions/${entityId}/test-uuid-1234.jpeg`,
        expect.any(ArrayBuffer),
        { cacheControl: '3600', contentType: 'image/jpeg', upsert: false },
      );
    });

    it('builds the path with the given entity segment for followups', async () => {
      const shelterId = 'shelter-1';
      const entityId = 'followup-1';
      const { storageClient, mocks } = createStorageClient();

      const path = await uploadImageToStorage(
        storageClient,
        baseAsset,
        shelterId,
        'followups',
        entityId,
      );

      expect(path).toBe(
        `${shelterId}/followups/${entityId}/test-uuid-1234.jpeg`,
      );
      expect(mocks.upload).toHaveBeenCalledWith(
        `${shelterId}/followups/${entityId}/test-uuid-1234.jpeg`,
        expect.any(ArrayBuffer),
        { cacheControl: '3600', contentType: 'image/jpeg', upsert: false },
      );
    });

    it('throws on storage upload error', async () => {
      const uploadMock = jest
        .fn()
        .mockResolvedValue({ error: { message: 'quota exceeded' } });
      const fromMock = jest.fn(() => ({ upload: uploadMock }));
      const client = {
        storage: { from: fromMock },
      } as never;

      await expect(
        uploadImageToStorage(client, baseAsset, 'shelter-1', 'animals', 'a-1'),
      ).rejects.toThrow('upload_failed: quota exceeded');
    });
  });

  describe('getPhotoSignedUrl', () => {
    function createStorageClient(
      result: { data: { signedUrl: string } | null; error: unknown } = {
        data: { signedUrl: 'https://signed.example.com/photo.jpg' },
        error: null,
      },
    ) {
      const createSignedUrlMock = jest.fn().mockResolvedValue(result);
      const fromMock = jest.fn(() => ({
        createSignedUrl: createSignedUrlMock,
      }));
      return {
        client: { storage: { from: fromMock } } as never,
        mocks: { createSignedUrl: createSignedUrlMock, from: fromMock },
      };
    }

    it('returns the path and the signed URL as separate values', async () => {
      const path = 'shelter-1/animals/animal-1/uuid.jpg';
      const { client, mocks } = createStorageClient();

      const result = await getPhotoSignedUrl(client, path);

      expect(result).toEqual({
        path,
        signedUrl: 'https://signed.example.com/photo.jpg',
      });
      expect(result.path).not.toContain('http');
      expect(mocks.from).toHaveBeenCalledWith('shelter-media');
    });

    it('passes the custom TTL to the storage client', async () => {
      const path = 'shelter-1/animals/animal-1/uuid.jpg';
      const { client, mocks } = createStorageClient();

      await getPhotoSignedUrl(client, path, 300);

      expect(mocks.createSignedUrl).toHaveBeenCalledWith(path, 300);
    });

    it('throws when the storage client fails', async () => {
      const { client } = createStorageClient({
        data: null,
        error: { message: 'not found' },
      });

      await expect(
        getPhotoSignedUrl(client, 'shelter-1/animals/a-1/uuid.jpg'),
      ).rejects.toEqual({ message: 'not found' });
    });

    it('throws when no signed URL is returned', async () => {
      const { client } = createStorageClient({
        data: { signedUrl: '' },
        error: null,
      });

      await expect(
        getPhotoSignedUrl(client, 'shelter-1/animals/a-1/uuid.jpg'),
      ).rejects.toThrow('Failed to generate signed URL');
    });
  });
});
