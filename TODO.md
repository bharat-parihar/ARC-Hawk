# ARC-Hawk TODO List - Production Readiness

This document tracks all issues, incomplete features, and technical debt that need to be addressed before the system is production-ready.

---

## Critical Issues (Must Fix Before Production)

### 1. Authentication & Authorization
- **Status**: NOT IMPLEMENTED
- **Location**: All backend API endpoints
- **Issue**: No authentication/authorization mechanism
- **Impact**: All API endpoints publicly accessible
- **Required**:
  - JWT authentication or API keys
  - Role-based access control (RBAC)
  - Middleware for protected routes

### 2. Frontend API Integration
- **Status**: IN PROGRESS
- **Location**: `apps/frontend/app/page.tsx`
- **Issue**: Dashboard was using hardcoded mock data
- **Fix Applied**: Created `services/dashboard.api.ts` for real API calls
- **Remaining**:
  - Verify API endpoints return expected data format
  - Add proper error handling for failed API calls
  - Implement loading states

### 3. Scanner SDK Integration
- **Status**: PARTIAL
- **Location**: `apps/scanner/hawk_scanner/commands/fs.py`
- **Issue**: SDK validators not integrated into main scanning pipeline
- **Fix Applied**: Created `hawk_scanner/internals/validation_integration.py`
- **Remaining**:
  - Integrate validation into other scanner commands (postgresql, mongodb, s3, etc.)
  - Add `--validate` flag to scanner CLI

---

## High Priority Issues

### 4. Remediation Module Incomplete
- **Status**: INCOMPLETE
- **Location**: `apps/backend/modules/remediation/`
- **Issues**:
  - `GetRemediationActions` returns empty array
  - `GetRemediationHistory` returns empty array
  - `GetPIIPreview` returns hardcoded data
  - Connector implementations (MongoDB, etc.) are empty stubs
- **Required**:
  - Implement actual remediation logic
  - Add connector implementations
  - Add preview storage/retrieval

### 5. Temporal Workflow Activities
- **Status**: INCOMPLETE
- **Location**: `apps/backend/modules/scanning/activities/scan_activities.go`
- **TODO Comments**:
  - Line 73: Integrate with existing `ingestion_service.go` logic
  - Line 88: Integrate with existing lineage sync logic
  - Line 149: Execute actual remediation on source system
  - Line 197: Execute actual rollback on source system
  - Lines 209-228: Finding retrieval, policy retrieval, condition evaluation, action execution

### 6. Lineage Handler Incomplete
- **Status**: PARTIAL
- **Location**: `apps/backend/modules/lineage/api/lineage_handler_v2.go`
- **Issues**:
  - `by_pii_type` aggregation returns empty array
  - Detailed PII aggregations not implemented

### 7. Masking Module Incomplete
- **Status**: PARTIAL
- **Location**: `apps/backend/modules/masking/`, `apps/scanner/sdk/masking/`
- **Issues**:
  - `MaskAsset` function incomplete
  - Scanner masking adapters not connected to main workflow
  - Line 366 in `filesystem.py`: JSONPath support for complex paths not implemented

---

## Medium Priority Issues

### 8. No Tests
- **Status**: MISSING
- **Locations**:
  - `apps/frontend/` - No test files
  - `apps/backend/modules/` - Integration tests missing
- **Required**:
  - Add frontend component tests (React Testing Library)
  - Add backend unit tests
  - Add integration tests for API endpoints
  - Add scanner integration tests

### 9. Hardcoded Credentials
- **Status**: NEEDS REVIEW
- **Locations**:
  - `docker-compose.yml`: Hardcoded passwords (`postgres`, `password123`)
  - `docker-compose.yml`: Neo4j credentials hardcoded
- **Required**:
  - Move credentials to environment variables or secrets manager
  - Update documentation for secure deployment

### 10. Multi-Source Connectors Not Tested
- **Status**: UNTESTED
- **Locations**: `apps/scanner/hawk_scanner/commands/`
- **Connectors**:
  - S3 (`s3.py`) - Not tested
  - GCS (`gcs.py`) - Not tested
  - MongoDB (`mongodb.py`) - Not tested
  - MySQL (`mysql.py`) - Not tested
  - Redis (`redis.py`) - Not tested
  - Slack (`slack.py`) - Not tested
  - Firebase (`firebase.py`) - Not tested
  - CouchDB (`couchdb.py`) - Not tested
  - Google Drive (`gdrive.py`, `gdrive_workspace.py`) - Not tested

---

## Low Priority Issues

### 11. Documentation Accuracy
- **Status**: NEEDS UPDATE
- **Action**: Update all documentation to reflect current state
- **Specifics**:
  - Remove "Production Ready" claims (DONE)
  - Add "Early Access" or "Development" labels
  - Document known limitations clearly

### 12. Error Handling Improvements
- **Status**: NEEDS REVIEW
- **Issue**: Generic error messages without actionable information
- **Required**:
  - Add specific error codes
  - Add error context to responses
  - Implement proper logging

### 13. Presidio Configuration
- **Status**: FIXED
- **Issue**: Used large model (`en_core_web_lg`) causing memory issues
- **Fix Applied**: Changed to `en_core_web_sm` in `presidio/config/analyzer_config.yaml`

### 14. Hardcoded Path in Scan Trigger
- **Status**: FIXED
- **Location**: `apps/backend/modules/scanning/api/scan_trigger_handler.go`
- **Fix Applied**: Replaced hardcoded `/Users/prathameshyadav/ARC-Hawk` with dynamic path detection

---

## Missing Dependencies

### 15. Scanner Dependencies
- **Issue**: `psycopg2-binary` not in `requirements.txt` for PostgreSQL support
- **Required**: Add `psycopg2-binary` to requirements

---

## Completed Fixes

| Issue | Status | Fix Date |
|-------|--------|----------|
| Frontend mock data | COMPLETED | 2026-01-22 |
| SDK validators integration | COMPLETED | 2026-01-22 |
| Presidio config model | COMPLETED | 2026-01-22 |
| Hardcoded path | COMPLETED | 2026-01-22 |
| Production Ready claims | COMPLETED | 2026-01-22 |

---

## Estimated Effort for Production Readiness

| Category | Estimated Effort |
|----------|-----------------|
| Authentication & Authorization | 2-3 weeks |
| Complete SDK Integration | 1 week |
| Remediation Module | 2-3 weeks |
| Temporal Workflows | 2 weeks |
| Test Suite | 3-4 weeks |
| Multi-Source Testing | 2 weeks |
| Security Hardening | 1 week |

**Total Estimated Time**: 13-18 weeks

---

## Next Steps

1. **Immediate**: Implement authentication before any deployment
2. **Short-term**: Complete SDK validator integration across all scanners
3. **Medium-term**: Add comprehensive test suite
4. **Long-term**: Complete remediation and Temporal workflow features
