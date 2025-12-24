# ARC Hawk Platform - User Manual 🦅

ARC Hawk is a unified data security and lineage platform designed to scan, classify, and visualize sensitive data across your infrastructure.

## 📂 Repository Structure

The project follows a modern monorepo architecture:

- `apps/`: Core applications.
  - `backend/`: Go-based API server (Gin framework).
  - `frontend/`: Next.js dashboard with Enterprise Dark Mode.
  - `scanner/`: Configuration and test data for the Hawk Scanner.
- `scripts/`: Automation and utility scripts.
  - `automation/unified-scan.py`: One-click scanning and ingestion tool.
- `infra/`: Infrastructure as Code (Docker, K8s, Terraform).
- `docs/`: Deployment guides, architecture diagrams, and this manual.

---

## 🚀 Getting Started

### Prerequisites
- **Go**: 1.19+
- **Node.js**: 18+ (TS)
- **Python**: 3.9+ (For automation)
- **Docker**: For PostgreSQL database (optional if running locally).
- **Hawk Scanner**: CLI tool installed and in PATH (`hawk_scanner`).

### 1. Database Setup
Ensure you have a PostgreSQL database running.
- **Docker**: `docker-compose up -d db` (from `infra/docker/`).
- **Local**: Ensure `postgres` user/password matches `apps/backend/internal/config` or set environment variables.

### 2. Backend Setup
Navigate to `apps/backend`:
```bash
cd apps/backend
go mod download
```

**Running the Server:**
You can run the server with default settings or explicit environment variables:
```bash
# Default (expects localhost:5432, user:postgres, pass:password)
go run cmd/server/main.go

# Custom Credentials
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=myuser
export DB_PASSWORD=mypass
go run cmd/server/main.go
```
*The server listens on `http://localhost:8080`.*

### 3. Frontend Setup
Navigate to `apps/frontend`:
```bash
cd apps/frontend
npm install
npm run dev
```
*The dashboard is available at `http://localhost:3000`.*

---

## 🔍 Running Scans

### Configuration
Edit `apps/scanner/config/connection.yml` to define your data sources (PostgreSQL, S3, Filesystem, Slack, etc.).

### Automated Scanning
We provide a unified script to run the scanner and ingest results into the backend automatically.

```bash
python3 scripts/automation/unified-scan.py
```

This script will:
1. Parse `connection.yml` from `apps/scanner/config/`.
2. Execute `hawk_scanner` for each configured source.
3. Post the JSON results to the Backend API.
4. Clean up temporary output files.

---

## 📊 Dashboard Features

### Enterprise Dark Mode
The UI features a high-contrast dark theme (`Dark Slate #0f172a`) with light components for maximum visibility.

### Data Lineage Graph
The interactive graph visualizes the flow of data:
- **Red/Orange Nodes**: Findings (PII/Secrets).
- **Green/Blue Nodes**: Safe Assets.
- **Rich Cards**: Nodes display Type (Email, PAN), Risk Score, and Icons.
- **Layout**: Intelligent Left-to-Right layout avoids overlaps.

### Filtering
Use the global search bar or distinct table filters to verify compliance across thousands of assets.

---

## 🛠️ Troubleshooting

### 1. Backend: "password authentication failed"
- **Cause**: The backend cannot connect to your local PostgreSQL.
- **Fix**: Check `DB_PASSWORD` env var. If using Docker, default is usually `password`. If using generic local Postgres, it might be empty or different.

### 2. Scanner: "Non-PII" Classification
- **Cause**: Older versions of the backend handled pattern matching case-sensitively.
- **Fix**: **Restart the backend**. (Fixed in `ingestion_service.go` by normalizing input to lowercase).

### 3. Automation: "Connection refused"
- **Cause**: The backend is not running on port 8080.
- **Fix**: Start the backend in a separate terminal window before running the script.

### 4. Frontend: "Module Found Error"
- **Cause**: Corrupted Next.js cache.
- **Fix**: Run `rm -rf .next && npm run dev`.
