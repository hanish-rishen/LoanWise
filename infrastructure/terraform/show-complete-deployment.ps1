# Complete Deployment Summary Script
Write-Host "`n" -NoNewline
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "           LOANWISE COMPLETE INFRASTRUCTURE                 " -ForegroundColor Green -BackgroundColor Black
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get all resources
$resources = terraform state list
$totalCount = ($resources | Measure-Object).Count

Write-Host "📊 DEPLOYMENT SUMMARY" -ForegroundColor Yellow
Write-Host "   Total Resources Deployed: " -NoNewline -ForegroundColor White
Write-Host "$totalCount AWS Resources" -ForegroundColor Green
Write-Host ""

# Get outputs
Write-Host "🌐 APPLICATION ENDPOINTS" -ForegroundColor Yellow
$outputs = terraform output -json | ConvertFrom-Json

if ($outputs.alb_dns_name) {
    Write-Host "   Load Balancer URL: " -NoNewline -ForegroundColor White
    Write-Host "http://$($outputs.alb_dns_name.value)" -ForegroundColor Cyan
}

if ($outputs.database_endpoint) {
    Write-Host "   Database Endpoint: " -NoNewline -ForegroundColor White
    Write-Host "$($outputs.database_endpoint.value)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📋 DEPLOYED RESOURCES" -ForegroundColor Yellow

# Group resources by type
$grouped = $resources | ForEach-Object {
    $parts = $_ -split '\.'
    [PSCustomObject]@{
        Type = $parts[0]
        Name = $parts[1]
        Full = $_
    }
} | Group-Object Type

foreach ($group in $grouped | Sort-Object Name) {
    $icon = switch ($group.Name) {
        "aws_vpc" { "🌐" }
        "aws_subnet" { "🔌" }
        "aws_internet_gateway" { "🌍" }
        "aws_nat_gateway" { "🔄" }
        "aws_route_table" { "🗺️" }
        "aws_security_group" { "🔒" }
        "aws_lb" { "⚖️" }
        "aws_lb_target_group" { "🎯" }
        "aws_lb_listener" { "👂" }
        "aws_launch_template" { "📋" }
        "aws_autoscaling_group" { "📈" }
        "aws_db_instance" { "🗄️" }
        "aws_db_subnet_group" { "🔗" }
        "aws_eip" { "📍" }
        "aws_route_table_association" { "🔗" }
        default { "✅" }
    }

    Write-Host "   $icon " -NoNewline -ForegroundColor Green
    Write-Host "$($group.Name) " -NoNewline -ForegroundColor White
    Write-Host "($($group.Count))" -ForegroundColor Gray
}

Write-Host ""
Write-Host "💰 COST ESTIMATE" -ForegroundColor Yellow
Write-Host "   Estimated Monthly Cost: ~\$25-35 USD" -ForegroundColor White
Write-Host "   (2x t2.micro EC2 + RDS t3.micro + Load Balancer)" -ForegroundColor Gray

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          ✅ INFRASTRUCTURE DEPLOYMENT COMPLETE! ✅         " -ForegroundColor Green -BackgroundColor Black
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Build and push Docker image to Docker Hub" -ForegroundColor White
Write-Host "   2. Deploy application using Ansible" -ForegroundColor White
Write-Host "   3. Access your application at the Load Balancer URL" -ForegroundColor White
Write-Host ""
