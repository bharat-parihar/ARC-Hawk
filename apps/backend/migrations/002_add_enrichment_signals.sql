-- Migration: Add enrichment signals to findings table
-- This adds columns to store the enrichment layer output for each finding

ALTER TABLE findings ADD COLUMN IF NOT EXISTS enrichment_signals JSONB;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS enrichment_score DECIMAL(5,2);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS enrichment_failed BOOLEAN DEFAULT false;

-- Create index for querying by enrichment score
CREATE INDEX IF NOT EXISTS idx_findings_enrichment_score ON findings(enrichment_score DESC);

-- Add comment for documentation
COMMENT ON COLUMN findings.enrichment_signals IS 'JSON object containing detailed enrichment signals: asset_semantics, environment, entropy, charset_diversity, token_shape, value_hash, historical_count';
COMMENT ON COLUMN findings.enrichment_score IS 'Composite enrichment score (0.00-1.00) used in multi-signal classification';
COMMENT ON COLUMN findings.enrichment_failed IS 'Tracks if enrichment layer encountered errors processing this finding';
