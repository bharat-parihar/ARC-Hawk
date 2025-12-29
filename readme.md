# ARC Hawk Monorepo

![Production Status](https://img.shields.io/badge/status-verified-green)
![Architecture](https://img.shields.io/badge/architecture-clean-blue)
![License](https://img.shields.io/badge/license-Apache%202.0-lightgrey)

Enterprise-grade monorepo containing the Hawk-Eye scanner, ARC Platform backend, and dashboard.

> **Production Readiness**: System verified for enterprise use. See [Verification Report](brain/verification_report.md) for details.

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

### Required
- **Docker & Docker Compose** - For PostgreSQL
- **Go 1.21+** - For backend compilation
- **Node.js 18+** - For frontend
- **Python 3.9+** - For Hawk-Eye scanner

### Optional (Graceful Degradation)
- **Neo4j** - Enhanced graph visualization (falls back to PostgreSQL)
- **Presidio** - ML-based PII detection (falls back to rules-only)

> 💡 See [Failure Modes Guide](docs/FAILURE_MODES.md) for degradation behavior

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
