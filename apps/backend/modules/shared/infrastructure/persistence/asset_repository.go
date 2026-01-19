package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/arc-platform/backend/modules/shared/domain/entity"
	"github.com/google/uuid"
)

// ============================================================================
// AssetRepository Implementation
// ============================================================================

func (r *PostgresRepository) CreateAsset(ctx context.Context, asset *entity.Asset) error {
	metadataJSON, err := json.Marshal(asset.FileMetadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO assets (id, stable_id, asset_type, name, path, data_source, host, 
			environment, owner, source_system, file_metadata, risk_score, total_findings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		asset.ID, asset.StableID, asset.AssetType, asset.Name, asset.Path,
		asset.DataSource, asset.Host, asset.Environment, asset.Owner, asset.SourceSystem,
		metadataJSON, asset.RiskScore, asset.TotalFindings,
	).Scan(&asset.CreatedAt, &asset.UpdatedAt)
}

func (r *PostgresRepository) GetAssetByID(ctx context.Context, id uuid.UUID) (*entity.Asset, error) {
	query := `
		SELECT id, stable_id, asset_type, name, path, data_source, host, 
			environment, owner, source_system, file_metadata, risk_score, total_findings, created_at, updated_at
		FROM assets WHERE id = $1`

	asset := &entity.Asset{}
	var metadataJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&asset.ID, &asset.StableID, &asset.AssetType, &asset.Name, &asset.Path,
		&asset.DataSource, &asset.Host, &asset.Environment, &asset.Owner, &asset.SourceSystem,
		&metadataJSON, &asset.RiskScore, &asset.TotalFindings, &asset.CreatedAt, &asset.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("asset not found")
		}
		return nil, err
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &asset.FileMetadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return asset, nil
}

func (r *PostgresRepository) GetAssetByStableID(ctx context.Context, stableID string) (*entity.Asset, error) {
	query := `
		SELECT id, stable_id, asset_type, name, path, data_source, host, 
			environment, owner, source_system, file_metadata, risk_score, total_findings, created_at, updated_at
		FROM assets WHERE stable_id = $1`

	asset := &entity.Asset{}
	var metadataJSON []byte

	err := r.db.QueryRowContext(ctx, query, stableID).Scan(
		&asset.ID, &asset.StableID, &asset.AssetType, &asset.Name, &asset.Path,
		&asset.DataSource, &asset.Host, &asset.Environment, &asset.Owner, &asset.SourceSystem,
		&metadataJSON, &asset.RiskScore, &asset.TotalFindings, &asset.CreatedAt, &asset.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Return nil if not found (for deduplication)
		}
		return nil, err
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &asset.FileMetadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return asset, nil
}

func (r *PostgresRepository) ListAssets(ctx context.Context, limit, offset int) ([]*entity.Asset, error) {
	query := `
		SELECT id, stable_id, asset_type, name, path, data_source, host, 
			environment, owner, source_system, file_metadata, risk_score, total_findings, created_at, updated_at
		FROM assets 
		ORDER BY risk_score DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []*entity.Asset
	for rows.Next() {
		asset := &entity.Asset{}
		var metadataJSON []byte

		err := rows.Scan(
			&asset.ID, &asset.StableID, &asset.AssetType, &asset.Name, &asset.Path,
			&asset.DataSource, &asset.Host, &asset.Environment, &asset.Owner, &asset.SourceSystem,
			&metadataJSON, &asset.RiskScore, &asset.TotalFindings, &asset.CreatedAt, &asset.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &asset.FileMetadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		assets = append(assets, asset)
	}

	return assets, rows.Err()
}

func (r *PostgresRepository) UpdateAssetRiskScore(ctx context.Context, id uuid.UUID, score int) error {
	query := `UPDATE assets SET risk_score = $1 WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, score, id)
	return err
}

func (r *PostgresRepository) UpdateAssetStats(ctx context.Context, id uuid.UUID, score int, totalFindings int) error {
	query := `UPDATE assets SET risk_score = $1, total_findings = $2 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, query, score, totalFindings, id)
	return err
}

func (r *PostgresRepository) GetHighRiskAssets(ctx context.Context, threshold int) ([]*entity.Asset, error) {
	query := `
		SELECT id, stable_id, asset_type, name, path, data_source, host, 
			environment, owner, source_system, file_metadata, risk_score, total_findings, created_at, updated_at
		FROM assets 
		WHERE risk_score >= $1
		ORDER BY risk_score DESC`

	rows, err := r.db.QueryContext(ctx, query, threshold)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []*entity.Asset
	for rows.Next() {
		asset := &entity.Asset{}
		var metadataJSON []byte

		err := rows.Scan(
			&asset.ID, &asset.StableID, &asset.AssetType, &asset.Name, &asset.Path,
			&asset.DataSource, &asset.Host, &asset.Environment, &asset.Owner, &asset.SourceSystem,
			&metadataJSON, &asset.RiskScore, &asset.TotalFindings, &asset.CreatedAt, &asset.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &asset.FileMetadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		assets = append(assets, asset)
	}

	return assets, rows.Err()
}

// UpdateMaskingStatus updates the masking status of an asset
func (r *PostgresRepository) UpdateMaskingStatus(ctx context.Context, assetID uuid.UUID, isMasked bool, strategy string) error {
	query := `
		UPDATE assets 
		SET is_masked = $1, masking_strategy = $2, masked_at = $3
		WHERE id = $4`

	var maskedAt *time.Time
	if isMasked {
		now := time.Now()
		maskedAt = &now
	}

	_, err := r.db.ExecContext(ctx, query, isMasked, strategy, maskedAt, assetID)
	return err
}

// GetMaskedAssets retrieves all masked assets
func (r *PostgresRepository) GetMaskedAssets(ctx context.Context) ([]*entity.Asset, error) {
	query := `
		SELECT id, stable_id, asset_type, name, path, data_source, host, 
			environment, owner, source_system, file_metadata, risk_score, total_findings,
			is_masked, masked_at, masking_strategy, created_at, updated_at
		FROM assets 
		WHERE is_masked = true
		ORDER BY masked_at DESC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []*entity.Asset
	for rows.Next() {
		asset := &entity.Asset{}
		var metadataJSON []byte

		err := rows.Scan(
			&asset.ID, &asset.StableID, &asset.AssetType, &asset.Name, &asset.Path,
			&asset.DataSource, &asset.Host, &asset.Environment, &asset.Owner, &asset.SourceSystem,
			&metadataJSON, &asset.RiskScore, &asset.TotalFindings,
			&asset.IsMasked, &asset.MaskedAt, &asset.MaskingStrategy,
			&asset.CreatedAt, &asset.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &asset.FileMetadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		assets = append(assets, asset)
	}

	return assets, rows.Err()
}
