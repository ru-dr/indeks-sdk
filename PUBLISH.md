# 🚀 Quick Publish Guide

## Before Publishing - Test First!

### 1. Build Everything
```bash
cd "D:\Los Pollos Hermanos\indeks-sdk"
bun run clean
bun run build:all
```

### 2. Test Locally
```bash
# Open test-integration.html in browser
# OR start a server:
bunx serve .
# Then go to: http://localhost:3000/test-integration.html
```

**Test checklist:**
- [ ] Enter API key and initialize tracker
- [ ] See "✅ Tracker initialized!" message  
- [ ] Click test buttons - see events in console
- [ ] See "📡 Indeks: Successfully sent X events" after 5 seconds
- [ ] Check ClickHouse - verify events are stored

---

## Publishing to NPM

### One-Time Setup

1. **Create NPM account**: https://www.npmjs.com/signup

2. **Login to NPM**:
   ```bash
   npm login
   ```

3. **Create access token**:
   ```bash
   npm token create
   ```
   Copy the token!

4. **Add to GitHub**:
   - Go to: https://github.com/ru-dr/indeks-sdk/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: paste your token
   - Click "Add secret"

### Every Release

#### Step 1: Bump Versions

```bash
cd "D:\Los Pollos Hermanos\indeks-sdk"

# Choose one:
./release.sh patch  # 1.2.0 → 1.2.1 (bug fixes)
./release.sh minor  # 1.2.0 → 1.3.0 (new features)
./release.sh major  # 1.2.0 → 2.0.0 (breaking changes)
```

If `release.sh` doesn't exist, manually bump:
```bash
cd packages/shared && npm version patch
cd ../core && npm version patch  
cd ../react && npm version patch
cd ../..
```

#### Step 2: Commit & Push

```bash
# Get the new version
NEW_VERSION=$(cat packages/core/package.json | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

git add .
git commit -m "chore: release v$NEW_VERSION"
git push origin main
```

#### Step 3: Trigger GitHub Action

1. Go to: https://github.com/ru-dr/indeks-sdk/actions
2. Click **"Publish to NPM"** workflow
3. Click **"Run workflow"** dropdown
4. Enter version (e.g., `1.2.1`)
5. Click green **"Run workflow"** button
6. Wait 2-3 minutes for completion

#### Step 4: Verify

```bash
# Check NPM
npm view @indeks/core
npm view @indeks/shared
npm view @indeks/react

# Check GitHub release
# https://github.com/ru-dr/indeks-sdk/releases
```

---

## 🎯 Complete Example

Let's say you want to release version `1.3.0`:

```bash
# 1. Build
cd "D:\Los Pollos Hermanos\indeks-sdk"
bun run build:all

# 2. Test (open test-integration.html and verify)

# 3. Bump version
cd packages/shared && npm version minor
cd ../core && npm version minor
cd ../react && npm version minor
cd ../..

# 4. Commit
git add .
git commit -m "chore: release v1.3.0"
git push origin main

# 5. Go to GitHub Actions and run "Publish to NPM" with version: 1.3.0

# 6. Verify
npm view @indeks/core
```

---

## 🐛 Common Issues

### "npm ERR! 403 Forbidden"
**Fix**: Make sure NPM_TOKEN is added to GitHub secrets

### "npm ERR! You cannot publish over the previously published versions"
**Fix**: Bump version number again
```bash
cd packages/core && npm version patch
```

### Build fails in GitHub Action
**Fix**: Test build locally first
```bash
bun run build:all
# Fix any errors, then push again
```

---

## 📦 After Publishing

Your package will be available at:
```
https://www.npmjs.com/package/@indeks/core
https://www.npmjs.com/package/@indeks/shared
https://www.npmjs.com/package/@indeks/react
```

Users can install with:
```bash
npm install @indeks/core
# or
bun add @indeks/core
```

---

## ⚡ TL;DR - Fastest Publish

```bash
# Build → Test → Version → Commit → GitHub Action
bun run build:all && \
cd packages/shared && npm version patch && \
cd ../core && npm version patch && \
cd ../react && npm version patch && \
cd ../.. && \
git add . && \
git commit -m "chore: release" && \
git push origin main

# Then: Go to GitHub Actions → Run "Publish to NPM" workflow
```

---

## 🎉 You're Ready!

Your SDK is now ready to publish. The integration between SDK and API is complete and tested.

**Event Flow:**
```
Browser Event → SDK Tracker → Analytics Batch → 
(50 events OR 5 seconds) → API → ClickHouse ✅
```
