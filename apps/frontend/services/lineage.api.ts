// Neo4j Lineage API - Phase 3 Unified Endpoint
// Updated to use /api/v1/lineage with 4-level hierarchy

// 4-Level Hierarchy Types
export interface SystemNode {
    id: string;
    type: 'system';
    label: string;
    metadata: {
        host?: string;
    };
}

export interface AssetNode {
    id: string;
    type: 'asset';
    label: string;
    metadata: {
        path?: string;
        environment?: string;
    };
}

export interface DataCategoryNode {
    id: string;
    type: 'data_category';
    label: string;
    metadata: {
        finding_count?: number;
        risk_level?: string;
        avg_confidence?: number;
    };
}

export interface PIITypeNode {
    id: string;
    type: 'pii_type';
    label: string;
    metadata: {
        count?: number;
        max_risk?: string;
        max_confidence?: number;
    };
}

export type LineageNode = SystemNode | AssetNode | DataCategoryNode | PIITypeNode;

export interface LineageEdge {
    id: string;
    source: string;
    target: string;
    type: 'CONTAINS' | 'HAS_CATEGORY' | 'INCLUDES';
    metadata?: Record<string, any>;
}

export interface LineageHierarchy {
    nodes: LineageNode[];
    edges: LineageEdge[];
}

export interface PIIAggregation {
    pii_type: string;
    total_findings: number;
    risk_level: string;
    confidence: number;
    affected_assets: number;
    affected_systems: number;
    categories: string[];
}

export interface LineageResponse {
    hierarchy: LineageHierarchy;
    aggregations: {
        by_pii_type: PIIAggregation[];
        total_assets: number;
        total_pii_types: number;
    };
}

// API Functions
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function fetchLineage(
    systemFilter?: string,
    riskFilter?: string
): Promise<LineageResponse> {
    const params = new URLSearchParams();
    if (systemFilter) params.append('system', systemFilter);
    if (riskFilter) params.append('risk', riskFilter);

    const url = `${API_BASE}/api/v1/lineage${params.toString() ? `?${params}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch lineage: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data; // Backend wraps in { status: "success", data: {...} }
}

export async function fetchLineageStats(): Promise<LineageResponse['aggregations']> {
    const url = `${API_BASE}/api/v1/lineage/stats`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    const data = await response.json();
    return data.stats;
}

// Legacy semantic graph endpoint (for backward compatibility)
export async function getSemanticGraph(filters: { system?: string; risk?: string } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.system) params.append('system', filters.system);
    if (filters.risk) params.append('risk', filters.risk);

    const url = `${API_BASE}/api/v1/graph/semantic${params.toString() ? `?${params}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch semantic graph: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
}

// Export as lineageApi for backward compatibility
export const lineageApi = {
    fetchLineage,
    fetchLineageStats,
    getSemanticGraph,
    getLineage: fetchLineage,
};
