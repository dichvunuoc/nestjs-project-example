#!/bin/bash

# Health check script for deployment
# Usage: ./scripts/health-check.sh [URL]

HEALTH_URL="${1:-http://localhost:3000/health}"
MAX_ATTEMPTS=30
ATTEMPT=0
DELAY=2

echo "Health check for: $HEALTH_URL"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed (HTTP $HTTP_CODE)"
    exit 0
  fi
  
  ATTEMPT=$((ATTEMPT+1))
  echo "⏳ Attempt $ATTEMPT/$MAX_ATTEMPTS - HTTP $HTTP_CODE (waiting ${DELAY}s...)"
  sleep $DELAY
done

echo "❌ Health check failed after $MAX_ATTEMPTS attempts"
exit 1
