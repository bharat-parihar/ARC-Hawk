# ARC-Hawk API Endpoints & Connections Summary

## Backend API Endpoints

### Base URL
`http://localhost:8080`

### Health Check
- **GET** `/health`
  - Returns service health status
  - No authentication required

### API Version 1 (`/api/v1`)

#### 1. Lineage Graph
- **GET** `/api/v1/lineage`
  - **Purpose**: Get the complete lineage graph with nodes and edges
  - **Query Parameters**:
    - `source` (optional): Filter by data source
    - `severity` (optional): Filter by severity
    - `data_type` (optional): Filter by data type
    - `level` (optional): Filter by hierarchy level (e.g., "system")
  - **Response**: JSON with `nodes` and `edges` arrays
  - **Frontend Usage**: `LineageGraph.tsx` component

#### 2. Scan Ingestion
- **POST** `/api/v1/scans/ingest`
  - **Purpose**: Ingest Hawk-eye scan results
  - **Body**: Hawk-eye JSON format with `fs` and `postgresql` arrays
  - **Response**: Scan run ID and statistics
  
- **GET** `/api/v1/scans/:id`
  - **Purpose**: Get scan run status
  - **Response**: Scan metadata and progress

- **GET** `/api/v1/scans/last`
  - **Purpose**: Get the most recent scan run
  - **Response**: Latest scan metadata and statistics
  - **Frontend Usage**: Dashboard last scan card

#### 3. Classification
- **GET** `/api/v1/classification/summary`
  - **Purpose**: Get aggregated PII classification statistics
  - **Response**: Classification counts, confidence scores, DPDPA categories
  - **Frontend Usage**: Summary cards on dashboard

#### 4. Findings
- **GET** `/api/v1/findings`
  - **Purpose**: Get all findings with filtering
  - **Query Parameters**:
    - `scan_run_id` (optional): Filter by scan run
    - `asset_id` (optional): Filter by asset
    - `severity` (optional): Filter by severity (Critical, High, Medium, Low)
    - `pattern_name` (optional): Filter by pattern
    - `data_source` (optional): Filter by data source
  - **Response**: Array of findings with asset and classification data
  - **Frontend Usage**: `FindingsTable.tsx` component

#### 5. Assets
- **GET** `/api/v1/assets/:id`
  - **Purpose**: Get detailed asset information
  - **Response**: Asset details with findings count and metadata
  - **Frontend Usage**: `InspectorPanel.tsx` when asset is selected

---

## Frontend Configuration

### API Base URL
Configured in: Next.js environment variables

**Development**: `http://localhost:8080`
**Production**: Set via `NEXT_PUBLIC_API_URL` env variable

### Frontend Pages
- **Main Dashboard**: `http://localhost:3000/`
  - Shows lineage graph, summary cards, findings table

---

## Database Connections

### PostgreSQL (Primary Database)
- **Host**: `localhost:5432`
- **Database**: `arc_platform`
- **User**: `postgres`
- **Password**: `postgres`
- **Tables**:
  - `scan_runs` - Scan execution metadata
  - `assets` - Data assets (files, tables, columns)
  - `findings` - PII/sensitive data findings
  - `patterns` - Detection pattern definitions
  - `classifications` - PII classification results
  - `review_states` - Finding review status
  - `asset_relationships` - Asset dependencies
  - `scan_metrics` - Scan statistics

### Neo4j (Graph Database - Optional)
- **HTTP**: `localhost:7474`
- **Bolt**: `localhost:7687`
- **Database**: `neo4j`
- **User**: `neo4j`
- **Password**: `password123`
- **Status**: Infrastructure ready, integration pending

---

## Data Flow

```
Hawk-eye Scanner
      ↓
POST /api/v1/scans/ingest
      ↓
[Ingestion Service]
      ↓
   PostgreSQL
      ↓
[Lineage/Findings/Classification Services]
      ↓
Frontend (React Flow Graph)
```

---

## Endpoint Verification Script

Run the verification script to test all endpoints:

```bash
# From project root
python scripts/verify_endpoints.py
```

**Prerequisites**:
- Backend running on port 8080
- Database populated with scan data

**Tests**:
1. ✅ Health check
2. ✅ Classification summary
3. ✅ Default lineage
4. ✅ System-level lineage
5. ✅ Findings list
6. ✅ Asset details (dynamic based on available data)

---

## Running the Complete System

### 1. Start Database
```bash
docker-compose up -d postgres
```

### 2. Start Backend
```bash
cd apps/backend
go run cmd/server/main.go
```
Backend runs on: `http://localhost:8080`

### 3. Run Scan (Ingest Data)
```bash
cd scripts/automation
python unified-scan.py
```
This populates the database with sample data.

### 4. Start Frontend
```bash
cd apps/frontend
npm run dev
```
Frontend runs on: `http://localhost:3000`

### 5. Verify All Endpoints
```bash
python scripts/verify_endpoints.py
```

---

## CORS Configuration

Backend allows requests from:
- `http://localhost:3000` (development)
- Configurable via `ALLOWED_ORIGINS` env variable

**Methods Allowed**: GET, POST, PUT, DELETE, OPTIONS
**Headers Allowed**: Origin, Content-Type, Accept, Authorization

---

## Current Status

| Component | Status | Port | Notes |
|-----------|--------|------|-------|
| PostgreSQL | ⚠️ Requires Docker | 5432 | `docker-compose up -d postgres` |
| Neo4j | ⚠️ Optional | 7474, 7687 | Infrastructure ready |
| Backend API | ✅ Ready | 8080 | `go run cmd/server/main.go` |
| Frontend | ✅ Enhanced | 3000 | `npm run dev` |
| Lineage Graph | ✅ Visually Upgraded | - | Gradient nodes, animated edges |

---

## Next Steps to Test

1. **Start Docker Desktop** (for PostgreSQL)
2. **Run**: `docker-compose up -d postgres`
3. **Run**: `cd apps/backend && go run cmd/server/main.go`
4. **Run**: `python scripts/automation/unified-scan.py` (to populate data)
5. **Run**: `cd apps/frontend && npm run dev`
6. **Open**: `http://localhost:3000`
7. **Verify**: `python scripts/verify_endpoints.py`

You'll see the stunning new lineage graph with:
- 🎨 Gradient node backgrounds
- ✨ Smooth hover animations
- 🔄 Animated critical edges
- 💎 Glassmorphism UI elements
- 📊 Optimized layout
