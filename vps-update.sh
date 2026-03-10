#!/bin/bash
set -e

echo "========================================="
echo "   ERP-CRM VPS CI/CD Update Script       "
echo "========================================="

# Ensure we're running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo ./vps-update.sh)"
  exit 1
fi

PROJECT_DIR=$(pwd)
export PATH=$PATH:/usr/local/go/bin:/snap/bin
echo "Updating project in $PROJECT_DIR"

# 1. Pull latest code (Assume git is already set up and authenticated on the branch you want)
echo "Pulling latest code from git..."
git pull || echo "Warning: Git pull failed or you are not in a git repository. Proceeding with local updates..."

# 2. Rebuild Backend
echo "Building Go Backend..."
go mod tidy
go build -o erpcrm_backend ./cmd/server

# 3. Restart Backend Service
echo "Restarting backend systemd service..."
systemctl restart erpcrm
echo "Backend service restarted."

# 4. Rebuild Frontend
echo "Cleaning old frontend build..."
rm -rf "$PROJECT_DIR/frontend/dist"

echo "Building Frontend..."
cd "$PROJECT_DIR/frontend"

# Pass the backend URL variable for the build
export VITE_API_URL="https://crmapi.appnity.cloud/api"

npm install
npm run build
cd "$PROJECT_DIR"

# 5. Reload Nginx cache/config just in case
echo "Reloading Nginx..."
systemctl reload nginx

echo "========================================="
echo "   Update Complete!                      "
echo "========================================="
echo "Your platform should now be live with the latest changes."
