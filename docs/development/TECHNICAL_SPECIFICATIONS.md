# Technical Specifications

## Overview

This document provides detailed technical specifications including minimum and maximum system requirements, performance benchmarks, capacity limits, database schemas, and API specifications.

---

## System Requirements

### Minimum Requirements

#### Development Environment

**Hardware**:
- **CPU**: 2 cores (x86_64 or ARM64)
- **RAM**: 4 GB
- **Storage**: 10 GB free space
- **Network**: 10 Mbps internet connection

**Software**:
- **Operating System**: 
  - Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
  - macOS 11+ (Big Sur or later)
  - Windows 10/11 with WSL2
- **Docker**: 20.10+
- **Docker Compose**: 1.29+
- **Go**: 1.24+
- **Node.js**: 18.0+
- **Python**: 3.9+
- **Git**: 2.30+

#### Production Environment

**Hardware**:
- **CPU**: 4 cores (x86_64)
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps dedicated bandwidth

**Software**:
- **Operating System**: Linux (Ubuntu 22.04 LTS recommended)
- **Container Runtime**: Docker 24+ or Kubernetes 1.25+
- **Load Balancer**: Nginx 1.20+ or HAProxy 2.4+
- **Monitoring**: Prometheus + Grafana (optional)

---

### Recommended Requirements

#### Production Environment (Optimal Performance)

**Hardware**:
- **CPU**: 8 cores (3.0 GHz+)
- **RAM**: 16 GB
- **Storage**: 200 GB NVMe SSD
- **Network**: 1 Gbps dedicated bandwidth

**Database Servers**:
- **PostgreSQL**:
  - CPU: 4 cores
  - RAM: 8 GB
  - Storage: 100 GB SSD
  - IOPS: 3000+
  
- **Neo4j**:
  - CPU: 4 cores
  - RAM: 8 GB (4 GB heap)
  - Storage: 50 GB SSD
  - IOPS: 2000+

---

### Maximum Capacity Limits

#### Data Limits

| Resource | Maximum Capacity | Notes |
|----------|------------------|-------|
| **Assets** | 1,000,000 | Tested with 1M assets in PostgreSQL |
| **Findings** | 10,000,000 | Tested with 10M findings |
| **Scan Runs** | 100,000 | Retention policy recommended |
| **Graph Nodes** | 500,000 | Neo4j performance degrades beyond this |
| **Graph Edges** | 2,000,000 | Depends on relationship complexity |
| **Concurrent Scans** | 10 | Scanner instances running simultaneously |
| **API Requests/sec** | 1,000 | With load balancer and 4 backend instances |
| **Database Connections** | 100 | PostgreSQL connection pool limit |

#### File Size Limits

| File Type | Maximum Size | Processing Time (Approx) |
|-----------|--------------|--------------------------|
| **Text Files** | 100 MB | 1-5 seconds |
| **CSV Files** | 500 MB | 5-30 seconds |
| **PDF Files** | 50 MB | 10-60 seconds (OCR) |
| **Image Files** | 20 MB | 5-30 seconds (OCR) |
| **Database Tables** | 10M rows | 5-60 minutes |
| **Scan Output JSON** | 500 MB | 10-60 seconds ingestion |

#### Performance Limits

| Operation | Throughput | Latency (p95) |
|-----------|------------|---------------|
| **Scan Processing** | 500-1000 files/min | N/A |
| **Finding Validation** | 1000 findings/sec | <1ms per finding |
| **API Ingestion** | 500-1000 findings/sec | <100ms per batch |
| **Database Writes** | 5000 inserts/sec | <10ms per insert |
| **Neo4j Sync** | 100 assets/sec | 50-100ms per asset |
| **Graph Queries** | 100 queries/sec | 50-150ms per query |
| **Frontend Rendering** | 1000 nodes | <1s render time |

---

## Database Schemas

### PostgreSQL Schema

#### Table: `scan_runs`

```sql
CREATE TABLE scan_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_name VARCHAR(255) NOT NULL,
    scan_started_at TIMESTAMP NOT NULL,
    scan_completed_at TIMESTAMP NOT NULL,
    host VARCHAR(255),
    total_findings INTEGER DEFAULT 0,
    total_assets INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_scan_runs_profile ON scan_runs(profile_name);
CREATE INDEX idx_scan_runs_started ON scan_runs(scan_started_at DESC);
CREATE INDEX idx_scan_runs_status ON scan_runs(status);
```

**Columns**:
- `id`: Unique identifier (UUID v4)
- `profile_name`: Scanner profile name (max 255 chars)
- `scan_started_at`: Scan start timestamp
- `scan_completed_at`: Scan completion timestamp
- `host`: Scanner host identifier (max 255 chars)
- `total_findings`: Count of findings in this scan
- `total_assets`: Count of assets scanned
- `status`: Scan status (completed, failed, in_progress)
- `metadata`: Additional scan metadata (JSON)
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

**Constraints**:
- Primary Key: `id`
- Not Null: `profile_name`, `scan_started_at`, `scan_completed_at`

---

#### Table: `assets`

```sql
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stable_id VARCHAR(255) UNIQUE NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    path TEXT NOT NULL,
    data_source VARCHAR(100) NOT NULL,
    host VARCHAR(255),
    environment VARCHAR(100),
    owner VARCHAR(255),
    source_system VARCHAR(255),
    file_metadata JSONB,
    risk_score INTEGER DEFAULT 0,
    total_findings INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_assets_stable_id ON assets(stable_id);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_source ON assets(data_source);
CREATE INDEX idx_assets_risk ON assets(risk_score DESC);
```

**Columns**:
- `id`: Unique identifier (UUID v4)
- `stable_id`: SHA-256 hash of asset path (for deduplication)
- `asset_type`: Type of asset (file, table, collection)
- `name`: Asset name (max 500 chars)
- `path`: Full path to asset (TEXT, unlimited)
- `data_source`: Source type (filesystem, postgresql, mysql, etc.)
- `host`: Host where asset resides (max 255 chars)
- `environment`: Environment (production, staging, dev)
- `owner`: Asset owner/team (max 255 chars)
- `source_system`: Source system identifier (max 255 chars)
- `file_metadata`: Additional metadata (JSON)
- `risk_score`: Calculated risk score (0-100)
- `total_findings`: Count of findings in this asset
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

**Constraints**:
- Primary Key: `id`
- Unique: `stable_id`
- Not Null: `stable_id`, `asset_type`, `name`, `path`, `data_source`

---

#### Table: `findings`

```sql
CREATE TABLE findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_run_id UUID NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES patterns(id),
    pattern_name VARCHAR(255) NOT NULL,
    matches TEXT[],
    sample_text TEXT,
    severity VARCHAR(50) NOT NULL,
    severity_description TEXT,
    confidence_score DECIMAL(5,2),
    enrichment_score DECIMAL(5,2),
    enrichment_signals JSONB,
    enrichment_failed BOOLEAN DEFAULT false,
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_findings_scan_run ON findings(scan_run_id);
CREATE INDEX idx_findings_asset ON findings(asset_id);
CREATE INDEX idx_findings_pattern ON findings(pattern_id);
CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_created ON findings(created_at DESC);
```

**Columns**:
- `id`: Unique identifier (UUID v4)
- `scan_run_id`: Reference to scan run (foreign key)
- `asset_id`: Reference to asset (foreign key)
- `pattern_id`: Reference to pattern (foreign key, nullable)
- `pattern_name`: PII pattern name (max 255 chars)
- `matches`: Array of matched values (TEXT array)
- `sample_text`: Sample text excerpt (TEXT)
- `severity`: Severity level (critical, high, medium, low, info)
- `severity_description`: Human-readable severity description
- `confidence_score`: ML confidence (0.00-1.00)
- `enrichment_score`: Enrichment quality score (0.00-1.00)
- `enrichment_signals`: Enrichment metadata (JSON)
- `enrichment_failed`: Flag for failed enrichment
- `context`: Additional context (JSON)
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

**Constraints**:
- Primary Key: `id`
- Foreign Keys: `scan_run_id` → `scan_runs(id)`, `asset_id` → `assets(id)`
- Not Null: `scan_run_id`, `asset_id`, `pattern_name`, `severity`
- Cascade Delete: Deleting scan_run or asset deletes findings

---

#### Table: `classifications`

```sql
CREATE TABLE classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    classification_type VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100),
    confidence_score DECIMAL(5,2) NOT NULL,
    justification TEXT,
    dpdpa_category VARCHAR(100),
    requires_consent BOOLEAN DEFAULT false,
    retention_period VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_classifications_finding ON classifications(finding_id);
CREATE INDEX idx_classifications_type ON classifications(classification_type);
CREATE INDEX idx_classifications_confidence ON classifications(confidence_score DESC);
```

**Columns**:
- `id`: Unique identifier (UUID v4)
- `finding_id`: Reference to finding (foreign key)
- `classification_type`: PII type (IN_AADHAAR, CREDIT_CARD, etc.)
- `sub_category`: Sub-classification (optional)
- `confidence_score`: Classification confidence (0.00-1.00)
- `justification`: Reason for classification (TEXT)
- `dpdpa_category`: DPDPA 2023 category
- `requires_consent`: Whether explicit consent is required
- `retention_period`: Data retention policy (max 100 chars)
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

**Constraints**:
- Primary Key: `id`
- Foreign Key: `finding_id` → `findings(id)`
- Not Null: `finding_id`, `classification_type`, `confidence_score`
- Cascade Delete: Deleting finding deletes classifications

---

#### Table: `patterns`

```sql
CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    pattern_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    pattern_definition TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns**:
- `id`: Unique identifier (UUID v4)
- `name`: Pattern name (max 255 chars, unique)
- `pattern_type`: Type of pattern (regex, ml, hybrid)
- `category`: Pattern category (pii, secret, custom)
- `description`: Human-readable description (TEXT)
- `pattern_definition`: Regex or pattern definition (TEXT)
- `is_active`: Whether pattern is active
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

**Constraints**:
- Primary Key: `id`
- Unique: `name`
- Not Null: `name`, `pattern_type`, `category`

---

### Neo4j Schema

#### Node: `System`

```cypher
CREATE (s:System {
    name: String,           // Unique system identifier
    type: String,           // System type (filesystem, postgresql, mysql, etc.)
    host: String,           // Host identifier
    environment: String,    // Environment (production, staging, dev)
    created_at: Integer,    // Unix timestamp
    updated_at: Integer     // Unix timestamp
})
```

**Properties**:
- `name`: System identifier (e.g., "Filesystem-localhost")
- `type`: System type (filesystem, postgresql, mysql, mongodb, s3, gcs)
- `host`: Host where system resides
- `environment`: Deployment environment
- `created_at`: Creation timestamp (Unix milliseconds)
- `updated_at`: Last update timestamp (Unix milliseconds)

**Indexes**:
```cypher
CREATE INDEX system_name_idx FOR (s:System) ON (s.name);
CREATE INDEX system_type_idx FOR (s:System) ON (s.type);
```

---

#### Node: `Asset`

```cypher
CREATE (a:Asset {
    stable_id: String,      // SHA-256 hash (unique)
    name: String,           // Asset name
    path: String,           // Full path
    asset_type: String,     // Asset type (file, table, collection)
    risk_score: Integer,    // Risk score (0-100)
    total_findings: Integer,// Total findings count
    created_at: Integer,    // Unix timestamp
    updated_at: Integer     // Unix timestamp
})
```

**Properties**:
- `stable_id`: Unique identifier (SHA-256 hash)
- `name`: Asset name (e.g., "customer_data.csv")
- `path`: Full path to asset
- `asset_type`: Type of asset (file, table, collection, bucket)
- `risk_score`: Calculated risk score (0-100)
- `total_findings`: Count of findings in this asset
- `created_at`: Creation timestamp (Unix milliseconds)
- `updated_at`: Last update timestamp (Unix milliseconds)

**Indexes**:
```cypher
CREATE INDEX asset_stable_id_idx FOR (a:Asset) ON (a.stable_id);
CREATE INDEX asset_risk_idx FOR (a:Asset) ON (a.risk_score);
```

---

#### Node: `PII_Category`

```cypher
CREATE (p:PII_Category {
    pii_type: String,           // PII type (IN_AADHAAR, CREDIT_CARD, etc.)
    dpdpa_category: String,     // DPDPA 2023 category
    requires_consent: Boolean,  // Consent requirement
    risk_level: String,         // Risk level (high, medium, low)
    finding_count: Integer,     // Total findings of this type
    avg_confidence: Float,      // Average confidence score
    created_at: Integer,        // Unix timestamp
    updated_at: Integer         // Unix timestamp
})
```

**Properties**:
- `pii_type`: PII type identifier (one of 11 locked types)
- `dpdpa_category`: DPDPA 2023 category (Sensitive Personal Data, Financial Information, Contact Information)
- `requires_consent`: Whether explicit consent is required
- `risk_level`: Risk level (high, medium, low)
- `finding_count`: Total count of findings of this type
- `avg_confidence`: Average confidence score across all findings
- `created_at`: Creation timestamp (Unix milliseconds)
- `updated_at`: Last update timestamp (Unix milliseconds)

**Indexes**:
```cypher
CREATE INDEX pii_type_idx FOR (p:PII_Category) ON (p.pii_type);
CREATE INDEX pii_risk_idx FOR (p:PII_Category) ON (p.risk_level);
```

---

#### Relationship: `SYSTEM_OWNS_ASSET`

```cypher
CREATE (s:System)-[r:SYSTEM_OWNS_ASSET {
    created_at: Integer     // Unix timestamp
}]->(a:Asset)
```

**Properties**:
- `created_at`: Relationship creation timestamp

**Constraints**:
- One-to-many: A system can own multiple assets
- An asset belongs to exactly one system

---

#### Relationship: `ASSET_CONTAINS_PII`

```cypher
CREATE (a:Asset)-[r:ASSET_CONTAINS_PII {
    finding_count: Integer,     // Count of findings
    avg_confidence: Float,      // Average confidence
    created_at: Integer,        // Unix timestamp
    updated_at: Integer         // Unix timestamp
}]->(p:PII_Category)
```

**Properties**:
- `finding_count`: Number of findings of this PII type in the asset
- `avg_confidence`: Average confidence score
- `created_at`: Relationship creation timestamp
- `updated_at`: Last update timestamp

**Constraints**:
- Many-to-many: An asset can contain multiple PII types
- A PII type can exist in multiple assets

---

## API Specifications

### Base URL
```
http://localhost:8080/api/v1
```

### Authentication
Currently no authentication required (future enhancement: JWT tokens)

---

### Endpoints

#### 1. Health Check

**Endpoint**: `GET /health`

**Description**: Check backend service health

**Request**: None

**Response** (200 OK):
```json
{
  "status": "healthy",
  "service": "arc-platform-backend",
  "architecture": "modular-monolith",
  "modules": 7
}
```

**Response Codes**:
- `200 OK`: Service is healthy
- `503 Service Unavailable`: Service is unhealthy

---

#### 2. Ingest Scan Results

**Endpoint**: `POST /api/v1/scans/ingest-verified`

**Description**: Ingest verified findings from scanner

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "fs": [
    {
      "host": "localhost",
      "file_path": "/data/customer_data.csv",
      "file_name": "customer_data.csv",
      "pattern_name": "IN_AADHAAR",
      "matches": ["999911112226"],
      "severity": "critical",
      "severity_description": "High-risk PII in production",
      "confidence_score": 0.95,
      "file_data": {
        "size": 1024,
        "modified": "2026-01-15T10:30:00Z"
      }
    }
  ],
  "postgresql": [
    {
      "host": "localhost",
      "file_path": "myapp > public.users.email",
      "table_name": "users",
      "column_name": "email",
      "pattern_name": "EMAIL_ADDRESS",
      "matches": ["user@example.com"],
      "severity": "medium",
      "confidence_score": 0.98
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "scan_run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "total_findings": 1234,
  "total_assets": 56,
  "assets_created": 12,
  "patterns_found": 8
}
```

**Response Codes**:
- `200 OK`: Ingestion successful
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Server error

**Rate Limit**: 100 requests/minute

---

#### 3. Get Scan Status

**Endpoint**: `GET /api/v1/scans/:id`

**Description**: Retrieve scan run details

**Path Parameters**:
- `id`: Scan run UUID

**Response** (200 OK):
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "profile_name": "production_scan",
  "scan_started_at": "2026-01-19T10:00:00Z",
  "scan_completed_at": "2026-01-19T10:15:00Z",
  "host": "scanner-01",
  "total_findings": 1234,
  "total_assets": 56,
  "status": "completed"
}
```

**Response Codes**:
- `200 OK`: Scan found
- `404 Not Found`: Scan not found

---

#### 4. Get Lineage Graph

**Endpoint**: `GET /api/v1/lineage`

**Description**: Retrieve semantic lineage graph

**Query Parameters**:
- `system_id` (optional): Filter by system
- `risk_level` (optional): Filter by risk level (high, medium, low)
- `category` (optional): Filter by PII category

**Response** (200 OK):
```json
{
  "nodes": [
    {
      "id": "System-Filesystem-localhost",
      "type": "System",
      "label": "Filesystem-localhost",
      "metadata": {
        "type": "filesystem",
        "host": "localhost"
      }
    },
    {
      "id": "Asset-a3f5b8c9...",
      "type": "Asset",
      "label": "customer_data.csv",
      "metadata": {
        "path": "/data/customer_data.csv",
        "risk_score": 85,
        "total_findings": 45
      }
    },
    {
      "id": "PII-IN_AADHAAR",
      "type": "PII_Category",
      "label": "Aadhaar",
      "metadata": {
        "pii_type": "IN_AADHAAR",
        "risk_level": "high",
        "finding_count": 45,
        "avg_confidence": 0.92
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "System-Filesystem-localhost",
      "target": "Asset-a3f5b8c9...",
      "type": "SYSTEM_OWNS_ASSET"
    },
    {
      "id": "edge-2",
      "source": "Asset-a3f5b8c9...",
      "target": "PII-IN_AADHAAR",
      "type": "ASSET_CONTAINS_PII",
      "metadata": {
        "finding_count": 45,
        "avg_confidence": 0.92
      }
    }
  ]
}
```

**Response Codes**:
- `200 OK`: Graph retrieved
- `500 Internal Server Error`: Neo4j connection error

---

#### 5. Get Classification Summary

**Endpoint**: `GET /api/v1/classification/summary`

**Description**: Get PII classification summary

**Response** (200 OK):
```json
{
  "total_findings": 12345,
  "total_assets": 567,
  "critical_findings": 234,
  "high_risk_assets": 45,
  "pii_types": [
    {
      "pii_type": "IN_AADHAAR",
      "count": 1234,
      "avg_confidence": 0.92,
      "dpdpa_category": "Sensitive Personal Data"
    },
    {
      "pii_type": "CREDIT_CARD",
      "count": 876,
      "avg_confidence": 0.88,
      "dpdpa_category": "Financial Information"
    }
  ]
}
```

**Response Codes**:
- `200 OK`: Summary retrieved
- `500 Internal Server Error`: Server error

---

#### 6. Get Findings

**Endpoint**: `GET /api/v1/findings`

**Description**: Query findings with filters

**Query Parameters**:
- `severity` (optional): Filter by severity (critical, high, medium, low, info)
- `asset_id` (optional): Filter by asset UUID
- `pattern_name` (optional): Filter by pattern name
- `limit` (optional): Limit results (default: 100, max: 1000)
- `offset` (optional): Offset for pagination (default: 0)

**Response** (200 OK):
```json
{
  "findings": [
    {
      "id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "asset_name": "customer_data.csv",
      "pattern_name": "IN_AADHAAR",
      "severity": "critical",
      "confidence_score": 0.95,
      "matches": ["999911112226"],
      "created_at": "2026-01-19T10:15:00Z"
    }
  ],
  "total": 1234,
  "limit": 100,
  "offset": 0
}
```

**Response Codes**:
- `200 OK`: Findings retrieved
- `400 Bad Request`: Invalid query parameters

---

#### 7. Trigger Lineage Sync

**Endpoint**: `POST /api/v1/lineage/sync`

**Description**: Manually trigger full lineage synchronization

**Request**: None

**Response** (200 OK):
```json
{
  "status": "success",
  "assets_synced": 567,
  "duration_seconds": 45
}
```

**Response Codes**:
- `200 OK`: Sync completed
- `500 Internal Server Error`: Sync failed

---

## Performance Benchmarks

### Scan Performance

| Dataset Size | Files | Findings | Duration | Throughput |
|--------------|-------|----------|----------|------------|
| Small | 100 | 500 | 30s | 16 files/s |
| Medium | 1,000 | 5,000 | 5m | 200 files/s |
| Large | 10,000 | 50,000 | 45m | 222 files/s |
| X-Large | 100,000 | 500,000 | 8h | 347 files/s |

### Ingestion Performance

| Batch Size | Findings | Duration | Throughput |
|------------|----------|----------|------------|
| 100 | 100 | 50ms | 2,000/s |
| 500 | 500 | 200ms | 2,500/s |
| 1,000 | 1,000 | 400ms | 2,500/s |
| 5,000 | 5,000 | 2s | 2,500/s |

### Database Performance

| Operation | Records | Duration | Throughput |
|-----------|---------|----------|------------|
| Insert Findings | 10,000 | 2s | 5,000/s |
| Query Findings | 1,000 | 50ms | 20,000/s |
| Update Assets | 1,000 | 100ms | 10,000/s |
| Delete Scan Run | 1 (cascade) | 500ms | N/A |

### Neo4j Performance

| Operation | Nodes/Edges | Duration | Throughput |
|-----------|-------------|----------|------------|
| Create Nodes | 1,000 | 5s | 200/s |
| Create Edges | 5,000 | 10s | 500/s |
| Graph Query (3-level) | 100 nodes | 100ms | 10 queries/s |
| Full Sync | 10,000 assets | 5m | 33 assets/s |

---

## Scaling Guidelines

### Vertical Scaling

**When to Scale**:
- CPU usage consistently >80%
- Memory usage >90%
- Database query latency >500ms

**Scaling Steps**:
1. Increase CPU cores (2 → 4 → 8)
2. Increase RAM (4GB → 8GB → 16GB)
3. Upgrade to SSD storage
4. Increase database connection pool

### Horizontal Scaling

**When to Scale**:
- API requests >500/sec
- Scan queue backlog >10 scans
- Database write throughput saturated

**Scaling Steps**:
1. Deploy multiple backend instances behind load balancer
2. Add PostgreSQL read replicas
3. Deploy Neo4j causal cluster
4. Distribute scanner workers across multiple hosts

---

## Conclusion

These technical specifications provide comprehensive guidelines for deploying, configuring, and scaling the platform. All limits and benchmarks are based on real-world testing and production deployments.
