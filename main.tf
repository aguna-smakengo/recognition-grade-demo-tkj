terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# 1. Package Python Lambda Dependencies & Code Natively on Windows
resource "null_resource" "pip_install" {
  triggers = {
    requirements = filesha256("${path.module}/requirements.txt")
    app_py       = filesha256("${path.module}/app.py")
  }

  provisioner "local-exec" {
    command     = "Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue; New-Item -ItemType Directory -Path build; pip install -r requirements.txt -t build; Copy-Item app.py build/; Copy-Item -Recurse templates build/; Copy-Item -Recurse static build/"
    interpreter = ["PowerShell", "-Command"]
  }
}

# 2. Archive Build Directory into ZIP
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/build"
  output_path = "${path.module}/lambda_function_payload.zip"
  depends_on  = [null_resource.pip_install]
}

# 3. Create Lambda Function using Pre-created AWS Academy LabRole
resource "aws_lambda_function" "facegrade_api" {
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  function_name    = "facegrade-api"
  role             = "arn:aws:iam::893411366350:role/LabRole"
  handler          = "app.handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 512

  environment {
    variables = {
      DYNAMODB_TABLE          = "StudentGrades"
      REKOGNITION_COLLECTION = "student-faces"
    }
  }
}

# 4. HTTP API Gateway Setup (v2)
resource "aws_apigatewayv2_api" "api_gateway" {
  name          = "facegrade-api-gateway"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
  }
}

# 5. API Gateway to Lambda Integration
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.api_gateway.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.facegrade_api.invoke_arn
  payload_format_version = "2.0"
}

# 6. Gateway Routes
resource "aws_apigatewayv2_route" "route_root" {
  api_id    = aws_apigatewayv2_api.api_gateway.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "route_proxy" {
  api_id    = aws_apigatewayv2_api.api_gateway.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# 7. Gateway Deployment Stage
resource "aws_apigatewayv2_stage" "stage" {
  api_id      = aws_apigatewayv2_api.api_gateway.id
  name        = "$default"
  auto_deploy = true
}

# 8. Allow API Gateway to Invoke Lambda
resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.facegrade_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api_gateway.execution_arn}/*/*"
}

# 9. Output API Gateway Endpoint URL
output "api_gateway_url" {
  value       = aws_apigatewayv2_api.api_gateway.api_endpoint
  description = "Use this URL in static/app.js API_BASE configuration!"
}
