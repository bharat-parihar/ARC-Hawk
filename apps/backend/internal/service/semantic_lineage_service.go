package service

import (
	"context"
	"fmt"

	"github.com/arc-platform/backend/internal/domain/repository"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/google/uuid"
)

// SemanticLineageService builds aggregated semantic lineage graphs
type SemanticLineageService struct {
	neo4jRepo *persistence.Neo4jRepository
	pgRepo    *persistence.PostgresRepository
}

// NewSemanticLineageService creates a new semantic lineage service
func NewSemanticLineageService(neo4jRepo *persistence.Neo4jRepository, pgRepo *persistence.PostgresRepository) *SemanticLineageService {
	return &SemanticLineageService{
		neo4jRepo: neo4jRepo,
		pgRepo:    pgRepo,
	}
}

// SemanticNode represents a node in the semantic graph
type SemanticNode struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"` // system, asset, data_category, finding
	Label    string                 `json:"label"`
	Metadata map[string]interface{} `json:"metadata"`
}

// SemanticEdge represents a relationship in the semantic graph
type SemanticEdge struct {
	ID       string                 `json:"id"`
	Source   string                 `json:"source"`
	Target   string                 `json:"target"`
	Type     string                 `json:"type"` // HOSTS, CONTAINS, HAS_FINDING
	Metadata map[string]interface{} `json:"metadata"`
}

// SemanticGraph represents the aggregated graph
type SemanticGraph struct {
	Nodes []SemanticNode `json:"nodes"`
	Edges []SemanticEdge `json:"edges"`
}

// SyncAssetToNeo4j syncs an asset and its findings to Neo4j (3-layer aggregated hierarchy)
// Creates: System → Asset → DataCategory (NO individual finding nodes for scalability)
func (s *SemanticLineageService) SyncAssetToNeo4j(ctx context.Context, assetID uuid.UUID) error {
	// Skip if Neo4j is not available
	if s.neo4jRepo == nil {
		return nil
	}

	// Get asset from PostgreSQL
	asset, err := s.pgRepo.GetAssetByID(ctx, assetID)
	if err != nil {
		return fmt.Errorf("failed to get asset: %w", err)
	}

	// 1. Create/Update System node
	systemID := fmt.Sprintf("system-%s", asset.Host)
	systemMetadata := map[string]interface{}{
		"host":          asset.Host,
		"source_system": asset.SourceSystem,
		"environment":   asset.Environment,
	}
	if err := s.neo4jRepo.CreateSystemNode(ctx, systemID, asset.Host, systemMetadata); err != nil {
		return fmt.Errorf("failed to create system node: %w", err)
	}

	// 2. Create/Update Asset node
	if err := s.neo4jRepo.CreateAssetNode(ctx, asset); err != nil {
		return fmt.Errorf("failed to create asset node: %w", err)
	}

	// 3. Create CONTAINS relationship (System → Asset)
	if err := s.neo4jRepo.CreateContainsRelationship(ctx, systemID, asset.ID.String()); err != nil {
		return fmt.Errorf("failed to create system-asset relationship: %w", err)
	}

	// 4. Get findings for this asset
	findings, err := s.pgRepo.ListFindings(ctx, repository.FindingFilters{AssetID: &assetID}, 1000, 0)
	if err != nil {
		return fmt.Errorf("failed to get findings: %w", err)
	}

	// 5. Aggregate findings by classification type (DataCategory level)
	categoryMap := make(map[string]*DataCategoryAggregate)

	for _, finding := range findings {
		// Get classification
		classifications, err := s.pgRepo.GetClassificationsByFindingID(ctx, finding.ID)
		if err != nil || len(classifications) == 0 {
			continue
		}

		classification := classifications[0]

		// CRITICAL: Filter Non-PII and low-confidence at query time for Neo4j
		// This ensures clean graph visualization even with store-all approach
		if classification.ConfidenceScore < 0.45 || classification.ClassificationType == "Non-PII" {
			continue
		}

		categoryKey := classification.ClassificationType
		if _, exists := categoryMap[categoryKey]; !exists {
			categoryMap[categoryKey] = &DataCategoryAggregate{
				ClassificationType: classification.ClassificationType,
				DPDPACategory:      classification.DPDPACategory,
				RequiresConsent:    classification.RequiresConsent,
				FindingCount:       0,
				TotalConfidence:    0.0,
				Findings:           []FindingAggregate{},
			}
		}

		agg := categoryMap[categoryKey]
		agg.FindingCount++
		agg.TotalConfidence += classification.ConfidenceScore

		// Track pattern diversity (for metadata only, not creating nodes)
		findingAgg := FindingAggregate{
			PatternName: finding.PatternName,
			Severity:    finding.Severity,
			Count:       len(finding.Matches),
		}
		agg.Findings = append(agg.Findings, findingAgg)
	}

	// 6. Create DataCategory nodes ONLY (no individual finding nodes)
	// This keeps the graph clean and scalable
	for categoryType, agg := range categoryMap {
		dataCategoryID := fmt.Sprintf("dc-%s-%s", asset.ID.String(), categoryType)

		avgConfidence := agg.TotalConfidence / float64(agg.FindingCount)

		// Aggregate pattern statistics for metadata
		patternCounts := make(map[string]int)
		severityCounts := make(map[string]int)
		for _, findingAgg := range agg.Findings {
			patternCounts[findingAgg.PatternName] += findingAgg.Count
			severityCounts[findingAgg.Severity]++
		}

		// Determine risk level based on classification type and confidence
		riskLevel := getRiskLevel(categoryType, avgConfidence)

		dataCategoryMetadata := map[string]interface{}{
			"classification_type": categoryType,
			"dpdpa_category":      agg.DPDPACategory,
			"requires_consent":    agg.RequiresConsent,
			"finding_count":       agg.FindingCount,
			"avg_confidence":      avgConfidence,
			"risk_level":          riskLevel,
			"pattern_diversity":   len(patternCounts),
			"pattern_counts":      patternCounts,
			"severity_breakdown":  severityCounts,
		}

		// Create DataCategory node in Neo4j
		if err := s.neo4jRepo.CreateDataCategoryNode(ctx, dataCategoryID, categoryType, dataCategoryMetadata); err != nil {
			return fmt.Errorf("failed to create data category node: %w", err)
		}

		// Create EXPOSES relationship (Asset → DataCategory)
		if err := s.neo4jRepo.CreateContainsRelationship(ctx, asset.ID.String(), dataCategoryID); err != nil {
			return fmt.Errorf("failed to create asset-category relationship: %w", err)
		}
	}

	return nil
}

// getRiskLevel determines risk level based on classification type and confidence
func getRiskLevel(classificationType string, avgConfidence float64) string {
	// Base risk by classification type
	baseRisk := map[string]int{
		"Sensitive Personal Data": 3, // Critical
		"Secrets":                 3, // Critical
		"Personal Data":           2, // High
		"Financial Data":          3, // Critical
		"Health Data":             3, // Critical
		"Biometric Data":          3, // Critical
	}

	risk, exists := baseRisk[classificationType]
	if !exists {
		risk = 1 // Medium for unknown types
	}

	// Adjust based on confidence
	if avgConfidence < 0.65 {
		risk-- // Lower risk if low confidence
	} else if avgConfidence > 0.85 {
		risk++ // Higher risk if very confident
	}

	// Map to risk level strings
	switch {
	case risk >= 3:
		return "Critical"
	case risk == 2:
		return "High"
	case risk == 1:
		return "Medium"
	default:
		return "Low"
	}
}

// DataCategoryAggregate represents aggregated findings by classification
type DataCategoryAggregate struct {
	ClassificationType string
	DPDPACategory      string
	RequiresConsent    bool
	FindingCount       int
	TotalConfidence    float64
	Findings           []FindingAggregate
}

// FindingAggregate represents aggregated findings by pattern
type FindingAggregate struct {
	PatternName string
	Severity    string
	Count       int
}

// GetSemanticGraph retrieves the aggregated semantic graph from Neo4j
func (s *SemanticLineageService) GetSemanticGraph(ctx context.Context, filters SemanticGraphFilters) (*SemanticGraph, error) {
	// Check if Neo4j is available before attempting to use it
	if s.neo4jRepo != nil {
		// Try Neo4j first
		nodes, edges, err := s.neo4jRepo.GetSemanticGraph(ctx, filters.SystemID, filters.RiskLevel)
		if err != nil {
			// Fallback to PostgreSQL if Neo4j query fails
			return s.fallbackToPostgres(ctx, filters)
		}

		// Convert to semantic graph format
		semanticNodes := make([]SemanticNode, len(nodes))
		for i, node := range nodes {
			semanticNodes[i] = SemanticNode{
				ID:       node.ID,
				Type:     node.Type,
				Label:    node.Label,
				Metadata: node.Metadata,
			}
		}

		semanticEdges := make([]SemanticEdge, len(edges))
		for i, edge := range edges {
			semanticEdges[i] = SemanticEdge{
				ID:       edge.ID,
				Source:   edge.Source,
				Target:   edge.Target,
				Type:     edge.Type,
				Metadata: edge.Metadata,
			}
		}

		return &SemanticGraph{
			Nodes: semanticNodes,
			Edges: semanticEdges,
		}, nil
	}

	// If Neo4j is not configured, use PostgreSQL fallback
	return s.fallbackToPostgres(ctx, filters)
}

// SemanticGraphFilters contains filtering options
type SemanticGraphFilters struct {
	SystemID  string
	RiskLevel string // high, medium, low
	Category  string // PII category filter
}

// fallbackToPostgres builds semantic graph from PostgreSQL when Neo4j unavailable
func (s *SemanticLineageService) fallbackToPostgres(ctx context.Context, _ SemanticGraphFilters) (*SemanticGraph, error) {
	// Get assets from PostgreSQL
	assets, err := s.pgRepo.ListAssets(ctx, 100, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to list assets: %w", err)
	}

	nodes := []SemanticNode{}
	edges := []SemanticEdge{}
	nodeMap := make(map[string]bool)

	// Build graph from PostgreSQL data (simplified aggregation)
	systemMap := make(map[string]bool)

	for _, asset := range assets {
		// Check if asset has PII findings (skip pure infrastructure/non-PII assets for cleaner graph)
		findingCount, err := s.pgRepo.CountFindings(ctx, repository.FindingFilters{AssetID: &asset.ID})
		if err != nil || findingCount == 0 {
			// If we can't efficiently check for Non-PII specifically in CountFindings without modifying it everywhere,
			// we assume 0 findings = skip.
			// The repo.CountFindings already excludes Non-PII if we modified it earlier!
			// YES - we modified finding_repository.go CountFindings to auto-exclude Non-PII.
			// So findingCount here will be 0 if all findings are Non-PII.
			if findingCount == 0 {
				continue
			}
		}

		// Create system node
		systemID := fmt.Sprintf("system-%s", asset.Host)
		if !systemMap[systemID] {
			nodes = append(nodes, SemanticNode{
				ID:    systemID,
				Type:  "system",
				Label: asset.Host,
				Metadata: map[string]interface{}{
					"host":          asset.Host,
					"source_system": asset.SourceSystem,
				},
			})
			systemMap[systemID] = true
		}

		// Create asset node
		assetID := asset.ID.String()
		if !nodeMap[assetID] {
			nodes = append(nodes, SemanticNode{
				ID:    assetID,
				Type:  "asset",
				Label: asset.Name,
				Metadata: map[string]interface{}{
					"path":        asset.Path,
					"risk_score":  asset.RiskScore,
					"environment": asset.Environment,
				},
			})
			nodeMap[assetID] = true

			// Create HOSTS edge
			edges = append(edges, SemanticEdge{
				ID:       fmt.Sprintf("%s-hosts-%s", systemID, assetID),
				Source:   systemID,
				Target:   assetID,
				Type:     "HOSTS",
				Metadata: map[string]interface{}{},
			})
		}
	}

	return &SemanticGraph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

// SyncLineage triggers a full synchronization of all assets to Neo4j
func (s *SemanticLineageService) SyncLineage(ctx context.Context) error {
	if s.neo4jRepo == nil {
		return fmt.Errorf("neo4j repository not configured")
	}

	// 1. Get all assets
	// Use a large limit for now, or implement pagination
	assets, err := s.pgRepo.ListAssets(ctx, 10000, 0)
	if err != nil {
		return fmt.Errorf("failed to list assets: %w", err)
	}

	successCount := 0
	errorCount := 0

	for _, asset := range assets {
		if err := s.SyncAssetToNeo4j(ctx, asset.ID); err != nil {
			fmt.Printf("Error syncing asset %s: %v\n", asset.Name, err)
			errorCount++
		} else {
			successCount++
		}
	}

	fmt.Printf("Sync completed: %d assets synced, %d failed\n", successCount, errorCount)
	return nil
}
