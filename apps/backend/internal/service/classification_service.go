package service

import (
	"context"
	"fmt"

	"github.com/arc-platform/backend/internal/infrastructure/persistence"
)

// ClassificationService handles PII classification
type ClassificationService struct {
	repo *persistence.PostgresRepository
}

// NewClassificationService creates a new classification service
func NewClassificationService(repo *persistence.PostgresRepository) *ClassificationService {
	return &ClassificationService{repo: repo}
}

// ClassificationSummary represents aggregated classification data
type ClassificationSummary struct {
	Total            int                      `json:"total"`
	ByType           map[string]TypeBreakdown `json:"by_type"`
	HighConfidence   int                      `json:"high_confidence_count"`
	RequiringConsent int                      `json:"requiring_consent_count"`
	DPDPACategories  map[string]int           `json:"dpdpa_categories"`
}

// TypeBreakdown represents statistics for a classification type
type TypeBreakdown struct {
	Count           int     `json:"count"`
	AvgConfidence   float64 `json:"avg_confidence"`
	Percentage      float64 `json:"percentage"`
	RequiresConsent int     `json:"requires_consent"`
}

// GetClassificationSummary retrieves aggregated classification statistics
func (s *ClassificationService) GetClassificationSummary(ctx context.Context) (*ClassificationSummary, error) {
	// Get summary from repository
	rawSummary, err := s.repo.GetClassificationSummary(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get classification summary: %w", err)
	}

	total := rawSummary["total"].(int)
	byTypeRaw := rawSummary["by_type"].(map[string]interface{})

	byType := make(map[string]TypeBreakdown)
	highConfidence := 0
	requiringConsent := 0
	dpdpaCategories := make(map[string]int)

	for typeName, data := range byTypeRaw {
		dataMap := data.(map[string]interface{})
		count := dataMap["count"].(int)
		avgConf := dataMap["avg_confidence"].(float64)

		breakdown := TypeBreakdown{
			Count:         count,
			AvgConfidence: avgConf,
			Percentage:    0,
		}

		if total > 0 {
			breakdown.Percentage = (float64(count) / float64(total)) * 100
		}

		byType[typeName] = breakdown

		if avgConf >= 85.0 {
			highConfidence += count
		}

		// Count DPDPA categories and consent requirements
		// This would ideally query the DB - using estimates here
		if typeName == "Personal Data" || typeName == "Sensitive Personal Data" {
			requiringConsent += count
			dpdpaCategories[typeName] = count
		} else if typeName == "Secrets" {
			dpdpaCategories["N/A"] = count
		}
	}

	return &ClassificationSummary{
		Total:            total,
		ByType:           byType,
		HighConfidence:   highConfidence,
		RequiringConsent: requiringConsent,
		DPDPACategories:  dpdpaCategories,
	}, nil
}
