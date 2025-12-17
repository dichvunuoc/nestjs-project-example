# DevOps Guide - Deployment & Infrastructure

## 📋 Tổng Quan

Guide này hướng dẫn cách sử dụng các DevOps components đã được tạo sẵn:
- Docker & Docker Compose
- Kubernetes manifests
- CI/CD pipelines
- Deployment scripts

---

## 🐳 Docker

### Build Image

```bash
# Production build
docker build -f docker/Dockerfile -t nestjs-app:latest .

# Development build
docker build -f docker/Dockerfile.dev -t nestjs-app:dev .
```

### Run Container

```bash
# Run single container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  nestjs-app:latest

# Run với docker-compose
docker-compose up -d
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Stop và remove volumes
docker-compose down -v

# Start với RabbitMQ
docker-compose --profile rabbitmq up -d
```

### Health Check

```bash
# Check container health
docker ps  # Check STATUS column

# Manual health check
curl http://localhost:3000/health
```

---

## ☸️ Kubernetes

### Prerequisites

```bash
# Install kubectl
# https://kubernetes.io/docs/tasks/tools/

# Setup kubeconfig
export KUBECONFIG=~/.kube/config
```

### Deploy

```bash
# Apply all manifests
kubectl apply -f k8s/

# Deploy specific resource
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Check Status

```bash
# Check deployment
kubectl get deployment nestjs-app

# Check pods
kubectl get pods -l app=nestjs-app

# Check service
kubectl get service nestjs-app-service

# Check ingress
kubectl get ingress nestjs-app-ingress
```

### View Logs

```bash
# Pod logs
kubectl logs -l app=nestjs-app

# Follow logs
kubectl logs -f -l app=nestjs-app

# Specific pod
kubectl logs <pod-name>
```

### Update Deployment

```bash
# Update image
kubectl set image deployment/nestjs-app app=nestjs-app:v1.0.1

# Rollout status
kubectl rollout status deployment/nestjs-app

# Rollback
kubectl rollout undo deployment/nestjs-app
```

### Secrets

```bash
# Create secret
kubectl create secret generic nestjs-secrets \
  --from-literal=database-url=postgresql://... \
  --from-literal=redis-url=redis://...

# Update secret
kubectl edit secret nestjs-secrets
```

---

## 🔄 CI/CD

### GitHub Actions

#### CI Pipeline

Tự động chạy khi:
- Push to `main` hoặc `develop`
- Pull request

Jobs:
1. **Lint** - Code linting
2. **Test** - Unit tests với coverage
3. **Build** - Build application

#### CD Pipeline

Tự động chạy khi:
- Push to `main`
- Tag với format `v*`

Jobs:
1. **Build and Push** - Build Docker image và push to registry
2. **Deploy** - Deploy to Kubernetes

### Setup Secrets

```bash
# GitHub Repository Settings > Secrets and variables > Actions

# Docker Hub
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-password

# Kubernetes
KUBECONFIG=<base64-encoded-kubeconfig>
```

### Manual Trigger

```bash
# Trigger workflow manually
gh workflow run ci.yml
gh workflow run cd.yml
```

---

## 📜 Scripts

### Health Check Script

```bash
# Default (localhost:3000)
./scripts/health-check.sh

# Custom URL
./scripts/health-check.sh http://api.example.com/health
```

### Deployment Script

```bash
# Deploy to production
./scripts/deploy.sh production latest

# Deploy to staging
./scripts/deploy.sh staging v1.0.1
```

---

## 🏥 Health Checks

### Application Health Endpoint

```
GET /health
```

Response:
```json
{
  "status": "UP",
  "timestamp": "2025-01-17T10:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "UP",
      "message": "Database connection healthy"
    },
    "redis": {
      "status": "UP",
      "message": "Redis connection healthy"
    }
  }
}
```

### Kubernetes Probes

- **Liveness Probe**: `/health` - Restart container nếu unhealthy
- **Readiness Probe**: `/health` - Remove từ load balancer nếu not ready
- **Startup Probe**: `/health` - Wait for app to start

---

## 🔐 Environment Variables

### Development

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

### Production

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@db-host:5432/mydb
REDIS_URL=redis://redis-host:6379
LOG_LEVEL=info
MESSAGE_BUS_TYPE=rabbitmq
RABBITMQ_URL=amqp://rabbitmq-host:5672
```

---

## 📊 Monitoring

### Prometheus Metrics

```bash
# Scrape metrics
curl http://localhost:3000/metrics
```

### Grafana Dashboard

Import Prometheus metrics vào Grafana:
- `nestjs_http_requests_total`
- `nestjs_http_request_duration_seconds`
- `nestjs_http_active_requests`

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed và merged
- [ ] Tests passing
- [ ] Build successful
- [ ] Docker image built và tested
- [ ] Environment variables configured
- [ ] Secrets created/updated
- [ ] Database migrations run (if needed)

### Deployment

- [ ] Deploy to staging first
- [ ] Health checks passing
- [ ] Smoke tests passed
- [ ] Deploy to production
- [ ] Monitor logs và metrics
- [ ] Verify functionality

### Post-Deployment

- [ ] Health checks stable
- [ ] No errors in logs
- [ ] Metrics looking good
- [ ] User acceptance testing
- [ ] Rollback plan ready (if needed)

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs <container-id>

# Check health
docker inspect <container-id> | grep Health
```

### Pod CrashLoopBackOff

```bash
# Check pod logs
kubectl logs <pod-name>

# Check events
kubectl describe pod <pod-name>

# Check resource limits
kubectl top pod <pod-name>
```

### Health Check Failing

```bash
# Manual check
curl http://localhost:3000/health

# Check database connection
kubectl exec -it <pod-name> -- psql $DATABASE_URL

# Check Redis connection
kubectl exec -it <pod-name> -- redis-cli -u $REDIS_URL ping
```

---

## 📚 Best Practices

### Docker

- ✅ Multi-stage builds để giảm image size
- ✅ Non-root user trong container
- ✅ Health checks trong Dockerfile
- ✅ .dockerignore để exclude unnecessary files

### Kubernetes

- ✅ Resource limits và requests
- ✅ Liveness, readiness, và startup probes
- ✅ Rolling updates strategy
- ✅ Secrets management
- ✅ ConfigMaps cho non-sensitive configs

### CI/CD

- ✅ Run tests trước khi build
- ✅ Build và test Docker image
- ✅ Tag images với version
- ✅ Deploy to staging trước production

---

**Last Updated:** 2025-01-17
