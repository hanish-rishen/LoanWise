# LoanWise Infrastructure & CI/CD Implementation Guide

This guide covers the complete implementation of the LoanWise deployment infrastructure across 6 stages.

## 📋 Implementation Checklist

- [x] **Step 1: Jenkins Setup** - CI/CD pipeline configuration
- [x] **Step 2: Dockerize App** - Container image creation and testing
- [x] **Step 3: Infrastructure (Terraform)** - AWS infrastructure as code
- [x] **Step 4: App Deployment (Ansible)** - Application deployment automation
- [x] **Step 5: Monitoring (Prometheus)** - Application metrics collection
- [x] **Step 6: Visualization (Grafana)** - Metrics visualization and dashboards

---

## Step 1: Jenkins Setup

### Overview
The Jenkins pipeline orchestrates the entire CI/CD workflow, from code checkout to production deployment.

### File: `Jenkinsfile`

#### Pipeline Stages:
1. **Checkout** - Clone the repository
2. **Install Dependencies** - Install Node.js packages
3. **Code Quality** - Run linting and type checking
4. **Security Scan** - Run npm audit
5. **Build Application** - Build the React app
6. **Test** - Run test suite
7. **Build Docker Image** - Create Docker container
8. **Test Docker Image** - Run container tests
9. **Push Docker Image** - Push to registry (main branch only)
10. **Terraform Plan** - Plan infrastructure changes
11. **Terraform Apply Approval** - Manual approval gate
12. **Terraform Apply** - Deploy infrastructure
13. **Deploy with Ansible** - Deploy app to servers
14. **Setup Prometheus** - Configure monitoring
15. **Setup Grafana** - Configure visualization

#### Jenkins Configuration:

1. **Create Jenkins credentials:**
   ```
   - docker-registry-url: Your Docker registry URL
   - docker-credentials: Docker registry credentials
   - vite-clerk-key: Clerk publishable key
   - vite-groq-key: Groq API key
   - vite-database-url: Database connection string
   ```

2. **Create a new Pipeline job:**
   - Pipeline script from SCM
   - Git repository: Your LoanWise repo
   - Branch: `*/main`
   - Script path: `Jenkinsfile`

3. **Configure webhook triggers:**
   - GitHub/GitLab webhook to trigger builds on push

### Run Locally:
```bash
# Install Jenkins
# Create pipeline job pointing to this repository
# Trigger builds manually or via webhook
```

---

## Step 2: Dockerize App

### Overview
Containerizes the LoanWise application for consistent deployment across environments.

### Files:
- `Dockerfile` - Multi-stage production build
- Docker image is tested and pushed as part of pipeline

#### Docker Build Process:
1. Build stage with Node.js 18 Alpine
2. Install dependencies
3. Run type-check and linting
4. Build React app with Vite
5. Production stage with Nginx
6. Copy built app to Nginx
7. Add health checks

#### Build Command:
```bash
docker build \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=<key> \
  --build-arg VITE_GROQ_API_KEY=<key> \
  -t loanwise:latest .
```

#### Test Command:
```bash
# Start container
docker run -d -p 8080:8080 loanwise:latest

# Health check
curl http://localhost:8080/health

# Stop container
docker stop <container_id>
```

---

## Step 3: Infrastructure (Terraform)

### Overview
Creates and manages AWS infrastructure using Terraform as Infrastructure as Code (IaC).

### Files:
- `infrastructure/terraform/main.tf` - Provider and backend configuration
- `infrastructure/terraform/variables.tf` - Input variables
- `infrastructure/terraform/networking.tf` - VPC, subnets, security groups
- `infrastructure/terraform/database.tf` - RDS PostgreSQL instance
- `infrastructure/terraform/compute.tf` - EC2, ALB, Auto Scaling Group
- `infrastructure/terraform/iam.tf` - IAM roles and policies
- `infrastructure/terraform/outputs.tf` - Output values
- `infrastructure/terraform/user_data.sh` - EC2 bootstrap script

### Architecture:

```
┌─────────────────────────────────────────┐
│          AWS Region (us-east-1)         │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Application Load Balancer      │   │
│  │  (Public, Port 80/443)          │   │
│  └──────────┬──────────────────────┘   │
│             │                          │
│  ┌──────────▼──────────────────────┐   │
│  │    Auto Scaling Group           │   │
│  │  ┌────────────┐  ┌────────────┐ │   │
│  │  │  EC2 Inst  │  │  EC2 Inst  │ │   │
│  │  │ (Docker)   │  │ (Docker)   │ │   │
│  │  └────────────┘  └────────────┘ │   │
│  └──────────┬──────────────────────┘   │
│             │                          │
│  ┌──────────▼──────────────────────┐   │
│  │    RDS PostgreSQL (Multi-AZ)    │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Terraform Setup:

1. **Create S3 backend bucket:**
   ```bash
   aws s3api create-bucket \
     --bucket loanwise-terraform-state \
     --region us-east-1
   
   aws s3api put-bucket-versioning \
     --bucket loanwise-terraform-state \
     --versioning-configuration Status=Enabled
   ```

2. **Create DynamoDB table:**
   ```bash
   aws dynamodb create-table \
     --table-name terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
   ```

3. **Initialize Terraform:**
   ```bash
   cd infrastructure/terraform
   terraform init
   ```

4. **Plan deployment:**
   ```bash
   terraform plan -var-file=production.tfvars -out=tfplan
   ```

5. **Apply changes:**
   ```bash
   terraform apply tfplan
   ```

### Created Resources:
- VPC with public and private subnets
- Internet Gateway and NAT Gateway
- Security groups for ALB, EC2, and RDS
- Application Load Balancer
- Auto Scaling Group with EC2 instances
- RDS PostgreSQL database (Multi-AZ)
- IAM roles and policies

---

## Step 4: App Deployment (Ansible)

### Overview
Automates application deployment to servers using Ansible playbooks.

### Files:
- `infrastructure/ansible/deploy.yml` - Application deployment playbook
- `infrastructure/ansible/inventory/production` - Inventory file with server details

### Deployment Steps:

1. **Update system packages**
2. **Install Docker**
3. **Login to Docker registry**
4. **Pull Docker image**
5. **Stop old container**
6. **Start new container**
7. **Wait for health check**

### Run Deployment:

```bash
cd infrastructure/ansible

# Deploy to production
ansible-playbook deploy.yml \
  -i inventory/production \
  -e "docker_image=registry.example.com/loanwise:latest" \
  -e "environment=production"
```

### Update Inventory:

Edit `infrastructure/ansible/inventory/production`:
```ini
[app_servers]
10.0.1.10  # Private IP of your EC2 instance
10.0.1.11
```

---

## Step 5: Monitoring (Prometheus)

### Overview
Collects application and system metrics using Prometheus.

### Files:
- `infrastructure/ansible/monitoring/prometheus.yml` - Prometheus setup playbook
- `infrastructure/ansible/monitoring/prometheus.yml.j2` - Prometheus configuration template
- `infrastructure/ansible/monitoring/prometheus.service.j2` - Systemd service file

### Prometheus Configuration:

The setup monitors:
- Prometheus itself
- LoanWise application (port 8080/metrics)
- Node exporter metrics (port 9100)

### Install Prometheus:

```bash
ansible-playbook infrastructure/ansible/monitoring/prometheus.yml \
  -i infrastructure/ansible/inventory/production
```

### Access Prometheus:
- URL: `http://<server-ip>:9090`
- Query examples:
  - `up` - Check if targets are up
  - `http_requests_total` - Total HTTP requests
  - `process_resident_memory_bytes` - Memory usage

---

## Step 6: Visualization (Grafana)

### Overview
Visualizes metrics collected by Prometheus using Grafana dashboards.

### Files:
- `infrastructure/ansible/monitoring/grafana.yml` - Grafana setup playbook

### Grafana Setup:

1. **Install Grafana:**
   ```bash
   ansible-playbook infrastructure/ansible/monitoring/grafana.yml \
     -i infrastructure/ansible/inventory/production
   ```

2. **Access Grafana:**
   - URL: `http://<server-ip>:3000`
   - Default credentials: `admin` / `admin`

3. **Add Prometheus data source:**
   - Settings → Data Sources → Add
   - Type: Prometheus
   - URL: `http://localhost:9090`

4. **Create dashboards:**
   - Import pre-built dashboards or create custom ones
   - Monitor app performance, server health, etc.

---

## Complete Pipeline Workflow

```
┌────────────────────────────────────────────────────────────────┐
│                    Git Push to main branch                     │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────────┐
         │  Jenkins Trigger  │
         └────────┬──────────┘
                  │
     ┌────────────┴────────────┐
     │                         │
     ▼                         ▼
┌─────────────┐           ┌──────────────┐
│ Build & Test│           │  Code Quality│
│   (npm)     │           │  (lint/tsc)  │
└────────┬────┘           └──────┬───────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Build Docker Image    │
         │ Test Docker Image     │
         └─────────┬─────────────┘
                   │
                   ▼
         ┌───────────────────────┐
         │ Push to Registry      │
         └─────────┬─────────────┘
                   │
                   ▼
         ┌───────────────────────┐
         │ Terraform Plan        │
         └─────────┬─────────────┘
                   │
         ┌─────────▼──────────┐
         │ Manual Approval    │
         └─────────┬──────────┘
                   │
                   ▼
         ┌───────────────────────┐
         │ Terraform Apply       │
         │ (Create/Update AWS)   │
         └─────────┬─────────────┘
                   │
                   ▼
         ┌───────────────────────┐
         │ Deploy with Ansible   │
         │ (Pull & Run Docker)   │
         └─────────┬─────────────┘
                   │
                   ▼
         ┌───────────────────────┐
         │ Setup Prometheus      │
         └─────────┬─────────────┘
                   │
                   ▼
         ┌───────────────────────┐
         │ Setup Grafana         │
         └─────────┬─────────────┘
                   │
                   ▼
         ┌───────────────────────┐
         │ Deployment Complete   │
         └───────────────────────┘
```

---

## Configuration Files

### Environment Variables (.env)
```bash
# Docker Registry
DOCKER_REGISTRY=registry.example.com
DOCKER_CREDENTIALS_USR=username
DOCKER_CREDENTIALS_PSW=password

# Application
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_GROQ_API_KEY=gsk_...
VITE_APP_URL=https://loanwise.example.com

# Database (RDS output)
DATABASE_URL=postgresql://admin:password@loanwise-db.xyz.us-east-1.rds.amazonaws.com:5432/loanwise

# Grafana
GRAFANA_ADMIN_PASSWORD=secure_password_here
```

### Terraform Variables (terraform.tfvars)
```hcl
aws_region              = "us-east-1"
environment             = "production"
project_name            = "loanwise"
vpc_cidr                = "10.0.0.0/16"
instance_count          = 2
instance_type           = "t3.medium"
database_instance_class = "db.t3.small"
database_password       = "secure_password_here"
docker_image            = "registry.example.com/loanwise:latest"
```

---

## Monitoring & Debugging

### Jenkins Pipeline Issues:
```bash
# Check Jenkins logs
tail -f /var/log/jenkins/jenkins.log

# Verify Docker setup
docker ps
docker logs <container_id>
```

### Terraform Issues:
```bash
# Validate configuration
terraform validate

# Check state
terraform state list
terraform state show <resource>

# Refresh state
terraform refresh
```

### Ansible Issues:
```bash
# Test connectivity
ansible all -i inventory/production -m ping

# Run with verbose output
ansible-playbook deploy.yml -i inventory/production -vvv

# Check SSH connectivity
ssh -i ~/.ssh/loanwise-prod.pem ec2-user@<ip>
```

### Application Issues:
```bash
# Check container logs
docker logs loanwise-app

# Check health endpoint
curl http://localhost:8080/health

# View Prometheus metrics
curl http://localhost:9090/api/v1/query?query=up

# Access Grafana
http://<server-ip>:3000
```

---

## Security Best Practices

1. **Secrets Management:**
   - Store all secrets in Jenkins credentials
   - Never commit secrets to Git
   - Use AWS Secrets Manager for production

2. **Network Security:**
   - Use private subnets for databases and app servers
   - Restrict security group rules to minimum required
   - Use NAT Gateway for outbound traffic

3. **IAM Security:**
   - Principle of least privilege
   - Use IAM roles instead of access keys
   - Regularly rotate credentials

4. **Monitoring & Logging:**
   - Enable CloudWatch logging
   - Set up alerts for anomalies
   - Monitor failed login attempts

---

## Cost Optimization

### Resource Sizing:
- Start with t3.micro/t3.small for testing
- Scale up as needed
- Use Reserved Instances for long-term

### Auto Scaling:
- Configure scale up/down based on metrics
- Use spot instances for non-critical workloads

### Database:
- Use RDS free tier if eligible
- Enable backup retention policies
- Monitor storage usage

---

## Next Steps

1. Set up Jenkins with GitHub/GitLab webhook
2. Create AWS S3 bucket for Terraform state
3. Configure Jenkins credentials
4. Test pipeline with first commit
5. Monitor application in production
6. Set up CloudWatch alerts
7. Configure backup and disaster recovery

---

## Troubleshooting

### Common Issues:

**Pipeline fails at Terraform stage:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Validate Terraform
cd infrastructure/terraform
terraform validate
```

**Ansible deployment fails:**
```bash
# Check SSH connectivity
ssh -i ~/.ssh/loanwise-prod.pem ec2-user@<server-ip>

# Test Docker on target server
ansible app_servers -i inventory/production -m command -a "docker ps"
```

**Application not responding:**
```bash
# Check if container is running
docker ps | grep loanwise

# Check container logs
docker logs loanwise-app

# Test health endpoint
curl http://localhost:8080/health
```

**Prometheus not collecting metrics:**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify app is exposing metrics
curl http://localhost:8080/metrics
```

---

## Support

For issues or questions, refer to:
- [Terraform Documentation](https://www.terraform.io/docs)
- [Ansible Documentation](https://docs.ansible.com)
- [Prometheus Documentation](https://prometheus.io/docs)
- [Grafana Documentation](https://grafana.com/docs)
