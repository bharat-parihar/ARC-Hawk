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

func (r *PostgresRepository) CreateFeedback(ctx context.Context, feedback *entity.FindingFeedback) error {
	query := `
		INSERT INTO finding_feedback (id, finding_id, user_id, feedback_type, original_classification, proposed_classification, comments)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, processed`

	return r.db.QueryRowContext(ctx, query,
		feedback.ID, feedback.FindingID, feedback.UserID, feedback.FeedbackType,
		feedback.OriginalClassification, feedback.ProposedClassification, feedback.Comments,
	).Scan(&feedback.CreatedAt, &feedback.Processed)
}

func (r *PostgresRepository) GetFeedbackForDataset(ctx context.Context) ([]entity.FeedbackWithFinding, error) {
	query := `
		SELECT 
			fb.id, fb.finding_id, fb.user_id, fb.feedback_type, fb.original_classification, fb.proposed_classification, fb.comments, fb.created_at, fb.processed,
			f.id, f.scan_run_id, f.asset_id, f.pattern_id, f.pattern_name, f.matches, f.sample_text, f.severity, f.severity_description, f.confidence_score, f.context, f.created_at, f.updated_at
		FROM finding_feedback fb
		JOIN findings f ON fb.finding_id = f.id
		WHERE fb.feedback_type IN ('CONFIRMED', 'FALSE_POSITIVE')
		ORDER BY fb.created_at DESC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query feedback: %w", err)
	}
	defer rows.Close()

	var results []entity.FeedbackWithFinding

	for rows.Next() {
		var item entity.FeedbackWithFinding
		var contextJSON []byte

		err := rows.Scan(
			&item.Feedback.ID, &item.Feedback.FindingID, &item.Feedback.UserID, &item.Feedback.FeedbackType, &item.Feedback.OriginalClassification, &item.Feedback.ProposedClassification, &item.Feedback.Comments, &item.Feedback.CreatedAt, &item.Feedback.Processed,
			&item.Finding.ID, &item.Finding.ScanRunID, &item.Finding.AssetID, &item.Finding.PatternID, &item.Finding.PatternName, pq.Array(&item.Finding.Matches), &item.Finding.SampleText, &item.Finding.Severity, &item.Finding.SeverityDescription, &item.Finding.ConfidenceScore, &contextJSON, &item.Finding.CreatedAt, &item.Finding.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan feedback row: %w", err)
		}

		if len(contextJSON) > 0 {
			if err := json.Unmarshal(contextJSON, &item.Finding.Context); err != nil {
				return nil, fmt.Errorf("failed to unmarshal context: %w", err)
			}
		}

		results = append(results, item)
	}

	return results, nil
}
