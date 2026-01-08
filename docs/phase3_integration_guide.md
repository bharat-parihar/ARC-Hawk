# Phase 3 Integration Guide

## Wiring the New Lineage Endpoint

### Step 1: Update main.go

Add the new lineage handler initialization:

```go
// In cmd/server/main.go, after existing handler initialization:

// Create new unified lineage handler (Phase 3)
lineageHandler := api.NewLineageHandler(semanticLineageService)
```

### Step 2: Update router.go

Replace the old dual lineage endpoints with the unified endpoint:

```go
// In SetupRoutes method:

// OLD endpoints (remove these):
// v1.GET("/lineage", r.lineageHandler.GetLineage)
// v1.GET("/graph/semantic", r.graphHandler.GetSemanticGraph)

// NEW unified endpoint (Phase 3):
v1.GET("/lineage", lineageHandler.GetLineage)           // 4-level hierarchy
v1.GET("/lineage/stats", lineageHandler.GetLineageStats) // Aggregations only
```

### Step 3: Update ingestion_service.go

Add Neo4j sync to the ingestion flow:

```go
// In IngestScan method, after creating finding and classification:

// NEW: Sync to Neo4j 4-level hierarchy (Phase 3)
if err := s.semanticLineageService.SyncFindingToGraph(
    ctx,
    finding,
    asset,
    classification,
); err != nil {
    // Log error but don't fail ingestion
    log.Printf("Warning: Failed to sync to Neo4j: %v", err)
}
```

### Step 4: Initialize Neo4j Schema

Run the schema setup:

```bash
# Connect to Neo4j
docker exec -it neo4j cypher-shell -u neo4j -p password123

# Run schema commands
:source /path/to/neo4j_schema.cypher
```

Or programmatically in Go:

```go
// In main.go, after Neo4j connection:
if neo4jEnabled == "true" {
    // Initialize schema
    schemaFile := "apps/backend/internal/infrastructure/persistence/neo4j_schema.cypher"
    // Read and execute...
}
```

### Step 5: Test the Endpoint

```bash
# Get full hierarchy
curl http://localhost:8080/api/v1/lineage

# Filter by system
curl "http://localhost:8080/api/v1/lineage?system=MacBook%20Pro"

# Filter by risk
curl "http://localhost:8080/api/v1/lineage?risk=CRITICAL"

# Get stats only
curl http://localhost:8080/api/v1/lineage/stats
```

### Expected Response

```json
{
  "status": "success",
  "data": {
    "hierarchy": {
      "nodes": [
        {"id": "system-localhost", "type": "system", "label": "localhost"},
        {"id": "asset-123", "type": "asset", "label": "/data/users.csv"},
        {"id": "dc-...", "type": "data_category", "label": "Sensitive Personal Data"},
        {"id": "IN_AADHAAR", "type": "pii_type", "label": "IN_AADHAAR", "metadata": {"count": 142}}
      ],
      "edges": [
        {"source": "system-localhost", "target": "asset-123", "type": "CONTAINS"},
        {"source": "asset-123", "target": "dc-...", "type": "HAS_CATEGORY"},
        {"source": "dc-...", "target": "IN_AADHAAR", "type": "INCLUDES"}
      ]
    },
    "aggregations": {
      "by_pii_type": [
        {
          "pii_type": "IN_AADHAAR",
          "total_findings": 142,
          "risk_level": "CRITICAL",
          "affected_assets": 3
        }
      ],
      "total_assets": 5,
      "total_pii_types": 8
    }
  }
}
```

### Step 6: Update Frontend

Update the lineage component to use the new endpoint:

```typescript
// OLD
const response = await fetch('/api/v1/graph/semantic');

// NEW
const response = await fetch('/api/v1/lineage');
const data = await response.json();
const { hierarchy, aggregations } = data.data;
```

### Step 7: Remove Old Code (After Testing)

Once confirmed working:

1. Remove `lineage_service.go` (PostgreSQL-based)
2. Remove old `lineage_handler.go`
3. Remove `/graph/semantic` endpoint
4. Update frontend to remove dual graph logic

---

## Verification Checklist

- [ ] Neo4j schema created (indexes, constraints)
- [ ] Ingestion syncs to Neo4j 4-level hierarchy
- [ ] `/api/v1/lineage` returns hierarchy
- [ ] `/api/v1/lineage/stats` returns aggregations
- [ ] Filters work (system, risk)
- [ ] Frontend displays graph correctly
- [ ] Old endpoints removed
- [ ] Performance < 500ms for 10K findings
