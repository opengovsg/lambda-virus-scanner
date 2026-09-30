#!/usr/bin/env bash


log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Starting clamd..."

/usr/sbin/clamd

log "Started clamd." 

if [ -z "${AWS_LAMBDA_RUNTIME_API}" ]; then
  # We know the image is being run off of Lambda, so we need to use the RIE
  # to start the function.
  log "Running $1 in aws-lambda-rie"
  exec /usr/bin/aws-lambda-rie ./node_modules/.bin/aws-lambda-ric $1
else
  log "Running $1 in Lambda"
  # We know the image is being run on Lambda so we don't need to use the RIE.
  exec ./node_modules/.bin/aws-lambda-ric $1
fi
