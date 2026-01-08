# Backend Router Integration Guide

## Adding the Verified Endpoint

To wire up the new SDK-verified ingestion endpoint, add the following to `router.go`:

### Step 1: Import the new handler
```go
import (
    // ... existing imports
    "github.com/arc-platform/backend/internal/api"
)
```

### Step 2: Initialize the handler in `main.go`

Add after existing handler initialization:
```go
// In cmd/server/main.go, after ingestionHandler initialization:
verifiedHandler := api.NewIngestVerifiedHandler(ingestionService, classificationService)
```

### Step 3: Add the route

In `router.go`, add to the v1 group:
```go
func SetupRouter(
    ingestionHandler *api.IngestionHandler,
    verifiedHandler *api.IngestVerifiedHandler,  // Add this parameter
    // ... other handlers
) *gin.Engine {
    // ... existing setup
    
    v1 := r.Group("/api/v1")
    {
        // Existing routes
        v1.POST("/scans/ingest", ingestionHandler.IngestScan)
        
        // NEW: SDK-verified ingestion endpoint
        v1.POST("/scans/ingest-verified", verifiedHandler.IngestVerified)
        
        // ... other routes
    }
    
    return r
}
```

### Step 4: Update main.go router call

```go
// In cmd/server/main.go:
router := api.SetupRouter(
    ingestionHandler,
    verifiedHandler,  // Add this argument
    // ... other handlers
)
```

## Testing the Endpoint

### 1. Generate test payload
```bash
python3 scripts/test_verified_payload.py
```

### 2. Start backend
```bash
cd apps/backend
go run cmd/server/main.go
```

### 3. Test the endpoint
```bash
curl -X POST http://localhost:8080/api/v1/scans/ingest-verified \
  -H "Content-Type: application/json" \
  -d @test_verified_payload.json
```

### Expected Response
```json
{
  "status": "success",
  "scan_run_id": "...",
  "total_findings": 3,
  "total_assets": 2,
  "validation_mode": "sdk"
}
```

## Verification Queries

### Check findings in database
```sql
SELECT 
    f.id,
    f.file_path,
    f.match_value as value_hash,
    f.severity,
    f.confidence_score,
    c.classification_type,
    f.metadata->>'validated_by' as validator
FROM findings f
JOIN classifications c ON f.id = c.finding_id
WHERE f.metadata->>'validated_by' = 'sdk'
ORDER BY f.created_at DESC
LIMIT 10;
```

### Check scan run
```sql
SELECT 
    id,
    profile_name,
    total_findings,
    total_assets,
    status,
    metadata->>'scanner_version' as scanner_version
FROM scan_runs
WHERE metadata->>'scanner_version' = '2.0-sdk'
ORDER BY scan_completed_at DESC
LIMIT 5;
```
