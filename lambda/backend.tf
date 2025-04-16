terraform {
  backend "s3" {
    bucket = "upfunnels-terraform-state"
    key    = "lambda/develop/message-whatsapp-consumer-lambda"
    region = "us-east-1"
  }
}
