// Lineage Graph Types - Phase 3: 4-Level Hierarchy

export type NodeType = 'system' | 'asset' | 'data_category' | 'pii_type';

export interface BaseNode {
    id: string;
    label: string;
    type: NodeType;
    metadata: Record<string, any>;
}

export interface SystemNode extends BaseNode {
    type: 'system';
    metadata: {
        host?: string;
    };
}

export interface AssetNode extends BaseNode {
    type: 'asset';
    metadata: {
        path?: string;
        environment?: string;
        risk_score?: number;
    };
}

export interface DataCategoryNode extends BaseNode {
    type: 'data_category';
    metadata: {
        finding_count?: number;
        risk_level?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        avg_confidence?: number;
    };
}

export interface PIITypeNode extends BaseNode {
    type: 'pii_type';
    metadata: {
        count?: number;
        max_risk?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        max_confidence?: number;
    };
}

export type LineageNode = SystemNode | AssetNode | DataCategoryNode | PIITypeNode;

export interface LineageEdge {
    id: string;
    source: string;
    target: string;
    type: 'CONTAINS' | 'HAS_CATEGORY' | 'INCLUDES';
    label?: string;
    metadata?: Record<string, any>;
}

export interface LineageGraphData {
    nodes: LineageNode[];
    edges: LineageEdge[];
}

// Visual layout configuration
export const NODE_COLORS: Record<NodeType, string> = {
    system: '#3b82f6',      // Blue
    asset: '#10b981',       // Green
    data_category: '#f59e0b', // Orange
    pii_type: '#ef4444',    // Red
};

export const NODE_SIZES: Record<NodeType, number> = {
    system: 60,
    asset: 50,
    data_category: 45,
    pii_type: 40,
};

// Risk level colors
export const RISK_COLORS = {
    CRITICAL: '#dc2626',
    HIGH: '#f97316',
    MEDIUM: '#fbbf24',
    LOW: '#4ade80',
};
