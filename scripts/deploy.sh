#!/bin/bash
set -e

ENV=$1

if [ -z "$ENV" ]; then
  echo "Usage: $0 [dev|staging|prod]"
  exit 1
fi

echo "Deploying to $ENV environment..."

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "kubectl could not be found"
    exit 1
fi

# Apply kustomize configuration
kubectl apply -k k8s/overlays/$ENV

echo "Deployment to $ENV initiated."
