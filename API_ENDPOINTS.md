# ARC-Hawk API Endpoints Documentation
**Generated:** 2026-01-08  
**Backend Port:** 8080  
**Version:** v1

---

## Health Check

### GET /health
**Description:** Server health status  
**Response:**
```json
{
  "status": "healthy",
  "service": "arc-platform-backend"
}
```

---

## API v1 Endpoints

### **Scan Ingestion** (`/api/v1/scans`)

#### POST /api/v1/scans/ingest
- **Description:** Ingest scan results (legacy)
- **Body:** Scan payload with findings
- **Returns:** Ingestion status

#### POST /api/v1/scans/ingest-verified
- **Description:** **Phase 2 SDK-verified ingestion** (current)
- **Body:** Verified SDK scan payload
- **Returns:** Ingestion status with validation

#### GET /api/v1/scans/latest
- **Description:** Get latest scan run
- **Returns:** Most recent scan metadata

#### GET /api/v1/scans/:id
- **Description:** Get scan status by ID
- **Params:** `id` (scan UUID)
- **Returns:** Scan details and status

#### DELETE /api/v1/scans/clear
- **Description:** Clear all scan data
- **Returns:** Deletion confirmation

---

### **Lineage** (`/api/v1/lineage`)

#### GET /api/v1/lineage
- **Description:** **Phase 3 Unified lineage** (Neo4j-only)
- **Query Params:**
  - `simplified` - Return simplified graph
- **Returns:** Neo4j semantic graph with nodes and edges

#### GET /api/v1/lineage/stats
- **Description:** Get lineage statistics
- **Returns:** Graph statistics (node count, edge count, etc.)

#### GET /api/v1/lineage-old
- **Description:** Legacy PostgreSQL lineage (deprecated)
- **Status:** Kept for backwards compatibility
- **Returns:** Old relational lineage format

---

### **Semantic Graph** (`/api/v1/graph`)

#### GET /api/v1/graph/semantic
- **Description:** Get aggregated Neo4j semantic graph
- **Returns:** 4-level hierarchy (System→Asset→Category→Finding)

---

### **Classification** (`/api/v1/classification`)

#### GET /api/v1/classification/summary
- **Description:** Get classification statistics and summary
- **Returns:** Summary by type, severity, confidence

#### POST /api/v1/classification/predict
- **Description:** Classify text using ML + rules
- **Body:**
```json
{
  "text": "Sample text to classify",
  "context": {}
}
```
- **Returns:** Classification result with confidence

---

### **Findings** (`/api/v1/findings`)

#### GET /api/v1/findings
- **Description:** Get paginated findings list
- **Query Params:**
  - `page` - Page number (default: 1)
  - `page_size` - Results per page (default: 20, max: 100)
  - `severity` - Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)
  - `pattern_name` - Filter by pattern name
  - `scan_run_id` - Filter by scan run UUID
  - `asset_id` - Filter by asset UUID
  - `data_source` - Filter by data source
  - `sort_by` - Sort field (default: created_at)
  - `sort_order` - Sort order (asc/desc, default: desc)
- **Returns:** Paginated findings with enriched details
- **Example:**
```bash
curl 'http://localhost:8080/api/v1/findings?limit=20&severity=HIGH'
```

#### POST /api/v1/findings/:id/feedback
- **Description:** Submit user feedback for a finding
- **Params:** `id` (finding UUID)
- **Body:**
```json
{
  "feedback_type": "CONFIRMED|FALSE_POSITIVE|NEEDS_REVIEW",
  "original_classification": "Sensitive Personal Data",
  "proposed_classification": "Non-PII",
  "comments": "This is not actually PII"
}
```
- **Returns:** Feedback submission confirmation

---

### **Assets** (`/api/v1/assets`)

#### GET /api/v1/assets
- **Description:** List all assets
- **Query Params:**
  - `page` - Page number
  - `page_size` - Results per page
  - `environment` - Filter by environment
  - `owner` - Filter by owner
  - `source_system` - Filter by source system
- **Returns:** Paginated asset list

#### GET /api/v1/assets/:id
- **Description:** Get asset details by ID
- **Params:** `id` (asset UUID)
- **Returns:** Asset details with findings count

---

### **Dataset** (`/api/v1/dataset`)

#### GET /api/v1/dataset/golden
- **Description:** Get golden dataset for ML training
- **Returns:** Labeled dataset with confirmed classifications
- **Use Case:** Training/tuning classification models

---

## Endpoint Summary

| Category | Count | Endpoints |
|----------|-------|-----------|
| **Health** | 1 | `/health` |
| **Scans** | 4 | `/scans/ingest`, `/scans/ingest-verified`, `/scans/latest`, `/scans/:id`, `/scans/clear` |
| **Lineage** | 3 | `/lineage`, `/lineage/stats`, `/lineage-old` |
| **Graph** | 1 | `/graph/semantic` |
| **Classification** | 2 | `/classification/summary`, `/classification/predict` |
| **Findings** | 2 | `/findings`, `/findings/:id/feedback` |
| **Assets** | 2 | `/assets`, `/assets/:id` |
| **Dataset** | 1 | `/dataset/golden` |
| **TOTAL** | **20** | **All endpoints documented** |

---

## Authentication

Currently: **None** (development mode)  
Future: Add JWT/API key authentication for production

---

## CORS Configuration

**Allowed Origins:** `http://localhost:3000` (configurable via `ALLOWED_ORIGINS` env)  
**Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS  
**Credentials:** Enabled

---

## Error Response Format

```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

---

## Notes

1. **Phase 2 Migration:** Use `/scans/ingest-verified` instead of `/scans/ingest`
2. **Phase 3 Lineage:** Primary endpoint is `/lineage` (Neo4j), `/lineage-old` is deprecated
3. **Auto-Filtering:** Findings endpoint automatically excludes Non-PII classifications
4. **Graceful Degradation:** System continues with rules-only if Presidio is unavailable

---

**Test Base URL:** `http://localhost:8080`  
**Production:** TBD
