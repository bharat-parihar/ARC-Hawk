# ARC Hawk Monorepo

Enterprise-grade monorepo containing the Hawk-Eye scanner, ARC Platform backend, and dashboard.

## Structure

### Applications (`apps/`)

- **[Scanner](apps/scanner/README.md)** (`apps/scanner/`) - Python-based PII and secret scanner
- **[Backend](apps/backend/README.md)** (`apps/backend/`) - Go-based platform backend (Clean Architecture)
- **[Frontend](apps/frontend/README.md)** (`apps/frontend/`) - Next.js 14 dashboard

### Libraries (`libs/`)

- **[API Contracts](libs/api-contracts/README.md)** (`libs/api-contracts/`) - Shared API definitions
- **[Common](libs/common/README.md)** (`libs/common/`) - Shared utilities

### Infrastructure (`infra/`)

- **Docker** - Container configurations
- **K8s** - Kubernetes manifests
- **Terraform** - Infrastructure as Code

### Documentation (`docs/`)

- **[Architecture](docs/architecture/README.md)** - System design and architecture docs

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Go 1.21+
- Node.js 18+
- Python 3.9+

### Running with Docker Compose

To start the entire platform (Database, Backend, Frontend):

```bash
docker-compose up -d
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Database**: localhost:5432

### Development Setup

Please refer to the README in each application directory for specific development instructions.

## License

Apache License 2.0
