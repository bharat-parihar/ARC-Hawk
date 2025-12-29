-- Migration: Add signal breakdown to classifications table
-- This adds columns to store multi-signal classification breakdown

ALTER TABLE classifications ADD COLUMN IF NOT EXISTS signal_breakdown JSONB;
ALTER TABLE classifications ADD COLUMN IF NOT EXISTS engine_version VARCHAR(50) DEFAULT 'v1.0';
ALTER TABLE classifications ADD COLUMN IF NOT EXISTS rule_score DECIMAL(5,2);
ALTER TABLE classifications ADD COLUMN IF NOT EXISTS presidio_score DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE classifications ADD COLUMN IF NOT EXISTS context_score DECIMAL(5,2);
ALTER TABLE classifications ADD COLUMN IF NOT EXISTS entropy_score DECIMAL(5,2);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_classifications_engine_version ON classifications(engine_version);

-- Add comments
COMMENT ON COLUMN classifications.signal_breakdown IS 'Detailed breakdown of all signals used in classification decision with explanations';
COMMENT ON COLUMN classifications.engine_version IS 'Classification engine version for compatibility tracking';
COMMENT ON COLUMN classifications.rule_score IS 'Rule-based signal score (0.00-1.00, weight: 45%)';
COMMENT ON COLUMN classifications.presidio_score IS 'Presidio ML signal score (0.00-1.00, weight: 25%)';
COMMENT ON COLUMN classifications.context_score IS 'Context enrichment signal score (0.00-1.00, weight: 20%)';
COMMENT ON COLUMN classifications.entropy_score IS 'Statistical entropy signal score (0.00-1.00, weight: 10%)';
