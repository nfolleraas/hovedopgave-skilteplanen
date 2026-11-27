import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientConfigs: [] as unknown[],
  send: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();

  class MockS3Client {
    constructor(config: unknown) {
      mocks.clientConfigs.push(config);
    }

    send(...args: unknown[]) {
      return mocks.send(...args);
    }
  }

  return {
    ...actual,
    S3Client: MockS3Client,
  };
});

import { R2Service } from './r2.service.js';

const originalEnvironment = {
  accessKey: process.env.ACCESS_KEY,
  accessKeyId: process.env.ACCESS_KEY_ID,
  bucket: process.env.R2_BUCKET_NAME,
  endpoint: process.env.R2_ENDPOINT,
};

describe('R2Service', () => {
  beforeEach(() => {
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.R2_ENDPOINT = 'https://r2.example.test';
    process.env.ACCESS_KEY_ID = 'access-key-id';
    process.env.ACCESS_KEY = 'secret-access-key';
    mocks.clientConfigs.length = 0;
    mocks.send.mockReset();
  });

  afterEach(() => {
    for (const [key, value] of Object.entries({
      ACCESS_KEY: originalEnvironment.accessKey,
      ACCESS_KEY_ID: originalEnvironment.accessKeyId,
      R2_BUCKET_NAME: originalEnvironment.bucket,
      R2_ENDPOINT: originalEnvironment.endpoint,
    })) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe('constructor and configuration', () => {
    it('creates successfully with the required configuration', () => {
      expect(new R2Service()).toBeDefined();
    });

    it.each(['R2_BUCKET_NAME', 'R2_ENDPOINT'])(
      'throws when %s is missing',
      (variable) => {
        delete process.env[variable];

        expect(() => new R2Service()).toThrow(
          'R2_BUCKET_NAME or R2_ENDPOINT must be configured.',
        );
      },
    );

    it('configures the S3 client for Cloudflare R2', () => {
      new R2Service();

      expect(mocks.clientConfigs).toEqual([
        {
          region: 'auto',
          endpoint: 'https://r2.example.test',
          credentials: {
            accessKeyId: 'access-key-id',
            secretAccessKey: 'secret-access-key',
          },
        },
      ]);
    });

    it('uses empty credentials when access-key variables are missing', () => {
      delete process.env.ACCESS_KEY_ID;
      delete process.env.ACCESS_KEY;

      new R2Service();

      expect(mocks.clientConfigs[0]).toMatchObject({
        credentials: { accessKeyId: '', secretAccessKey: '' },
      });
    });
  });

  describe('upload', () => {
    it('sends a PutObjectCommand and returns its response', async () => {
      const response = { ETag: 'etag' };
      const body = Buffer.from('file contents');
      mocks.send.mockResolvedValue(response);
      const service = new R2Service();

      await expect(
        service.upload('documents/file.txt', body, 'text/plain'),
      ).resolves.toBe(response);

      expect(mocks.send).toHaveBeenCalledOnce();
      const [command] = mocks.send.mock.calls[0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'documents/file.txt',
        Body: body,
        ContentType: 'text/plain',
      });
    });

    it('supports an omitted content type', async () => {
      mocks.send.mockResolvedValue({});
      const service = new R2Service();

      await service.upload('documents/file.txt', Buffer.from('file contents'));

      expect(mocks.send.mock.calls[0][0].input).toEqual({
        Bucket: 'test-bucket',
        Key: 'documents/file.txt',
        Body: expect.any(Buffer),
        ContentType: undefined,
      });
    });

    it('propagates S3 errors unchanged', async () => {
      const error = new Error('upload failed');
      mocks.send.mockRejectedValue(error);

      await expect(
        new R2Service().upload('documents/file.txt', Buffer.from('contents')),
      ).rejects.toBe(error);
    });
  });

  describe('download', () => {
    it('sends a GetObjectCommand and returns the exact response', async () => {
      const response = { Body: 'stream', ContentLength: 42 };
      mocks.send.mockResolvedValue(response);

      await expect(
        new R2Service().download('documents/file.txt'),
      ).resolves.toBe(response);

      expect(mocks.send).toHaveBeenCalledOnce();
      const [command] = mocks.send.mock.calls[0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'documents/file.txt',
      });
    });

    it('propagates missing-object and access errors unchanged', async () => {
      const error = new Error('object not found');
      mocks.send.mockRejectedValue(error);

      await expect(new R2Service().download('missing.txt')).rejects.toBe(error);
    });
  });

  describe('list', () => {
    it.each([
      ['with prefix and continuation token', 'documents/', 'next-token'],
      ['with prefix only', 'documents/', undefined],
      ['with continuation token only', undefined, 'next-token'],
      ['without optional parameters', undefined, undefined],
    ])(
      'passes optional parameters %s',
      async (_description, prefix, continuationToken) => {
        const response = { Contents: [] };
        mocks.send.mockResolvedValue(response);

        await expect(
          new R2Service().list(prefix, continuationToken),
        ).resolves.toBe(response);

        expect(mocks.send).toHaveBeenCalledOnce();
        const [command] = mocks.send.mock.calls[0];
        expect(command).toBeInstanceOf(ListObjectsV2Command);
        expect(command.input).toEqual({
          Bucket: 'test-bucket',
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });
      },
    );

    it('propagates listing errors unchanged', async () => {
      const error = new Error('list failed');
      mocks.send.mockRejectedValue(error);

      await expect(new R2Service().list('documents/')).rejects.toBe(error);
    });
  });

  describe('delete', () => {
    it('sends a DeleteObjectCommand and returns the exact response', async () => {
      const response = { DeleteMarker: true };
      mocks.send.mockResolvedValue(response);

      await expect(new R2Service().delete('documents/file.txt')).resolves.toBe(
        response,
      );

      expect(mocks.send).toHaveBeenCalledOnce();
      const [command] = mocks.send.mock.calls[0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toEqual({
        Bucket: 'test-bucket',
        Key: 'documents/file.txt',
      });
    });

    it('propagates deletion errors unchanged', async () => {
      const error = new Error('delete failed');
      mocks.send.mockRejectedValue(error);

      await expect(new R2Service().delete('documents/file.txt')).rejects.toBe(
        error,
      );
    });
  });
});
