#!/bin/bash
set -e

# Log output
exec > >(tee /var/log/user_data.log)
exec 2>&1

echo "Starting user data script..."

# Update system
yum update -y

# Install Docker
amazon-linux-extras install -y docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install CloudWatch Agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Pull and run Docker image
aws ecr get-login-password --region $(curl -s http://169.254.169.254/latest/meta-data/placement/region) | docker login --username AWS --password-stdin $(echo ${docker_image} | cut -d'/' -f1)
docker pull ${docker_image}

# Run Docker container
docker run -d \
  --name loanwise-app \
  --restart always \
  -p 8080:8080 \
  -e DATABASE_URL="${database_url}" \
  ${docker_image}

echo "User data script completed"
