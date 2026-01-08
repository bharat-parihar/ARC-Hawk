package persistence

import (
	"context"
	"fmt"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// === Phase 3: 4-Level Hierarchy Methods ===

// CreateDataCategoryNode creates or updates a DataCategory node
func (r *Neo4jRepository) CreateDataCategoryNode(ctx context.Context, dataCategoryID, label string, metadata map[string]interface{}) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MERGE (dc:DataCategory {id: $id})
			SET dc.name = $name,
			    dc.dpdpa_category = $dpdpa_category,
			    dc.requires_consent = $requires_consent,
			    dc.finding_count = $finding_count,
			    dc.avg_confidence = $avg_confidence,
			    dc.risk_level = $risk_level,
			    dc.updated_at = datetime()
			RETURN dc
		`
		params := map[string]interface{}{
			"id":               dataCategoryID,
			"name":             label,
			"dpdpa_category":   metadata["dpdpa_category"],
			"requires_consent": metadata["requires_consent"],
			"finding_count":    metadata["finding_count"],
			"avg_confidence":   metadata["avg_confidence"],
			"risk_level":       metadata["risk_level"],
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	return err
}

// CreatePIITypeNode creates or updates a PIIType node with aggregations
func (r *Neo4jRepository) CreatePIITypeNode(ctx context.Context, piiType string, metadata map[string]interface{}) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MERGE (pii:PIIType {type: $type})
			ON CREATE SET
				pii.count = $count,
				pii.max_risk = $max_risk,
				pii.max_confidence = $max_confidence,
				pii.first_detected = $detected_at,
				pii.last_detected = $detected_at
			ON MATCH SET
				pii.count = pii.count + $count,
				pii.max_risk = CASE
					WHEN $max_risk > pii.max_risk THEN $max_risk
					ELSE pii.max_risk
				END,
				pii.max_confidence = CASE
					WHEN $max_confidence > pii.max_confidence THEN $max_confidence
					ELSE pii.max_confidence
				END,
				pii.last_detected = $detected_at
			RETURN pii
		`
		params := map[string]interface{}{
			"type":           piiType,
			"count":          metadata["count"],
			"max_risk":       metadata["max_risk"],
			"max_confidence": metadata["max_confidence"],
			"detected_at":    time.Now().Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	return err
}

// CreateHierarchyRelationship creates relationships in the 4-level hierarchy
func (r *Neo4jRepository) CreateHierarchyRelationship(ctx context.Context, parentID, childID, relType string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		var query string

		switch relType {
		case "CONTAINS": // System → Asset
			query = `
				MATCH (parent {id: $parentID})
				MATCH (child {id: $childID})
				MERGE (parent)-[r:CONTAINS]->(child)
				RETURN r
			`
		case "HAS_CATEGORY": // Asset → DataCategory
			query = `
				MATCH (asset:Asset {id: $parentID})
				MATCH (cat:DataCategory {id: $childID})
				MERGE (asset)-[r:HAS_CATEGORY]->(cat)
				RETURN r
			`
		case "INCLUDES": // DataCategory → PIIType
			query = `
				MATCH (cat:DataCategory {id: $parentID})
				MATCH (pii:PIIType {type: $childID})
				MERGE (cat)-[r:INCLUDES]->(pii)
				RETURN r
			`
		default:
			return nil, fmt.Errorf("unknown relationship type: %s", relType)
		}

		params := map[string]interface{}{
			"parentID": parentID,
			"childID":  childID,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	return err
}

// GetSemanticGraph retrieves the 4-level hierarchy from Neo4j
func (r *Neo4jRepository) GetSemanticGraph(ctx context.Context, systemFilter, riskFilter string) ([]Node, []Edge, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	nodes := []Node{}
	edges := []Edge{}
	nodeMap := make(map[string]bool)
	edgeMap := make(map[string]bool)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH path = (sys:System)-[:CONTAINS]->(asset:Asset)
			             -[:HAS_CATEGORY]->(cat:DataCategory)
			             -[:INCLUDES]->(pii:PIIType)
			WHERE ($systemFilter IS NULL OR sys.name = $systemFilter)
			  AND ($riskFilter IS NULL OR pii.max_risk = $riskFilter)
			RETURN sys, asset, cat, pii,
			       relationships(path) as rels
			ORDER BY pii.count DESC
			LIMIT 1000
		`
		params := map[string]interface{}{
			"systemFilter": systemFilter,
			"riskFilter":   riskFilter,
		}

		result, err := tx.Run(ctx, query, params)
		if err != nil {
			return nil, err
		}

		records, err := result.Collect(ctx)
		if err != nil {
			return nil, err
		}

		for _, record := range records {
			// Process System node
			if sysVal, ok := record.Get("sys"); ok && sysVal != nil {
				if node, ok := sysVal.(neo4j.Node); ok {
					id, _ := node.Props["id"].(string)
					name, _ := node.Props["name"].(string)
					if id != "" && !nodeMap[id] {
						nodes = append(nodes, Node{
							ID:    id,
							Label: name,
							Type:  "system",
							Metadata: map[string]interface{}{
								"host": node.Props["host"],
							},
						})
						nodeMap[id] = true
					}
				}
			}

			// Process Asset node
			if assetVal, ok := record.Get("asset"); ok && assetVal != nil {
				if node, ok := assetVal.(neo4j.Node); ok {
					id, _ := node.Props["id"].(string)
					name, _ := node.Props["name"].(string)
					if id != "" && !nodeMap[id] {
						nodes = append(nodes, Node{
							ID:    id,
							Label: name,
							Type:  "asset",
							Metadata: map[string]interface{}{
								"path":        node.Props["path"],
								"environment": node.Props["environment"],
							},
						})
						nodeMap[id] = true
					}
				}
			}

			// Process DataCategory node
			if catVal, ok := record.Get("cat"); ok && catVal != nil {
				if node, ok := catVal.(neo4j.Node); ok {
					id, _ := node.Props["id"].(string)
					name, _ := node.Props["name"].(string)
					if id != "" && !nodeMap[id] {
						nodes = append(nodes, Node{
							ID:    id,
							Label: name,
							Type:  "data_category",
							Metadata: map[string]interface{}{
								"finding_count":  node.Props["finding_count"],
								"risk_level":     node.Props["risk_level"],
								"avg_confidence": node.Props["avg_confidence"],
							},
						})
						nodeMap[id] = true
					}
				}
			}

			// Process PIIType node
			if piiVal, ok := record.Get("pii"); ok && piiVal != nil {
				if node, ok := piiVal.(neo4j.Node); ok {
					piiType, _ := node.Props["type"].(string)
					if piiType != "" && !nodeMap[piiType] {
						nodes = append(nodes, Node{
							ID:    piiType,
							Label: piiType,
							Type:  "pii_type",
							Metadata: map[string]interface{}{
								"count":          node.Props["count"],
								"max_risk":       node.Props["max_risk"],
								"max_confidence": node.Props["max_confidence"],
							},
						})
						nodeMap[piiType] = true
					}
				}
			}

			// Process relationships
			if relsVal, ok := record.Get("rels"); ok && relsVal != nil {
				if rels, ok := relsVal.([]interface{}); ok {
					for _, relVal := range rels {
						if rel, ok := relVal.(neo4j.Relationship); ok {
							edgeID := fmt.Sprintf("%d", rel.ElementId)
							if !edgeMap[edgeID] {
								edges = append(edges, Edge{
									ID:     edgeID,
									Source: "", // Would need proper mapping
									Target: "",
									Type:   rel.Type,
									Label:  rel.Type,
								})
								edgeMap[edgeID] = true
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

// GetPIIAggregations returns aggregated PII type statistics
func (r *Neo4jRepository) GetPIIAggregations(ctx context.Context) ([]map[string]interface{}, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (pii:PIIType)
			OPTIONAL MATCH (cat:DataCategory)-[:INCLUDES]->(pii)
			OPTIONAL MATCH (asset:Asset)-[:HAS_CATEGORY]->(cat)
			OPTIONAL MATCH (sys:System)-[:CONTAINS]->(asset)
			RETURN 
			  pii.type as pii_type,
			  pii.count as total_findings,
			  pii.max_risk as risk_level,
			  pii.max_confidence as confidence,
			  COUNT(DISTINCT asset) as affected_assets,
			  COUNT(DISTINCT sys) as affected_systems,
			  COLLECT(DISTINCT cat.name) as categories
			ORDER BY pii.count DESC
		`

		result, err := tx.Run(ctx, query, nil)
		if err != nil {
			return nil, err
		}

		records, err := result.Collect(ctx)
		if err != nil {
			return nil, err
		}

		aggregations := []map[string]interface{}{}
		for _, record := range records {
			agg := map[string]interface{}{
				"pii_type":         record.Values[0],
				"total_findings":   record.Values[1],
				"risk_level":       record.Values[2],
				"confidence":       record.Values[3],
				"affected_assets":  record.Values[4],
				"affected_systems": record.Values[5],
				"categories":       record.Values[6],
			}
			aggregations = append(aggregations, agg)
		}

		return aggregations, nil
	})

	if err != nil {
		return nil, err
	}

	if aggs, ok := result.([]map[string]interface{}); ok {
		return aggs, nil
	}

	return []map[string]interface{}{}, nil
}
