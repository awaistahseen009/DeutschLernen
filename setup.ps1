# DeutschMeister - Windows PowerShell Setup Script
Write-Host "=======================================================" -ForegroundColor Gold
Write-Host " DeutschMeister - Automated Windows Setup Script" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Gold

# Check Node.js
try {
    $nodeVer = node -v
    Write-Host "Found Node.js version: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH. Please install Node.js v18+." -ForegroundColor Red
    exit 1
}

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Pushing Prisma Database Schema & Generating Client..." -ForegroundColor Cyan
npx prisma db push --skip-generate
npx prisma generate

Write-Host "=======================================================" -ForegroundColor Gold
Write-Host " Setup complete! Run: npm run dev to start!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Gold
