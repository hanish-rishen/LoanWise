# Quick Setup Guide for LoanWise Infrastructure

## Prerequisites

- AWS Account with appropriate permissions
- Jenkins instance (can be hosted on EC2 or external)
- Terraform installed locally (v1.0+)
- Ansible installed locally (2.9+)
- Docker installed locally
- AWS CLI configured with credentials

## Quick Start Steps

### 1. Create Terraform Backend Resources

```bash
# Create S3 bucket for state
aws s3api create-bucket \
  --bucket loanwise-terraform-state-$(date +%s) \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket loanwise-terraform-state-$(date +%s) \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for locks
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Prepare Terraform Configuration

```bash
cd infrastructure/terraform

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment
terraform plan -out=tfplan
```

### 3. Deploy Infrastructure

```bash
# Apply Terraform changes (requires approval)
terraform apply tfplan

# Note the outputs, you'll need them for Ansible
terraform output
```

### 4. Prepare Ansible Configuration

```bash
cd ../ansible

# Copy example inventory
cp inventory/production.example inventory/production

# Edit with your EC2 private IPs
nano inventory/production

# Test connectivity
ansible all -i inventory/production -m ping
```

### 5. Set Up Jenkins

1. Access Jenkins dashboard (http://your-jenkins:8080)
2. Install required plugins:
   - Pipeline
   - Docker Pipeline
   - AWS Credentials
   - GitHub Integration

3. Add Jenkins Credentials:
   ```
   Kind: Secret text
   ID: vite-clerk-key
   Secret: <your-value>
   
   Kind: Secret text
   ID: vite-groq-key
   Secret: <your-value>
   
   Kind: Username with password
   ID: docker-credentials
   Username: <docker-username>
   Password: <docker-token>
   ```

4. Create a new Pipeline job:
   - Name: LoanWise-Pipeline
   - Pipeline script from SCM
   - Git repository: https://github.com/hanish-rishen/LoanWise.git
   - Credentials: Your GitHub credentials
   - Branches: main
   - Script path: Jenkinsfile

### 6. Configure GitHub Webhook

1. Go to your repository settings
2. Add webhook:
   - Payload URL: http://your-jenkins:8080/github-webhook/
   - Content type: application/json
   - Events: Push events
   - Active: ✓

### 7. Deploy Application

```bash
# Trigger Jenkins pipeline
# Or manually run:

# Deploy app
cd ../ansible
ansible-playbook deploy.yml \
  -i inventory/production \
  -e "docker_image=<your-registry>/loanwise:latest" \
  -e "environment=production"

# Setup monitoring
ansible-playbook monitoring/prometheus.yml \
  -i inventory/production

ansible-playbook monitoring/grafana.yml \
  -i inventory/production
```

### 8. Verify Deployment

```bash
# SSH into app server
ssh -i ~/.ssh/loanwise-prod.pem ec2-user@<app-server-ip>

# Check container
docker ps
docker logs loanwise-app

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/

# Access monitoring
# Prometheus: http://<monitoring-ip>:9090
# Grafana: http://<monitoring-ip>:3000
```

## Troubleshooting

### Terraform Issues

```bash
# Destroy and retry
terraform destroy

# Or check state
terraform state list
terraform state show <resource>
```

### Ansible Issues

```bash
# Test connectivity
ansible all -i inventory/production -m ping

# Run with verbose output
ansible-playbook deploy.yml -i inventory/production -vvv

# Check SSH
ssh -i ~/.ssh/loanwise-prod.pem ec2-user@<ip>
```

### Jenkins Issues

```bash
# Check logs
tail -f /var/log/jenkins/jenkins.log

# Check Docker
docker ps
docker logs jenkins-container
```

## Clean Up

### Remove Everything

```bash
# Destroy Jenkins resources
# (Delete EC2, RDS, ALB, etc.)

cd infrastructure/terraform
terraform destroy

# Delete S3 bucket
aws s3 rb s3://loanwise-terraform-state-<timestamp> --force

# Delete DynamoDB table
aws dynamodb delete-table --table-name terraform-locks
```

## Files Summary

```
infrastructure/
├── terraform/
│   ├── main.tf              # Provider and backend
│   ├── variables.tf         # Input variables
│   ├── networking.tf        # VPC, subnets, security groups
│   ├── database.tf          # RDS
│   ├── compute.tf           # EC2, ALB, ASG
│   ├── iam.tf              # IAM roles
│   ├── outputs.tf          # Output values
│   ├── user_data.sh        # EC2 bootstrap
│   ├── terraform.tfvars.example
│   └── terraform.tfvars    # (create from example)
│
└── ansible/
    ├── deploy.yml          # Application deployment
    ├── inventory/
    │   ├── production      # Server IPs
    │   └── production.example
    └── monitoring/
        ├── prometheus.yml
        ├── prometheus.yml.j2
        ├── prometheus.service.j2
        └── grafana.yml
```

## Support & Documentation

- Full guide: See INFRASTRUCTURE_GUIDE.md
- Terraform docs: https://www.terraform.io/docs
- Ansible docs: https://docs.ansible.com
- Jenkins docs: https://www.jenkins.io/doc
