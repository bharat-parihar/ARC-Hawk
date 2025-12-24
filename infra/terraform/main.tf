terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

resource "aws_s3_bucket" "scanner_results" {
  bucket = "arc-hawk-scanner-results"
  acl    = "private"
}
