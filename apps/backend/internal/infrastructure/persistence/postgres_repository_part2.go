package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/domain/repository"
	"github.com/google/uuid"
)

// ============================================================================
// ClassificationRepository Implementation
// ============================================================================

func (r *PostgresRepository) CreateClassification(ctx context.Context, classification *entity.Classification) error {
	query := `
		INSERT INTO classifications (id, finding_id, classification_type, sub_category, 
			confidence_score, justification, dpdpa_category, requires_consent, retention_period)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		classification.ID, classification.FindingID, classification.ClassificationType,
		classification.SubCategory, classification.ConfidenceScore, classification.Justification,
		classification.DPDPACategory, classification.RequiresConsent, classification.RetentionPeriod,
	).Scan(&classification.CreatedAt, &classification.UpdatedAt)
}

func (r *PostgresRepository) GetClassificationsByFindingID(ctx context.Context, findingID uuid.UUID) ([]*entity.Classification, error) {
	query := `
		SELECT id, finding_id, classification_type, sub_category, confidence_score, 
			justification, dpdpa_category, requires_consent, retention_period, created_at, updated_at
		FROM classifications 
		WHERE finding_id = $1`

	rows, err := r.db.QueryContext(ctx, query, findingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var classifications []*entity.Classification
	for rows.Next() {
		c := &entity.Classification{}
		err := rows.Scan(
			&c.ID, &c.FindingID, &c.ClassificationType, &c.SubCategory,
			&c.ConfidenceScore, &c.Justification, &c.DPDPACategory,
			&c.RequiresConsent, &c.RetentionPeriod, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		classifications = append(classifications, c)
	}

	return classifications, rows.Err()
}

func (r *PostgresRepository) GetClassificationSummary(ctx context.Context) (map[string]interface{}, error) {
	query := `
		SELECT 
			classification_type, 
			COUNT(*) as count,
			AVG(confidence_score) as avg_confidence
		FROM classifications
		GROUP BY classification_type`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summary := make(map[string]interface{})
	typeBreakdown := make(map[string]interface{})

	for rows.Next() {
		var classificationType string
		var count int
		var avgConfidence float64

		if err := rows.Scan(&classificationType, &count, &avgConfidence); err != nil {
			return nil, err
		}

		typeBreakdown[classificationType] = map[string]interface{}{
			"count":          count,
			"avg_confidence": avgConfidence,
		}
	}

	summary["by_type"] = typeBreakdown

	// Get total count
	var total int
	err = r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM classifications").Scan(&total)
	if err != nil {
		return nil, err
	}
	summary["total"] = total

	return summary, rows.Err()
}

// ============================================================================
// AssetRelationshipRepository Implementation
// ============================================================================

func (r *PostgresRepository) CreateAssetRelationship(ctx context.Context, relationship *entity.AssetRelationship) error {
	metadataJSON, err := json.Marshal(relationship.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO asset_relationships (id, source_asset_id, target_asset_id, relationship_type, metadata)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (source_asset_id, target_asset_id, relationship_type) DO NOTHING
		RETURNING created_at`

	err = r.db.QueryRowContext(ctx, query,
		relationship.ID, relationship.SourceAssetID, relationship.TargetAssetID,
		relationship.RelationshipType, metadataJSON,
	).Scan(&relationship.CreatedAt)

	// Ignore conflict errors (duplicate relationships)
	if err != nil && err.Error() == "sql: no rows in result set" {
		return nil
	}

	return err
}

func (r *PostgresRepository) GetAssetRelationshipsBySourceAsset(ctx context.Context, sourceAssetID uuid.UUID) ([]*entity.AssetRelationship, error) {
	query := `
		SELECT id, source_asset_id, target_asset_id, relationship_type, metadata, created_at
		FROM asset_relationships 
		WHERE source_asset_id = $1`

	rows, err := r.db.QueryContext(ctx, query, sourceAssetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanRelationships(rows)
}

func (r *PostgresRepository) GetAllAssetRelationships(ctx context.Context) ([]*entity.AssetRelationship, error) {
	query := `
		SELECT id, source_asset_id, target_asset_id, relationship_type, metadata, created_at
		FROM asset_relationships`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanRelationships(rows)
}

func (r *PostgresRepository) GetFilteredAssetRelationships(ctx context.Context, filters repository.RelationshipFilters) ([]*entity.AssetRelationship, error) {
	query := `
		SELECT id, source_asset_id, target_asset_id, relationship_type, metadata, created_at
		FROM asset_relationships WHERE 1=1`

	args := []interface{}{}
	argCount := 1

	if filters.RelationshipType != "" {
		query += fmt.Sprintf(" AND relationship_type = $%d", argCount)
		args = append(args, filters.RelationshipType)
		argCount++
	}

	if filters.SourceAssetID != nil {
		query += fmt.Sprintf(" AND source_asset_id = $%d", argCount)
		args = append(args, *filters.SourceAssetID)
		argCount++
	}

	if filters.TargetAssetID != nil {
		query += fmt.Sprintf(" AND target_asset_id = $%d", argCount)
		args = append(args, *filters.TargetAssetID)
		argCount++
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanRelationships(rows)
}

func (r *PostgresRepository) scanRelationships(rows *sql.Rows) ([]*entity.AssetRelationship, error) {
	var relationships []*entity.AssetRelationship
	for rows.Next() {
		rel := &entity.AssetRelationship{}
		var metadataJSON []byte

		err := rows.Scan(
			&rel.ID, &rel.SourceAssetID, &rel.TargetAssetID,
			&rel.RelationshipType, &metadataJSON, &rel.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &rel.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		relationships = append(relationships, rel)
	}

	return relationships, rows.Err()
}

// ============================================================================
// ReviewStateRepository Implementation
// ============================================================================

func (r *PostgresRepository) CreateReviewState(ctx context.Context, reviewState *entity.ReviewState) error {
	query := `
		INSERT INTO review_states (id, finding_id, status, reviewed_by, reviewed_at, comments)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		reviewState.ID, reviewState.FindingID, reviewState.Status,
		reviewState.ReviewedBy, reviewState.ReviewedAt, reviewState.Comments,
	).Scan(&reviewState.CreatedAt, &reviewState.UpdatedAt)
}

func (r *PostgresRepository) GetReviewStateByFindingID(ctx context.Context, findingID uuid.UUID) (*entity.ReviewState, error) {
	query := `
		SELECT id, finding_id, status, reviewed_by, reviewed_at, comments, created_at, updated_at
		FROM review_states 
		WHERE finding_id = $1
		ORDER BY created_at DESC
		LIMIT 1`

	rs := &entity.ReviewState{}
	err := r.db.QueryRowContext(ctx, query, findingID).Scan(
		&rs.ID, &rs.FindingID, &rs.Status, &rs.ReviewedBy,
		&rs.ReviewedAt, &rs.Comments, &rs.CreatedAt, &rs.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return rs, nil
}

func (r *PostgresRepository) UpdateReviewState(ctx context.Context, reviewState *entity.ReviewState) error {
	query := `
		UPDATE review_states 
		SET status = $1, reviewed_by = $2, reviewed_at = $3, comments = $4
		WHERE id = $5`

	_, err := r.db.ExecContext(ctx, query,
		reviewState.Status, reviewState.ReviewedBy, reviewState.ReviewedAt,
		reviewState.Comments, reviewState.ID,
	)
	return err
}

// ============================================================================
// SourceProfileRepository Implementation
// ============================================================================

func (r *PostgresRepository) CreateSourceProfile(ctx context.Context, profile *entity.SourceProfile) error {
	configJSON, err := json.Marshal(profile.Configuration)
	if err != nil {
		return fmt.Errorf("failed to marshal configuration: %w", err)
	}

	query := `
		INSERT INTO source_profiles (id, name, description, data_source_type, configuration, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		profile.ID, profile.Name, profile.Description, profile.DataSourceType,
		configJSON, profile.IsActive,
	).Scan(&profile.CreatedAt, &profile.UpdatedAt)
}

func (r *PostgresRepository) GetSourceProfileByName(ctx context.Context, name string) (*entity.SourceProfile, error) {
	query := `
		SELECT id, name, description, data_source_type, configuration, is_active, created_at, updated_at
		FROM source_profiles 
		WHERE name = $1`

	profile := &entity.SourceProfile{}
	var configJSON []byte

	err := r.db.QueryRowContext(ctx, query, name).Scan(
		&profile.ID, &profile.Name, &profile.Description, &profile.DataSourceType,
		&configJSON, &profile.IsActive, &profile.CreatedAt, &profile.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if len(configJSON) > 0 {
		if err := json.Unmarshal(configJSON, &profile.Configuration); err != nil {
			return nil, fmt.Errorf("failed to unmarshal configuration: %w", err)
		}
	}

	return profile, nil
}

func (r *PostgresRepository) ListSourceProfiles(ctx context.Context) ([]*entity.SourceProfile, error) {
	query := `
		SELECT id, name, description, data_source_type, configuration, is_active, created_at, updated_at
		FROM source_profiles 
		ORDER BY name`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var profiles []*entity.SourceProfile
	for rows.Next() {
		profile := &entity.SourceProfile{}
		var configJSON []byte

		err := rows.Scan(
			&profile.ID, &profile.Name, &profile.Description, &profile.DataSourceType,
			&configJSON, &profile.IsActive, &profile.CreatedAt, &profile.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(configJSON) > 0 {
			if err := json.Unmarshal(configJSON, &profile.Configuration); err != nil {
				return nil, fmt.Errorf("failed to unmarshal configuration: %w", err)
			}
		}

		profiles = append(profiles, profile)
	}

	return profiles, rows.Err()
}
