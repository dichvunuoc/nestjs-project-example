#!/bin/bash

# Deployment script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT="${1:-production}"
IMAGE_TAG="${2:-latest}"

echo "🚀 Deploying to $ENVIRONMENT with tag $IMAGE_TAG"

# Build Docker image
echo "📦 Building Docker image..."
docker build -f docker/Dockerfile -t nestjs-app:$IMAGE_TAG .

# Tag image
docker tag nestjs-app:$IMAGE_TAG nestjs-app:$ENVIRONMENT

# Push to registry (if needed)
# docker push nestjs-app:$IMAGE_TAG

# Deploy to Kubernetes
if [ -d "k8s" ]; then
  echo "☸️  Deploying to Kubernetes..."
  kubectl set image deployment/nestjs-app app=nestjs-app:$IMAGE_TAG -n $ENVIRONMENT
  kubectl rollout status deployment/nestjs-app -n $ENVIRONMENT
fi

# Health check
echo "🏥 Running health check..."
./scripts/health-check.sh

echo "✅ Deployment completed successfully!"
