package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/arc-platform/backend/modules/shared/domain/entity"
)

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
