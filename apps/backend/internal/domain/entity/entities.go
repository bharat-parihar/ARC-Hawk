package entity

import (
	"time"

	"github.com/google/uuid"
)

// ScanRun represents a single scan execution
type ScanRun struct {
	ID              uuid.UUID              `json:"id"`
	ProfileName     string                 `json:"profile_name"`
	ScanStartedAt   time.Time              `json:"scan_started_at"`
	ScanCompletedAt time.Time              `json:"scan_completed_at"`
	Host            string                 `json:"host"`
	TotalFindings   int                    `json:"total_findings"`
	TotalAssets     int                    `json:"total_assets"`
	Status          string                 `json:"status"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

// SourceProfile represents a scanner configuration profile
type SourceProfile struct {
	ID             uuid.UUID              `json:"id"`
	Name           string                 `json:"name"`
	Description    string                 `json:"description"`
	DataSourceType string                 `json:"data_source_type"`
	Configuration  map[string]interface{} `json:"configuration,omitempty"`
	IsActive       bool                   `json:"is_active"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

// Asset represents a normalized file or resource
type Asset struct {
	ID            uuid.UUID              `json:"id"`
	StableID      string                 `json:"stable_id"`
	AssetType     string                 `json:"asset_type"`
	Name          string                 `json:"name"`
	Path          string                 `json:"path"`
	DataSource    string                 `json:"data_source"`
	Host          string                 `json:"host"`
	Environment   string                 `json:"environment"`
	Owner         string                 `json:"owner"`
	SourceSystem  string                 `json:"source_system"`
	FileMetadata  map[string]interface{} `json:"file_metadata,omitempty"`
	RiskScore     int                    `json:"risk_score"`
	TotalFindings int                    `json:"total_findings"`
	CreatedAt     time.Time              `json:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at"`
}

// Finding represents an individual PII or secret detection
type Finding struct {
	ID                  uuid.UUID              `json:"id"`
	ScanRunID           uuid.UUID              `json:"scan_run_id"`
	AssetID             uuid.UUID              `json:"asset_id"`
	PatternID           *uuid.UUID             `json:"pattern_id,omitempty"`
	PatternName         string                 `json:"pattern_name"`
	Matches             []string               `json:"matches"`
	SampleText          string                 `json:"sample_text"`
	Severity            string                 `json:"severity"`
	SeverityDescription string                 `json:"severity_description"`
	ConfidenceScore     *float64               `json:"confidence_score,omitempty"`
	Context             map[string]interface{} `json:"context,omitempty"`
	CreatedAt           time.Time              `json:"created_at"`
	UpdatedAt           time.Time              `json:"updated_at"`
}

// Pattern represents a detection pattern definition
type Pattern struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	PatternType       string    `json:"pattern_type"`
	Category          string    `json:"category"`
	Description       string    `json:"description"`
	PatternDefinition string    `json:"pattern_definition"`
	IsActive          bool      `json:"is_active"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// Classification represents PII classification
type Classification struct {
	ID                 uuid.UUID `json:"id"`
	FindingID          uuid.UUID `json:"finding_id"`
	ClassificationType string    `json:"classification_type"`
	SubCategory        string    `json:"sub_category,omitempty"`
	ConfidenceScore    float64   `json:"confidence_score"`
	Justification      string    `json:"justification"`
	DPDPACategory      string    `json:"dpdpa_category,omitempty"`
	RequiresConsent    bool      `json:"requires_consent"`
	RetentionPeriod    string    `json:"retention_period,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// AssetRelationship represents graph edges between assets
type AssetRelationship struct {
	ID               uuid.UUID              `json:"id"`
	SourceAssetID    uuid.UUID              `json:"source_asset_id"`
	TargetAssetID    uuid.UUID              `json:"target_asset_id"`
	RelationshipType string                 `json:"relationship_type"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt        time.Time              `json:"created_at"`
}

// ReviewState represents audit trail for finding reviews
type ReviewState struct {
	ID         uuid.UUID  `json:"id"`
	FindingID  uuid.UUID  `json:"finding_id"`
	Status     string     `json:"status"`
	ReviewedBy string     `json:"reviewed_by,omitempty"`
	ReviewedAt *time.Time `json:"reviewed_at,omitempty"`
	Comments   string     `json:"comments,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}
