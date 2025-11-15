#!/usr/bin/env pwsh

Write-Host "🔨 Building Indeks SDK Packages..." -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Clean and build shared
Write-Host "📦 Building @indeks/shared..." -ForegroundColor Yellow
Set-Location "packages\shared"
bun run clean
bun run build
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ @indeks/shared build failed" -ForegroundColor Red
    exit 1 
}
Write-Host "✅ @indeks/shared built" -ForegroundColor Green
Set-Location "..\..\"

# Clean and build core
Write-Host ""
Write-Host "📦 Building @indeks/core..." -ForegroundColor Yellow
Set-Location "packages\core"
bun run clean
bun run build
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ @indeks/core build failed" -ForegroundColor Red
    exit 1 
}
Write-Host "✅ @indeks/core built" -ForegroundColor Green
Set-Location "..\..\"

# Clean and build react
Write-Host ""
Write-Host "📦 Building @indeks/react..." -ForegroundColor Yellow
Set-Location "packages\react"
bun run clean
bun run build
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ @indeks/react build failed" -ForegroundColor Red
    exit 1 
}
Write-Host "✅ @indeks/react built" -ForegroundColor Green
Set-Location "..\..\"

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ All packages built successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your IDE TypeScript server" -ForegroundColor White
Write-Host "   VS Code: Ctrl+Shift+P → 'TypeScript: Restart TS Server'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart your dev server:" -ForegroundColor White
Write-Host "   cd ..\indeks" -ForegroundColor Gray
Write-Host "   bun run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "The TypeScript errors should now be gone! ✨" -ForegroundColor Green
