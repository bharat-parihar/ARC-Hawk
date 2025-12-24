package service

import (
	"context"
	"fmt"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/domain/repository"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/google/uuid"
)

// LineageService builds dynamic lineage graphs
type LineageService struct {
	repo *persistence.PostgresRepository
}

// NewLineageService creates a new lineage service
func NewLineageService(repo *persistence.PostgresRepository) *LineageService {
	return &LineageService{repo: repo}
}

// Node represents a graph node
type Node struct {
	ID        string                 `json:"id"`
	Label     string                 `json:"label"`
	Type      string                 `json:"type"`
	ParentID  string                 `json:"parent_id,omitempty"`
	RiskScore int                    `json:"risk_score"`
	Metadata  map[string]interface{} `json:"metadata"`
}

// Edge represents a graph edge
type Edge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
	Type   string `json:"type"`
	Label  string `json:"label"`
}

// LineageGraph represents the complete graph
type LineageGraph struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

// LineageFilters represents filtering options
type LineageFilters struct {
	Source   string
	Severity string
	DataType string
	AssetID  *uuid.UUID
	Level    string // "system", "asset", "field"
}

// BuildLineage constructs a dynamic lineage graph from relational data
func (s *LineageService) BuildLineage(ctx context.Context, filters LineageFilters) (*LineageGraph, error) {
	var assets []*entity.Asset
	var err error

	// Get assets based on filters
	if filters.AssetID != nil {
		asset, err := s.repo.GetAssetByID(ctx, *filters.AssetID)
		if err != nil {
			return nil, fmt.Errorf("failed to get asset: %w", err)
		}
		assets = []*entity.Asset{asset}
	} else {
		assets, err = s.repo.ListAssets(ctx, 100, 0)
		if err != nil {
			return nil, fmt.Errorf("failed to list assets: %w", err)
		}
	}

	// Filter assets by source if specified
	if filters.Source != "" {
		filteredAssets := []*entity.Asset{}
		for _, asset := range assets {
			if asset.DataSource == filters.Source {
				filteredAssets = append(filteredAssets, asset)
			}
		}
		assets = filteredAssets
	}

	nodes := []Node{}
	edges := []Edge{}
	nodeMap := make(map[string]bool)

	// Track systems (groups)
	systemMap := make(map[string]bool)

	// Create nodes for assets
	for _, asset := range assets {
		// 1. Create System/Group Node
		// Use SourceSystem or Host as grouper
		systemID := fmt.Sprintf("sys-%s", asset.Host)
		if asset.SourceSystem != "" {
			systemID = fmt.Sprintf("sys-%s", asset.SourceSystem)
		}

		if !systemMap[systemID] {
			nodes = append(nodes, Node{
				ID:    systemID,
				Label: asset.Host,
				Type:  "system",
				Metadata: map[string]interface{}{
					"source_system": asset.SourceSystem,
					"host":          asset.Host,
				},
			})
			systemMap[systemID] = true
		}

		// If level is "system", skip asset nodes
		if filters.Level == "system" {
			continue
		}

		nodeID := asset.ID.String()
		if !nodeMap[nodeID] {
			nodes = append(nodes, Node{
				ID:        nodeID,
				Label:     asset.Name,
				Type:      asset.AssetType,
				ParentID:  systemID, // Grouping
				RiskScore: asset.RiskScore,
				Metadata: map[string]interface{}{
					"path":           asset.Path,
					"data_source":    asset.DataSource,
					"total_findings": asset.TotalFindings,
					"environment":    asset.Environment,
					"owner":          asset.Owner,
				},
			})
			nodeMap[nodeID] = true
		}

		// Get findings for this asset
		findingFilters := repository.FindingFilters{
			AssetID: &asset.ID,
		}

		if filters.Severity != "" {
			findingFilters.Severity = filters.Severity
		}

		findings, err := s.repo.ListFindings(ctx, findingFilters, 100, 0)
		if err != nil {
			return nil, fmt.Errorf("failed to get findings: %w", err)
		}

		// Create nodes for findings and edges
		for _, finding := range findings {
			findingNodeID := finding.ID.String()
			if !nodeMap[findingNodeID] {
				// Get classification for finding
				classifications, err := s.repo.GetClassificationsByFindingID(ctx, finding.ID)
				if err != nil {
					return nil, fmt.Errorf("failed to get classifications: %w", err)
				}

				classificationType := "Unknown"
				confidence := 0.0
				if len(classifications) > 0 {
					classificationType = classifications[0].ClassificationType
					confidence = classifications[0].ConfidenceScore

					// Filter by data type if specified
					if filters.DataType != "" && classificationType != filters.DataType {
						continue
					}
				} else if filters.DataType != "" {
					continue
				}

				nodes = append(nodes, Node{
					ID:        findingNodeID,
					Label:     finding.PatternName,
					Type:      "finding",
					ParentID:  nodeID,
					RiskScore: calculateFindingRiskScore(finding.Severity),
					Metadata: map[string]interface{}{
						"pattern":        finding.PatternName,
						"severity":       finding.Severity,
						"matches_count":  len(finding.Matches),
						"classification": classificationType,
						"confidence":     confidence,
					},
				})
				nodeMap[findingNodeID] = true

				// Create EXPOSES edge from asset to finding (visual reinforcement)
				// Even if parented, edges are useful for logic
				edges = append(edges, Edge{
					ID:     fmt.Sprintf("%s-exposes-%s", nodeID, findingNodeID),
					Source: nodeID,
					Target: findingNodeID,
					Type:   "EXPOSES",
					Label:  "exposes",
				})

				// Create classification node and edge if exists
				if len(classifications) > 0 {
					for _, classification := range classifications {
						classNodeID := fmt.Sprintf("classification-%s", classification.ClassificationType)
						if !nodeMap[classNodeID] {
							nodes = append(nodes, Node{
								ID:        classNodeID,
								Label:     classification.ClassificationType,
								Type:      "classification",
								RiskScore: int(classification.ConfidenceScore),
								Metadata: map[string]interface{}{
									"dpdpa_category":   classification.DPDPACategory,
									"requires_consent": classification.RequiresConsent,
								},
							})
							nodeMap[classNodeID] = true
						}

						// Create CLASSIFIED_AS edge
						edges = append(edges, Edge{
							ID:     fmt.Sprintf("%s-classified-%s", findingNodeID, classNodeID),
							Source: findingNodeID,
							Target: classNodeID,
							Type:   "CLASSIFIED_AS",
							Label:  "classified as",
						})
					}
				}
			}
		}
	}

	// Get asset relationships
	relationshipFilters := repository.RelationshipFilters{}
	if filters.AssetID != nil {
		relationshipFilters.SourceAssetID = filters.AssetID
	}

	relationships, err := s.repo.GetFilteredAssetRelationships(ctx, relationshipFilters)
	if err != nil {
		return nil, fmt.Errorf("failed to get relationships: %w", err)
	}

	// Add relationship edges
	for _, rel := range relationships {
		sourceID := rel.SourceAssetID.String()
		targetID := rel.TargetAssetID.String()

		if nodeMap[sourceID] && nodeMap[targetID] {
			edges = append(edges, Edge{
				ID:     rel.ID.String(),
				Source: sourceID,
				Target: targetID,
				Type:   rel.RelationshipType,
				Label:  rel.RelationshipType,
			})
		}
	}

	return &LineageGraph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

func calculateFindingRiskScore(severity string) int {
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
