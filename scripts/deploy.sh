#!/bin/bash
# CaltransBizConnect Deployment Script

echo "--- Starting Deployment Preparation ---"

# 1. Run migrations if needed (locally)
# npm run migrate

# 2. Check for .env.production
if [ ! -f .env.production ]; then
    echo "Warning: .env.production not found. Ensure it exists on the server."
fi

# 3. Git Push to main (Triggers GitHub Actions or Hostinger Git)
echo "Pushing code to GitHub..."
git add .
git commit -m "chore: migrate to MySQL and update deployment config"
git push origin main

echo "--- Deployment Push Complete ---"
echo "Note: If using Hostinger Git integration, the site will update automatically."
echo "If using manual deployment, upload the following files/folders:"
echo "- server/ (all refactored files)"
echo "- public/ (if applicable)"
echo "- package.json"
echo "- .env.production (rename to .env on server)"
