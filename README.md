# lambda-virus-scanner

[![Build Status](https://github.com/opengovsg/lambda-virus-scanner/actions/workflows/build.yml/badge.svg)](https://github.com/opengovsg/lambda-virus-scanner/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/opengovsg/lambda-virus-scanner/badge.svg?branch=main)](https://coveralls.io/github/opengovsg/lambda-virus-scanner?branch=main)


A service for scanning files for viruses, built on ClamAV, AWS Lambda and S3.

This codebase is derived from services built for 
[Care360](https://products.open.gov.sg/care360) and 
[FormSG](https://github.com/opengovsg/FormSG).

## Workflow

Files are placed in an S3 bucket for quarantining incoming files. Both this 
bucket, as well as the S3 bucket for holding files that have been scanned and 
deemed clean, *must* have versioning enabled. Versioning ensures that the file
that is scanned and subsequently considered clean does not get replaced with a 
tainted file by a malicious actor.

The lambda is then invoked, which scans the file corresponding to the specified
object key and version with ClamAV. If the file is clean, it is removed from 
the quarantine bucket, and placed in the S3 bucket for holding clean files.

Once that is done, the lambda responds with the object key and the version id 
needed to retrieve the file from the clean bucket.

### Cloudflare R2

Cloudflare R2 buckets do not support versioning, so version id checks are
removed if lambda-virus-scanner is configured with an `AWS_ENDPOINT` ending
with `.r2.cloudflarestorage.com`.

## Development

This codebase can be run on your local machine with the following command:

```
npm run dev
```

## Deployment

Deployments to AWS are done using the [Serverless](https://serverless.com) 
framework. The deployment configuration is specified in 
[serverless.yml](./serverless.yml), which in turn expects a `.env` file 
populated with [environment variables for configuration](#configuration)

A GitHub Action [workflow](./.github/workflows/deploy-aws.yml) is provided for 
your convenience; you may write your own GitHub Actions that call this. This 
workflow in turn invokes a [loader script](./scripts/envLoader.mjs) that 
generates the `.env` file used by Serverless from secrets held in AWS Secrets
Manager, which you will have to set up yourself.

The [entrypoint script](./entry.sh) for lambda-virus-scanner recognises when 
it is running within the AWS Lambda runtime environment; if it is not, it sets 
up the service within a Lambda emulation layer. This makes it possible to 
deploy this service to any environment that supports Docker containers, 
like Fly.io.

## Configuration

Environment variables are used for configuration. These 
in turn influence S3 configuration and behaviour.

| Variable | Description |
| :------- | ----------- |
| `NODE_ENV`                           | Environment that the virus scanner is run in. Possible values include `development`, `staging`, `uat` and `production`. Defaults to `development`. If `development` or `test` is specified, S3 will be configured to access buckets using path-style URLs. |
| `AWS_REGION`                         | AWS region. Defaults to `ap-southeast-1`. |
| `AWS_ACCESS_KEY_ID`                  | AWS IAM access key ID used to access S3. |
| `AWS_SECRET_ACCESS_KEY`              | AWS IAM access secret used to access S3. |
| `AWS_ENDPOINT`                       | (Optional) the URL pointing to the endpoint host. This could be AWS, Cloudflare or localstack, depending on environment. If empty, S3 will be configured to point to the specified AWS region. If specified, S3 will be configured to access buckets using path-style URLs. |
| `VIRUS_SCANNER_QUARANTINE_S3_BUCKET` | Name of S3 bucket for quarantined files. |
| `VIRUS_SCANNER_CLEAN_S3_BUCKET`      | Name of S3 bucket for clean files. |
