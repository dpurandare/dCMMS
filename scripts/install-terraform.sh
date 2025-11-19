#!/bin/bash

# ==============================================
# Terraform Installation Script
# ==============================================
# This script installs Terraform for Infrastructure as Code
# Usage: ./scripts/install-terraform.sh

set -e

echo "=========================================="
echo "Terraform Installation"
echo "=========================================="
echo ""

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Detected Linux - installing Terraform..."

    # Add HashiCorp GPG key
    wget -O- https://apt.releases.hashicorp.com/gpg | \
        sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

    # Add HashiCorp repository
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
        https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
        sudo tee /etc/apt/sources.list.d/hashicorp.list

    # Install Terraform
    sudo apt-get update
    sudo apt-get install terraform

elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detected macOS - installing via Homebrew..."

    if ! command -v brew &> /dev/null; then
        echo "❌ Error: Homebrew is not installed"
        echo "Please install Homebrew first: https://brew.sh/"
        exit 1
    fi

    brew tap hashicorp/tap
    brew install hashicorp/tap/terraform

else
    echo "❌ Error: Unsupported OS: $OSTYPE"
    echo "Please install Terraform manually: https://www.terraform.io/downloads"
    exit 1
fi

# Verify installation
echo ""
terraform version
echo ""
echo "✅ Terraform installed successfully!"
echo ""

echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Create Terraform configurations in: infrastructure/terraform/"
echo "2. Initialize Terraform: cd infrastructure/terraform && terraform init"
echo "3. Plan infrastructure: terraform plan"
echo "4. Apply changes: terraform apply"
echo ""
echo "For Sprint 18 (DCMMS-146):"
echo "- Create Terraform modules for your cloud provider (AWS/Azure/GCP)"
echo "- Define infrastructure: VPC, subnets, security groups, databases, etc."
echo "- Document in: docs/deployment/production-deployment-runbook.md"
echo ""
