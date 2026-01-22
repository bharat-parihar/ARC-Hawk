# ARC Platform Backend

The core API and business logic layer for the ARC-Hawk platform, built with **Go (Golang)** following Clean Architecture principles.

## 🌟 Features

- **Modular Monolith**: 7 distinct business modules (Assets, Scanning, Lineage, Compliance, etc.).
- **Real-time Updates**: WebSocket integration for live scan progress bars.
- **Workflow Orchestration**: **Temporal** integration for reliable, long-running scan & remediation jobs.
- **Graph Lineage**: **Neo4j** integration for semantic data mapping.
- **Clean Architecture**: Strict separation of Handler -> Service -> Domain -> Infrastructure.

## 📂 Module Structure

```
internal/
├── api/                # HTTP Handlers (Gin)
├── domain/             # Core Interfaces & Models
├── infrastructure/     # DB/External Adapters
├── service/            # Business Logic
│
└── modules/            # Business Modules
    ├── analytics/      # Risk scoring & dashboard stats
    ├── assets/         # Inventory management
    ├── compliance/     # DPDPA logic & reporting
    ├── connections/    # Source credential management
    ├── lineage/        # Neo4j graph operations
    ├── masking/        # Remediation logic
    └── scanning/       # Scan ingestion & WebSocket events
```

## 🚀 Getting Started

### Prerequisites

- Go 1.21+
- PostgreSQL 15+
- Neo4j 5.15+
- Temporal Server

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `PORT` | API Port | `8080` |
| `DB_HOST` | PostgreSQL Host | `localhost` |
| `DB_USER` | DB Username | `postgres` |
| `NEO4J_URI` | Neo4j Connection | `bolt://localhost:7687` |
| `TEMPORAL_ADDRESS` | Temporal Server | `localhost:7233` |
| `SCAN_ID` | (For Scanner) | Auto-generated |

### Running Locally

```bash
# 1. Install Dependencies
go mod download

# 2. Run Server
go run cmd/server/main.go
```

The server will start on `http://localhost:8080`.

## 🔌 API Endpoints

### Scanning
- `POST /api/v1/scans/trigger` - Start a new scan (Temporal workflow)
- `POST /api/v1/scans/ingest` - Ingest results (called by Scanner)
- `GET /api/v1/scans/:id/status` - Check workflow status

### Findings
- `GET /api/v1/findings` - List findings with filters (Status, Asset, PII Type)
- `PATCH /api/v1/findings/:id/feedback` - Mark False Positive

### Remediation
- `POST /api/v1/remediation/execute` - Trigger masking/deletion workflow

### Lineage
- `GET /api/v1/lineage` - Fetch Cytoscape/ReactFlow graph data

## 🧪 Testing

Run unit and integration tests:

```bash
go test ./... -v
```
