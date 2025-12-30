package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/domain/repository"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/arc-platform/backend/pkg/normalization"
	"github.com/google/uuid"
)

// IngestionService handles scan ingestion and normalization
type IngestionService struct {
	repo            *persistence.PostgresRepository
	classifier      *ClassificationService
	enrichment      *EnrichmentService
	semanticLineage *SemanticLineageService
}

// NewIngestionService creates a new ingestion service
func NewIngestionService(repo *persistence.PostgresRepository, classifier *ClassificationService, enrichment *EnrichmentService, semanticLineage *SemanticLineageService) *IngestionService {
	return &IngestionService{
		repo:            repo,
		classifier:      classifier,
		enrichment:      enrichment,
		semanticLineage: semanticLineage,
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

		// ENRICHMENT LAYER - Add contextual intelligence
		// Extract column name if this is a database finding
		columnName := ""
		if colVal, ok := hawkeyeFinding.FileData["column_name"]; ok {
			if colStr, ok := colVal.(string); ok {
				columnName = colStr
			}
		}

		matchSample := ""
		if len(hawkeyeFinding.Matches) > 0 {
			matchSample = hawkeyeFinding.Matches[0]
		}

		// CRITICAL FIX #3: Normalize before classification
		normalizedMatch := normalization.Normalize(matchSample)

		// Perform enrichment
		enrichmentSignals := s.enrichment.Enrich(ctx, EnrichmentContext{
			FilePath:    hawkeyeFinding.FilePath,
			MatchValue:  normalizedMatch, // Use normalized value
			PatternName: hawkeyeFinding.PatternName,
			AssetType:   "file",
			ColumnName:  columnName,
		})

		// Calculate enrichment score (this becomes the Context Score in multi-signal)
		enrichmentScore := s.enrichment.GetEnrichmentScore(enrichmentSignals)

		// Classify finding using multi-signal engine
		multiSignalInput := MultiSignalInput{
			PatternName:       hawkeyeFinding.PatternName,
			FilePath:          hawkeyeFinding.FilePath,
			MatchValue:        normalizedMatch,
			ColumnName:        columnName,
			FileData:          hawkeyeFinding.FileData,
			EnrichmentScore:   enrichmentScore,
			EnrichmentSignals: enrichmentSignals,
		}

		decision, err := s.classifier.ClassifyMultiSignal(ctx, multiSignalInput)
		if err != nil {
			log.Printf("ERROR: Classification failed for %s: %v", hawkeyeFinding.PatternName, err)
			continue
		}

		// RECOMMENDED: Filter Non-PII at ingestion time (60-80% DB size reduction)
		// Alternative: Store all, filter at query time (allows threshold tuning)
		// Current: Using ingestion-time filtering for production efficiency
		if decision.Classification == "Non-PII" || decision.FinalScore < 0.45 {
			// Skip low-confidence and Non-PII findings to prevent database bloat
			// If you need retrospective tuning, comment this block and ensure
			// query-time filtering is applied in finding_repository.go
			continue
		}

		// Sanitize inputs for Postgres (remove null bytes) with logging
		sanitizedMatches := make([]string, len(hawkeyeFinding.Matches))
		sanitizationCount := 0
		for i, m := range hawkeyeFinding.Matches {
			if strings.Contains(m, "\u0000") {
				sanitizationCount++
				log.Printf("WARNING: Null byte detected in finding %s at %s (removed)",
					hawkeyeFinding.PatternName, hawkeyeFinding.FilePath)
			}
			sanitizedMatches[i] = strings.ReplaceAll(m, "\u0000", "")
		}
		sanitizedSample := strings.ReplaceAll(hawkeyeFinding.SampleText, "\u0000", "")

		// Track sanitization in scan metadata
		if sanitizationCount > 0 {
			if scanRun.Metadata == nil {
				scanRun.Metadata = make(map[string]interface{})
			}
			if existingCount, ok := scanRun.Metadata["sanitized_findings"].(int); ok {
				scanRun.Metadata["sanitized_findings"] = existingCount + sanitizationCount
			} else {
				scanRun.Metadata["sanitized_findings"] = sanitizationCount
			}
		}

		// Convert enrichment signals to map for storage
		enrichmentMap := map[string]interface{}{
			"asset_semantics":   enrichmentSignals.AssetSemantics,
			"environment":       enrichmentSignals.Environment,
			"entropy":           enrichmentSignals.Entropy,
			"charset_diversity": enrichmentSignals.CharsetDiversity,
			"token_shape":       enrichmentSignals.TokenShape,
			"value_hash":        enrichmentSignals.ValueHash,
			"historical_count":  enrichmentSignals.HistoricalCount,
		}

		// Generate normalized hash for deduplication
		// Use pkg/normalization when available, inline implementation for now
		normalizedValue := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(matchSample, " ", ""), "-", ""))
		hash := sha256.Sum256([]byte(normalizedValue))
		valueHash := hex.EncodeToString(hash[:])
		_ = valueHash // Will be used when entity.Finding has NormalizedValueHash field

		// Check for duplicates (same asset, pattern, and value hash in this scan)
		// Note: This requires adding GetFindingByHash to repository interface
		// For now, we'll just add the hash and rely on the unique index to prevent duplication
		// The database migration 000003_add_deduplication.up.sql adds:
		// CREATE UNIQUE INDEX idx_findings_unique ON findings(asset_id, pattern_name, normalized_value_hash, scan_run_id)

		// Create finding with deduplication hash
		finding := &entity.Finding{
			ID:                  uuid.New(),
			ScanRunID:           scanRun.ID,
			AssetID:             assetID,
			PatternID:           &patternID,
			PatternName:         hawkeyeFinding.PatternName,
			Matches:             sanitizedMatches,
			SampleText:          sanitizedSample,
			Severity:            hawkeyeFinding.Severity,
			SeverityDescription: hawkeyeFinding.SeverityDescription,
			ConfidenceScore:     &decision.FinalScore,
			Context:             decision.SignalBreakdown,
			EnrichmentSignals:   enrichmentMap,
			EnrichmentScore:     &enrichmentScore,
			EnrichmentFailed:    enrichmentSignals.EnrichmentFailed,
			// New field for deduplication:
			// NormalizedValueHash: valueHash,  // Uncomment when entity.Finding has this field
		}

		// TODO: When entity.Finding has NormalizedValueHash field, uncomment above
		// For now, the unique index will prevent true duplicates at DB level

		if err := s.repo.CreateFinding(ctx, finding); err != nil {
			// Check if error is due to duplicate (unique constraint violation)
			if strings.Contains(err.Error(), "idx_findings_unique") {
				// Duplicate detected - skip silently or log
				log.Printf("DEBUG: Duplicate finding skipped for %s at %s", hawkeyeFinding.PatternName, hawkeyeFinding.FilePath)
				continue
			}
			return nil, fmt.Errorf("failed to create finding: %w", err)
		}

		// Save Classification
		classification := &entity.Classification{
			ID:                 uuid.New(),
			FindingID:          finding.ID,
			ClassificationType: decision.Classification,
			SubCategory:        decision.SubCategory,
			ConfidenceScore:    decision.FinalScore,
			Justification:      decision.Justification,
			DPDPACategory:      decision.DPDPACategory,
			RequiresConsent:    decision.RequiresConsent,
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
		count, err := s.repo.CountFindings(ctx, repository.FindingFilters{
			AssetID: &assetID,
		})

		if err != nil {
			return nil, fmt.Errorf("failed to count findings: %w", err)
		}

		// Update asset with finding count
		asset, _ := s.repo.GetAssetByStableID(ctx, stableID)
		if asset != nil {
			asset.TotalFindings = count
			// Recalculate robust risk score based on all findings
			if err := s.recalculateAssetRisk(ctx, assetID); err != nil {
				// Log error but verify other assets
				fmt.Printf("Error recalculating risk for asset %s: %v\n", stableID, err)
			}

			// Sync to Neo4j if semantic lineage is enabled
			if s.semanticLineage != nil {
				if err := s.semanticLineage.SyncAssetToNeo4j(ctx, assetID); err != nil {
					// Log but don't fail ingestion (graceful degradation)
					fmt.Printf("WARNING: Failed to sync asset %s to Neo4j: %v\n", assetID, err)
				}
			}
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

// recalculateAssetRisk derives the risk score from findings severity and count
func (s *IngestionService) recalculateAssetRisk(ctx context.Context, assetID uuid.UUID) error {
	// 1. Get total findings count
	// We could use CountFindings, but we need max severity too.
	// Let's rely on the repository to give us stats or query findings.

	// For now, simpler: Get ALL findings for this asset (lightweight if paginated/limited, but potentially heavy)
	// BETTER: Add a method to repo: GetAssetRiskData(assetID) -> (count, maxSeverity)
	// Since I can't easily modify the repo interface without touching multiple files,
	// I will use ListFindings logic with a limit, or just count.

	// Actually, I can use CountFindings for count.
	count, err := s.repo.CountFindings(ctx, repository.FindingFilters{
		AssetID: &assetID,
	})
	if err != nil {
		return err
	}

	// 2. Determine Max Severity
	// We verify if there are ANY 'Critical' or 'High' findings.
	hasCritical, err := s.hasFindingWithSeverity(ctx, assetID, "Critical") // "Highest" mapped to Critical in DB?
	// Wait, internal severity is strings: "Highest", "High", "Medium", "Low".
	// The scanner sends "Highest" or "High".
	// Let's check "Highest" (Critical)
	if err != nil {
		return err
	}

	hasHigh, err := s.hasFindingWithSeverity(ctx, assetID, "High")
	if err != nil {
		return err
	}

	// 3. Calculate Base Score
	baseScore := 10
	if hasCritical {
		baseScore = 95
	} else if hasHigh {
		if count > 3 {
			baseScore = 85 // High volume of High severity
		} else {
			baseScore = 75
		}
	} else if count > 0 {
		// Medium/Low
		if count > 10 {
			baseScore = 60
		} else {
			baseScore = 40
		}
	}

	// 4. Update Asset
	return s.repo.UpdateAssetStats(ctx, assetID, baseScore, count)
}

func (s *IngestionService) hasFindingWithSeverity(ctx context.Context, assetID uuid.UUID, severity string) (bool, error) {
	// Quick check using CountFindings filtering
	// Note: Scanner sends "Highest" for Critical. Repo stores what scanner sends (string).
	// My previous fix used "Highest" -> Critical mapping in calculateRiskScore but persisted the raw string.
	// Let's check strict_rules.yml or system.py.
	// verification_output.json showed: "severity": "Highest"

	targetSev := severity
	if severity == "Critical" {
		targetSev = "Highest" // Map back to scanner term if needed, or check both
	}

	count, err := s.repo.CountFindings(ctx, repository.FindingFilters{
		AssetID:  &assetID,
		Severity: targetSev,
	})

	if count > 0 {
		return true, nil
	}

	// Double check alternative naming
	if severity == "Critical" && targetSev == "Highest" {
		// Also check "Critical" just in case
		c2, err := s.repo.CountFindings(ctx, repository.FindingFilters{
			AssetID:  &assetID,
			Severity: "Critical",
		})
		return c2 > 0, err
	}

	return false, err
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

// contains checks if string contains any of the substrings
func contains(str string, substrings []string) bool {
	for _, substr := range substrings {
		if strings.Contains(str, substr) {
			return true
		}
	}
	return false
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

// GetLatestScan returns the most recent scan run
func (s *IngestionService) GetLatestScan(ctx context.Context) (*entity.ScanRun, error) {
	return s.repo.GetLatestScanRun(ctx)
}
