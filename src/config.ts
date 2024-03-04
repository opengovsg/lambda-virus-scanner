import convict from 'convict'

const isDev = process.env.NODE_ENV === 'development'

const isTest = process.env.NODE_ENV === 'test'

export const config = convict({
  environment: {
    env: 'NODE_ENV',
    format: ['development', 'staging', 'uat', 'production', 'test'],
    default: 'development',
  },
  isTestOrDev: {
    default: isDev || isTest,
  },
  virusScannerQuarantineS3Bucket: {
    env: 'VIRUS_SCANNER_QUARANTINE_S3_BUCKET',
    format: String,
    default: '',
  },
  virusScannerCleanS3Bucket: {
    env: 'VIRUS_SCANNER_CLEAN_S3_BUCKET',
    format: String,
    default: '',
  },
  region: {
    doc: 'Region that S3 bucket is located in',
    format: String,
    default: 'ap-southeast-1',
    env: 'AWS_REGION',
  },
  endpoint: {
    doc: 'Endpoint for S3 buckets',
    default: '',
    env: 'AWS_ENDPOINT',
  },
})
  .validate()
  .getProperties()

export type ConfigSchema = typeof config
