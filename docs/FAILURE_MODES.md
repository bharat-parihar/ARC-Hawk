# Failure Modes & Recovery Guide

## Overview

ARC-Hawk is designed with graceful degradation in mind. This document describes how the system behaves when dependencies are unavailable and how to recover from common failure scenarios.

---

## Dependency Failure Modes

### 1. Neo4j Unavailable

**Behavior**: ✅ Graceful Degradation  
**Impact**: Medium (reduced functionality)

**What Happens**:
- System automatically falls back to PostgreSQL for lineage graphs
- Semantic graph API (`/api/v1/graph/semantic`) uses PostgreSQL aggregation
- No loss of core functionality
- Performance may be slightly reduced for complex graphs

**How to Detect**:
```bash
# Check logs for:
"WARNING: Failed to connect to Neo4j: ... (falling back to PostgreSQL-only mode)"
# Or:
"Neo4j disabled - using PostgreSQL-only lineage"
```

**Recovery**:
1. Start Neo4j: `docker-compose up -d neo4j`
2. Verify: `curl http://localhost:7474`
3. Restart backend to reconnect

**Configuration**:
- Set `NEO4J_ENABLED=false` in `.env` to explicitly disable
- Or simply don't start the Neo4j container

---

### 2. Presidio ML Service Unavailable

**Behavior**: ✅ Graceful Degradation  
**Impact**: Low (ML enhancement disabled)

**What Happens**:
- System runs in **rules-only mode**
- Classification engine uses regex patterns only
- No ML-based confidence adjustments
- Core PII detection still functional

**How to Detect**:
```bash
# Check logs for:
"Presidio ML integration disabled (rules-only mode)"
```

**Recovery**:
1. Start Presidio: `docker-compose up -d presidio-analyzer`
2. Verify: `curl http://localhost:5001/health`
3. Restart backend with `PRESIDIO_ENABLED=true`

**Configuration**:
- Set `PRESIDIO_ENABLED=false` in `.env` to disable
- Default URL: `http://localhost:5001`

---

### 3. PostgreSQL Unavailable  

**Behavior**: 🔴 System Inoperable  
**Impact**: Critical (no operation possible)

**What Happens**:
- Backend fails to start
- `Failed to connect to database` error in logs
- All APIs return connection errors

**How to Detect**:
```bash
# Backend won't start, shows:
"Failed to connect to database: ..."
```

**Recovery**:
1. Start PostgreSQL: `docker-compose up -d postgres`
2. Verify: `pg_isready -h localhost -p 5432`
3. Restart backend

**Prevention**:
- PostgreSQL is mandatory, cannot be disabled
- Always start before backend: `docker-compose up -d postgres`

---

## Network & Timeout Issues

### Slow Database Queries

**Symptoms**:
- API requests timing out
- High latency on findings endpoint

**Mitigation**:
- Backend has 15-second timeout for requests
- Pagination limits (max 100 results per page)
- Use filtering parameters to reduce query load

**Recovery**:
```bash
# Check database performance
docker exec -it arc-platform-db psql -U postgres -d arc_platform \
  -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"
```

### Frontend Can't Reach Backend

**Common Causes**:
- CORS misconfiguration
- Backend not running
- Port 8080 blocked

**Diagnosis**:
```bash
# Check backend is running
curl http://localhost:8080/health

# Check CORS settings
grep ALLOWED_ORIGINS apps/backend/.env
```

**Fix**:
```bash
# Update CORS in .env
ALLOWED_ORIGINS=http://localhost:3000

# Restart backend
```

---

## Data Corruption & Recovery

### Restart Safety

**Guaranteed**:
- ✅ All data persists across restarts (PostgreSQL)
- ✅ Neo4j graph data persists (if enabled)
- ✅ Scan history preserved

**Not Guaranteed**:
- ⚠️ In-flight scan processing may be lost
- ⚠️ Re-run same scan to recover

### Idempotent Scans

**Safe to Re-run**:
- Running the same scan multiple times won't duplicate findings
- Findings are deduplicated by hash

---

## Error Responses

### 500 Internal Server Error

**Possible Causes**:
1. Database connection lost
2. Neo4j driver panic (if enabled)
3. Malformed data in database

**Debug Steps**:
```bash
# Check backend logs
tail -f apps/backend/backend.log

# Look for panic stack traces or database errors
```

### 400 Bad Request

**Common Causes**:
- Invalid UUID format in query params
- Malformed JSON in POST body
- Missing required fields

**Example**:
```json
{
  "error": "Invalid scan_run_id format",
  "details": "invalid UUID length: 10"
}
```

---

## Monitoring & Alerts

### Health Check Endpoints

```bash
# Backend
curl http://localhost:8080/health
# Expected: {"status":"healthy","service":"arc-platform-backend"}

# PostgreSQL
pg_isready -h localhost -p 5432

# Neo4j (if enabled)
curl http://localhost:7474

# Presidio (if enabled)
curl http://localhost:5001/health
```

### Recommended Monitoring

1. **Backend Health**: Poll `/health` every 30s
2. **Database**: Monitor connection count
3. **Disk Space**: Ensure adequate for scan results
4. **Memory**: Watch for memory leaks in long-running scans

---

## Emergency Procedures

### Complete System Reset

```bash
# Stop all services
docker-compose down

# Clear data (WARNING: destructive)
docker volume rm arc-platform-db_postgres_data
docker volume rm arc-platform-db_neo4j_data

# Restart fresh
docker-compose up -d
cd apps/backend && go run cmd/server/main.go
```

### Partial Reset (Keep Database)

```bash
# Just restart services
docker-compose restart postgres neo4j presidio-analyzer
pkill -f "apps/backend"
cd apps/backend && ./server
```

---

## Support & Debugging

### Enable Debug Logging

```bash
# In .env
GIN_MODE=debug

# Restart backend for verbose logs
```

### Collect Diagnostic Info

```bash
# System status
docker ps
curl http://localhost:8080/health

# Recent logs
tail -100 apps/backend/backend.log

# Database status
docker exec -it arc-platform-db psql -U postgres -c "\dt"
```

---

## See Also

- [System Architecture](../SYSTEM_SUMMARY.md)
- [API Documentation](../ENDPOINTS_AND_CONNECTIONS.md)
- [Deployment Guide](deployment/README.md)
