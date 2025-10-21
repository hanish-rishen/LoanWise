# Complete Prometheus & Grafana Setup Guide for LoanWise

This guide will get Prometheus and Grafana monitoring up and running for your LoanWise application.

---

## 🎯 What You'll Get

- **Prometheus**: Collects metrics from your LoanWise app, servers, and Docker containers
- **Grafana**: Beautiful dashboards to visualize all metrics
- **Pre-configured**: Ready-to-use setup with Ansible playbooks

---

## 📋 Prerequisites

1. **EC2 instances running** (from Terraform deployment)
2. **Ansible installed** locally
3. **SSH access** to your EC2 instances
4. **LoanWise app deployed** (running in Docker)

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Verify Your Inventory

Check that your EC2 IPs are in `infrastructure/ansible/inventory/production`:

```ini
[monitoring]
10.0.1.20  # Your monitoring server IP (can be same as app server)

[app_servers]
10.0.1.10
10.0.1.11
```

### Step 2: Install Prometheus

```powershell
cd infrastructure/ansible

# Deploy Prometheus
ansible-playbook monitoring/prometheus.yml -i inventory/production

# Check if it's running
ansible monitoring -i inventory/production -a "systemctl status prometheus"
```

**Access Prometheus**: `http://<monitoring-server-ip>:9090`

### Step 3: Install Grafana

```powershell
# Deploy Grafana
ansible-playbook monitoring/grafana.yml -i inventory/production

# Check if it's running
ansible monitoring -i inventory/production -a "systemctl status grafana-server"
```

**Access Grafana**: `http://<monitoring-server-ip>:3000`
- **Default credentials**: `admin` / `admin`

---

## 📊 What Gets Monitored

### Application Metrics (Port 8080)
- HTTP request count
- Response times
- Error rates
- Active connections

### System Metrics (Node Exporter - Port 9100)
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### Docker Metrics (cAdvisor - Port 8080)
- Container CPU/Memory
- Container network I/O
- Container restarts

### Database Metrics (RDS)
- Connection count
- Query performance
- Storage usage

---

## 🔧 Detailed Setup Instructions

### Option 1: All-in-One Setup (Recommended)

Run this single command to set up everything:

```powershell
cd infrastructure/ansible

# Setup both Prometheus and Grafana
ansible-playbook monitoring/prometheus.yml -i inventory/production
ansible-playbook monitoring/grafana.yml -i inventory/production
```

### Option 2: Step-by-Step Setup

#### A. Setup Prometheus

```powershell
# 1. Test connectivity
ansible monitoring -i inventory/production -m ping

# 2. Install Prometheus
ansible-playbook monitoring/prometheus.yml -i inventory/production -v

# 3. Verify installation
ansible monitoring -i inventory/production -a "prometheus --version"

# 4. Check service status
ansible monitoring -i inventory/production -a "systemctl status prometheus"

# 5. Test Prometheus UI
# Open browser: http://<monitoring-ip>:9090
# Try query: up
```

#### B. Setup Node Exporter (for system metrics)

```powershell
# Run this playbook to add node exporter
ansible-playbook monitoring/node-exporter.yml -i inventory/production
```

#### C. Setup Grafana

```powershell
# 1. Install Grafana
ansible-playbook monitoring/grafana.yml -i inventory/production -v

# 2. Verify installation
ansible monitoring -i inventory/production -a "grafana-server -v"

# 3. Check service status
ansible monitoring -i inventory/production -a "systemctl status grafana-server"

# 4. Access Grafana
# Open browser: http://<monitoring-ip>:3000
# Login: admin / admin (change on first login)
```

---

## 📈 Configure Grafana Dashboards

### After logging into Grafana:

1. **Add Prometheus Data Source**:
   - Already configured automatically!
   - Verify: Configuration → Data Sources → Prometheus

2. **Import Pre-built Dashboards**:

   **For Docker Monitoring**:
   ```
   Dashboard ID: 193
   Name: Docker Dashboard
   ```

   **For Node/Server Monitoring**:
   ```
   Dashboard ID: 1860
   Name: Node Exporter Full
   ```

   **For Application Monitoring**:
   ```
   Dashboard ID: 3662
   Name: Prometheus 2.0 Overview
   ```

   **How to import**:
   - Click **+** → **Import**
   - Enter Dashboard ID
   - Select Prometheus data source
   - Click **Import**

---

## 🎯 Verify Everything Works

### Test Prometheus

```powershell
# Check targets are up
curl http://<monitoring-ip>:9090/api/v1/targets

# Run test queries
curl 'http://<monitoring-ip>:9090/api/v1/query?query=up'
curl 'http://<monitoring-ip>:9090/api/v1/query?query=node_cpu_seconds_total'
```

### Test Grafana

```powershell
# Check health
curl http://<monitoring-ip>:3000/api/health

# List dashboards
curl -u admin:admin http://<monitoring-ip>:3000/api/search
```

---

## 🔍 What Prometheus Monitors

Based on `prometheus.yml.j2` configuration:

```yaml
# Prometheus itself
- localhost:9090

# LoanWise Application
- localhost:8080/metrics

# Node Exporter (system metrics)
- localhost:9100
```

---

## 📊 Sample Queries in Prometheus

Try these queries in Prometheus UI (`http://<ip>:9090/graph`):

```promql
# Check if targets are up
up

# CPU usage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100

# HTTP requests per second
rate(http_requests_total[5m])

# Container memory usage
container_memory_usage_bytes{name="loanwise-app"}

# Database connections
pg_stat_database_numbackends
```

---

## 🎨 Create Custom Dashboard in Grafana

1. **Click** **+** → **Create Dashboard**
2. **Add Panel**
3. **Set Query**:
   ```
   rate(http_requests_total[5m])
   ```
4. **Configure visualization** (Graph, Gauge, etc.)
5. **Save Dashboard**

---

## 🔔 Set Up Alerts

### In Prometheus

Edit `prometheus.yml` to add alerting rules:

```yaml
rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:9093
```

### In Grafana

1. **Go to Alerting** → **Notification channels**
2. **Add channel** (Email, Slack, etc.)
3. **Set up alert rules** in dashboards

---

## 🛠️ Troubleshooting

### Prometheus Not Starting?

```powershell
# Check logs
ansible monitoring -i inventory/production -a "journalctl -u prometheus -n 50"

# Check config syntax
ansible monitoring -i inventory/production -a "promtool check config /etc/prometheus/prometheus.yml"

# Restart service
ansible monitoring -i inventory/production -a "systemctl restart prometheus"
```

### Grafana Not Starting?

```powershell
# Check logs
ansible monitoring -i inventory/production -a "journalctl -u grafana-server -n 50"

# Check config
ansible monitoring -i inventory/production -a "cat /etc/grafana/grafana.ini"

# Restart service
ansible monitoring -i inventory/production -a "systemctl restart grafana-server"
```

### Can't Access UI?

```powershell
# Check firewall
ansible monitoring -i inventory/production -a "firewall-cmd --list-all"

# Add ports
ansible monitoring -i inventory/production -a "firewall-cmd --permanent --add-port=9090/tcp"
ansible monitoring -i inventory/production -a "firewall-cmd --permanent --add-port=3000/tcp"
ansible monitoring -i inventory/production -a "firewall-cmd --reload"

# Or check security groups in AWS
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

### No Metrics Showing?

```powershell
# Check if app is exposing metrics
curl http://<app-ip>:8080/metrics

# Check Prometheus targets
curl http://<monitoring-ip>:9090/api/v1/targets
```

---

## 🔒 Security Recommendations

1. **Change default passwords**:
   ```powershell
   ansible monitoring -i inventory/production -m shell -a "grafana-cli admin reset-admin-password NewPassword123"
   ```

2. **Enable HTTPS** (use nginx reverse proxy)

3. **Restrict access** (Security groups, firewall)

4. **Enable authentication** in Prometheus

---

## 📦 What's Already Configured

✅ Prometheus installed via Ansible
✅ Grafana installed via Ansible
✅ Prometheus data source auto-configured in Grafana
✅ Service auto-start on boot
✅ Health checks configured

---

## 🚀 Next Steps

1. ✅ Run the Ansible playbooks
2. ✅ Access Prometheus and Grafana
3. ✅ Import dashboards
4. ✅ Create custom dashboards
5. ✅ Set up alerts
6. ✅ Monitor your app!

---

## 📞 Quick Reference

```
Prometheus UI:    http://<monitoring-ip>:9090
Grafana UI:       http://<monitoring-ip>:3000
Node Exporter:    http://<server-ip>:9100/metrics
App Metrics:      http://<app-ip>:8080/metrics

Default Credentials:
  Grafana: admin / admin
```

---

## 💡 Pro Tips

- **Use variables** in Grafana for dynamic dashboards
- **Set up alerting** for critical metrics
- **Use dashboards** from grafana.com/dashboards
- **Monitor trends** over time, not just current state
- **Create SLIs/SLOs** for your app

---

**Your monitoring stack is ready! Run the playbooks and start monitoring!** 📊
