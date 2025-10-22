terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "loanwise-terraform-state-638967610858362026"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  # Default tags removed for AWS Lab compatibility
  # default_tags {
  #   tags = {
  #     Environment = var.environment
  #     Project     = var.project_name
  #     ManagedBy   = "Terraform"
  #   }
  # }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}
