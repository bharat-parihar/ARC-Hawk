-- Rollback migration for consent management and retention policy

-- Drop triggers
DROP TRIGGER IF EXISTS consent_records_updated_at ON consent_records;
DROP FUNCTION IF EXISTS update_consent_records_updated_at();

-- Drop views
DROP VIEW IF EXISTS consent_status_view;
DROP VIEW IF EXISTS retention_violations;

-- Drop function
DROP FUNCTION IF EXISTS calculate_deletion_due(TIMESTAMP, INTEGER);

-- Remove columns from findings
ALTER TABLE findings DROP COLUMN IF EXISTS last_seen_at;
ALTER TABLE findings DROP COLUMN IF EXISTS first_detected_at;

-- Remove columns from assets
ALTER TABLE assets DROP COLUMN IF EXISTS retention_policy_basis;
ALTER TABLE assets DROP COLUMN IF EXISTS retention_policy_name;
ALTER TABLE assets DROP COLUMN IF EXISTS retention_policy_days;

-- Drop indexes
DROP INDEX IF EXISTS idx_consent_records_expiry;
DROP INDEX IF EXISTS idx_consent_records_status;
DROP INDEX IF EXISTS idx_consent_records_pii_type;
DROP INDEX IF EXISTS idx_consent_records_asset_id;

-- Drop table
DROP TABLE IF EXISTS consent_records;
