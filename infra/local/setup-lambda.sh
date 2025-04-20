#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Package Lambda
7z a -tzip $SCRIPT_DIR/lambda.zip $SCRIPT_DIR/../../src/*

aws configure set cli_pager ""

# Create SQS Queue
awslocal sqs create-queue --queue-name wpp.fifo --attributes FifoQueue=true

# Create SQS Queue
awslocal sqs create-queue --queue-name crm.fifo --attributes FifoQueue=true

# Delete Lambda Function
awslocal lambda delete-function --function-name wpp || true

# Create Lambda Function
awslocal lambda create-function \
  --function-name wpp \
  --runtime nodejs18.x \
  --handler index.handler \
  --role arn:aws:iam::000000000000:role/dummy-role \
  --zip-file fileb://$SCRIPT_DIR/lambda.zip \
  --environment file://$SCRIPT_DIR/variables.json

# Remove old permission if exists
awslocal lambda remove-permission \
  --function-name wpp \
  --statement-id sqs-trigger || true

# Get Queue ARN
QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/wpp.fifo --attribute-names QueueArn | jq -r '.Attributes.QueueArn')

# Add permission to Lambda
awslocal lambda add-permission \
  --function-name wpp \
  --statement-id sqs-trigger \
  --action "lambda:InvokeFunction" \
  --principal sqs.amazonaws.com \
  --source-arn "$QUEUE_ARN"

# Remove old mappings
mappings=$(awslocal lambda list-event-source-mappings --function-name wpp --query "EventSourceMappings[].UUID" --output text)

for uuid in $mappings; do
  awslocal lambda delete-event-source-mapping --uuid $uuid
done

# Create event source mapping
awslocal lambda create-event-source-mapping \
  --event-source-arn "$QUEUE_ARN" \
  --function-name wpp \
  --batch-size 1
