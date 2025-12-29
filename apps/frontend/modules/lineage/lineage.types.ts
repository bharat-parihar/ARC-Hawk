/**
 * Lineage Module Type Definitions
 */

// ============================================
// NODE TYPES
// ============================================

export type NodeType = 'system' | 'asset' | 'file' | 'table' | 'data_category' | 'category' | 'finding' | 'classification';

export interface BaseNode {
    id: string;
    label: string;
    type: NodeType;
    risk_score: number;
    metadata: Record<string, any>;
    parent_id?: string;
}

export interface NodeData extends BaseNode {
    expanded: boolean;
    childCount?: number;
    onExpand?: () => void;
}

// ============================================
// EDGE TYPES
// ============================================

export type EdgeType =
    | 'CONTAINS'
    | 'HAS'
    | 'EXPOSES'
    | 'CLASSIFIED_AS'
    | 'FLOWS_TO'
    | 'DEPENDS_ON';

export interface BaseEdge {
    id: string;
    source: string;
    target: string;
    type: EdgeType;
    label: string;
}

// ============================================
// GRAPH STRUCTURES
// ============================================

export interface LineageGraph {
    nodes: BaseNode[];
    edges: BaseEdge[];
}

// ============================================
// FILTERS
// ============================================

export interface LineageFilters {
    source?: string;
    severity?: string;
    data_type?: string;
    asset_id?: string;
    level?: string;
    system?: string;      // For sidebar filter
    category?: string;    // For sidebar filter
}

export interface SemanticGraphFilters {
    system_id?: string;
    risk_level?: string;
    category?: string;
}

// ============================================
// LAYOUT CONFIGURATION (STRICT)
// ============================================

export interface LayoutConfig {
    rankdir: 'LR' | 'TB' | 'RL' | 'BT';
    nodesep: number;
    ranksep: number;
    edgesep: number;
    marginx: number;
    marginy: number;
}

// STRICT: Horizontal hierarchy to prevent vertical stacking
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    rankdir: 'LR',      // Left-to-Right (horizontal flow)
    nodesep: 200,       // Increased vertical spacing to prevent overlap
    ranksep: 250,       // Increased horizontal spacing for clearer flow
    edgesep: 80,        // Increased edge separation
    marginx: 100,       // Canvas margin horizontal
    marginy: 100,       // Canvas margin vertical
};

// ============================================
// PERFORMANCE LIMITS
// ============================================

export const PERFORMANCE_LIMITS = {
    MAX_VISIBLE_NODES: 100,
    MAX_CHILDREN_PER_EXPAND: 50,
    ZOOM_DETAIL_THRESHOLD: 0.75,
    AUTO_COLLAPSE_THRESHOLD: 30,
} as const;
