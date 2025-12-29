package persistence

import (
	"context"
	"fmt"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// CreateDataCategoryNode creates or updates a data category node in Neo4j
func (r *Neo4jRepository) CreateDataCategoryNode(ctx context.Context, dataCategoryID, label string, metadata map[string]interface{}) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MERGE (dc:DataCategory {id: $id})
			SET dc.label = $label,
			    dc.classification_type = $classificationType,
			    dc.dpdpa_category = $dpdpaCategory,
			    dc.requires_consent = $requiresConsent,
			    dc.finding_count = $findingCount,
			    dc.avg_confidence = $avgConfidence,
			    dc.updated_at = datetime()
			RETURN dc
		`
		params := map[string]interface{}{
			"id":                 dataCategoryID,
			"label":              label,
			"classificationType": metadata["classification_type"],
			"dpdpaCategory":      metadata["dpdpa_category"],
			"requiresConsent":    metadata["requires_consent"],
			"findingCount":       metadata["finding_count"],
			"avgConfidence":      metadata["avg_confidence"],
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	return err
}

// CreateFindingAggregateNode creates or updates an aggregated finding node
func (r *Neo4jRepository) CreateFindingAggregateNode(ctx context.Context, findingID, label string, metadata map[string]interface{}) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MERGE (f:FindingAggregate {id: $id})
			SET f.label = $label,
			    f.pattern_name = $patternName,
			    f.severity = $severity,
			    f.count = $count,
			    f.updated_at = datetime()
			RETURN f
		`
		params := map[string]interface{}{
			"id":          findingID,
			"label":       label,
			"patternName": metadata["pattern_name"],
			"severity":    metadata["severity"],
			"count":       metadata["count"],
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	return err
}

// CreateHasFindingRelationship creates a HAS_FINDING relationship with count
func (r *Neo4jRepository) CreateHasFindingRelationship(ctx context.Context, dataCategoryID, findingID string, count int) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (dc:DataCategory {id: $dataCategoryID})
			MATCH (f:FindingAggregate {id: $findingID})
			MERGE (dc)-[r:HAS_FINDING]->(f)
			SET r.count = $count
			RETURN r
		`
		params := map[string]interface{}{
			"dataCategoryID": dataCategoryID,
			"findingID":      findingID,
			"count":          count,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	return err
}

// GetSemanticGraph retrieves the aggregated semantic graph
func (r *Neo4jRepository) GetSemanticGraph(ctx context.Context, systemID, riskLevel string) ([]Node, []Edge, error) {
	// Defensive check: return error if driver is nil
	if r.driver == nil {
		return nil, nil, fmt.Errorf("neo4j driver is not initialized")
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	nodes := []Node{}
	edges := []Edge{}
	nodeMap := make(map[string]bool)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		// Build query with optional filters
		query := `
			MATCH (s:System)
			OPTIONAL MATCH (s)-[:CONTAINS]->(a:Asset)
			OPTIONAL MATCH (a)-[:CONTAINS]->(dc:DataCategory)
			OPTIONAL MATCH (dc)-[r:HAS_FINDING]->(f:FindingAggregate)
		`

		params := map[string]interface{}{}

		if systemID != "" {
			query += " WHERE s.id = $systemID"
			params["systemID"] = systemID
		}

		query += " RETURN s, a, dc, f, r"

		result, err := tx.Run(ctx, query, params)
		if err != nil {
			return nil, err
		}

		records, err := result.Collect(ctx)
		if err != nil {
			return nil, err
		}

		edgeSet := make(map[string]bool)

		for _, record := range records {
			// Process System
			if systemNode, ok := record.Get("s"); ok && systemNode != nil {
				if node, ok := systemNode.(neo4j.Node); ok {
					id, _ := node.Props["id"].(string)
					label, _ := node.Props["label"].(string)
					if id != "" && !nodeMap[id] {
						nodes = append(nodes, Node{
							ID:    id,
							Label: label,
							Type:  "system",
							Metadata: map[string]interface{}{
								"host":          node.Props["host"],
								"source_system": node.Props["source_system"],
								"environment":   node.Props["environment"],
							},
						})
						nodeMap[id] = true
					}
				}
			}

			// Process Asset
			if assetNode, ok := record.Get("a"); ok && assetNode != nil {
				if node, ok := assetNode.(neo4j.Node); ok {
					id, _ := node.Props["id"].(string)
					name, _ := node.Props["name"].(string)
					if id != "" && !nodeMap[id] {
						riskScore, _ := node.Props["risk_score"].(int64)
						nodes = append(nodes, Node{
							ID:        id,
							Label:     name,
							Type:      "asset",
							RiskScore: int(riskScore),
							Metadata: map[string]interface{}{
								"path":           node.Props["path"],
								"data_source":    node.Props["data_source"],
								"environment":    node.Props["environment"],
								"total_findings": node.Props["total_findings"],
							},
						})
						nodeMap[id] = true

						// Create System -> Asset edge
						systemID, _ := record.Get("s")
						if sysNode, ok := systemID.(neo4j.Node); ok {
							sysID, _ := sysNode.Props["id"].(string)
							edgeID := fmt.Sprintf("%s-hosts-%s", sysID, id)
							if !edgeSet[edgeID] {
								edges = append(edges, Edge{
									ID:     edgeID,
									Source: sysID,
									Target: id,
									Type:   "HOSTS",
									Label:  "hosts",
								})
								edgeSet[edgeID] = true
							}
						}
					}
				}
			}

			// Process DataCategory
			if dcNode, ok := record.Get("dc"); ok && dcNode != nil {
				if node, ok := dcNode.(neo4j.Node); ok {
					id, _ := node.Props["id"].(string)
					label, _ := node.Props["label"].(string)
					if id != "" && !nodeMap[id] {
						findingCount, _ := node.Props["finding_count"].(int64)
						avgConfidence, _ := node.Props["avg_confidence"].(float64)
						nodes = append(nodes, Node{
							ID:    id,
							Label: label,
							Type:  "data_category",
							Metadata: map[string]interface{}{
								"classification_type": node.Props["classification_type"],
								"dpdpa_category":      node.Props["dpdpa_category"],
								"requires_consent":    node.Props["requires_consent"],
								"finding_count":       findingCount,
								"avg_confidence":      avgConfidence,
							},
						})
						nodeMap[id] = true

						// Create Asset -> DataCategory edge
						assetID, _ := record.Get("a")
						if assetNode, ok := assetID.(neo4j.Node); ok {
							aID, _ := assetNode.Props["id"].(string)
							edgeID := fmt.Sprintf("%s-contains-%s", aID, id)
							if !edgeSet[edgeID] {
								edges = append(edges, Edge{
									ID:     edgeID,
									Source: aID,
									Target: id,
									Type:   "CONTAINS",
									Label:  "contains",
								})
								edgeSet[edgeID] = true
							}
						}
					}
				}
			}

			// Process FindingAggregate
			if findingNode, ok := record.Get("f"); ok && findingNode != nil {
				if node, ok := findingNode.(neo4j.Node); ok {
					id, _ := node.Props["id"].(string)
					label, _ := node.Props["label"].(string)
					if id != "" && !nodeMap[id] {
						count, _ := node.Props["count"].(int64)
						nodes = append(nodes, Node{
							ID:    id,
							Label: label,
							Type:  "finding_aggregate",
							Metadata: map[string]interface{}{
								"pattern_name": node.Props["pattern_name"],
								"severity":     node.Props["severity"],
								"count":        count,
							},
						})
						nodeMap[id] = true

						// Create DataCategory -> Finding edge
						dcID, _ := record.Get("dc")
						if dcNode, ok := dcID.(neo4j.Node); ok {
							dcNodeID, _ := dcNode.Props["id"].(string)

							// Get count from relationship
							if rel, ok := record.Get("r"); ok && rel != nil {
								if relationship, ok := rel.(neo4j.Relationship); ok {
									relCount, _ := relationship.Props["count"].(int64)
									edgeID := fmt.Sprintf("%s-has-%s", dcNodeID, id)
									if !edgeSet[edgeID] {
										edges = append(edges, Edge{
											ID:     edgeID,
											Source: dcNodeID,
											Target: id,
											Type:   "HAS_FINDING",
											Label:  fmt.Sprintf("has %d", relCount),
										})
										edgeSet[edgeID] = true
									}
								}
							}
						}
					}
				}
			}
		}

		return nil, nil
	})

	if err != nil {
		return nil, nil, err
	}

	_ = result

	return nodes, edges, nil
}
