package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/domain/repository"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

// PostgresRepository implements all repository interfaces
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository creates a new PostgreSQL repository
func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// MigrateSchema updates the database schema with new columns
func (r *PostgresRepository) MigrateSchema(ctx context.Context) error {
	queries := []string{
		"ALTER TABLE assets ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT ''",
		"ALTER TABLE assets ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT ''",
		"ALTER TABLE assets ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT ''",
	}
	for _, q := range queries {
		if _, err := r.db.ExecContext(ctx, q); err != nil {
			return fmt.Errorf("migration failed: %s: %w", q, err)
		}
	}
	return nil
}

// ============================================================================
// ScanRunRepository Implementation
// ============================================================================

func (r *PostgresRepository) CreateScanRun(ctx context.Context, scanRun *entity.ScanRun) error {
	metadataJSON, err := json.Marshal(scanRun.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO scan_runs (id, profile_name, scan_started_at, scan_completed_at, host, 
			total_findings, total_assets, status, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		scanRun.ID, scanRun.ProfileName, scanRun.ScanStartedAt, scanRun.ScanCompletedAt,
		scanRun.Host, scanRun.TotalFindings, scanRun.TotalAssets, scanRun.Status, metadataJSON,
	).Scan(&scanRun.CreatedAt, &scanRun.UpdatedAt)
}

func (r *PostgresRepository) GetScanRunByID(ctx context.Context, id uuid.UUID) (*entity.ScanRun, error) {
	query := `
		SELECT id, profile_name, scan_started_at, scan_completed_at, host, 
			total_findings, total_assets, status, metadata, created_at, updated_at
		FROM scan_runs WHERE id = $1`

	scanRun := &entity.ScanRun{}
	var metadataJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&scanRun.ID, &scanRun.ProfileName, &scanRun.ScanStartedAt, &scanRun.ScanCompletedAt,
		&scanRun.Host, &scanRun.TotalFindings, &scanRun.TotalAssets, &scanRun.Status,
		&metadataJSON, &scanRun.CreatedAt, &scanRun.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("scan run not found")
		}
		return nil, err
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &scanRun.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return scanRun, nil
}

func (r *PostgresRepository) ListScanRuns(ctx context.Context, limit, offset int) ([]*entity.ScanRun, error) {
	query := `
		SELECT id, profile_name, scan_started_at, scan_completed_at, host, 
			total_findings, total_assets, status, metadata, created_at, updated_at
		FROM scan_runs 
		ORDER BY scan_started_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scanRuns []*entity.ScanRun
	for rows.Next() {
		scanRun := &entity.ScanRun{}
		var metadataJSON []byte

		err := rows.Scan(
			&scanRun.ID, &scanRun.ProfileName, &scanRun.ScanStartedAt, &scanRun.ScanCompletedAt,
			&scanRun.Host, &scanRun.TotalFindings, &scanRun.TotalAssets, &scanRun.Status,
			&metadataJSON, &scanRun.CreatedAt, &scanRun.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &scanRun.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		scanRuns = append(scanRuns, scanRun)
	}

	return scanRuns, rows.Err()
}

func (r *PostgresRepository) UpdateScanRun(ctx context.Context, scanRun *entity.ScanRun) error {
	metadataJSON, err := json.Marshal(scanRun.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		UPDATE scan_runs 
		SET total_findings = $1, total_assets = $2, status = $3, metadata = $4
		WHERE id = $5`

	_, err = r.db.ExecContext(ctx, query,
		scanRun.TotalFindings, scanRun.TotalAssets, scanRun.Status, metadataJSON, scanRun.ID,
	)
	return err
}

func (r *PostgresRepository) GetLatestScanRun(ctx context.Context) (*entity.ScanRun, error) {
	query := `
		SELECT id, profile_name, scan_started_at, scan_completed_at, host, 
			total_findings, total_assets, status, metadata, created_at, updated_at
		FROM scan_runs 
		ORDER BY scan_started_at DESC
		LIMIT 1`

	scanRun := &entity.ScanRun{}
	var metadataJSON []byte

	err := r.db.QueryRowContext(ctx, query).Scan(
		&scanRun.ID, &scanRun.ProfileName, &scanRun.ScanStartedAt, &scanRun.ScanCompletedAt,
		&scanRun.Host, &scanRun.TotalFindings, &scanRun.TotalAssets, &scanRun.Status,
		&metadataJSON, &scanRun.CreatedAt, &scanRun.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &scanRun.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return scanRun, nil
}

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

// ============================================================================
// FindingRepository Implementation
// ============================================================================

func (r *PostgresRepository) CreateFinding(ctx context.Context, finding *entity.Finding) error {
	contextJSON, err := json.Marshal(finding.Context)
	if err != nil {
		return fmt.Errorf("failed to marshal context: %w", err)
	}

	query := `
		INSERT INTO findings (id, scan_run_id, asset_id, pattern_id, pattern_name, 
			matches, sample_text, severity, severity_description, confidence_score, context)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		finding.ID, finding.ScanRunID, finding.AssetID, finding.PatternID, finding.PatternName,
		pq.Array(finding.Matches), finding.SampleText, finding.Severity, finding.SeverityDescription,
		finding.ConfidenceScore, contextJSON,
	).Scan(&finding.CreatedAt, &finding.UpdatedAt)
}

func (r *PostgresRepository) GetFindingByID(ctx context.Context, id uuid.UUID) (*entity.Finding, error) {
	query := `
		SELECT id, scan_run_id, asset_id, pattern_id, pattern_name, matches, sample_text, 
			severity, severity_description, confidence_score, context, created_at, updated_at
		FROM findings WHERE id = $1`

	finding := &entity.Finding{}
	var contextJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&finding.ID, &finding.ScanRunID, &finding.AssetID, &finding.PatternID, &finding.PatternName,
		pq.Array(&finding.Matches), &finding.SampleText, &finding.Severity, &finding.SeverityDescription,
		&finding.ConfidenceScore, &contextJSON, &finding.CreatedAt, &finding.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("finding not found")
		}
		return nil, err
	}

	if len(contextJSON) > 0 {
		if err := json.Unmarshal(contextJSON, &finding.Context); err != nil {
			return nil, fmt.Errorf("failed to unmarshal context: %w", err)
		}
	}

	return finding, nil
}

func (r *PostgresRepository) ListFindingsByScanRun(ctx context.Context, scanRunID uuid.UUID, limit, offset int) ([]*entity.Finding, error) {
	query := `
		SELECT id, scan_run_id, asset_id, pattern_id, pattern_name, matches, sample_text, 
			severity, severity_description, confidence_score, context, created_at, updated_at
		FROM findings 
		WHERE scan_run_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	return r.scanFindings(ctx, query, scanRunID, limit, offset)
}

func (r *PostgresRepository) ListFindingsByAsset(ctx context.Context, assetID uuid.UUID, limit, offset int) ([]*entity.Finding, error) {
	query := `
		SELECT id, scan_run_id, asset_id, pattern_id, pattern_name, matches, sample_text, 
			severity, severity_description, confidence_score, context, created_at, updated_at
		FROM findings 
		WHERE asset_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	return r.scanFindings(ctx, query, assetID, limit, offset)
}

func (r *PostgresRepository) ListFindings(ctx context.Context, filters repository.FindingFilters, limit, offset int) ([]*entity.Finding, error) {
	query := `
		SELECT id, scan_run_id, asset_id, pattern_id, pattern_name, matches, sample_text, 
			severity, severity_description, confidence_score, context, created_at, updated_at
		FROM findings WHERE 1=1`

	args := []interface{}{}
	argCount := 1

	if filters.ScanRunID != nil {
		query += fmt.Sprintf(" AND scan_run_id = $%d", argCount)
		args = append(args, *filters.ScanRunID)
		argCount++
	}

	if filters.AssetID != nil {
		query += fmt.Sprintf(" AND asset_id = $%d", argCount)
		args = append(args, *filters.AssetID)
		argCount++
	}

	if filters.Severity != "" {
		query += fmt.Sprintf(" AND severity = $%d", argCount)
		args = append(args, filters.Severity)
		argCount++
	}

	if filters.PatternName != "" {
		query += fmt.Sprintf(" AND pattern_name ILIKE $%d", argCount)
		args = append(args, "%"+filters.PatternName+"%")
		argCount++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanFindingsFromRows(rows)
}

func (r *PostgresRepository) CountFindings(ctx context.Context, filters repository.FindingFilters) (int, error) {
	query := `SELECT COUNT(*) FROM findings WHERE 1=1`

	args := []interface{}{}
	argCount := 1

	if filters.ScanRunID != nil {
		query += fmt.Sprintf(" AND scan_run_id = $%d", argCount)
		args = append(args, *filters.ScanRunID)
		argCount++
	}

	if filters.AssetID != nil {
		query += fmt.Sprintf(" AND asset_id = $%d", argCount)
		args = append(args, *filters.AssetID)
		argCount++
	}

	if filters.Severity != "" {
		query += fmt.Sprintf(" AND severity = $%d", argCount)
		args = append(args, filters.Severity)
		argCount++
	}

	if filters.PatternName != "" {
		query += fmt.Sprintf(" AND pattern_name ILIKE $%d", argCount)
		args = append(args, "%"+filters.PatternName+"%")
		argCount++
	}

	var count int
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	return count, err
}

func (r *PostgresRepository) scanFindings(ctx context.Context, query string, args ...interface{}) ([]*entity.Finding, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanFindingsFromRows(rows)
}

func (r *PostgresRepository) scanFindingsFromRows(rows *sql.Rows) ([]*entity.Finding, error) {
	var findings []*entity.Finding
	for rows.Next() {
		finding := &entity.Finding{}
		var contextJSON []byte

		err := rows.Scan(
			&finding.ID, &finding.ScanRunID, &finding.AssetID, &finding.PatternID, &finding.PatternName,
			pq.Array(&finding.Matches), &finding.SampleText, &finding.Severity, &finding.SeverityDescription,
			&finding.ConfidenceScore, &contextJSON, &finding.CreatedAt, &finding.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(contextJSON) > 0 {
			if err := json.Unmarshal(contextJSON, &finding.Context); err != nil {
				return nil, fmt.Errorf("failed to unmarshal context: %w", err)
			}
		}

		findings = append(findings, finding)
	}

	return findings, rows.Err()
}

// ============================================================================
// PatternRepository Implementation
// ============================================================================

func (r *PostgresRepository) CreatePattern(ctx context.Context, pattern *entity.Pattern) error {
	query := `
		INSERT INTO patterns (id, name, pattern_type, category, description, pattern_definition, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at`

	return r.db.QueryRowContext(ctx, query,
		pattern.ID, pattern.Name, pattern.PatternType, pattern.Category,
		pattern.Description, pattern.PatternDefinition, pattern.IsActive,
	).Scan(&pattern.CreatedAt, &pattern.UpdatedAt)
}

func (r *PostgresRepository) GetPatternByID(ctx context.Context, id uuid.UUID) (*entity.Pattern, error) {
	query := `
		SELECT id, name, pattern_type, category, description, pattern_definition, is_active, created_at, updated_at
		FROM patterns WHERE id = $1`

	pattern := &entity.Pattern{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&pattern.ID, &pattern.Name, &pattern.PatternType, &pattern.Category,
		&pattern.Description, &pattern.PatternDefinition, &pattern.IsActive,
		&pattern.CreatedAt, &pattern.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("pattern not found")
		}
		return nil, err
	}

	return pattern, nil
}

func (r *PostgresRepository) GetPatternByName(ctx context.Context, name string) (*entity.Pattern, error) {
	query := `
		SELECT id, name, pattern_type, category, description, pattern_definition, is_active, created_at, updated_at
		FROM patterns WHERE name = $1`

	pattern := &entity.Pattern{}
	err := r.db.QueryRowContext(ctx, query, name).Scan(
		&pattern.ID, &pattern.Name, &pattern.PatternType, &pattern.Category,
		&pattern.Description, &pattern.PatternDefinition, &pattern.IsActive,
		&pattern.CreatedAt, &pattern.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return pattern, nil
}

func (r *PostgresRepository) ListPatterns(ctx context.Context) ([]*entity.Pattern, error) {
	query := `
		SELECT id, name, pattern_type, category, description, pattern_definition, is_active, created_at, updated_at
		FROM patterns 
		ORDER BY name`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var patterns []*entity.Pattern
	for rows.Next() {
		pattern := &entity.Pattern{}
		err := rows.Scan(
			&pattern.ID, &pattern.Name, &pattern.PatternType, &pattern.Category,
			&pattern.Description, &pattern.PatternDefinition, &pattern.IsActive,
			&pattern.CreatedAt, &pattern.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		patterns = append(patterns, pattern)
	}

	return patterns, rows.Err()
}

// Continue in next file part...
