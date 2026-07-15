#!/bin/bash
# Push Chamak Street to GitHub
# Usage: GITHUB_TOKEN=your_token bash push-to-github.sh
# Or set GITHUB_TOKEN in Replit Secrets first

TOKEN="${GITHUB_TOKEN}"
REPO="shayxn/Chamakos-Bazaar"

if [ -z "$TOKEN" ]; then
  echo "❌ GITHUB_TOKEN is not set."
  echo "   1. Go to GitHub → Settings → Developer Settings → Personal access tokens"
  echo "   2. Generate a token with 'repo' scope"
  echo "   3. In Replit: Secrets → Add Secret → Name: GITHUB_TOKEN, Value: your_token"
  echo "   Then run: bash push-to-github.sh"
  exit 1
fi

echo "🔧 Configuring remote with token..."
git remote set-url origin "https://${TOKEN}@github.com/${REPO}.git"

echo "📦 Fetching latest from origin..."
git fetch origin main 2>/dev/null

AHEAD=$(git rev-list HEAD...origin/main --count 2>/dev/null || echo "?")
echo "ℹ️  Your branch is ahead of origin. Pushing..."

echo "🚀 Pushing to GitHub (force-with-lease)..."
git push origin main --force-with-lease

STATUS=$?

# Always restore clean remote URL (no token in URL)
git remote set-url origin "https://github.com/${REPO}.git"

if [ $STATUS -eq 0 ]; then
  echo "✅ Successfully pushed to https://github.com/${REPO}"
else
  echo "❌ Push failed (exit $STATUS)"
  echo "   Make sure your token has 'repo' write access."
fi
