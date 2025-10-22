#!/bin/bash
# Setup Ansible and Deploy LoanWise Application

set -e

echo -e "\n============================================================"
echo -e "           ANSIBLE DEPLOYMENT - LOANWISE APP                "
echo -e "============================================================\n"

# Fix repository keys and install Ansible
if ! command -v ansible &> /dev/null; then
    echo "📦 Setting up Ansible..."

    # Install Ansible using pip with --break-system-packages for Kali
    echo "Installing Ansible via pip..."
    python3 -m pip install --user --break-system-packages ansible

    # Add to PATH
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "✅ Ansible installed!"
ansible --version

# Convert Windows paths to WSL paths
ANSIBLE_DIR="/mnt/r/LoanWise/LoanWise/infrastructure/ansible"
cd "$ANSIBLE_DIR"

# Fix SSH key permissions
echo -e "\n🔐 Setting SSH key permissions..."
chmod 600 /mnt/c/Users/hanis/hanish.pem

# Test connectivity
echo -e "\n🔌 Testing SSH connectivity..."
ansible app_servers -i inventory/production -m ping

# Deploy application
echo -e "\n🚀 Deploying application with Ansible..."
ansible-playbook deploy.yml \
    -i inventory/production \
    -e "docker_image=hanishrishen/loanwise:latest" \
    -e "database_url=postgresql://loanwiseadmin:LoanWise2024!SecureDB#Pass@loanwise-db.c5tftpxp2w3a.us-east-1.rds.amazonaws.com:5432/loanwise" \
    -e "environment=production"

echo -e "\n============================================================"
echo -e "          ✅ DEPLOYMENT COMPLETE! ✅                        "
echo -e "============================================================\n"

echo "🌐 Application URL: http://loanwise-alb-1060567157.us-east-1.elb.amazonaws.com"
