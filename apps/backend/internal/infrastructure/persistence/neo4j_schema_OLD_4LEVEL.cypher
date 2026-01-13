-- Neo4j Schema for ARC-Hawk Semantic Lineage
-- 4-Level Hierarchy: System → Asset → DataCategory → PIIType
-- ============================================================

-- Performance Indexes
-- ============================================================
CREATE INDEX system_name IF NOT EXISTS FOR (s:System) ON (s.name);
CREATE INDEX asset_path IF NOT EXISTS FOR (a:Asset) ON (a.path);
CREATE INDEX category_name IF NOT EXISTS FOR (c:DataCategory) ON (c.name);
CREATE INDEX pii_type IF NOT EXISTS FOR (p:PIIType) ON (p.type);

-- Uniqueness Constraints
-- ============================================================
CREATE CONSTRAINT system_unique IF NOT EXISTS FOR (s:System) REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT asset_unique IF NOT EXISTS FOR (a:Asset) REQUIRE a.path IS UNIQUE;
CREATE CONSTRAINT pii_type_unique IF NOT EXISTS FOR (p:PIIType) REQUIRE p.type IS UNIQUE;

-- Node Labels
-- ============================================================
-- System: Represents a host/machine/environment
-- Asset: Represents files, databases, tables, etc.
-- DataCategory: Represents classification type (e.g., "Sensitive Personal Data")
-- PIIType: Represents specific PII types (e.g., "IN_AADHAAR", "CREDIT_CARD")

-- Relationship Types
-- ============================================================
-- CONTAINS: System → Asset
-- HAS_CATEGORY: Asset → DataCategory  
-- INCLUDES: DataCategory → PIIType

-- Sample Query: Create Full Hierarchy
-- ============================================================
-- MERGE (sys:System {name: $system_name})
-- ON CREATE SET sys.type = $system_type, sys.owner = $owner
--
-- MERGE (asset:Asset {path: $asset_path})
-- ON CREATE SET asset.type = $asset_type, asset.environment = $environment
--
-- MERGE (cat:DataCategory {name: $category_name})
-- ON CREATE SET cat.dpdpa_category = $dpdpa, cat.requires_consent = $consent
--
-- MERGE (pii:PIIType {type: $pii_type})
-- ON CREATE SET pii.count = 0, pii.max_risk = 'LOW'
-- ON MATCH SET 
--   pii.count = pii.count + 1,
--   pii.max_risk = CASE WHEN $risk > pii.max_risk THEN $risk ELSE pii.max_risk END
--
-- MERGE (sys)-[:CONTAINS]->(asset)
-- MERGE (asset)-[:HAS_CATEGORY]->(cat)
-- MERGE (cat)-[:INCLUDES]->(pii)

-- Sample Query: Get Full Hierarchy
-- ============================================================
-- MATCH path = (sys:System)-[:CONTAINS]->(asset:Asset)
--              -[:HAS_CATEGORY]->(cat:DataCategory)
--              -[:INCLUDES]->(pii:PIIType)
-- WHERE ($system_filter IS NULL OR sys.name = $system_filter)
--   AND ($pii_filter IS NULL OR pii.type IN $pii_filter)
--   AND ($risk_filter IS NULL OR pii.max_risk = $risk_filter)
-- RETURN sys, asset, cat, pii
-- ORDER BY pii.count DESC
-- LIMIT 1000

-- Sample Query: Aggregate by PII Type
-- ============================================================
-- MATCH (pii:PIIType)
-- OPTIONAL MATCH (cat:DataCategory)-[:INCLUDES]->(pii)
-- OPTIONAL MATCH (asset:Asset)-[:HAS_CATEGORY]->(cat)
-- OPTIONAL MATCH (sys:System)-[:CONTAINS]->(asset)
-- RETURN 
--   pii.type as pii_type,
--   pii.count as total_findings,
--   pii.max_risk as risk_level,
--   pii.max_confidence as confidence,
--   COUNT(DISTINCT asset) as affected_assets,
--   COUNT(DISTINCT sys) as affected_systems,
--   COLLECT(DISTINCT cat.name) as categories
-- ORDER BY pii.count DESC

-- Sample Query: Get Risk Summary
-- ============================================================
-- MATCH (pii:PIIType)
-- RETURN 
--   pii.max_risk as risk_level,
--   COUNT(*) as type_count,
--   SUM(pii.count) as total_findings
-- ORDER BY risk_level DESC

-- Cleanup Query (Development Only)
-- ============================================================
-- MATCH (n)
-- DETACH DELETE n
