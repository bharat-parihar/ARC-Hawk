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

// SyncAssetToNeo4j syncs an asset and its findings to Neo4j (aggregated)
func (s *SemanticLineageService) SyncAssetToNeo4j(ctx context.Context, assetID uuid.UUID) error {
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

	// 3. Create HOSTS relationship
	if err := s.neo4jRepo.CreateContainsRelationship(ctx, systemID, asset.ID.String()); err != nil {
		return fmt.Errorf("failed to create hosts relationship: %w", err)
	}

	// 4. Get findings for this asset
	findings, err := s.pgRepo.ListFindings(ctx, repository.FindingFilters{AssetID: &assetID}, 1000, 0)
	if err != nil {
		return fmt.Errorf("failed to get findings: %w", err)
	}

	// 5. Aggregate findings by classification type
	// Group: AssetID + ClassificationType → DataCategory node
	categoryMap := make(map[string]*DataCategoryAggregate)

	for _, finding := range findings {
		// Get classification
		classifications, err := s.pgRepo.GetClassificationsByFindingID(ctx, finding.ID)
		if err != nil || len(classifications) == 0 {
			continue
		}

		classification := classifications[0]

		// Skip low confidence
		if classification.ConfidenceScore < 0.45 {
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

		// Aggregate findings by pattern
		findingAgg := FindingAggregate{
			PatternName: finding.PatternName,
			Severity:    finding.Severity,
			Count:       len(finding.Matches),
		}
		agg.Findings = append(agg.Findings, findingAgg)
	}

	// 6. Create DataCategory nodes and relationships
	for categoryType, agg := range categoryMap {
		dataCategoryID := fmt.Sprintf("dc-%s-%s", asset.ID.String(), categoryType)

		avgConfidence := agg.TotalConfidence / float64(agg.FindingCount)

		dataCategoryMetadata := map[string]interface{}{
			"classification_type": categoryType,
			"dpdpa_category":      agg.DPDPACategory,
			"requires_consent":    agg.RequiresConsent,
			"finding_count":       agg.FindingCount,
			"avg_confidence":      avgConfidence,
		}

		// Create DataCategory node in Neo4j
		if err := s.neo4jRepo.CreateDataCategoryNode(ctx, dataCategoryID, categoryType, dataCategoryMetadata); err != nil {
			return fmt.Errorf("failed to create data category node: %w", err)
		}

		// Create CONTAINS relationship (Asset → DataCategory)
		if err := s.neo4jRepo.CreateContainsRelationship(ctx, asset.ID.String(), dataCategoryID); err != nil {
			return fmt.Errorf("failed to create contains relationship: %w", err)
		}

		// 7. Create aggregated Finding nodes (by pattern)
		patternMap := make(map[string]*FindingAggregate)
		for _, findingAgg := range agg.Findings {
			if existing, exists := patternMap[findingAgg.PatternName]; exists {
				existing.Count += findingAgg.Count
			} else {
				patternMap[findingAgg.PatternName] = &findingAgg
			}
		}

		// Create Finding nodes for each pattern
		for patternName, findingAgg := range patternMap {
			findingNodeID := fmt.Sprintf("finding-%s-%s-%s", asset.ID.String(), categoryType, patternName)

			findingMetadata := map[string]interface{}{
				"pattern_name": patternName,
				"severity":     findingAgg.Severity,
				"count":        findingAgg.Count,
			}

			if err := s.neo4jRepo.CreateFindingAggregateNode(ctx, findingNodeID, patternName, findingMetadata); err != nil {
				return fmt.Errorf("failed to create finding node: %w", err)
			}

			// Create HAS_FINDING relationship (DataCategory → Finding)
			if err := s.neo4jRepo.CreateHasFindingRelationship(ctx, dataCategoryID, findingNodeID, findingAgg.Count); err != nil {
				return fmt.Errorf("failed to create has_finding relationship: %w", err)
			}
		}
	}

	return nil
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
func (s *SemanticLineageService) fallbackToPostgres(ctx context.Context, filters SemanticGraphFilters) (*SemanticGraph, error) {
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
