# Detailed Workflow Documentation

## Overview

This document provides comprehensive, step-by-step workflows for all major operations in the platform, from initial setup to production scanning and monitoring.

---

## Table of Contents

1. [System Setup Workflow](#system-setup-workflow)
2. [Scan Execution Workflow](#scan-execution-workflow)
3. [Data Ingestion Workflow](#data-ingestion-workflow)
4. [Classification Workflow](#classification-workflow)
5. [Lineage Synchronization Workflow](#lineage-synchronization-workflow)
6. [Frontend Visualization Workflow](#frontend-visualization-workflow)
7. [Compliance Reporting Workflow](#compliance-reporting-workflow)
8. [Troubleshooting Workflow](#troubleshooting-workflow)

---

## System Setup Workflow

### Prerequisites
- Docker and Docker Compose installed
- Go 1.24+ installed
- Node.js 18+ and npm installed
- Python 3.9+ installed
- Git installed

### Step 1: Clone Repository
```bash
# Clone the repository
git clone https://github.com/your-org/arc-hawk.git
cd arc-hawk
```

### Step 2: Start Infrastructure Services
```bash
# Start PostgreSQL, Neo4j, and NLP engine
docker-compose up -d

# Verify services are running
docker ps

# Expected output:
# - arc-platform-db (PostgreSQL on port 5432)
# - arc-platform-neo4j (Neo4j on ports 7474, 7687)
# - arc-platform-presidio (NLP engine on port 5001)
```

### Step 3: Configure Environment Variables
```bash
# Backend configuration
cd apps/backend
cp .env.example .env

# Edit .env with your settings
# Required variables:
# - DB_HOST=localhost
# - DB_PORT=5432
# - DB_USER=postgres
# - DB_PASSWORD=postgres
# - DB_NAME=arc_platform
# - NEO4J_URI=bolt://localhost:7687
# - NEO4J_USERNAME=neo4j
# - NEO4J_PASSWORD=password123
```

### Step 4: Initialize Backend
```bash
# Install Go dependencies
go mod download

# Run database migrations (automatic on startup)
go run cmd/server/main.go

# Backend will start on port 8080
# Migrations will be applied automatically
```

### Step 5: Initialize Frontend
```bash
# Navigate to frontend directory
cd ../frontend

# Install npm dependencies
npm install

# Start development server
npm run dev

# Frontend will start on port 3000
```

### Step 6: Configure Scanner
```bash
# Navigate to scanner directory
cd ../scanner

# Install Python dependencies
pip install -r requirements.txt

# Download NLP model
python -m spacy download en_core_web_sm

# Configure connection.yml (see Scanner Configuration section)
cp config/connection.yml.example config/connection.yml
```

### Step 7: Verify Installation
```bash
# Check backend health
curl http://localhost:8080/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "arc-platform-backend",
#   "architecture": "modular-monolith",
#   "modules": 7
# }

# Check frontend
open http://localhost:3000

# Expected: Dashboard loads successfully
```

**Total Setup Time**: ~15-20 minutes

---

## Scan Execution Workflow

### Overview
The scanner discovers PII across configured data sources, validates findings, and sends verified results to the backend.

### Step 1: Configure Data Sources

Create `config/connection.yml`:

```yaml
sources:
  # Filesystem scanning
  fs:
    local_files:
      path: /path/to/scan
      exclude_patterns:
        - .git
        - node_modules
        - venv
        - __pycache__
  
  # PostgreSQL scanning
  postgresql:
    production_db:
      host: localhost
      port: 5432
      user: postgres
      password: postgres
      database: myapp
      tables:
        - users
        - customers
        - transactions
      limit_start: 0
      limit_end: 1000
```

### Step 2: Configure Fingerprints (Optional)

Create `config/fingerprint.yml` to customize PII patterns:

```yaml
fingerprint:
  # Custom patterns (in addition to built-in 11 locked PIIs)
  CustomPattern:
    regex: 'CUSTOM-\d{6}'
    category: 'custom'
```

### Step 3: Execute Scan

```bash
# Basic scan (all configured sources)
python hawk_scanner/main.py all \
  --connection config/connection.yml \
  --fingerprint config/fingerprint.yml \
  --json scan_output.json

# Scan specific source
python hawk_scanner/main.py fs \
  --connection config/connection.yml \
  --json scan_output.json

# Scan with debug output
python hawk_scanner/main.py all \
  --connection config/connection.yml \
  --json scan_output.json \
  --debug
```

### Step 4: Monitor Scan Progress

**Console Output**:
```
[SDK] Initializing Presidio with model: en_core_web_sm
[SDK] AnalyzerEngine initialized successfully
[SDK] Registered 11 custom recognizers
[SCAN] Scanning filesystem: /path/to/scan
[SCAN] Processing file: customer_data.csv
✅ Verified IN_AADHAAR: 9999111122*** (passed 1 validators)
✅ Verified CREDIT_CARD: 4532015112*** (passed 1 validators)
⚠️  Rejected IN_PAN: Failed validate_pan validation
📊 Validation Results: 45/50 valid (5 rejected)
[SCAN] Scan completed in 2m 34s
[SCAN] Total findings: 1,234
[SCAN] Total assets: 56
```

### Step 5: Review Scan Output

**Output File Structure** (`scan_output.json`):
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

### Step 6: Auto-Ingestion (Optional)

Configure scanner to automatically send findings to backend:

```yaml
# In connection.yml
auto_ingest:
  enabled: true
  backend_url: http://localhost:8080/api/v1/scans/ingest-verified
  batch_size: 500
```

**Scan Duration Estimates**:
- Small dataset (<1K files, <10 tables): 1-5 minutes
- Medium dataset (1K-10K files, 10-50 tables): 5-30 minutes
- Large dataset (>10K files, >50 tables): 30+ minutes

---

## Data Ingestion Workflow

### Overview
The backend receives scan results, normalizes data, and persists to PostgreSQL.

### Step 1: Receive Scan Data

**API Endpoint**: `POST /api/v1/scans/ingest-verified`

**Request Body**:
```json
{
  "fs": [...],
  "postgresql": [...]
}
```

### Step 2: Create Scan Run

```go
// Backend creates scan_run record
scanRun := &entity.ScanRun{
    ID:              uuid.New(),
    ProfileName:     "production_scan",
    ScanStartedAt:   time.Now(),
    ScanCompletedAt: time.Now(),
    Host:            "scanner-01",
    Status:          "completed",
}
db.CreateScanRun(scanRun)
```

### Step 3: Normalize Assets

For each finding:

```go
// Generate stable ID for deduplication
stableID := generateStableID(finding.FilePath)

// Check if asset exists
asset := db.GetAssetByStableID(stableID)

if asset == nil {
    // Create new asset
    asset = &entity.Asset{
        ID:         uuid.New(),
        StableID:   stableID,
        AssetType:  determineAssetType(finding),
        Name:       finding.FileName,
        Path:       finding.FilePath,
        DataSource: finding.DataSource,
        Host:       finding.Host,
    }
    db.CreateAsset(asset)
}
```

### Step 4: Create Findings

```go
// Create finding record
finding := &entity.Finding{
    ID:          uuid.New(),
    ScanRunID:   scanRun.ID,
    AssetID:     asset.ID,
    PatternName: hawkeyeFinding.PatternName,
    Matches:     hawkeyeFinding.Matches,
    Severity:    hawkeyeFinding.Severity,
    Confidence:  hawkeyeFinding.ConfidenceScore,
}
db.CreateFinding(finding)
```

### Step 5: Create Classifications

```go
// Classify PII type
classification := &entity.Classification{
    ID:                 uuid.New(),
    FindingID:          finding.ID,
    ClassificationType: determinePIIType(finding.PatternName),
    ConfidenceScore:    finding.Confidence,
    DPDPACategory:      mapToDPDPACategory(finding.PatternName),
    RequiresConsent:    requiresConsent(finding.PatternName),
}
db.CreateClassification(classification)
```

### Step 6: Recalculate Asset Risk

```go
// Update asset risk score
riskScore := calculateAssetRisk(asset.ID)
db.UpdateAssetRiskScore(asset.ID, riskScore)
```

### Step 7: Trigger Lineage Sync

```go
// Asynchronously sync to Neo4j
go func() {
    err := semanticLineageService.SyncAssetToNeo4j(ctx, asset.ID)
    if err != nil {
        log.Printf("Lineage sync failed: %v", err)
    }
}()
```

### Step 8: Return Ingestion Result

```json
{
  "scan_run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "total_findings": 1234,
  "total_assets": 56,
  "assets_created": 12,
  "patterns_found": 8
}
```

**Ingestion Performance**:
- Throughput: ~500-1000 findings/second
- Latency: <100ms per request (batch of 500 findings)
- Database writes: Batched transactions

---

## Classification Workflow

### Overview
The classification service maps PII types to regulatory categories (DPDPA 2023).

### Step 1: Receive Finding

```go
finding := &entity.Finding{
    PatternName: "IN_AADHAAR",
    Confidence:  0.95,
}
```

### Step 2: Map to PII Type

```go
piiTypeMap := map[string]string{
    "Aadhaar":           "IN_AADHAAR",
    "PAN":               "IN_PAN",
    "Credit Card":       "CREDIT_CARD",
    "Email":             "EMAIL_ADDRESS",
    "Indian Phone":      "IN_PHONE",
    "Passport":          "IN_PASSPORT",
    "UPI":               "IN_UPI",
    "IFSC":              "IN_IFSC",
    "Bank Account":      "IN_BANK_ACCOUNT",
    "Voter ID":          "IN_VOTER_ID",
    "Driving License":   "IN_DRIVING_LICENSE",
}

piiType := piiTypeMap[finding.PatternName]
```

### Step 3: Map to DPDPA Category

```go
dpdpaMap := map[string]string{
    "IN_AADHAAR":         "Sensitive Personal Data",
    "IN_PAN":             "Financial Information",
    "CREDIT_CARD":        "Financial Information",
    "EMAIL_ADDRESS":      "Contact Information",
    "IN_PHONE":           "Contact Information",
    "IN_PASSPORT":        "Sensitive Personal Data",
    "IN_UPI":             "Financial Information",
    "IN_IFSC":            "Financial Information",
    "IN_BANK_ACCOUNT":    "Financial Information",
    "IN_VOTER_ID":        "Sensitive Personal Data",
    "IN_DRIVING_LICENSE": "Sensitive Personal Data",
}

dpdpaCategory := dpdpaMap[piiType]
```

### Step 4: Determine Consent Requirement

```go
requiresConsentMap := map[string]bool{
    "IN_AADHAAR":         true,  // Explicit consent required
    "IN_PAN":             true,
    "CREDIT_CARD":        true,
    "EMAIL_ADDRESS":      false, // Implied consent acceptable
    "IN_PHONE":           false,
    "IN_PASSPORT":        true,
    "IN_UPI":             true,
    "IN_IFSC":            false,
    "IN_BANK_ACCOUNT":    true,
    "IN_VOTER_ID":        true,
    "IN_DRIVING_LICENSE": true,
}

requiresConsent := requiresConsentMap[piiType]
```

### Step 5: Set Retention Period

```go
retentionMap := map[string]string{
    "IN_AADHAAR":         "As per purpose + 1 year",
    "IN_PAN":             "7 years (tax compliance)",
    "CREDIT_CARD":        "As per RBI guidelines",
    "EMAIL_ADDRESS":      "Until user opts out",
    "IN_PHONE":           "Until user opts out",
    "IN_PASSPORT":        "As per purpose + 1 year",
    "IN_UPI":             "As per RBI guidelines",
    "IN_IFSC":            "As per RBI guidelines",
    "IN_BANK_ACCOUNT":    "As per RBI guidelines",
    "IN_VOTER_ID":        "As per purpose + 1 year",
    "IN_DRIVING_LICENSE": "As per purpose + 1 year",
}

retentionPeriod := retentionMap[piiType]
```

### Step 6: Create Classification Record

```go
classification := &entity.Classification{
    ID:                 uuid.New(),
    FindingID:          finding.ID,
    ClassificationType: piiType,
    ConfidenceScore:    finding.Confidence,
    DPDPACategory:      dpdpaCategory,
    RequiresConsent:    requiresConsent,
    RetentionPeriod:    retentionPeriod,
    Justification:      fmt.Sprintf("Detected by pattern: %s", finding.PatternName),
}

db.CreateClassification(classification)
```

**Classification Time**: <10ms per finding

---

## Lineage Synchronization Workflow

### Overview
The lineage service builds a 3-level graph hierarchy in Neo4j.

### Step 1: Receive Asset for Sync

```go
assetID := uuid.MustParse("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
```

### Step 2: Fetch Asset from PostgreSQL

```go
asset := db.GetAssetByID(assetID)
// asset.Path = "/data/customer_data.csv"
// asset.DataSource = "filesystem"
// asset.Host = "localhost"
```

### Step 3: Create/Update System Node

```cypher
MERGE (s:System {
    name: $systemName,
    type: $systemType,
    host: $host
})
ON CREATE SET
    s.created_at = timestamp()
ON MATCH SET
    s.updated_at = timestamp()
RETURN s
```

**Parameters**:
```go
systemName := "Filesystem-localhost"
systemType := "filesystem"
host := "localhost"
```

### Step 4: Create/Update Asset Node

```cypher
MERGE (a:Asset {
    stable_id: $stableID
})
ON CREATE SET
    a.name = $name,
    a.path = $path,
    a.asset_type = $assetType,
    a.created_at = timestamp()
ON MATCH SET
    a.name = $name,
    a.updated_at = timestamp()
RETURN a
```

**Parameters**:
```go
stableID := asset.StableID
name := asset.Name
path := asset.Path
assetType := asset.AssetType
```

### Step 5: Create System-Asset Relationship

```cypher
MATCH (s:System {name: $systemName})
MATCH (a:Asset {stable_id: $stableID})
MERGE (s)-[r:SYSTEM_OWNS_ASSET]->(a)
ON CREATE SET
    r.created_at = timestamp()
RETURN r
```

### Step 6: Fetch Findings for Asset

```go
findings := db.GetFindingsByAssetID(assetID)
// Group findings by PII type
piiAggregates := aggregateFindingsByPIIType(findings)
```

### Step 7: Create PII_Category Nodes

For each unique PII type:

```cypher
MERGE (p:PII_Category {
    pii_type: $piiType
})
ON CREATE SET
    p.dpdpa_category = $dpdpaCategory,
    p.requires_consent = $requiresConsent,
    p.created_at = timestamp()
ON MATCH SET
    p.finding_count = $findingCount,
    p.avg_confidence = $avgConfidence,
    p.risk_level = $riskLevel,
    p.updated_at = timestamp()
RETURN p
```

**Parameters**:
```go
piiType := "IN_AADHAAR"
dpdpaCategory := "Sensitive Personal Data"
requiresConsent := true
findingCount := 45
avgConfidence := 0.92
riskLevel := "high"
```

### Step 8: Create Asset-PII Relationships

```cypher
MATCH (a:Asset {stable_id: $stableID})
MATCH (p:PII_Category {pii_type: $piiType})
MERGE (a)-[r:ASSET_CONTAINS_PII]->(p)
ON CREATE SET
    r.created_at = timestamp()
ON MATCH SET
    r.finding_count = $findingCount,
    r.avg_confidence = $avgConfidence,
    r.updated_at = timestamp()
RETURN r
```

### Step 9: Calculate Asset Risk Score

```go
riskScore := 0
for _, aggregate := range piiAggregates {
    if aggregate.RiskLevel == "high" {
        riskScore += 100
    } else if aggregate.RiskLevel == "medium" {
        riskScore += 50
    } else {
        riskScore += 25
    }
}
riskScore = min(riskScore, 100)

// Update asset node
neo4j.Execute(`
    MATCH (a:Asset {stable_id: $stableID})
    SET a.risk_score = $riskScore
`, stableID, riskScore)
```

### Step 10: Verify Sync

```cypher
// Query to verify 3-level hierarchy
MATCH (s:System)-[:SYSTEM_OWNS_ASSET]->(a:Asset)-[:ASSET_CONTAINS_PII]->(p:PII_Category)
WHERE a.stable_id = $stableID
RETURN s, a, p
```

**Sync Performance**:
- Single asset sync: 50-100ms
- Batch sync (100 assets): 5-10 seconds
- Full database sync: 1-5 minutes (depends on asset count)

---

## Frontend Visualization Workflow

### Overview
The frontend queries the backend API and renders interactive visualizations.

### Step 1: Load Dashboard

```typescript
// Fetch dashboard metrics
const response = await axios.get('http://localhost:8080/api/v1/classification/summary');

const metrics = {
    totalFindings: response.data.total_findings,
    totalAssets: response.data.total_assets,
    criticalFindings: response.data.critical_findings,
    highRiskAssets: response.data.high_risk_assets,
};
```

### Step 2: Fetch Lineage Graph

```typescript
// Query lineage API
const lineageResponse = await axios.get('http://localhost:8080/api/v1/lineage');

const graph = {
    nodes: lineageResponse.data.nodes,
    edges: lineageResponse.data.edges,
};
```

**Response Structure**:
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

### Step 3: Render Lineage Graph

```typescript
import ReactFlow from 'reactflow';

const LineageMap = () => {
    const nodes = graph.nodes.map(node => ({
        id: node.id,
        type: node.type.toLowerCase(),
        data: {
            label: node.label,
            metadata: node.metadata,
        },
        position: calculatePosition(node),
    }));

    const edges = graph.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.type,
        animated: true,
    }));

    return <ReactFlow nodes={nodes} edges={edges} />;
};
```

### Step 4: Fetch Findings

```typescript
// Query findings with filters
const findingsResponse = await axios.get('http://localhost:8080/api/v1/findings', {
    params: {
        severity: 'critical',
        limit: 100,
        offset: 0,
    },
});

const findings = findingsResponse.data.findings;
```

### Step 5: Render Findings Table

```typescript
const FindingsTable = () => {
    return (
        <table>
            <thead>
                <tr>
                    <th>Asset</th>
                    <th>PII Type</th>
                    <th>Severity</th>
                    <th>Confidence</th>
                    <th>Matches</th>
                </tr>
            </thead>
            <tbody>
                {findings.map(finding => (
                    <tr key={finding.id}>
                        <td>{finding.asset_name}</td>
                        <td>{finding.pattern_name}</td>
                        <td>{finding.severity}</td>
                        <td>{(finding.confidence_score * 100).toFixed(0)}%</td>
                        <td>{finding.matches.length}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
```

### Step 6: Generate Risk Heatmap

```typescript
// Aggregate findings by asset and severity
const heatmapData = assets.map(asset => ({
    name: asset.name,
    critical: asset.critical_count,
    high: asset.high_count,
    medium: asset.medium_count,
    low: asset.low_count,
}));

// Render heatmap
const RiskHeatmap = () => {
    return (
        <div className="heatmap">
            {heatmapData.map(asset => (
                <div
                    key={asset.name}
                    className={`heatmap-cell risk-${getRiskLevel(asset)}`}
                    title={`${asset.name}: ${asset.critical + asset.high + asset.medium + asset.low} findings`}
                >
                    {asset.name}
                </div>
            ))}
        </div>
    );
};
```

**Rendering Performance**:
- Dashboard load: <500ms
- Lineage graph render: <1s (for <100 nodes)
- Findings table: <200ms (for 100 rows)

---

## Compliance Reporting Workflow

### Overview
Generate DPDPA 2023 compliance reports.

### Step 1: Query Compliance Data

```go
// Get all findings grouped by DPDPA category
complianceData := db.QueryCompliancePosture()
```

### Step 2: Calculate Compliance Metrics

```go
metrics := ComplianceMetrics{
    TotalPIITypes:          11,
    PIITypesDetected:       len(complianceData),
    SensitiveDataAssets:    countAssetsByCategory("Sensitive Personal Data"),
    FinancialDataAssets:    countAssetsByCategory("Financial Information"),
    ContactDataAssets:      countAssetsByCategory("Contact Information"),
    ConsentRequiredAssets:  countAssetsRequiringConsent(),
    NonCompliantAssets:     identifyNonCompliantAssets(),
}
```

### Step 3: Generate Report

```json
{
  "report_date": "2026-01-19",
  "compliance_framework": "DPDPA 2023",
  "summary": {
    "total_assets": 156,
    "assets_with_pii": 89,
    "compliance_score": 78,
    "non_compliant_assets": 12
  },
  "categories": [
    {
      "category": "Sensitive Personal Data",
      "pii_types": ["IN_AADHAAR", "IN_PASSPORT", "IN_VOTER_ID", "IN_DRIVING_LICENSE"],
      "asset_count": 45,
      "finding_count": 1234,
      "requires_consent": true,
      "retention_period": "As per purpose + 1 year"
    },
    {
      "category": "Financial Information",
      "pii_types": ["IN_PAN", "CREDIT_CARD", "IN_BANK_ACCOUNT", "IN_UPI", "IN_IFSC"],
      "asset_count": 32,
      "finding_count": 876,
      "requires_consent": true,
      "retention_period": "7 years (tax/RBI compliance)"
    },
    {
      "category": "Contact Information",
      "pii_types": ["EMAIL_ADDRESS", "IN_PHONE"],
      "asset_count": 67,
      "finding_count": 2345,
      "requires_consent": false,
      "retention_period": "Until user opts out"
    }
  ],
  "recommendations": [
    "Implement consent management for 45 assets with sensitive data",
    "Review retention policies for 12 non-compliant assets",
    "Encrypt 23 assets containing financial information"
  ]
}
```

### Step 4: Export Report

```typescript
// Frontend export functionality
const exportReport = async () => {
    const response = await axios.get('http://localhost:8080/api/v1/compliance/report', {
        responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'compliance_report.pdf');
    document.body.appendChild(link);
    link.click();
};
```

---

## Troubleshooting Workflow

### Issue: Scan Not Detecting PII

**Diagnosis**:
1. Check scanner logs for validation failures
2. Verify NLP model is loaded correctly
3. Test individual validators

**Resolution**:
```bash
# Test Aadhaar validator
python -c "from sdk.validators.verhoeff import validate_aadhaar; print(validate_aadhaar('999911112226'))"

# Expected: True (if valid Aadhaar)

# Check NLP model
python -m spacy info en_core_web_sm

# Re-download if missing
python -m spacy download en_core_web_sm
```

### Issue: Findings Not Appearing in Dashboard

**Diagnosis**:
1. Check if ingestion succeeded
2. Verify PostgreSQL has data
3. Check Neo4j sync status

**Resolution**:
```bash
# Check PostgreSQL
psql -U postgres -d arc_platform -c "SELECT COUNT(*) FROM findings;"

# Check Neo4j
docker exec -it arc-platform-neo4j cypher-shell -u neo4j -p password123 \
  "MATCH (n) RETURN COUNT(n);"

# Manual lineage sync
curl -X POST http://localhost:8080/api/v1/lineage/sync
```

### Issue: Lineage Graph Not Rendering

**Diagnosis**:
1. Check browser console for errors
2. Verify API response
3. Check graph data structure

**Resolution**:
```bash
# Test lineage API
curl http://localhost:8080/api/v1/lineage | jq .

# Expected: JSON with nodes and edges arrays

# Check frontend logs
# Open browser DevTools → Console
# Look for React/ReactFlow errors
```

### Issue: High Memory Usage

**Diagnosis**:
1. Check NLP model size
2. Verify batch processing is enabled
3. Monitor database connection pool

**Resolution**:
```bash
# Use small NLP model (not large)
# In sdk/config.yml:
model:
  name: en_core_web_sm  # NOT en_core_web_lg

# Enable batch processing
# In scanner code:
batch_size: 1000

# Reduce database connections
# In backend .env:
DB_MAX_CONNECTIONS=25
```

---

## Workflow Summary

| Workflow | Duration | Complexity | Automation |
|----------|----------|------------|------------|
| System Setup | 15-20 min | Medium | Partial |
| Scan Execution | 1-30 min | Low | Full |
| Data Ingestion | <1 min | Low | Full |
| Classification | <10ms | Low | Full |
| Lineage Sync | 1-5 min | Medium | Full |
| Frontend Viz | <1s | Low | Full |
| Compliance Report | <5s | Low | Partial |

All workflows are designed for **minimal manual intervention** with comprehensive automation and error handling.
