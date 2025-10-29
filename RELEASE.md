# Release Process

This document outlines the process for releasing new versions of the Indeks SDK packages.

## Prerequisites

1. **NPM Account**: Ensure you have an npm account with publish access to the `indeks` organization
2. **NPM Token**: Generate an automation token from npm:
   - Go to https://www.npmjs.com/
   - Log in and click your profile icon → Access Tokens (or https://www.npmjs.com/settings/indeks/tokens)
   - Click "Generate New Token" and choose "Automation" type
   - Copy the token (starts with `npm_...`)
3. **GitHub Secret**: Add the npm token as a GitHub repository secret named `NPM_TOKEN`:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`, Value: your npm token
   - Click "Add secret"

## Setting up NPM_TOKEN in GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Your npm automation token (starts with `npm_`)
6. Click **Add secret**

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

### 3. Create and Push a Git Tag

```bash
# Create a tag matching the new version
git tag v1.0.1

# Push the tag to trigger the publish workflow
git push origin main
git push origin v1.0.1
```

### 4. Monitor the GitHub Action

1. Go to the **Actions** tab in your GitHub repository
2. Watch the "Publish to NPM" workflow run
3. Verify all packages are published successfully

### 5. Verify Publication

Check that your packages are live on npm:

- https://www.npmjs.com/package/@indeks/core
- https://www.npmjs.com/package/@indeks/react
- https://www.npmjs.com/package/@indeks/shared

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
git tag "v$NEW_VERSION"

echo "Ready to push! Run:"
echo "  git push origin main"
echo "  git push origin v$NEW_VERSION"
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

If you need to unpublish a version (within 72 hours):

```bash
npm unpublish @indeks/core@x.x.x
npm unpublish @indeks/react@x.x.x
npm unpublish @indeks/shared@x.x.x
```

## Troubleshooting

### Authentication Error

- Verify `NPM_TOKEN` is correctly set in GitHub Secrets
- Ensure the token has publish permissions
- Check token hasn't expired

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
- Verify you have access to publish to the `indeks` npm organization
