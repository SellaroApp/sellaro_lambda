## Setting up lambda locally

To set up and run your lambda locally you must be running [LocalStack](https://docs.localstack.cloud/overview/) locally.
LocalStack is an AWS-compatible environment where we can set up most of the server for local testing.

To run LocalStack simply deploy it with Docker Compose

```bash
docker compose up -d
```

It is also convenient to install [awslocal](https://github.com/localstack/awscli-local) cli:

```bash
pipx install awslocal
pipx ensurepath
```

After deploying LocalStack, please run the `setup-lambda.sh` script

```bash
./setup-lambda.sh
```

## Debugging Lambda

You can check lambda logs with `awslocal logs tail /aws/lambda/wpp`. If you get an error or nothing show up, please run `awslocal logs describe-log-groups` and confirm you see `/aws/lambda/wpp` in the logGroups array. If not, please run:

```bash
awslocal lambda invoke   --function-name wpp   --payload '{}'   response.json
cat response.json
```

Check `response.json` content for a clue.

It may be better to use `awslocal logs tail --follow /aws/lambda/wpp > logs.txt` and open `logs.txt` because the terminal may truncate the output.

## Debugging SQS

You can check messages inside SQS by running:

```bash
awslocal sqs receive-message   --queue-url http://localhost:4566/000000000000/wpp.fifo   --max-number-of-messages 10   --visibility-timeout 0   --wait-time-seconds 0
```