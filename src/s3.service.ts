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

  constructor(config: ConfigSchema, private readonly logger: Logger) {
    const forcePathStyle = config.isTestOrDev || Boolean(config.endpoint)

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

      if (!versionId) {
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
    } catch (error) {
      this.logger.error(
        error,
        `Failed to get object ${objectKey} from s3 bucket ${bucketName}`,
      )

      throw error
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
      await this.s3Client.send(
        new DeleteObjectCommand({
          Key: objectKey,
          Bucket: bucketName,
          VersionId: versionId,
        }),
      )

      this.logger.info(
        {
          bucketName,
          objectKey,
        },
        'Deleted document from s3',
      )
    } catch (error) {
      this.logger.error(
        {
          bucketName,
          objectKey,
          error,
        },
        'Failed to delete object from s3',
      )

      throw error
    }
  }

  async moveS3File({
    sourceBucketName,
    sourceObjectKey,
    sourceObjectVersionId,
    destinationBucketName,
    destinationObjectKey,
  }: MoveS3FileParams): Promise<string> {
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
          CopySource: `${sourceBucketName}/${sourceObjectKey}?versionId=${sourceObjectVersionId}`,
        }),
      )

      if (!VersionId) {
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
    } catch (error) {
      this.logger.error(
        {
          sourceBucketName,
          sourceObjectKey,
          sourceObjectVersionId,
          destinationBucketName,
          destinationObjectKey,
          error,
        },
        'Failed to move object in s3',
      )

      throw error
    }
  }
}
