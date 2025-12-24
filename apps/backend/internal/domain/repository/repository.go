package repository

import (
	"context"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/google/uuid"
)

// ScanRunRepository defines operations for scan runs
type ScanRunRepository interface {
	Create(ctx context.Context, scanRun *entity.ScanRun) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.ScanRun, error)
	List(ctx context.Context, limit, offset int) ([]*entity.ScanRun, error)
	Update(ctx context.Context, scanRun *entity.ScanRun) error
	GetLatest(ctx context.Context) (*entity.ScanRun, error)
}

// AssetRepository defines operations for assets
type AssetRepository interface {
	Create(ctx context.Context, asset *entity.Asset) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Asset, error)
	GetByStableID(ctx context.Context, stableID string) (*entity.Asset, error)
	List(ctx context.Context, limit, offset int) ([]*entity.Asset, error)
	UpdateRiskScore(ctx context.Context, id uuid.UUID, score int) error
	GetHighRiskAssets(ctx context.Context, threshold int) ([]*entity.Asset, error)
}

// FindingRepository defines operations for findings
type FindingRepository interface {
	Create(ctx context.Context, finding *entity.Finding) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Finding, error)
	ListByScanRun(ctx context.Context, scanRunID uuid.UUID, limit, offset int) ([]*entity.Finding, error)
	ListByAsset(ctx context.Context, assetID uuid.UUID, limit, offset int) ([]*entity.Finding, error)
	List(ctx context.Context, filters FindingFilters, limit, offset int) ([]*entity.Finding, error)
	Count(ctx context.Context, filters FindingFilters) (int, error)
}

// FindingFilters represents filtering options for findings
type FindingFilters struct {
	ScanRunID   *uuid.UUID
	AssetID     *uuid.UUID
	Severity    string
	PatternName string
	DataSource  string
}

// PatternRepository defines operations for patterns
type PatternRepository interface {
	Create(ctx context.Context, pattern *entity.Pattern) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Pattern, error)
	GetByName(ctx context.Context, name string) (*entity.Pattern, error)
	List(ctx context.Context) ([]*entity.Pattern, error)
}

// ClassificationRepository defines operations for classifications
type ClassificationRepository interface {
	Create(ctx context.Context, classification *entity.Classification) error
	GetByFindingID(ctx context.Context, findingID uuid.UUID) ([]*entity.Classification, error)
	GetSummary(ctx context.Context) (map[string]interface{}, error)
}

// AssetRelationshipRepository defines operations for asset relationships
type AssetRelationshipRepository interface {
	Create(ctx context.Context, relationship *entity.AssetRelationship) error
	GetBySourceAsset(ctx context.Context, sourceAssetID uuid.UUID) ([]*entity.AssetRelationship, error)
	GetAll(ctx context.Context) ([]*entity.AssetRelationship, error)
	GetFiltered(ctx context.Context, filters RelationshipFilters) ([]*entity.AssetRelationship, error)
}

// RelationshipFilters represents filtering options for relationships
type RelationshipFilters struct {
	RelationshipType string
	SourceAssetID    *uuid.UUID
	TargetAssetID    *uuid.UUID
}

// ReviewStateRepository defines operations for review states
type ReviewStateRepository interface {
	Create(ctx context.Context, reviewState *entity.ReviewState) error
	GetByFindingID(ctx context.Context, findingID uuid.UUID) (*entity.ReviewState, error)
	Update(ctx context.Context, reviewState *entity.ReviewState) error
}

// SourceProfileRepository defines operations for source profiles
type SourceProfileRepository interface {
	Create(ctx context.Context, profile *entity.SourceProfile) error
	GetByName(ctx context.Context, name string) (*entity.SourceProfile, error)
	List(ctx context.Context) ([]*entity.SourceProfile, error)
}
