# Quick Local Monitoring Setup
# Run Prometheus + Grafana on your Windows machine

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  STARTING LOCAL MONITORING" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

cd R:\LoanWise\LoanWise\monitoring

Write-Host "Starting Prometheus and Grafana with Docker Compose..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "`nWaiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`nChecking container status..." -ForegroundColor Yellow
docker-compose ps

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  MONITORING IS READY!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Access here:" -ForegroundColor White
Write-Host "  Grafana:      http://localhost:3000" -ForegroundColor Cyan
Write-Host "                Login: admin / admin123`n" -ForegroundColor Yellow
Write-Host "  Prometheus:   http://localhost:9090" -ForegroundColor Cyan
Write-Host "  AlertManager: http://localhost:9093" -ForegroundColor Cyan
Write-Host "  Node Metrics: http://localhost:9100/metrics" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "  2. Login with admin / admin123" -ForegroundColor White
Write-Host "  3. Go to Dashboards > Import" -ForegroundColor White
Write-Host "  4. Enter ID: 1860 (Node Exporter Full)" -ForegroundColor White
Write-Host "  5. Select Prometheus as data source and click Import" -ForegroundColor White

Write-Host "`n========================================`n" -ForegroundColor Cyan
