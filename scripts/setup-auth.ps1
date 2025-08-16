# LMS Authentication Setup Script
# This script sets up the authentication system for all microservices

Write-Host "🔐 Setting up LMS Authentication System..." -ForegroundColor Green

# Generate secure API keys for each service
function New-ApiKey {
    param([string]$ServiceName)
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    $key = [System.Convert]::ToBase64String($bytes) -replace '[/+=]', ''
    return "${ServiceName}_$($key.Substring(0, 24))"
}

# Generate shared secret key
function New-SecretKey {
    $bytes = New-Object byte[] 64
    [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    return [System.Convert]::ToBase64String($bytes) -replace '[/+=]', ''
}

Write-Host "📝 Generating secure API keys..." -ForegroundColor Yellow

$services = @(
    "course-service",
    "payment-service", 
    "assessment-service",
    "analytics-service",
    "notification-service",
    "live-session-service",
    "file-service",
    "api-gateway"
)

$envContent = @"
# LMS Authentication Configuration
# Generated on $(Get-Date)

# Service API Keys
"@

foreach ($service in $services) {
    $apiKey = New-ApiKey $service
    $envVarName = $service.ToUpper().Replace("-", "_") + "_API_KEY"
    $envContent += "`n$envVarName=$apiKey"
    Write-Host "✅ Generated API key for $service" -ForegroundColor Green
}

$secretKey = New-SecretKey
$envContent += @"

# Shared secret for HMAC signatures
SERVICE_SECRET_KEY=$secretKey

# User Service Configuration
USER_SERVICE_URL=http://localhost:3001

# Service Ports
USER_SERVICE_PORT=3001
COURSE_SERVICE_PORT=3002
PAYMENT_SERVICE_PORT=3003
ASSESSMENT_SERVICE_PORT=3004
ANALYTICS_SERVICE_PORT=3005
NOTIFICATION_SERVICE_PORT=3006
LIVE_SESSION_SERVICE_PORT=3007
FILE_SERVICE_PORT=3008
API_GATEWAY_PORT=3000
"@

# Write to .env file
$envPath = Join-Path $PSScriptRoot "..\\.env.auth"
$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "📄 Environment configuration written to .env.auth" -ForegroundColor Green
Write-Host "⚠️  Please copy these values to your main .env file" -ForegroundColor Yellow

# Build shared auth library
Write-Host "🔨 Building shared authentication library..." -ForegroundColor Yellow
Set-Location (Join-Path $PSScriptRoot "..\\libs\\shared-auth")

if (Test-Path "package.json") {
    npm install
    npm run build
    Write-Host "✅ Shared auth library built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Shared auth library not found" -ForegroundColor Red
}

# Return to root directory
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "`n🎉 Authentication system setup complete!" -ForegroundColor Green
Write-Host "📚 Read docs/AUTHENTICATION.md for usage instructions" -ForegroundColor Cyan
Write-Host "🔧 Configure your services using the generated API keys" -ForegroundColor Cyan

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Copy .env.auth contents to your main .env file"
Write-Host "2. Update each service to use @lms/shared-auth"
Write-Host "3. Configure API Gateway with authentication middleware"
Write-Host "4. Test the authentication flow"
