#!/bin/bash

# ==========================================
# Zero-Downtime Deployment Script
# Usage: ./deploy.sh [production|staging]
# ==========================================

ENV=$1

if [ -z "$ENV" ]; then
  echo "Error: Environment not specified."
  echo "Usage: ./deploy.sh [production|staging]"
  exit 1
fi

echo "Starting deployment for environment: $ENV"

# 1. Install dependencies cleanly
echo "Installing dependencies..."
npm ci --omit=dev
if [ $? -ne 0 ]; then
  echo "Failed to install dependencies. Aborting."
  exit 1
fi

# 2. Reload PM2 (Zero-downtime if configured correctly)
echo "Reloading application with PM2..."
pm2 reload ecosystem.config.js --env $ENV
if [ $? -ne 0 ]; then
  echo "PM2 reload failed. Aborting."
  exit 1
fi

# 3. Health Check
echo "Waiting 5 seconds for application to start..."
sleep 5

HEALTH_URL="http://localhost:5000/api/health"
echo "Performing health check on $HEALTH_URL..."

HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" $HEALTH_URL)

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "✅ Health check passed! Deployment to $ENV successful."
else
  echo "❌ Health check failed (HTTP $HTTP_STATUS). Initiating rollback..."
  
  # Rollback: undo the git pull (go back 1 commit/state)
  git reset --hard HEAD@{1}
  
  # Install dependencies for old state
  npm ci --omit=dev
  
  # Reload PM2 with old state
  pm2 reload ecosystem.config.js --env $ENV
  
  echo "⚠️ Rollback completed. Please check the logs for errors."
  exit 1
fi
