#!/bin/bash

# Pre-Publish Verification Script
echo "🔍 Indeks SDK - Pre-Publish Verification"
echo "=========================================="
echo ""

ERRORS=0

# Check 1: Build
echo "🔨 Building packages..."
bun run build:all > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - run 'bun run build:all' to see errors"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Verify dist folders
echo ""
echo "📂 Checking build outputs..."
for pkg in shared core react; do
    if [ -d "packages/$pkg/dist/cjs" ] && [ -d "packages/$pkg/dist/esm" ] && [ -d "packages/$pkg/dist/types" ]; then
        echo "✅ packages/$pkg/dist complete"
    else
        echo "❌ packages/$pkg/dist incomplete"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check 3: Verify integration fixes
echo ""
echo "🔧 Verifying critical fixes..."

if grep -q '"x-api-key": this.config.apiKey' "packages/core/src/lib/analytics.ts"; then
    echo "✅ API header: x-api-key"
else
    echo "❌ API header NOT fixed"
    ERRORS=$((ERRORS + 1))
fi

if grep -q 'indeks.bl0q.app/api/v1/collect' "packages/shared/src/constants/index.ts"; then
    echo "✅ Endpoint: indeks.bl0q.app/api/v1/collect"
else
    echo "❌ Endpoint NOT configured"
    ERRORS=$((ERRORS + 1))
fi

if grep -q 'private analytics: IndeksAnalytics' "packages/core/src/lib/tracker.ts"; then
    echo "✅ Analytics integrated"
else
    echo "❌ Analytics NOT integrated"
    ERRORS=$((ERRORS + 1))
fi

if grep -q 'this.analytics.batch' "packages/core/src/lib/tracker.ts"; then
    echo "✅ Event batching enabled"
else
    echo "❌ Event batching NOT enabled"
    ERRORS=$((ERRORS + 1))
fi

if grep -q 'autoFlushInterval' "packages/core/src/lib/tracker.ts"; then
    echo "✅ Auto-flush timer enabled"
else
    echo "❌ Auto-flush timer NOT enabled"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: Version consistency
echo ""
echo "📦 Checking package versions..."
SHARED_VERSION=$(cat packages/shared/package.json | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
CORE_VERSION=$(cat packages/core/package.json | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
REACT_VERSION=$(cat packages/react/package.json | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

echo "  @indeks/shared: $SHARED_VERSION"
echo "  @indeks/core: $CORE_VERSION"
echo "  @indeks/react: $REACT_VERSION"

if [ "$SHARED_VERSION" = "$CORE_VERSION" ] && [ "$CORE_VERSION" = "$REACT_VERSION" ]; then
    echo "✅ All packages have same version"
else
    echo "❌ Version mismatch - all packages should have same version"
    ERRORS=$((ERRORS + 1))
fi

# Final report
echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED!"
    echo ""
    echo "Ready to publish version: $CORE_VERSION"
    echo ""
    echo "Next steps:"
    echo "  1. Test with test-integration.html"
    echo "  2. git add . && git commit -m 'chore: release v$CORE_VERSION'"
    echo "  3. git push origin main"
    echo "  4. Go to GitHub Actions and run 'Publish to NPM'"
    echo "     https://github.com/ru-dr/indeks-sdk/actions"
else
    echo "❌ VERIFICATION FAILED - $ERRORS error(s) found"
    echo ""
    echo "Fix the errors above before publishing"
fi
echo "=========================================="
