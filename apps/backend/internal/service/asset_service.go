package service

import (
	"context"
	"fmt"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/google/uuid"
)

// AssetService handles asset retrieval and management
type AssetService struct {
	repo *persistence.PostgresRepository
}

// NewAssetService creates a new asset service
func NewAssetService(repo *persistence.PostgresRepository) *AssetService {
	return &AssetService{repo: repo}
}

// GetAsset retrieves an asset by ID with full context
func (s *AssetService) GetAsset(ctx context.Context, id uuid.UUID) (*entity.Asset, error) {
	asset, err := s.repo.GetAssetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get asset: %w", err)
	}
	return asset, nil
}

// UpdateAsset updates context fields
func (s *AssetService) UpdateAsset(ctx context.Context, asset *entity.Asset) error {
	// Not implemented fully in repo yet (only UpdateAssetRiskScore and CreateAsset exists)
	// For V2 MVP, we focus on Get.
	return nil
}
