# Deployment Guide

## Docker Compose (Development/Staging)

The easiest way to run the full stack is using the root `docker-compose.yml`.

```bash
docker-compose up -d
```

## Kubernetes (Production)

Sample manifests are available in `infra/k8s/`.

1.  **Build Images**:
    ```bash
    docker build -t arc-backend:latest apps/backend
    docker build -t arc-frontend:latest apps/frontend
    ```

2.  **Apply Manifests**:
    ```bash
    kubectl apply -f infra/k8s/deployment.yaml
    ```
