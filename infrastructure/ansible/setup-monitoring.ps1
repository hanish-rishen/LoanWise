# Complete Monitoring Stack Setup Script
# This script sets up Prometheus, Grafana, and Node Exporter

param(
    [string]$InventoryPath = "inventory/production",
    [switch]$SkipNodeExporter,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        LoanWise Monitoring Stack Installation               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check if Ansible is installed
try {
    $ansibleVersion = ansible --version 2>&1 | Select-Object -First 1
    Write-Host "✅ Ansible installed: $ansibleVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Ansible not found. Please install Ansible first." -ForegroundColor Red
    Write-Host "   Install with: pip install ansible" -ForegroundColor Yellow
    exit 1
}

# Check if inventory file exists
if (-not (Test-Path $InventoryPath)) {
    Write-Host "❌ Inventory file not found: $InventoryPath" -ForegroundColor Red
    Write-Host "   Please create the inventory file first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Inventory file found" -ForegroundColor Green

# Test connectivity
Write-Host ""
Write-Host "🔌 Testing connectivity to servers..." -ForegroundColor Yellow

$pingResult = ansible all -i $InventoryPath -m ping 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cannot connect to servers. Check your inventory and SSH keys." -ForegroundColor Red
    Write-Host $pingResult
    exit 1
}

Write-Host "✅ All servers reachable" -ForegroundColor Green

# Setup Node Exporter (system metrics)
if (-not $SkipNodeExporter) {
    Write-Host ""
    Write-Host "📊 Installing Node Exporter (system metrics)..." -ForegroundColor Yellow

    $nodeExporterArgs = @(
        "monitoring/node-exporter.yml",
        "-i", $InventoryPath
    )

    if ($Verbose) {
        $nodeExporterArgs += "-v"
    }

    ansible-playbook @nodeExporterArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node Exporter installed successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Node Exporter installation had issues" -ForegroundColor Yellow
    }
}

# Setup Prometheus
Write-Host ""
Write-Host "📈 Installing Prometheus..." -ForegroundColor Yellow

$prometheusArgs = @(
    "monitoring/prometheus.yml",
    "-i", $InventoryPath
)

if ($Verbose) {
    $prometheusArgs += "-v"
}

ansible-playbook @prometheusArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prometheus installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Prometheus installation failed" -ForegroundColor Red
    exit 1
}

# Setup Grafana
Write-Host ""
Write-Host "📊 Installing Grafana..." -ForegroundColor Yellow

$grafanaArgs = @(
    "monitoring/grafana.yml",
    "-i", $InventoryPath
)

if ($Verbose) {
    $grafanaArgs += "-v"
}

ansible-playbook @grafanaArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Grafana installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Grafana installation failed" -ForegroundColor Red
    exit 1
}

# Get monitoring server IP
Write-Host ""
Write-Host "🔍 Getting monitoring server information..." -ForegroundColor Yellow

$monitoringIP = ansible monitoring -i $InventoryPath -m shell -a "hostname -I | awk '{print `$1}'" 2>&1 | Select-String -Pattern "\d+\.\d+\.\d+\.\d+" | ForEach-Object { $_.Matches[0].Value }

if (-not $monitoringIP) {
    $monitoringIP = "<monitoring-server-ip>"
}

# Display success message
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                 🎉 INSTALLATION COMPLETE! 🎉                 ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Access Your Monitoring Stack:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Prometheus:  http://$monitoringIP:9090" -ForegroundColor Yellow
Write-Host "  Grafana:     http://$monitoringIP:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Default Grafana Credentials:" -ForegroundColor Cyan
Write-Host "    Username: admin" -ForegroundColor White
Write-Host "    Password: admin" -ForegroundColor White
Write-Host "    (Change password on first login)" -ForegroundColor Gray
Write-Host ""

Write-Host "🔍 Quick Verification Commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Check Prometheus status" -ForegroundColor Gray
Write-Host "  ansible monitoring -i $InventoryPath -a 'systemctl status prometheus'" -ForegroundColor White
Write-Host ""
Write-Host "  # Check Grafana status" -ForegroundColor Gray
Write-Host "  ansible monitoring -i $InventoryPath -a 'systemctl status grafana-server'" -ForegroundColor White
Write-Host ""
Write-Host "  # Test Prometheus API" -ForegroundColor Gray
Write-Host "  curl http://$monitoringIP:9090/api/v1/targets" -ForegroundColor White
Write-Host ""

Write-Host "📈 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Open Grafana: http://$monitoringIP:3000" -ForegroundColor White
Write-Host "  2. Login with admin/admin" -ForegroundColor White
Write-Host "  3. Import dashboards (see MONITORING_SETUP.md)" -ForegroundColor White
Write-Host "  4. Set up alerts for critical metrics" -ForegroundColor White
Write-Host ""

Write-Host "📚 For more details, see:" -ForegroundColor Cyan
Write-Host "  - MONITORING_SETUP.md" -ForegroundColor White
Write-Host "  - INFRASTRUCTURE_GUIDE.md" -ForegroundColor White
Write-Host ""
