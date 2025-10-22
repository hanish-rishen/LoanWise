#!/bin/bash
# Deploy LoanWise via Ansible in WSL

set -e

echo -e "\n============================================================"
echo -e "           ANSIBLE DEPLOYMENT - LOANWISE APP                "
echo -e "============================================================\n"

# Install Ansible if not already installed
if ! command -v ansible &> /dev/null; then
    echo "📦 Installing Ansible..."
    sudo apt-get update
    sudo apt-get install -y ansible
fi

# Convert Windows path to WSL path
ANSIBLE_DIR="/mnt/r/LoanWise/LoanWise/infrastructure/ansible"
cd "$ANSIBLE_DIR"

# Fix SSH key permissions
chmod 600 /mnt/c/Users/hanis/hanish.pem

# Get database endpoint
DB_ENDPOINT=$(cd ../terraform && terraform output -json | grep -o '"database_endpoint":\s*{"value":\s*"\([^"]*\)"' | sed 's/.*"\([^"]*\)".*/\1/')

echo -e "\n🔌 Testing SSH connectivity..."
ansible app_servers -i inventory/production -m ping

echo -e "\n🚀 Deploying application..."
ansible-playbook deploy.yml \
    -i inventory/production \
    -e "docker_image=hanishrishen/loanwise:latest" \
    -e "database_url=postgresql://loanwiseadmin:LoanWise2024!SecureDB#Pass@loanwise-db.c5tftpxp2w3a.us-east-1.rds.amazonaws.com:5432/loanwise" \
    -e "environment=production" \
    --verbose

echo -e "\n✅ Deployment complete!"
echo -e "\n🌐 Application URL: http://loanwise-alb-1060567157.us-east-1.elb.amazonaws.com"
