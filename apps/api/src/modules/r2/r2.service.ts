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

  /**
   * Uploads an object to the configured R2 bucket.
   * @param key - The destination object key
   * @param body - The object contents
   * @param contentType - The optional media type of the object
   * @returns The R2 upload response
   */
  async upload(key: string, body: Buffer, contentType?: string) {
    return await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /**
   * Downloads an object from the configured R2 bucket.
   * @param key - The object key to retrieve
   * @returns The R2 download response
   */
  async download(key: string) {
    return await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /**
   * Lists objects from the configured R2 bucket.
   * @param prefix - The optional object-key prefix to filter by
   * @param continuationToken - The optional token for the next result page
   * @returns A page of matching R2 objects
   */
  async list(prefix?: string, continuationToken?: string) {
    return await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
  }

  /**
   * Deletes an object from the configured R2 bucket.
   * @param key - The object key to delete
   * @returns The R2 deletion response
   */
  async delete(key: string) {
    return await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
