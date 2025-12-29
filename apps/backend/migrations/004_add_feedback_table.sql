CREATE TABLE IF NOT EXISTS finding_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID NOT NULL REFERENCES findings(id),
    user_id TEXT NOT NULL DEFAULT 'system',
    feedback_type TEXT NOT NULL, -- 'FALSE_POSITIVE', 'FALSE_NEGATIVE', 'CONFIRMED'
    original_classification TEXT NOT NULL,
    proposed_classification TEXT, 
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_feedback_finding_id ON finding_feedback(finding_id);
