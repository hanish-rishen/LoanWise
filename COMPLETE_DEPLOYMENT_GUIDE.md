# 🚀 Complete Step-by-Step Deployment Guide for LoanWise

Complete guide to deploy Jenkins, Terraform, Ansible, Docker, Grafana, and Prometheus for LoanWise application.

---

## 📑 Table of Contents

- [Phase 0: Prerequisites (30 minutes)](#phase-0-prerequisites-30-minutes)
- [Phase 1: Setup Terraform Backend (15 minutes)](#phase-1-setup-terraform-backend-15-minutes)
- [Phase 2: Deploy Infrastructure with Terraform (20 minutes)](#phase-2-deploy-infrastructure-with-terraform-20-minutes)
- [Phase 3: Build & Push Docker Image (10 minutes)](#phase-3-build--push-docker-image-10-minutes)
- [Phase 4: Configure Ansible Inventory (5 minutes)](#phase-4-configure-ansible-inventory-5-minutes)
- [Phase 5: Deploy Application with Ansible (10 minutes)](#phase-5-deploy-application-with-ansible-10-minutes)
- [Phase 6: Setup Monitoring (10 minutes)](#phase-6-setup-monitoring-10-minutes)
- [Phase 7: Setup Jenkins (20 minutes)](#phase-7-setup-jenkins-optional-20-minutes)
- [Phase 8: Verification & Testing (10 minutes)](#phase-8-verification--testing-10-minutes)
- [Phase 9: Ongoing Operations](#phase-9-ongoing-operations)
- [Quick Reference Commands](#quick-reference-commands)
- [Troubleshooting](#troubleshooting)

---

## Phase 0: Prerequisites (30 minutes)

### 1. Install Required Tools

Check if tools are already installed:

```powershell
# Check versions
aws --version
terraform --version
ansible --version
docker --version
```

If not installed, download and install:
- **AWS CLI**: https://aws.amazon.com/cli/
- **Terraform**: https://www.terraform.io/downloads
- **Ansible**: `pip install ansible`
- **Docker Desktop**: https://www.docker.com/products/docker-desktop

### 2. Setup AWS Credentials

```powershell
# Configure AWS CLI
aws configure

# Enter when prompted:
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: us-east-1
# Default output format: json

# Verify it works
aws sts get-caller-identity
```

### 3. Setup SSH Key for EC2

```powershell
# Create SSH directory
New-Item -ItemType Directory -Path ~/.ssh -Force

# Generate EC2 key pair
aws ec2 create-key-pair `
  --key-name loanwise-prod `
  --query 'KeyMaterial' `
  --output text | Out-File -Encoding ASCII ~/.ssh/loanwise-prod.pem

# Set proper permissions (Windows)
icacls ~/.ssh/loanwise-prod.pem /inheritance:r
icacls ~/.ssh/loanwise-prod.pem /grant:r "$env:USERNAME`:(R)"
```

### 4. Create Docker Hub Account

1. Go to https://hub.docker.com and create account
2. Login locally:

```powershell
# Login to Docker Hub
docker login

# Or use GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

---

## Phase 1: Setup Terraform Backend (15 minutes)

### 1. Create S3 Bucket for Terraform State

```powershell
# Generate unique bucket name
$BUCKET_NAME = "loanwise-terraform-state-$(Get-Date -Format 'yyyyMMddHHmmss')"

# Create S3 bucket
aws s3api create-bucket `
  --bucket $BUCKET_NAME `
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning `
  --bucket $BUCKET_NAME `
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption `
  --bucket $BUCKET_NAME `
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Save bucket name
Write-Host "Your S3 bucket: $BUCKET_NAME" -ForegroundColor Green
```

### 2. Create DynamoDB Table for State Locking

```powershell
aws dynamodb create-table `
  --table-name terraform-locks `
  --attribute-definitions AttributeName=LockID,AttributeType=S `
  --key-schema AttributeName=LockID,KeyType=HASH `
  --billing-mode PAY_PER_REQUEST `
  --region us-east-1
```

### 3. Update Terraform Backend Configuration

Edit `infrastructure/terraform/main.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "YOUR_BUCKET_NAME_HERE"  # Replace with $BUCKET_NAME from above
    key            = "loanwise/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

---

## Phase 2: Deploy Infrastructure with Terraform (20 minutes)

### 1. Configure Terraform Variables

```powershell
cd infrastructure/terraform

# Create terraform.tfvars from example
Copy-Item terraform.tfvars.example terraform.tfvars

# Edit the file
notepad terraform.tfvars
```

**Update `terraform.tfvars` with these values:**

```hcl
aws_region              = "us-east-1"
environment             = "production"
project_name            = "loanwise"
vpc_cidr                = "10.0.0.0/16"
instance_count          = 2
instance_type           = "t3.medium"
database_instance_class = "db.t3.small"
database_name           = "loanwise"
database_username       = "admin"
database_password       = "YourSecurePassword123!"  # Change this!
docker_image            = "your-dockerhub-username/loanwise:latest"  # Update this!
```

### 2. Initialize Terraform

```powershell
# Initialize Terraform (downloads providers)
terraform init

# Validate configuration
terraform validate

# Format code (optional)
terraform fmt
```

### 3. Plan Infrastructure

```powershell
# See what will be created
terraform plan -out=tfplan

# Review the output carefully!
# You should see: ~30-40 resources to be created
```

### 4. Deploy Infrastructure

```powershell
# Apply the plan (this takes ~10-15 minutes)
terraform apply tfplan

# Wait for completion...
# ✅ Apply complete! Resources: 38 added, 0 changed, 0 destroyed.
```

### 5. Save Terraform Outputs

```powershell
# Get outputs
terraform output

# Save to file for reference
terraform output -json > terraform-outputs.json

# Get specific values you'll need
$ALB_DNS = terraform output -raw alb_dns_name
$RDS_ENDPOINT = terraform output -raw database_endpoint
$APP_IPS = terraform output -json private_subnet_ids | ConvertFrom-Json

Write-Host "ALB DNS: $ALB_DNS" -ForegroundColor Green
Write-Host "RDS Endpoint: $RDS_ENDPOINT" -ForegroundColor Green
Write-Host "App Server Subnet IDs: $APP_IPS" -ForegroundColor Green

# Save these values - you'll need them!
```

---

## Phase 3: Build & Push Docker Image (10 minutes)

### 1. Create nginx.conf File

The Dockerfile needs this file. Create it in project root:

```powershell
# Create nginx.conf in project root
@'
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    server {
        listen 8080;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Static files caching
        location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
'@ | Out-File -Encoding UTF8 nginx.conf
```

### 2. Build Docker Image

```powershell
# Go to project root
cd r:\LoanWise\LoanWise

# Build the image
docker build -t loanwise:latest `
  --build-arg VITE_CLERK_PUBLISHABLE_KEY="pk_test_your_key_here" `
  --build-arg VITE_GROQ_API_KEY="gsk_your_key_here" `
  --build-arg VITE_APP_URL="http://$ALB_DNS" `
  --build-arg VITE_BUILD_VERSION="1.0.0" `
  .

# This takes ~5 minutes
```

### 3. Test Docker Image Locally

```powershell
# Run container locally
docker run -d -p 8080:8080 --name loanwise-test loanwise:latest

# Test health
curl http://localhost:8080/health

# Test app
Start-Process "http://localhost:8080"

# Check logs
docker logs loanwise-test

# Stop test container
docker stop loanwise-test
docker rm loanwise-test
```

### 4. Push to Docker Registry

```powershell
# Tag for Docker Hub
docker tag loanwise:latest your-dockerhub-username/loanwise:latest
docker tag loanwise:latest your-dockerhub-username/loanwise:1.0.0

# Login to Docker Hub
docker login

# Push images
docker push your-dockerhub-username/loanwise:latest
docker push your-dockerhub-username/loanwise:1.0.0

# Or push to GitHub Container Registry
docker tag loanwise:latest ghcr.io/your-username/loanwise:latest
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin
docker push ghcr.io/your-username/loanwise:latest
```

---

## Phase 4: Configure Ansible Inventory (5 minutes)

### 1. Get EC2 Instance IPs

```powershell
# Get EC2 instance private IPs from Auto Scaling Group
aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=loanwise-asg-instance" `
  --query "Reservations[].Instances[].[PrivateIpAddress,InstanceId,State.Name]" `
  --output table

# Save these IPs for next step
```

### 2. Update Production Inventory

Edit `infrastructure/ansible/inventory/production`:

```ini
[all]
localhost ansible_connection=local

[app_servers]
# Use the IPs from terraform output or AWS EC2 console
10.0.1.10    # Replace with actual IP
10.0.1.11    # Replace with actual IP

[monitoring]
# Use one of the app servers for monitoring
10.0.1.10    # Can be same as first app server

[production:children]
app_servers
monitoring

[production:vars]
ansible_user=ec2-user
ansible_ssh_private_key_file=~/.ssh/loanwise-prod.pem
docker_registry=docker.io
docker_image=your-dockerhub-username/loanwise:latest  # Update this!
environment=production
```

### 3. Test Ansible Connectivity

```powershell
cd infrastructure/ansible

# Test SSH connectivity
ansible all -i inventory/production -m ping

# If this succeeds, you're good to go!
```

**If ping fails**, update AWS security groups:

```powershell
# Get your current IP
$MY_IP = (Invoke-WebRequest -Uri "https://api.ipify.org").Content

# Get security group ID
$SG_ID = aws ec2 describe-security-groups `
  --filters "Name=group-name,Values=loanwise-ec2-sg" `
  --query "SecurityGroups[0].GroupId" `
  --output text

# Update security group to allow SSH from your IP
aws ec2 authorize-security-group-ingress `
  --group-id $SG_ID `
  --protocol tcp `
  --port 22 `
  --cidr "$MY_IP/32"

# Try ping again
ansible all -i inventory/production -m ping
```

---

## Phase 5: Deploy Application with Ansible (10 minutes)

### 1. Deploy LoanWise Application

```powershell
cd infrastructure/ansible

# Deploy app
ansible-playbook deploy.yml `
  -i inventory/production `
  -e "docker_image=your-dockerhub-username/loanwise:latest" `
  -e "environment=production" `
  -e "database_url=postgresql://admin:YourPassword@$RDS_ENDPOINT:5432/loanwise" `
  -v

# Watch deployment (takes ~3-5 minutes)
```

### 2. Verify Deployment

```powershell
# Check Docker containers
ansible app_servers -i inventory/production -a "docker ps"

# Check app health
ansible app_servers -i inventory/production -a "curl -f http://localhost:8080/health"

# Check logs
ansible app_servers -i inventory/production -a "docker logs loanwise-app --tail 50"
```

### 3. Test via Load Balancer

```powershell
# Get ALB DNS if you don't have it saved
$ALB_DNS = aws elbv2 describe-load-balancers `
  --names loanwise-alb `
  --query "LoadBalancers[0].DNSName" `
  --output text

# Test ALB health
curl http://$ALB_DNS/health

# Open in browser
Start-Process "http://$ALB_DNS"
```

---

## Phase 6: Setup Monitoring (10 minutes)

### 1. Deploy Node Exporter (System Metrics)

```powershell
cd infrastructure/ansible

# Install Node Exporter on all servers
ansible-playbook monitoring/node-exporter.yml -i inventory/production -v

# Verify
ansible all -i inventory/production -a "systemctl status node_exporter"

# Test metrics
$MONITORING_IP = (ansible monitoring -i inventory/production -a "hostname -I" | Select-String -Pattern "\d+\.\d+\.\d+\.\d+").Matches[0].Value
curl http://${MONITORING_IP}:9100/metrics
```

### 2. Deploy Prometheus

```powershell
# Install Prometheus
ansible-playbook monitoring/prometheus.yml -i inventory/production -v

# Verify
ansible monitoring -i inventory/production -a "systemctl status prometheus"

# Test Prometheus UI
Start-Process "http://${MONITORING_IP}:9090"
```

### 3. Deploy Grafana

```powershell
# Install Grafana
ansible-playbook monitoring/grafana.yml -i inventory/production -v

# Verify
ansible monitoring -i inventory/production -a "systemctl status grafana-server"

# Access Grafana
Start-Process "http://${MONITORING_IP}:3000"

# Login: admin / admin (change on first login)
```

### 4. One-Command Setup (Alternative)

```powershell
# Or use the automated setup script
cd infrastructure/ansible
.\setup-monitoring.ps1 -InventoryPath inventory/production -Verbose

# This installs Node Exporter, Prometheus, and Grafana in one go!
```

### 5. Configure Grafana Dashboards

1. Login to Grafana: `http://<monitoring-ip>:3000`
   - Username: `admin`
   - Password: `admin` (change on first login)

2. Go to **Configuration** → **Data Sources**
   - Prometheus should already be configured!

3. Import Dashboards:
   - Click **+** → **Import**
   - Enter Dashboard IDs:
     - **1860** - Node Exporter Full
     - **193** - Docker monitoring
     - **3662** - Prometheus 2.0 Overview
   - Select **Prometheus** as data source
   - Click **Import**

4. Or import custom dashboard:
   - Click **+** → **Import**
   - Upload `infrastructure/ansible/monitoring/dashboards/loanwise-app.json`

---

## Phase 7: Setup Jenkins (Optional - 20 minutes)

### Option A: Use EC2 Instance for Jenkins

```powershell
# Get first app server IP
$JENKINS_IP = (ansible app_servers -i infrastructure/ansible/inventory/production --list-hosts)[0]

# SSH into EC2 instance
ssh -i ~/.ssh/loanwise-prod.pem ec2-user@$JENKINS_IP
```

Inside the EC2 instance:

```bash
# Install Java
sudo yum install java-11-openjdk -y

# Add Jenkins repo
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# Install Jenkins
sudo yum upgrade -y
sudo yum install jenkins -y

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Get initial password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Open firewall
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### Option B: Use Docker for Jenkins (Local Testing)

```powershell
# Run Jenkins in Docker
docker run -d `
  -p 8080:8080 `
  -p 50000:50000 `
  -v jenkins_home:/var/jenkins_home `
  -v /var/run/docker.sock:/var/run/docker.sock `
  --name jenkins `
  jenkins/jenkins:lts

# Get initial password
docker exec jenkins cat /var/lib/jenkins/secrets/initialAdminPassword

# Access Jenkins
Start-Process "http://localhost:8080"
```

### Configure Jenkins

1. **Initial Setup**:
   - Paste initial admin password
   - Install suggested plugins
   - Create admin user

2. **Install Additional Plugins**:
   - Go to **Manage Jenkins** → **Manage Plugins**
   - Install:
     - Docker Pipeline
     - Terraform Plugin
     - Ansible Plugin
     - GitHub Integration

3. **Add Credentials**:
   - Go to **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
   - Add:
     - **Docker Hub** (Username + Password)
       - ID: `docker-credentials`
     - **AWS Credentials** (Access Key ID + Secret)
       - ID: `aws-credentials`
     - **VITE_CLERK_PUBLISHABLE_KEY** (Secret text)
       - ID: `vite-clerk-key`
     - **VITE_GROQ_API_KEY** (Secret text)
       - ID: `vite-groq-key`
     - **Docker Registry URL** (Secret text)
       - ID: `docker-registry-url`
       - Secret: `docker.io` or `ghcr.io`

4. **Create Pipeline Job**:
   - Click **New Item**
   - Name: `LoanWise-Pipeline`
   - Type: **Pipeline**
   - Pipeline → Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/hanish-rishen/LoanWise.git`
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
   - Save

5. **Configure GitHub Webhook** (Optional):
   - Go to your GitHub repository → **Settings** → **Webhooks**
   - Add webhook:
     - Payload URL: `http://your-jenkins-url:8080/github-webhook/`
     - Content type: `application/json`
     - Events: **Push events**
     - Active: ✓

---

## Phase 8: Verification & Testing (10 minutes)

### 1. Test Complete Application Flow

```powershell
# 1. Test ALB (Load Balancer)
curl http://$ALB_DNS/health

# Should return: "healthy"

# 2. Test Application
Start-Process "http://$ALB_DNS"

# Should load the LoanWise application

# 3. Check all services
ansible all -i infrastructure/ansible/inventory/production -a "docker ps"

# Should show loanwise-app container running
```

### 2. Test Monitoring

**Prometheus** (`http://<monitoring-ip>:9090`):
1. Go to **Status** → **Targets**
   - All targets should show **UP**
2. Try queries:
   - `up`
   - `rate(http_requests_total[5m])`
   - `node_memory_MemAvailable_bytes`

**Grafana** (`http://<monitoring-ip>:3000`):
1. Login with admin credentials
2. Check dashboards show data
3. Verify metrics are coming in
4. Create test dashboard

### 3. Test Database Connection

```powershell
# SSH into app server
ssh -i ~/.ssh/loanwise-prod.pem ec2-user@$APP_IP

# Install PostgreSQL client
sudo yum install postgresql -y

# Connect to RDS
psql -h $RDS_ENDPOINT -U admin -d loanwise

# Inside psql:
\dt  # List tables
SELECT 1;  # Test query
\q  # Quit
```

### 4. Test Auto-Scaling

```powershell
# Generate load
for ($i=0; $i -lt 1000; $i++) {
    curl http://$ALB_DNS
}

# Watch Auto Scaling Group
aws autoscaling describe-auto-scaling-groups `
  --auto-scaling-group-names loanwise-asg `
  --query "AutoScalingGroups[0].[DesiredCapacity,MinSize,MaxSize,Instances[].InstanceId]"

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics `
  --namespace AWS/EC2 `
  --metric-name CPUUtilization `
  --dimensions Name=AutoScalingGroupName,Value=loanwise-asg `
  --start-time (Get-Date).AddHours(-1).ToString("o") `
  --end-time (Get-Date).ToString("o") `
  --period 300 `
  --statistics Average
```

### 5. Verify All Components

```powershell
Write-Host "`n=== Component Status ===" -ForegroundColor Cyan

# Check Terraform state
Write-Host "`n1. Terraform:" -ForegroundColor Yellow
cd infrastructure/terraform
terraform show -json | jq -r '.values.root_module.resources | length'
Write-Host "   Resources deployed" -ForegroundColor Green

# Check Docker images
Write-Host "`n2. Docker:" -ForegroundColor Yellow
docker images loanwise

# Check Ansible connectivity
Write-Host "`n3. Ansible:" -ForegroundColor Yellow
cd ../ansible
ansible all -i inventory/production -m ping

# Check application
Write-Host "`n4. Application:" -ForegroundColor Yellow
curl -s http://$ALB_DNS/health

# Check monitoring
Write-Host "`n5. Monitoring:" -ForegroundColor Yellow
curl -s http://${MONITORING_IP}:9090/-/healthy
curl -s http://${MONITORING_IP}:3000/api/health

Write-Host "`n=== All Systems Operational ===" -ForegroundColor Green
```

---

## Phase 9: Ongoing Operations

### Daily Checks

```powershell
# Check app health
curl http://$ALB_DNS/health

# Check logs
ansible app_servers -i infrastructure/ansible/inventory/production -a "docker logs --tail 100 loanwise-app"

# Check Grafana dashboards
Start-Process "http://${MONITORING_IP}:3000"

# Check for updates
git pull origin main
```

### Update Application

**Option 1: Manual Update**

```powershell
# 1. Build new image
docker build -t loanwise:1.0.1 .

# 2. Tag and push
docker tag loanwise:1.0.1 your-dockerhub-username/loanwise:1.0.1
docker push your-dockerhub-username/loanwise:1.0.1

# 3. Deploy via Ansible
ansible-playbook infrastructure/ansible/deploy.yml `
  -i infrastructure/ansible/inventory/production `
  -e "docker_image=your-dockerhub-username/loanwise:1.0.1"
```

**Option 2: Trigger Jenkins (Automatic)**

```powershell
# Just push to main branch
git add .
git commit -m "feat: add new features"
git push origin main

# Jenkins pipeline will automatically:
# 1. Build and test
# 2. Build Docker image
# 3. Push to registry
# 4. Deploy with Terraform/Ansible
# 5. Update monitoring
```

### Scale Application

```powershell
# Scale up
aws autoscaling update-auto-scaling-group `
  --auto-scaling-group-name loanwise-asg `
  --min-size 2 `
  --max-size 6 `
  --desired-capacity 4

# Scale down
aws autoscaling update-auto-scaling-group `
  --auto-scaling-group-name loanwise-asg `
  --min-size 1 `
  --max-size 3 `
  --desired-capacity 2
```

### Backup Database

```powershell
# Create RDS snapshot
aws rds create-db-snapshot `
  --db-instance-identifier loanwise-db `
  --db-snapshot-identifier loanwise-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')

# List snapshots
aws rds describe-db-snapshots `
  --db-instance-identifier loanwise-db
```

### Monitor Costs

```powershell
# Get current month costs
aws ce get-cost-and-usage `
  --time-period Start=$(Get-Date -Day 1 -Format 'yyyy-MM-dd'),End=$(Get-Date -Format 'yyyy-MM-dd') `
  --granularity MONTHLY `
  --metrics UnblendedCost `
  --group-by Type=DIMENSION,Key=SERVICE

# Set up budget alert (one-time)
aws budgets create-budget `
  --account-id $(aws sts get-caller-identity --query Account --output text) `
  --budget file://budget.json
```

---

## 🔥 Quick Reference Commands

### Infrastructure Commands

```powershell
# Terraform
cd infrastructure/terraform
terraform plan                          # Preview changes
terraform apply                         # Apply changes
terraform destroy                       # Destroy infrastructure ⚠️
terraform output                        # Show outputs
terraform state list                    # List resources
terraform state show <resource>         # Show resource details

# AWS CLI
aws ec2 describe-instances              # List EC2 instances
aws elbv2 describe-load-balancers       # List load balancers
aws rds describe-db-instances           # List databases
aws autoscaling describe-auto-scaling-groups  # List ASGs
```

### Application Commands

```powershell
# Ansible
cd infrastructure/ansible
ansible-playbook deploy.yml -i inventory/production                    # Deploy app
ansible app_servers -i inventory/production -m ping                    # Test connectivity
ansible app_servers -i inventory/production -a "docker ps"             # List containers
ansible app_servers -i inventory/production -a "docker logs loanwise-app"  # View logs

# Docker
docker build -t loanwise:latest .                       # Build image
docker run -d -p 8080:8080 loanwise:latest              # Run container
docker ps                                                # List containers
docker logs <container_id>                               # View logs
docker exec -it <container_id> sh                        # Shell into container
docker push your-username/loanwise:latest                # Push to registry
```

### Monitoring Commands

```powershell
# Prometheus queries
curl 'http://MONITORING_IP:9090/api/v1/query?query=up'
curl 'http://MONITORING_IP:9090/api/v1/targets'

# Grafana API
curl -u admin:admin http://MONITORING_IP:3000/api/dashboards/home
curl http://MONITORING_IP:3000/api/health

# Node Exporter
curl http://SERVER_IP:9100/metrics
```

### Useful One-Liners

```powershell
# Get all EC2 instance IPs
aws ec2 describe-instances --filters "Name=tag:Name,Values=loanwise-*" --query "Reservations[].Instances[].[PrivateIpAddress,PublicIpAddress,State.Name]" --output table

# Get ALB DNS name
aws elbv2 describe-load-balancers --names loanwise-alb --query "LoadBalancers[0].DNSName" --output text

# Get RDS endpoint
aws rds describe-db-instances --db-instance-identifier loanwise-db --query "DBInstances[0].Endpoint.Address" --output text

# Restart all app containers
ansible app_servers -i infrastructure/ansible/inventory/production -a "docker restart loanwise-app"

# View all logs
ansible app_servers -i infrastructure/ansible/inventory/production -a "docker logs loanwise-app --tail 200"

# Check health on all servers
ansible app_servers -i infrastructure/ansible/inventory/production -a "curl -f http://localhost:8080/health"
```

---

## 🆘 Troubleshooting

### Can't SSH to EC2?

**Problem**: `ansible all -m ping` fails or SSH timeout

**Solution**:

```powershell
# 1. Get your current public IP
$MY_IP = (Invoke-WebRequest -Uri "https://api.ipify.org").Content
Write-Host "Your IP: $MY_IP"

# 2. Get security group ID
$SG_ID = aws ec2 describe-security-groups `
  --filters "Name=group-name,Values=loanwise-ec2-sg" `
  --query "SecurityGroups[0].GroupId" `
  --output text

# 3. Add your IP to security group
aws ec2 authorize-security-group-ingress `
  --group-id $SG_ID `
  --protocol tcp --port 22 `
  --cidr "$MY_IP/32"

# 4. Test SSH manually
ssh -i ~/.ssh/loanwise-prod.pem ec2-user@<instance-ip>

# 5. Check key permissions
icacls ~/.ssh/loanwise-prod.pem
```

### App Won't Start?

**Problem**: Docker container not running or crashing

**Solution**:

```powershell
# 1. Check Docker logs
ansible app_servers -i infrastructure/ansible/inventory/production -a "docker logs loanwise-app"

# 2. Check if image exists
ansible app_servers -i infrastructure/ansible/inventory/production -a "docker images"

# 3. Manually pull image
ansible app_servers -i infrastructure/ansible/inventory/production -a "docker pull your-dockerhub-username/loanwise:latest"

# 4. Check environment variables
ansible app_servers -i infrastructure/ansible/inventory/production -a "docker inspect loanwise-app"

# 5. Try running manually
ssh -i ~/.ssh/loanwise-prod.pem ec2-user@<instance-ip>
docker run -it --rm loanwise:latest sh  # Interactive shell
```

### Prometheus Not Showing Data?

**Problem**: Prometheus has no metrics or targets are down

**Solution**:

```powershell
# 1. Check Prometheus config
ansible monitoring -i infrastructure/ansible/inventory/production -a "cat /etc/prometheus/prometheus.yml"

# 2. Check Prometheus logs
ansible monitoring -i infrastructure/ansible/inventory/production -a "journalctl -u prometheus -n 50"

# 3. Verify Prometheus is running
ansible monitoring -i infrastructure/ansible/inventory/production -a "systemctl status prometheus"

# 4. Check targets manually
curl http://MONITORING_IP:9090/api/v1/targets | jq

# 5. Restart Prometheus
ansible monitoring -i infrastructure/ansible/inventory/production -a "systemctl restart prometheus"

# 6. Check if app is exposing metrics
curl http://APP_IP:8080/metrics
```

### Grafana Can't Connect to Prometheus?

**Problem**: Grafana shows "Data source error"

**Solution**:

```powershell
# 1. Check if Prometheus is accessible
curl http://localhost:9090/-/healthy

# 2. Update Grafana data source
# Login to Grafana → Configuration → Data Sources → Prometheus
# URL should be: http://localhost:9090

# 3. Test connection in Grafana
# Click "Save & Test" button

# 4. Check Grafana logs
ansible monitoring -i infrastructure/ansible/inventory/production -a "journalctl -u grafana-server -n 50"

# 5. Restart Grafana
ansible monitoring -i infrastructure/ansible/inventory/production -a "systemctl restart grafana-server"
```

### Terraform Apply Fails?

**Problem**: Terraform shows errors during apply

**Solution**:

```powershell
# 1. Check Terraform state
terraform state list

# 2. Validate configuration
terraform validate

# 3. Check for resource conflicts
terraform plan

# 4. Unlock state if locked
terraform force-unlock <lock-id>

# 5. Refresh state
terraform refresh

# 6. Target specific resources
terraform apply -target=aws_instance.example

# 7. If all else fails, import existing resources
terraform import aws_instance.example i-xxxxx
```

### Load Balancer Returns 502/503?

**Problem**: ALB shows bad gateway errors

**Solution**:

```powershell
# 1. Check target health
aws elbv2 describe-target-health `
  --target-group-arn <tg-arn>

# 2. Check if app is responding
ansible app_servers -i infrastructure/ansible/inventory/production -a "curl http://localhost:8080/health"

# 3. Check ALB logs (if enabled)
aws s3 ls s3://loanwise-alb-logs/

# 4. Check security groups
# Make sure ALB can reach EC2 instances on port 8080

# 5. Verify health check settings
aws elbv2 describe-target-groups --names loanwise-tg
```

### Database Connection Issues?

**Problem**: App can't connect to RDS

**Solution**:

```powershell
# 1. Check RDS endpoint
$RDS_ENDPOINT = aws rds describe-db-instances `
  --db-instance-identifier loanwise-db `
  --query "DBInstances[0].Endpoint.Address" `
  --output text

# 2. Test connection from EC2
ssh -i ~/.ssh/loanwise-prod.pem ec2-user@<instance-ip>
telnet $RDS_ENDPOINT 5432

# 3. Check security group rules
# RDS security group must allow inbound from EC2 security group on port 5432

# 4. Check RDS status
aws rds describe-db-instances --db-instance-identifier loanwise-db

# 5. Check connection string in app
docker inspect loanwise-app | grep DATABASE_URL
```

### Out of Disk Space?

**Problem**: Docker or system running out of space

**Solution**:

```powershell
# 1. Check disk usage
ansible all -i infrastructure/ansible/inventory/production -a "df -h"

# 2. Clean up Docker
ansible all -i infrastructure/ansible/inventory/production -a "docker system prune -af --volumes"

# 3. Remove old images
ansible all -i infrastructure/ansible/inventory/production -a "docker image prune -af"

# 4. Check Docker disk usage
ansible all -i infrastructure/ansible/inventory/production -a "docker system df"

# 5. Increase EBS volume size
aws ec2 modify-volume --volume-id vol-xxxxx --size 50
```

### Jenkins Pipeline Fails?

**Problem**: Jenkins build fails

**Solution**:

1. **Check Console Output** in Jenkins
2. **Verify Credentials** are configured correctly
3. **Check Docker daemon** is running
4. **Verify AWS credentials** have permissions
5. **Check Terraform** is installed on Jenkins
6. **Verify Ansible** connectivity from Jenkins

```powershell
# On Jenkins server
docker ps
terraform version
ansible --version
aws sts get-caller-identity
```

---

## 🎉 You're Done!

Your complete LoanWise infrastructure is now running with:

- ✅ **AWS Infrastructure**: VPC, EC2, RDS, ALB, Auto Scaling
- ✅ **Dockerized Application**: Running in containers
- ✅ **Automated Deployment**: Terraform + Ansible
- ✅ **Monitoring**: Prometheus + Grafana
- ✅ **CI/CD Pipeline**: Jenkins (optional)
- ✅ **High Availability**: Multi-AZ, Auto Scaling, Load Balancing

### Access Your System

| Component | URL | Credentials |
|-----------|-----|-------------|
| **Application** | `http://<alb-dns>` | - |
| **Prometheus** | `http://<monitoring-ip>:9090` | - |
| **Grafana** | `http://<monitoring-ip>:3000` | admin / admin |
| **Jenkins** | `http://<jenkins-ip>:8080` | Your admin user |

### Next Steps

1. ✅ Set up CloudWatch alarms
2. ✅ Configure SSL/TLS certificates
3. ✅ Set up Route53 for custom domain
4. ✅ Configure backup schedules
5. ✅ Set up log aggregation (ELK/CloudWatch)
6. ✅ Create runbooks for common issues
7. ✅ Set up monitoring alerts in Grafana

### Important Files

- **Terraform state**: S3 bucket `loanwise-terraform-state-*`
- **SSH key**: `~/.ssh/loanwise-prod.pem`
- **Ansible inventory**: `infrastructure/ansible/inventory/production`
- **Monitoring dashboards**: Grafana at port 3000

### Monthly Costs Estimate

- **EC2 (t3.medium × 2)**: ~$60/month
- **RDS (db.t3.small Multi-AZ)**: ~$70/month
- **ALB**: ~$20/month
- **Data Transfer**: ~$10/month
- **S3/CloudWatch**: ~$5/month
- **Total**: ~$165/month

### Support

For issues or questions:
- **Documentation**: Check `INFRASTRUCTURE_GUIDE.md`, `MONITORING_SETUP.md`
- **Logs**: Use Ansible or AWS Console to check logs
- **Monitoring**: Check Grafana dashboards for metrics

---

**🚀 Your LoanWise infrastructure is fully operational!**
