package service

import (
	"context"
	"fmt"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
)

// === Phase 3: 4-Level Hierarchy Methods ===

// SyncFindingToGraph syncs a finding to the 4-level Neo4j hierarchy
// System → Asset → DataCategory → PIIType
func (s *SemanticLineageService) SyncFindingToGraph(
	ctx context.Context,
	finding *entity.Finding,
	asset *entity.Asset,
	classification *entity.Classification,
) error {
	// Skip if Neo4j is not available
	if s.neo4jRepo == nil {
		return nil
	}

	// 1. Create/Update System node
	systemID := fmt.Sprintf("system-%s", asset.Host)
	systemMetadata := map[string]interface{}{
		"host":          asset.Host,
		"source_system": asset.SourceSystem,
	}
	if err := s.neo4jRepo.CreateSystemNode(ctx, systemID, asset.Host, systemMetadata); err != nil {
		return fmt.Errorf("failed to create system node: %w", err)
	}

	// 2. Create/Update Asset node
	if err := s.neo4jRepo.CreateAssetNode(ctx, asset); err != nil {
		return fmt.Errorf("failed to create asset node: %w", err)
	}

	// 3. Create CONTAINS relationship (System → Asset)
	if err := s.neo4jRepo.CreateHierarchyRelationship(ctx, systemID, asset.ID.String(), "CONTAINS"); err != nil {
		return fmt.Errorf("failed to create system-asset relationship: %w", err)
	}

	// 4. Create/Update DataCategory node
	dataCategoryID := fmt.Sprintf("dc-%s-%s", asset.ID.String(), classification.ClassificationType)
	dataCategoryMetadata := map[string]interface{}{
		"dpdpa_category":   classification.DPDPACategory,
		"requires_consent": classification.RequiresConsent,
		"finding_count":    1,
		"avg_confidence":   classification.ConfidenceScore,
		"risk_level":       mapSeverityToRisk(finding.Severity),
	}
	if err := s.neo4jRepo.CreateDataCategoryNode(ctx, dataCategoryID, classification.ClassificationType, dataCategoryMetadata); err != nil {
		return fmt.Errorf("failed to create data category node: %w", err)
	}

	// 5. Create HAS_CATEGORY relationship (Asset → DataCategory)
	if err := s.neo4jRepo.CreateHierarchyRelationship(ctx, asset.ID.String(), dataCategoryID, "HAS_CATEGORY"); err != nil {
		return fmt.Errorf("failed to create asset-category relationship: %w", err)
	}

	// 6. Create/Update PIIType node (with aggregation)
	piiType := getPIITypeFromPattern(finding.PatternName)
	piiMetadata := map[string]interface{}{
		"count":          1,
		"max_risk":       finding.Severity,
		"max_confidence": classification.ConfidenceScore,
	}
	if err := s.neo4jRepo.CreatePIITypeNode(ctx, piiType, piiMetadata); err != nil {
		return fmt.Errorf("failed to create PII type node: %w", err)
	}

	// 7. Create INCLUDES relationship (DataCategory → PIIType)
	if err := s.neo4jRepo.CreateHierarchyRelationship(ctx, dataCategoryID, piiType, "INCLUDES"); err != nil {
		return fmt.Errorf("failed to create category-pii relationship: %w", err)
	}

	return nil
}

// GetHierarchy retrieves the complete 4-level hierarchy with filters
func (s *SemanticLineageService) GetHierarchy(
	ctx context.Context,
	systemFilter string,
	riskFilter string,
) (*HierarchyResponse, error) {
	// Check if Neo4j is available
	if s.neo4jRepo == nil {
		return nil, fmt.Errorf("Neo4j not configured")
	}

	// Get nodes and edges from Neo4j
	nodes, edges, err := s.neo4jRepo.GetSemanticGraph(ctx, systemFilter, riskFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get hierarchy: %w", err)
	}

	// Get aggregations
	aggregations, err := s.neo4jRepo.GetPIIAggregations(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get aggregations: %w", err)
	}

	// Build response
	return &HierarchyResponse{
		Hierarchy: SemanticGraph{
			Nodes: convertNodesToSemantic(nodes),
			Edges: convertEdgesToSemantic(edges),
		},
		Aggregations: AggregationSummary{
			ByPIIType:     aggregations,
			TotalAssets:   countNodesByType(nodes, "asset"),
			TotalPIITypes: countNodesByType(nodes, "pii_type"),
		},
	}, nil
}

// HierarchyResponse represents the full hierarchy with aggregations
type HierarchyResponse struct {
	Hierarchy    SemanticGraph      `json:"hierarchy"`
	Aggregations AggregationSummary `json:"aggregations"`
}

// AggregationSummary contains aggregated statistics
type AggregationSummary struct {
	ByPIIType     []map[string]interface{} `json:"by_pii_type"`
	TotalAssets   int                      `json:"total_assets"`
	TotalPIITypes int                      `json:"total_pii_types"`
}

// Helper functions

func mapSeverityToRisk(severity string) string {
	switch severity {
	case "Critical", "High":
		return "CRITICAL"
	case "Medium":
		return "HIGH"
	default:
		return "MEDIUM"
	}
}

func getPIITypeFromPattern(patternName string) string {
	// Map pattern names to standard PII types
	patternMap := map[string]string{
		"Aadhaar":     "IN_AADHAAR",
		"PAN":         "IN_PAN",
		"Credit_Card": "CREDIT_CARD",
		"Email":       "EMAIL_ADDRESS",
		"Phone":       "PHONE_NUMBER",
		"SSN":         "US_SSN",
		"Passport":    "US_PASSPORT",
	}

	if piiType, exists := patternMap[patternName]; exists {
		return piiType
	}

	// Default: use pattern name
	return patternName
}

func convertNodesToSemantic(nodes []persistence.Node) []SemanticNode {
	semantic := make([]SemanticNode, len(nodes))
	for i, node := range nodes {
		semantic[i] = SemanticNode{
			ID:       node.ID,
			Type:     node.Type,
			Label:    node.Label,
			Metadata: node.Metadata,
		}
	}
	return semantic
}

func convertEdgesToSemantic(edges []persistence.Edge) []SemanticEdge {
	semantic := make([]SemanticEdge, len(edges))
	for i, edge := range edges {
		semantic[i] = SemanticEdge{
			ID:       edge.ID,
			Source:   edge.Source,
			Target:   edge.Target,
			Type:     edge.Type,
			Metadata: edge.Metadata,
		}
	}
	return semantic
}

func countNodesByType(nodes []persistence.Node, nodeType string) int {
	count := 0
	for _, node := range nodes {
		if node.Type == nodeType {
			count++
		}
	}
	return count
}
