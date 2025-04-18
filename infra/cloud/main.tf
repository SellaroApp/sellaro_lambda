resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.environment}-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "lambda_sqs_policy" {
  name        = "${var.environment}-lambda-sqs-access"
  description = "Allow Lambda to poll messages from SQS"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        Effect   = "Allow",
        Resource = data.aws_sqs_queue.wpp_queue.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_sqs_policy_attachment" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_sqs_policy.arn
}

resource "aws_iam_policy" "lambda_vpc_networking" {
  name = "${var.environment}-lambda-vpc-networking"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_networking_attachment" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_vpc_networking.arn
}


data "aws_secretsmanager_secret" "config" {
  name = "sellaro/${var.environment}/env"
}

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["${var.environment}-vpc"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "tag:Name"
    values = ["*private*"]
  }
}

resource "aws_security_group" "lambda_sg" {
  name        = "${var.environment}-lambda-sg"
  description = "Security group for Lambda inside private subnets"
  vpc_id      = data.aws_vpc.main.id

  // Allow outbound access if needed (for NAT access, DB, etc.)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_lambda_function" "lambda" {
  function_name    = "${var.environment}-message-whatsapp-consumer-lambda"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  filename         = "${path.module}/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda.zip")
  timeout          = 10

  vpc_config {
    security_group_ids = [aws_security_group.lambda_sg.id]
    subnet_ids         = data.aws_subnets.private.ids
  }

  environment {
    variables = {
      MONGODB_URI            = var.mongodbUri
      WHATSAPP_EVOLUTION_URL = var.wppUrl
      WHATSAPP_EVOLUTION_API_TOKEN = var.wppApiToken
    }
  }
}

data "aws_sqs_queue" "wpp_queue" {
  name = "${var.environment}-wpp.fifo"
}

resource "aws_lambda_event_source_mapping" "wpp_queue_mapping" {
  event_source_arn = data.aws_sqs_queue.wpp_queue.arn
  function_name    = aws_lambda_function.lambda.function_name
  batch_size       = 5
  enabled          = true
}
