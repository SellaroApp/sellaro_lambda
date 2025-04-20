variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "mongodbUri" {
  description = "MongoDB URI"
  type        = string
}


variable "wppApiToken" {
  description = "WhatsApp API Token"
  type        = string
}


variable "wppUrl" {
  description = "WhatsApp URL"
  type        = string
}

variable "backendUrl" {
  description = "Backend URL"
  type        = string
}
