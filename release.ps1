param(
    [Parameter(Position = 0)]
    [ValidateSet('patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease', 'custom')]
    [string]$VersionType = "patch",
    
    [Parameter(Position = 1)]
    [string]$CustomVersion,
    
    [switch]$Publish,
    [switch]$DryRun,
    [switch]$SkipValidation,
    [string]$CommitMessage,
    [string]$Branch = "main"
)

# Color output helpers
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "→ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }

Write-Info "Starting release process..."

# Validate custom version if provided
if ($VersionType -eq "custom") {
    if (-not $CustomVersion) {
        Write-Error "Custom version requires -CustomVersion parameter (e.g., -CustomVersion '2.0.0')"
        exit 1
    }
    if ($CustomVersion -notmatch '^\d+\.\d+\.\d+(-[\w\.]+)?$') {
        Write-Error "Invalid version format. Use semver format (e.g., 1.2.3 or 1.2.3-beta.1)"
        exit 1
    }
}

# Check for uncommitted changes unless skipped
if (-not $SkipValidation) {
    $status = git status --porcelain
    if ($status) {
        Write-Warning "You have uncommitted changes:"
        Write-Host $status
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne 'y') {
            Write-Info "Release cancelled"
            exit 0
        }
    }
}

# Get current version
$currentPackageJson = Get-Content "packages\core\package.json" | ConvertFrom-Json
$currentVersion = $currentPackageJson.version
Write-Info "Current version: $currentVersion"

# Bump versions
Write-Info "Bumping versions in all packages..."

if ($VersionType -eq "custom") {
    # Set custom version directly
    $packages = @("shared", "core", "react")
    foreach ($pkg in $packages) {
        $pkgPath = "packages\$pkg\package.json"
        $pkgJson = Get-Content $pkgPath -Raw | ConvertFrom-Json
        $pkgJson.version = $CustomVersion
        $pkgJson | ConvertTo-Json -Depth 100 | Set-Content $pkgPath -NoNewline
        Write-Success "Updated $pkg to $CustomVersion"
    }
    $newVersion = $CustomVersion
} else {
    # Manually update versions to avoid npm workspace errors
    $packages = @("shared", "core", "react")
    
    # Calculate new version
    $parts = $currentVersion -split '\.'
    
    switch ($VersionType) {
        'major' { $newVersion = "$(([int]$parts[0]) + 1).0.0" }
        'minor' { $newVersion = "$($parts[0]).$(([int]$parts[1]) + 1).0" }
        'patch' { $newVersion = "$($parts[0]).$($parts[1]).$(([int]$parts[2]) + 1)" }
        default { 
            Write-Error "Version type $VersionType not supported. Use 'major', 'minor', 'patch', or 'custom'"
            exit 1
        }
    }
    
    # Update all package.json files
    foreach ($pkg in $packages) {
        $pkgPath = "packages\$pkg\package.json"
        $pkgJson = Get-Content $pkgPath -Raw | ConvertFrom-Json
        $pkgJson.version = $newVersion
        $pkgJson | ConvertTo-Json -Depth 100 | Set-Content $pkgPath -NoNewline
    }
    Write-Success "Updated all packages to v$newVersion ($VersionType)"
}

# Dry run check
if ($DryRun) {
    Write-Warning "DRY RUN - No changes will be committed or pushed"
    Write-Info "Would update version: $currentVersion → $newVersion"
    Write-Info "Would commit with message: chore: release v$newVersion$(if ($Publish) { ' [publish]' })"
    Write-Info "Would push to: origin/$Branch"
    if ($Publish) {
        Write-Info "Would trigger NPM publish workflow"
    }
    exit 0
}

# Stage changes
git add .
Write-Success "Staged version changes"

# Commit with custom or default message
$defaultMessage = "chore: release v$newVersion"
if ($Publish) {
    $defaultMessage += " [publish]"
}
$finalMessage = if ($CommitMessage) { "$CommitMessage [v$newVersion]$(if ($Publish) { ' [publish]' })" } else { $defaultMessage }

git commit -m $finalMessage
Write-Success "Committed: $finalMessage"

# Push to branch
Write-Info "Pushing to origin/$Branch..."
git push origin $Branch

if ($Publish) {
    Write-Success "Publishing v$newVersion to NPM via GitHub Actions..."
    Write-Info "Monitor workflow at: https://github.com/ru-dr/indeks-sdk/actions"
    Write-Info "Packages will be published: @indeks/shared, @indeks/core, @indeks/react"
} else {
    Write-Success "Committed v$newVersion without publishing"
    Write-Info "To publish, run: .\release.ps1 -VersionType $VersionType -Publish"
}

Write-Success "Done! Version $currentVersion → $newVersion"
