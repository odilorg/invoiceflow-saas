#!/bin/bash

# Deployment script with cache busting for InvoiceFlow

echo "🚀 Starting InvoiceFlow deployment with cache busting..."

# Generate build version
export BUILD_VERSION="v$(date +%s)"
echo "Build version: $BUILD_VERSION"

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

# Store build version for runtime
echo "$BUILD_VERSION" > .next/BUILD_ID

# Restart PM2 with update-env to apply new environment
echo "🔄 Restarting application..."
pm2 restart invoice-followup --update-env

# Clear Nginx cache if exists
if [ -d "/var/cache/nginx" ]; then
  echo "🧹 Clearing Nginx cache..."
  sudo rm -rf /var/cache/nginx/*
fi

# Send deployment notification (optional)
echo "✅ Deployment complete! Version: $BUILD_VERSION"

# Display instructions for users
echo ""
echo "========================================="
echo "IMPORTANT: Users may need to:"
echo "1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Clear browser cache"
echo "3. Or wait for auto-update notification"
echo "========================================="