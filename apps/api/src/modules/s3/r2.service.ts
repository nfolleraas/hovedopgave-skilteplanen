import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';

@Injectable()
export class R2Service {
  private readonly bucket = process.env.R2_BUCKET_NAME;

  private readonly client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.ACCESS_KEY ?? '',
    },
  });

  constructor() {
    if (!this.bucket || !process.env.R2_ENDPOINT) {
      throw new Error('R2_BUCKET_NAME or R2_ENDPOINT must be configured.');
    }
  }

  async upload(key: string, body: Buffer, contentType?: string) {
    return this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async download(key: string) {
    return this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async list(prefix?: string) {
    return this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );
  }

  async delete(key: string) {
    return this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
