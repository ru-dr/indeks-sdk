# Release Process

This document outlines the process for releasing new versions of the Indeks SDK packages to GitHub Packages.

## Prerequisites

1. **GitHub Repository**: Ensure you have push access to the repository
2. **GitHub Token**: The workflow uses `GITHUB_TOKEN` which is automatically available in GitHub Actions
3. **Package Permissions**: Ensure packages are set to public in the repository settings:
   - Go to your GitHub repo → Settings → Packages
   - For each package (@indeks/core, @indeks/react, @indeks/shared), set visibility to "Public"

## Release Steps

### 1. Update Package Versions

Update the version in each package's `package.json`:

```bash
# For a patch release (1.0.0 -> 1.0.1)
cd packages/core && npm version patch
cd ../react && npm version patch
cd ../shared && npm version patch

# For a minor release (1.0.0 -> 1.1.0)
cd packages/core && npm version minor
cd ../react && npm version minor
cd ../shared && npm version minor

# For a major release (1.0.0 -> 2.0.0)
cd packages/core && npm version major
cd ../react && npm version major
cd ../shared && npm version major
```

### 2. Commit and Push Version Changes

```bash
git add .
git commit -m "chore: bump version to x.x.x"
git push origin main
```

### 3. Trigger the Release Workflow

1. Go to your GitHub repository → **Actions** tab
2. Click **"Publish to GitHub Packages"** workflow
3. Click **"Run workflow"** button
4. Enter the version number (e.g., `1.2.0`) in the input field
5. Click **"Run workflow"**

### 4. Monitor the GitHub Action

1. Go to the **Actions** tab in your GitHub repository
2. Watch the "Publish to GitHub Packages" workflow run
3. Verify all packages are published successfully

### 5. Verify Release

After the workflow completes, check that:

1. **Packages are published** to GitHub Packages (repo → Packages tab)
2. **GitHub Release is created** with automatically generated release notes (repo → Releases tab)
3. **Release notes include**:
   - Commits since the last release
   - Contributors to the release
   - Links to pull requests (if any)
   - Categorization of changes (features, bug fixes, etc.)

## Quick Release Script

You can use this script for quick releases:

```bash
# release.sh
#!/bin/bash

VERSION_TYPE=${1:-patch}  # patch, minor, or major

echo "Bumping version ($VERSION_TYPE) for all packages..."

cd packages/shared && npm version $VERSION_TYPE --no-git-tag-version
cd ../core && npm version $VERSION_TYPE --no-git-tag-version
cd ../react && npm version $VERSION_TYPE --no-git-tag-version
cd ../..

# Get the new version from one of the packages
NEW_VERSION=$(cat packages/core/package.json | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

echo "New version: $NEW_VERSION"

git add .
git commit -m "chore: bump version to $NEW_VERSION"

echo "Ready to push and trigger workflow! Run:"
echo "  git push origin main"
echo "  Then manually trigger the GitHub Actions workflow with version: $NEW_VERSION"
```

Make it executable:

```bash
chmod +x release.sh
```

Use it:

```bash
./release.sh patch   # for patch releases
./release.sh minor   # for minor releases
./release.sh major   # for major releases
```

## Rollback

**Note:** GitHub Packages does not support unpublishing packages like npm does. If you need to rollback:

1. **Delete the GitHub Release** (repo → Releases → find the release → Delete)
2. **Bump version and republish** with fixes
3. **Inform users** to update to the new version

For critical issues, you may need to:

- Mark the release as a draft (temporarily hides it)
- Create a new release with fixes
- Update documentation to point users to the corrected version

## Troubleshooting

### Authentication Error

- The workflow uses `GITHUB_TOKEN` automatically - no manual setup required
- Ensure you have push access to the repository
- Check that packages are set to public visibility in repository settings

### GitHub Release Action Fails (403)

- Make sure your workflow uses `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
- Go to GitHub repo → Settings → Actions → General → Workflow permissions
- Set to "Read and write permissions"

### Build Failure

- Run `bun run build:all` locally to verify builds work
- Check for TypeScript errors
- Ensure all dependencies are properly installed

### Version Already Published

- You cannot republish the same version
- Bump the version number and try again

### Package Not Found During Publish

- Ensure package.json has correct "name" field
- Verify publishConfig is set correctly in each package.json
- Check that the GitHub Packages registry URL is correct in the workflow
