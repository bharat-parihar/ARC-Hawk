package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/google/uuid"
)

// IngestionService handles scan ingestion and normalization
type IngestionService struct {
	repo       *persistence.PostgresRepository
	classifier *ClassificationService
}

// NewIngestionService creates a new ingestion service
func NewIngestionService(repo *persistence.PostgresRepository, classifier *ClassificationService) *IngestionService {
	return &IngestionService{
		repo:       repo,
		classifier: classifier,
	}
}

// HawkeyeScanInput represents the Hawk-eye scanner JSON format
type HawkeyeScanInput struct {
	FS         []HawkeyeFinding `json:"fs"`
	PostgreSQL []HawkeyeFinding `json:"postgresql"`
}

// HawkeyeFinding represents a single finding from Hawk-eye
type HawkeyeFinding struct {
	Host                string                 `json:"host"`
	FilePath            string                 `json:"file_path"`
	PatternName         string                 `json:"pattern_name"`
	Matches             []string               `json:"matches"`
	SampleText          string                 `json:"sample_text"`
	Profile             string                 `json:"profile"`
	DataSource          string                 `json:"data_source"`
	FileData            map[string]interface{} `json:"file_data"`
	Severity            string                 `json:"severity"`
	SeverityDescription string                 `json:"severity_description"`
}

// IngestScanResult represents the result of ingestion
type IngestScanResult struct {
	ScanRunID     uuid.UUID `json:"scan_run_id"`
	TotalFindings int       `json:"total_findings"`
	TotalAssets   int       `json:"total_assets"`
	AssetsCreated int       `json:"assets_created"`
	PatternsFound int       `json:"patterns_found"`
}

// IngestScan processes Hawk-eye scan output and normalizes it into the database
func (s *IngestionService) IngestScan(ctx context.Context, input *HawkeyeScanInput) (*IngestScanResult, error) {
	if len(input.FS) == 0 && len(input.PostgreSQL) == 0 {
		return nil, fmt.Errorf("no findings in scan input")
	}

	// Combine findings
	allFindings := append(input.FS, input.PostgreSQL...)

	// Create ScanRun
	profileName := allFindings[0].Profile
	if profileName == "" {
		profileName = "default"
	}

	scanRun := &entity.ScanRun{
		ID:              uuid.New(),
		ProfileName:     profileName,
		ScanStartedAt:   time.Now().Add(-5 * time.Minute), // Approximate
		ScanCompletedAt: time.Now(),
		Host:            allFindings[0].Host,
		Status:          "completed",
		Metadata:        map[string]interface{}{},
	}

	if err := s.repo.CreateScanRun(ctx, scanRun); err != nil {
		return nil, fmt.Errorf("failed to create scan run: %w", err)
	}

	// Track created assets and patterns
	assetMap := make(map[string]uuid.UUID)   // stableID -> UUID
	patternMap := make(map[string]uuid.UUID) // pattern name -> UUID
	assetsCreated := 0

	// Process each finding
	for _, hawkeyeFinding := range allFindings {
		// Generate stable asset ID from file path
		stableID := generateStableID(hawkeyeFinding.FilePath)

		// Check if asset already exists
		assetID, exists := assetMap[stableID]
		if !exists {
			// Try to get existing asset from database
			existingAsset, err := s.repo.GetAssetByStableID(ctx, stableID)
			if err != nil {
				return nil, fmt.Errorf("failed to check existing asset: %w", err)
			}

			if existingAsset != nil {
				assetID = existingAsset.ID
				assetMap[stableID] = assetID
			} else {
				// Extract owner from file data if available
				owner := "Platform Team"
				if val, ok := hawkeyeFinding.FileData["owner"].(string); ok {
					owner = val
				}

				// Map profile to environment
				env := "Production"
				if scanRun.ProfileName == "test_scan" || scanRun.ProfileName == "dev" {
					env = "Development"
				}

				// Create new asset
				asset := &entity.Asset{
					ID:           uuid.New(),
					StableID:     stableID,
					AssetType:    "file",
					Name:         getFileName(hawkeyeFinding.FilePath),
					Path:         hawkeyeFinding.FilePath,
					DataSource:   hawkeyeFinding.DataSource,
					Host:         hawkeyeFinding.Host,
					Environment:  env,
					Owner:        owner,
					SourceSystem: fmt.Sprintf("%s://%s", hawkeyeFinding.DataSource, hawkeyeFinding.Host),
					FileMetadata: hawkeyeFinding.FileData,
					RiskScore:    calculateRiskScore(hawkeyeFinding.Severity),
				}

				if err := s.repo.CreateAsset(ctx, asset); err != nil {
					return nil, fmt.Errorf("failed to create asset: %w", err)
				}

				assetID = asset.ID
				assetMap[stableID] = assetID
				assetsCreated++
			}
		}

		// Get or create pattern
		patternID, err := s.getOrCreatePattern(ctx, &hawkeyeFinding, patternMap)
		if err != nil {
			return nil, fmt.Errorf("failed to get/create pattern: %w", err)
		}

		// Classify finding using V2 Engine
		matchSample := ""
		if len(hawkeyeFinding.Matches) > 0 {
			matchSample = hawkeyeFinding.Matches[0]
		}

		classificationResult := s.classifier.Classify(
			hawkeyeFinding.PatternName,
			hawkeyeFinding.FilePath,
			matchSample,
			hawkeyeFinding.FileData,
		)

		// Create finding
		finding := &entity.Finding{
			ID:                  uuid.New(),
			ScanRunID:           scanRun.ID,
			AssetID:             assetID,
			PatternID:           &patternID,
			PatternName:         hawkeyeFinding.PatternName,
			Matches:             hawkeyeFinding.Matches,
			SampleText:          hawkeyeFinding.SampleText,
			Severity:            hawkeyeFinding.Severity,
			SeverityDescription: hawkeyeFinding.SeverityDescription,
			ConfidenceScore:     &classificationResult.ConfidenceScore,
			Context:             classificationResult.Signals,
		}

		if err := s.repo.CreateFinding(ctx, finding); err != nil {
			return nil, fmt.Errorf("failed to create finding: %w", err)
		}

		// Save Classification
		classification := &entity.Classification{
			ID:                 uuid.New(),
			FindingID:          finding.ID,
			ClassificationType: classificationResult.ClassificationType,
			SubCategory:        classificationResult.SubCategory,
			ConfidenceScore:    classificationResult.ConfidenceScore,
			Justification:      classificationResult.Justification,
			DPDPACategory:      classificationResult.DPDPACategory,
			RequiresConsent:    classificationResult.RequiresConsent,
		}

		if err := s.repo.CreateClassification(ctx, classification); err != nil {
			return nil, fmt.Errorf("failed to create classification: %w", err)
		}

		// Create review state
		reviewState := &entity.ReviewState{
			ID:        uuid.New(),
			FindingID: finding.ID,
			Status:    "pending",
		}

		if err := s.repo.CreateReviewState(ctx, reviewState); err != nil {
			return nil, fmt.Errorf("failed to create review state: %w", err)
		}
	}

	// Update asset total findings and create relationships
	for stableID, assetID := range assetMap {
		// Count findings for this asset
		count, err := s.repo.CountFindings(ctx, struct {
			ScanRunID   *uuid.UUID
			AssetID     *uuid.UUID
			Severity    string
			PatternName string
			DataSource  string
		}{AssetID: &assetID})

		if err != nil {
			return nil, fmt.Errorf("failed to count findings: %w", err)
		}

		// Update asset with finding count
		asset, _ := s.repo.GetAssetByStableID(ctx, stableID)
		if asset != nil {
			asset.TotalFindings = count
			// Risk score based on findings count and severity
			if count > 10 {
				asset.RiskScore = 90
			} else if count > 5 {
				asset.RiskScore = 70
			} else if count > 0 {
				asset.RiskScore = 50
			}
			s.repo.UpdateAssetRiskScore(ctx, asset.ID, asset.RiskScore)
		}
	}

	// Update scan run totals
	scanRun.TotalFindings = len(allFindings)
	scanRun.TotalAssets = len(assetMap)
	if err := s.repo.UpdateScanRun(ctx, scanRun); err != nil {
		return nil, fmt.Errorf("failed to update scan run: %w", err)
	}

	return &IngestScanResult{
		ScanRunID:     scanRun.ID,
		TotalFindings: scanRun.TotalFindings,
		TotalAssets:   scanRun.TotalAssets,
		AssetsCreated: assetsCreated,
		PatternsFound: len(patternMap),
	}, nil
}

// getOrCreatePattern gets existing pattern or creates new one
func (s *IngestionService) getOrCreatePattern(ctx context.Context, finding *HawkeyeFinding, patternMap map[string]uuid.UUID) (uuid.UUID, error) {
	// Check cache
	if id, exists := patternMap[finding.PatternName]; exists {
		return id, nil
	}

	// Check database
	existingPattern, err := s.repo.GetPatternByName(ctx, finding.PatternName)
	if err != nil {
		return uuid.Nil, err
	}

	if existingPattern != nil {
		patternMap[finding.PatternName] = existingPattern.ID
		return existingPattern.ID, nil
	}

	// Create new pattern
	pattern := &entity.Pattern{
		ID:                uuid.New(),
		Name:              finding.PatternName,
		PatternType:       "regex",
		Category:          categorizePattern(finding.PatternName),
		Description:       fmt.Sprintf("Pattern for detecting: %s", finding.PatternName),
		PatternDefinition: "",
		IsActive:          true,
	}

	if err := s.repo.CreatePattern(ctx, pattern); err != nil {
		return uuid.Nil, err
	}

	patternMap[finding.PatternName] = pattern.ID
	return pattern.ID, nil
}

// generateStableID creates a stable identifier from file path
func generateStableID(filePath string) string {
	hash := sha256.Sum256([]byte(filePath))
	return hex.EncodeToString(hash[:])
}

// getFileName extracts filename from path
func getFileName(path string) string {
	// Simple extraction - in production use filepath.Base
	for i := len(path) - 1; i >= 0; i-- {
		if path[i] == '/' {
			return path[i+1:]
		}
	}
	return path
}

// calculateRiskScore converts severity to numeric risk score
func calculateRiskScore(severity string) int {
	switch severity {
	case "Critical":
		return 95
	case "High":
		return 80
	case "Medium":
		return 60
	case "Low":
		return 30
	default:
		return 10
	}
}

// categorizePattern determines pattern category
func categorizePattern(patternName string) string {
	lowerName := strings.ToLower(patternName)

	if contains(lowerName, []string{"email", "phone", "ssn", "passport", "license"}) {
		return "pii"
	}
	if contains(lowerName, []string{"key", "token", "secret", "password", "api", "aws"}) {
		return "secret"
	}
	if contains(lowerName, []string{"credit", "card", "account", "bank"}) {
		return "financial"
	}

	return "other"
}

// Ensure interface compatibility
var _ json.Marshaler = (*HawkeyeScanInput)(nil)

func (h *HawkeyeScanInput) MarshalJSON() ([]byte, error) {
	type Alias HawkeyeScanInput
	return json.Marshal(&struct{ *Alias }{Alias: (*Alias)(h)})
}
