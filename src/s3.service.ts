import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Logger } from 'pino'

import { ConfigSchema } from './config'
import {
  DeleteS3FileParams,
  GetS3FileStreamParams,
  GetS3FileStreamResult,
  MoveS3FileParams,
} from './types'

export class S3Service {
  private readonly s3Client: S3Client

  constructor(
    private readonly config: ConfigSchema,
    private readonly logger: Logger,
  ) {
    const forcePathStyle =
      this.config.isTestOrDev || Boolean(this.config.endpoint)

    this.s3Client = new S3Client({
      region: config.region,
      ...(forcePathStyle
        ? {
            endpoint: config.endpoint || 'http://host.docker.internal:4566',
            forcePathStyle,
          }
        : {}),
    })
  }

  get isR2(): boolean {
    return (
      Boolean(this.config.endpoint) &&
      new URL(this.config.endpoint).hostname.endsWith(
        '.r2.cloudflarestorage.com',
      )
    )
  }

  async getS3FileStreamWithVersionId({
    bucketName,
    objectKey,
  }: GetS3FileStreamParams): Promise<GetS3FileStreamResult> {
    this.logger.info(
      {
        bucketName,
        objectKey,
      },
      'Getting document from s3',
    )

    try {
      const { Body: body, VersionId: versionId } = await this.s3Client.send(
        new GetObjectCommand({
          Key: objectKey,
          Bucket: bucketName,
        }),
      )

      if (!body) {
        throw new Error('Body is empty')
      }

      if (!versionId && !this.isR2) {
        throw new Error('VersionId is empty')
      }

      this.logger.info(
        {
          bucketName,
          objectKey,
        },
        'Retrieved document from s3',
      )

      return { body, versionId } as GetS3FileStreamResult
    } catch (err) {
      this.logger.error(
        {
          bucketName,
          objectKey,
          err,
        },
        'Failed to get object from s3',
      )

      throw err
    }
  }

  async deleteS3File({ bucketName, objectKey, versionId }: DeleteS3FileParams) {
    this.logger.info(
      {
        bucketName,
        objectKey,
        versionId,
      },
      'Deleting document from s3',
    )

    try {
      const params = this.isR2
        ? {
            Key: objectKey,
            Bucket: bucketName,
          }
        : {
            Key: objectKey,
            Bucket: bucketName,
            VersionId: versionId,
          }
      await this.s3Client.send(new DeleteObjectCommand(params))

      this.logger.info(
        {
          bucketName,
          objectKey,
        },
        'Deleted document from s3',
      )
    } catch (err) {
      this.logger.error(
        {
          bucketName,
          objectKey,
          err,
        },
        'Failed to delete object from s3',
      )

      throw err
    }
  }

  async moveS3File({
    sourceBucketName,
    sourceObjectKey,
    sourceObjectVersionId,
    destinationBucketName,
    destinationObjectKey,
  }: MoveS3FileParams): Promise<string | undefined> {
    this.logger.info(
      {
        sourceBucketName,
        sourceObjectKey,
        sourceObjectVersionId,
        destinationBucketName,
        destinationObjectKey,
      },
      'Moving document in s3',
    )

    try {
      const { VersionId } = await this.s3Client.send(
        new CopyObjectCommand({
          Key: destinationObjectKey,
          Bucket: destinationBucketName,
          CopySource: `${sourceBucketName}/${sourceObjectKey}${
            this.isR2 ? '' : `?versionId=${sourceObjectVersionId}`
          }`,
        }),
      )

      if (!VersionId && !this.isR2) {
        this.logger.error(
          {
            sourceBucketName,
            sourceObjectKey,
            sourceObjectVersionId,
            destinationBucketName,
            destinationObjectKey,
          },
          'VersionId is empty after copying object in s3',
        )

        throw new Error('VersionId is empty')
      }

      await this.s3Client.send(
        new DeleteObjectCommand({
          Key: sourceObjectKey,
          Bucket: sourceBucketName,
          VersionId: sourceObjectVersionId,
        }),
      )

      this.logger.info(
        {
          sourceBucketName,
          sourceObjectKey,
          sourceObjectVersionId,
          destinationBucketName,
          destinationObjectKey,
          destinationVersionId: VersionId,
        },
        'Moved document in s3',
      )

      return VersionId
    } catch (err) {
      this.logger.error(
        {
          sourceBucketName,
          sourceObjectKey,
          sourceObjectVersionId,
          destinationBucketName,
          destinationObjectKey,
          err,
        },
        'Failed to move object in s3',
      )

      throw err
    }
  }
}
