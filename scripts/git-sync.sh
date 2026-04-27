#!/bin/bash

# Configuration
GITHUB_TOKEN="${GITHUB_TOKEN:-""}" 
GITHUB_USER="${GITHUB_USER:-""}"
REPO_NAME="flix-gosts-system"

echo "🚀 Starting Ghost System Synchronization (Self-Hosted Model)..."

# Fix for Termux/Android shared storage ownership issues
CURRENT_DIR=$(pwd)
echo "🔧 Configuring git safe directory for: $CURRENT_DIR"
git config --global --add safe.directory "$CURRENT_DIR"

# Check for git
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed."
    exit 1
fi

# Request Username if missing
if [ -z "$GITHUB_USER" ]; then
    read -p "👤 Enter your GitHub Username: " GITHUB_USER
fi

# Initialize repository
if [ ! -d ".git" ]; then
    echo "📂 Initializing repository..."
    git init
    git checkout -b main
fi

# Add files
echo "➕ Staging changes..."
git add .
git commit -m "🚀 Deploying Full-Stack Ghost System with Local DB" 2>/dev/null

# Set remote
if [ -n "$GITHUB_TOKEN" ]; then
    REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
else
    REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
fi

# Create repo via GitHub API (ignore error if exists)
echo "📡 Verifying GitHub Repository..."
if [ -n "$GITHUB_TOKEN" ]; then
    curl -H "Authorization: token ${GITHUB_TOKEN}" -d "{\"name\":\"${REPO_NAME}\", \"private\": true}" https://api.github.com/user/repos > /dev/null 2>&1
fi

git remote add origin "${REMOTE_URL}" 2>/dev/null || git remote set-url origin "${REMOTE_URL}"

# Push
echo "⬆️ Pushing code to GitHub (you may be prompted for password/token)..."
git push -u origin main --force

echo "✅ Synchronization Complete!"
echo "🔗 Repository: https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo "-------------------------------------------------------"
echo "Next Step: Run 'bash scripts/deploy-vps.sh' on your VPS server."
