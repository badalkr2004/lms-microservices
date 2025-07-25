# PowerShell script to build all libraries and services in the correct order

# Clean all build artifacts first
Write-Host "🧹 Cleaning all build artifacts..." -ForegroundColor Cyan
pnpm -r clean

# Build libraries in correct order
Write-Host "🔨 Building common library..." -ForegroundColor Cyan
Set-Location -Path libs/common
pnpm build
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Common library build failed!" -ForegroundColor Red
  exit 1
}

Write-Host "🔨 Building logger library..." -ForegroundColor Cyan
Set-Location -Path ../logger
pnpm build
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Logger library build failed!" -ForegroundColor Red
  exit 1
}

Write-Host "🔨 Building database library..." -ForegroundColor Cyan
Set-Location -Path ../database
pnpm build
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Database library build failed!" -ForegroundColor Red
  exit 1
}

# Build the user service
Write-Host "🔨 Building user-service..." -ForegroundColor Cyan
Set-Location -Path ../../services/user-service
pnpm build
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ User service build failed!" -ForegroundColor Red
  exit 1
}

Write-Host "✅ All builds completed successfully!" -ForegroundColor Green
Write-Host "🚀 Starting user service..." -ForegroundColor Cyan
pnpm start
