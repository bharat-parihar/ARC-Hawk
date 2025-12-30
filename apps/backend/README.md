# ARC Platform Backend

Enterprise-grade Data Lineage and PII Classification Platform backend built with Go, following Clean Architecture principles.

## Architecture

The backend follows Clean Architecture with clear separation of concerns:

- **`cmd/server/`** - Application entry point
- **`internal/api/`** - HTTP handlers and routing (Gin framework)
- **`internal/service/`** - Business logic layer
- **`internal/domain/`** - Domain models and interfaces
- **`internal/infrastructure/`** - External dependencies (PostgreSQL, Neo4j, Presidio)
- **`pkg/`** - Reusable packages (Logger, Validator)

## Key Integrations

- **PostgreSQL**: Primary data store for scans, assets, and findings.
- **Neo4j**: Graph database for semantic lineage and relationship traversal.
- **Presidio**: PII classification engine (gRPC integration).


## Prerequisites

- Go 1.21 or higher
- PostgreSQL 15+

## Setup

1. **Install dependencies:**
   ```bash
   go mod download
   ```

2. **Configure environment:**
   ```bash
   cp configs/.env.example .env
   # Edit .env with your database  credentials
   ```

3. **Run database migrations:**
   ```bash
   # Start PostgreSQL (see root docker-compose.yml)
   docker-compose up -d postgres
   ```

## Running

**Development mode:**
```bash
go run cmd/server/main.go
```

**Build and run:**
```bash
go build -o bin/server ./cmd/server/
./bin/server
```

Server will start on `http://localhost:8080`

## API Endpoints

- `GET /health` - Health check
- `POST /api/v1/scans/ingest` - Ingest scan data from Hawk-eye
- `GET /api/v1/scans/:id` - Get scan status
- `GET /api/v1/lineage` - Get data lineage graph
- `GET /api/v1/classification/summary` - Get PII classification summary
- `GET /api/v1/findings` - Get findings with filtering

## Testing

```bash
go test ./...
```

## Database Migrations

Database schema is located in `migrations/schema.sql` and is automatically applied when using docker-compose.
