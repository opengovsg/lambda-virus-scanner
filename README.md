# lambda-virus-scanner

[![Build Status](https://github.com/opengovsg/lambda-virus-scanner/actions/workflows/build.yml/badge.svg)](https://github.com/opengovsg/lambda-virus-scanner/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/opengovsg/lambda-virus-scanner/badge.svg?branch=main)](https://coveralls.io/github/opengovsg/lambda-virus-scanner?branch=main)


A service for scanning files for viruses, built on ClamAV, AWS Lambda and S3.

This codebase is derived from services built for 
[Care360](https://products.open.gov.sg/care360) and 
[FormSG](https://github.com/opengovsg/FormSG).

## Workflow

Files are placed in an S3 bucket for quarantining incoming files. The Lambda
is invoked, which reads the file and scans it using ClamAV. If the file is 
clean, it is removed from the quarantine bucket and placed in an S3 bucket
for holding clean files.

## Development

This codebase can be run on your local machine with the following command:

```
npm run dev
```

## Deployment

Deployments to AWS are done using the Serverless framework. A GitHub Action 
[workflow](./.github/workflows/deploy-aws.yml) is provided for your 
convenience; you may write your own GitHub Actions that call this.

The entrypoint script for lambda-virus-scanner recognises when it is running
within the AWS Lambda runtime environment; if it is not, it sets up the service
within a Lambda emulation layer. This makes it possible to deploy this service
to any environment that supports Docker containers, such as Fly.io.

## Configuration

TODO
