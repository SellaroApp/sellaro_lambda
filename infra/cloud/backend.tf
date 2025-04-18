terraform {
  backend "s3" {
    bucket = "sellaro-terraform-state"
    key    = "lambda.tfstate"
    region = "us-east-1"
  }
}
