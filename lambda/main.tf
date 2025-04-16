
resource "aws_lambda_function" "lambda" {
  function_name = "${var.env}-message-whatsapp-consumer-lambda"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = "arn:aws:iam::031078334487:role/lambda_exec_role"
  filename      = "src-code.zip"
  source_code_hash = filebase64sha256("src-code.zip")
  timeout = 10

  environment {
    variables = {
      ENV_VAR = var.env
      MONGODB_URI= var.mongoDbUri
      WHATSAPP_EVOLUTION_API_TOKEN = ""
      WHATSAPP_EVOLUTION_URL = var.whatsappEvolutionUrl
      BACKEND_URL = var.apiMainUrl
    }
  }
}
