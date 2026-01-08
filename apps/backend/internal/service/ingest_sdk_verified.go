package service

import (
	"context"
	"fmt"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/google/uuid"
)

// VerifiedScanInput represents batch of SDK-validated findings
type VerifiedScanInput struct {
	ScanID   string                 `json:"scan_id"`
	Findings []VerifiedFinding      `json:"findings"`
	Metadata map[string]interface{} `json:"metadata"`
}

// IngestSDKVerified processes SDK-validated findings
// This is the simplified Phase 2 ingestion that trusts SDK validation
func (s *IngestionService) IngestSDKVerified(ctx context.Context, input VerifiedScanInput) error {
	adapter := NewSDKAdapter()

	// Start transaction
	tx, err := s.repo.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Create scan run
	scanRun := &entity.ScanRun{
		ID:     uuid.New(),
		Status: "completed",
		Metadata: map[string]interface{}{
			"sdk_scan":    true,
			"scan_id":     input.ScanID,
			"sdk_version": "2.0",
		},
	}

	if err := tx.CreateScanRun(ctx, scanRun); err != nil {
		return fmt.Errorf("failed to create scan run: %w", err)
	}

	// Process each finding
	for _, vf := range input.Findings {
		if err := s.processSingleSDKFinding(ctx, tx, adapter, scanRun.ID, &vf); err != nil {
			// Log error but continue processing other findings
			fmt.Printf("Error processing finding: %v\n", err)
			continue
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (s *IngestionService) processSingleSDKFinding(
	ctx context.Context,
	tx *persistence.PostgresTransaction,
	adapter *SDKAdapter,
	scanRunID uuid.UUID,
	vf *VerifiedFinding,
) error {
	// 1. Get or create asset
	asset := adapter.MapToAsset(vf)

	// Check if asset exists by stable_id
	existingAsset, err := tx.GetAssetByStableID(ctx, asset.StableID)
	if err == nil && existingAsset != nil {
		// Asset exists, use its ID
		asset.ID = existingAsset.ID
	} else {
		// Create new asset
		if err := tx.CreateAsset(ctx, asset); err != nil {
			return fmt.Errorf("failed to create asset: %w", err)
		}
	}

	// 2. Create finding
	finding := adapter.MapToFinding(vf, scanRunID, asset.ID)
	if err := tx.CreateFinding(ctx, finding); err != nil {
		return fmt.Errorf("failed to create finding: %w", err)
	}

	// 3. Create classification
	classification := adapter.MapToClassification(vf, finding.ID)
	if err := tx.CreateClassification(ctx, classification); err != nil {
		return fmt.Errorf("failed to create classification: %w", err)
	}

	// 4. Sync to Neo4j (Phase 3 integration) - would need to add service field
	// TODO: Add semanticLineageService field to IngestionService or call directly
	/*
		if s.semanticLineageService != nil {
			if err := s.semanticLineageService.SyncFindingToGraph(ctx, finding, asset, classification); err != nil {
				// Log but don't fail the ingestion
				fmt.Printf("Warning: Failed to sync to Neo4j: %v\n", err)
			}
		}
	*/

	return nil
}
