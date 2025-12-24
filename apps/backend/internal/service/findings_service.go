package service

import (
	"context"
	"fmt"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/domain/repository"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/google/uuid"
)

// FindingsService handles findings queries
type FindingsService struct {
	repo *persistence.PostgresRepository
}

// NewFindingsService creates a new findings service
func NewFindingsService(repo *persistence.PostgresRepository) *FindingsService {
	return &FindingsService{repo: repo}
}

// FindingsQuery represents query parameters
type FindingsQuery struct {
	ScanRunID   *uuid.UUID
	AssetID     *uuid.UUID
	Severity    string
	PatternName string
	DataSource  string
	Page        int
	PageSize    int
	SortBy      string
	SortOrder   string
}

// FindingsResponse represents paginated findings response
type FindingsResponse struct {
	Findings   []*FindingWithDetails `json:"findings"`
	Total      int                   `json:"total"`
	Page       int                   `json:"page"`
	PageSize   int                   `json:"page_size"`
	TotalPages int                   `json:"total_pages"`
}

// FindingWithDetails includes finding with asset and classification details
type FindingWithDetails struct {
	*entity.Finding
	AssetName       string                   `json:"asset_name"`
	AssetPath       string                   `json:"asset_path"`
	Environment     string                   `json:"environment"`
	Owner           string                   `json:"owner"`
	SourceSystem    string                   `json:"source_system"`
	Classifications []*entity.Classification `json:"classifications"`
	ReviewStatus    string                   `json:"review_status"`
}

// GetFindings retrieves paginated and filtered findings
func (s *FindingsService) GetFindings(ctx context.Context, query FindingsQuery) (*FindingsResponse, error) {
	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}

	offset := (query.Page - 1) * query.PageSize

	// Build filters
	filters := repository.FindingFilters{
		ScanRunID:   query.ScanRunID,
		AssetID:     query.AssetID,
		Severity:    query.Severity,
		PatternName: query.PatternName,
		DataSource:  query.DataSource,
	}

	// Get findings
	findings, err := s.repo.ListFindings(ctx, filters, query.PageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list findings: %w", err)
	}

	// Get total count
	total, err := s.repo.CountFindings(ctx, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to count findings: %w", err)
	}

	// Enrich findings with details
	enrichedFindings := make([]*FindingWithDetails, 0, len(findings))
	for _, finding := range findings {
		// Get asset details
		asset, err := s.repo.GetAssetByID(ctx, finding.AssetID)
		if err != nil {
			return nil, fmt.Errorf("failed to get asset: %w", err)
		}

		// Get classifications
		classifications, err := s.repo.GetClassificationsByFindingID(ctx, finding.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get classifications: %w", err)
		}

		// Get review status
		reviewState, err := s.repo.GetReviewStateByFindingID(ctx, finding.ID)
		reviewStatus := "pending"
		if err == nil && reviewState != nil {
			reviewStatus = reviewState.Status
		}

		enrichedFindings = append(enrichedFindings, &FindingWithDetails{
			Finding:         finding,
			AssetName:       asset.Name,
			AssetPath:       asset.Path,
			Environment:     asset.Environment,
			Owner:           asset.Owner,
			SourceSystem:    asset.SourceSystem,
			Classifications: classifications,
			ReviewStatus:    reviewStatus,
		})
	}

	totalPages := (total + query.PageSize - 1) / query.PageSize

	return &FindingsResponse{
		Findings:   enrichedFindings,
		Total:      total,
		Page:       query.Page,
		PageSize:   query.PageSize,
		TotalPages: totalPages,
	}, nil
}
