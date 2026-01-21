-- Migration: Add consent management tables
-- Version: 9
-- Description: Add consent_records table for DPDPA Section 6 compliance

-- Create consent_records table
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    pii_type VARCHAR(50) NOT NULL,
    consent_obtained_at TIMESTAMP NOT NULL,
    consent_expires_at TIMESTAMP,
    consent_withdrawn_at TIMESTAMP,
    consent_basis VARCHAR(50) NOT NULL DEFAULT 'explicit', -- 'explicit', 'legitimate_interest', 'contractual', 'legal_obligation'
    purpose TEXT NOT NULL, -- Purpose for which consent was obtained
    obtained_by VARCHAR(255) NOT NULL, -- User who recorded the consent
    withdrawal_requested_by VARCHAR(255),
    withdrawal_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_consent_records_asset_id ON consent_records(asset_id);
CREATE INDEX idx_consent_records_pii_type ON consent_records(pii_type);
CREATE INDEX idx_consent_records_status ON consent_records(consent_withdrawn_at) WHERE consent_withdrawn_at IS NULL;
CREATE INDEX idx_consent_records_expiry ON consent_records(consent_expires_at) WHERE consent_expires_at IS NOT NULL;

-- Add retention policy columns to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS retention_policy_days INTEGER DEFAULT 90;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS retention_policy_name VARCHAR(100) DEFAULT 'Standard 90-Day';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS retention_policy_basis TEXT;

-- Add temporal tracking to findings table
ALTER TABLE findings ADD COLUMN IF NOT EXISTS first_detected_at TIMESTAMP DEFAULT NOW();
ALTER TABLE findings ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT NOW();

-- Create function to calculate deletion due date
CREATE OR REPLACE FUNCTION calculate_deletion_due(
    p_first_detected_at TIMESTAMP,
    p_retention_days INTEGER
) RETURNS TIMESTAMP AS $$
BEGIN
    RETURN p_first_detected_at + (p_retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for retention violations
CREATE OR REPLACE VIEW retention_violations AS
SELECT 
    f.id AS finding_id,
    f.asset_id,
    a.name AS asset_name,
    f.pii_type,
    f.first_detected_at,
    a.retention_policy_days,
    calculate_deletion_due(f.first_detected_at, a.retention_policy_days) AS deletion_due_at,
    CASE 
        WHEN calculate_deletion_due(f.first_detected_at, a.retention_policy_days) < NOW() 
        THEN EXTRACT(DAY FROM NOW() - calculate_deletion_due(f.first_detected_at, a.retention_policy_days))
        ELSE 0
    END AS days_overdue
FROM findings f
JOIN assets a ON f.asset_id = a.id
WHERE calculate_deletion_due(f.first_detected_at, a.retention_policy_days) < NOW();

-- Create view for consent status
CREATE OR REPLACE VIEW consent_status_view AS
SELECT 
    cr.id,
    cr.asset_id,
    cr.pii_type,
    cr.consent_obtained_at,
    cr.consent_expires_at,
    cr.consent_withdrawn_at,
    cr.consent_basis,
    CASE 
        WHEN cr.consent_withdrawn_at IS NOT NULL THEN 'WITHDRAWN'
        WHEN cr.consent_expires_at IS NOT NULL AND cr.consent_expires_at < NOW() THEN 'EXPIRED'
        WHEN cr.consent_expires_at IS NOT NULL AND cr.consent_expires_at < NOW() + INTERVAL '30 days' THEN 'EXPIRING_SOON'
        ELSE 'VALID'
    END AS status
FROM consent_records cr;

-- Add updated_at trigger for consent_records
CREATE OR REPLACE FUNCTION update_consent_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_records_updated_at
    BEFORE UPDATE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION update_consent_records_updated_at();

-- Add comments for documentation
COMMENT ON TABLE consent_records IS 'Stores consent records for DPDPA Section 6 compliance';
COMMENT ON COLUMN consent_records.consent_basis IS 'Legal basis for processing: explicit, legitimate_interest, contractual, legal_obligation';
COMMENT ON COLUMN consent_records.purpose IS 'Specific purpose for which consent was obtained';
COMMENT ON VIEW retention_violations IS 'Assets with PII that should have been deleted per retention policy';
COMMENT ON VIEW consent_status_view IS 'Current status of all consent records';
