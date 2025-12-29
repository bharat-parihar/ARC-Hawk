/**
 * ARC-Hawk Design System - Colors (Balanced Light Theme)
 * 
 * Professional light theme with proper contrast
 * Soft backgrounds, clear text, visible elements
 */

// ============================================
// BALANCED LIGHT THEME
// ============================================

export const background = {
    primary: '#F8FAFC',     // Slate 50 - Soft white background
    surface: '#FFFFFF',     // Pure white - Cards/elevated
    card: '#FFFFFF',        // White cards with shadows
    elevated: '#F1F5F9',    // Slate 100 - Subtle elevation
} as const;

export const border = {
    default: '#CBD5E1',     // Slate 300 - Visible borders
    subtle: '#E2E8F0',      // Slate 200 - Subtle dividers
    strong: '#94A3B8',      // Slate 400 - Strong emphasis
} as const;

export const text = {
    primary: '#0F172A',     // Slate 900 - High contrast text
    secondary: '#475569',   // Slate 600 - Clear secondary
    muted: '#64748B',       // Slate 500 - Readable muted
    inverse: '#FFFFFF',     // White on dark
} as const;

// ============================================
// NODE COLORS
// ============================================

export const nodeColors = {
    system: '#3B82F6',      // Blue 500 - Clear System
    asset: '#6366F1',       // Indigo 500 - Requested Indigo
    pii: '#F59E0B',         // Amber 500 - Requested PII
    sensitive: '#EF4444',   // Red 500 - Requested Sensitive
    category: '#64748B',    // Slate 500 - Generic Category
} as const;

// ============================================
// STATE COLORS
// ============================================

export const state = {
    risk: '#DC2626',        // Red 600
    success: '#059669',     // Emerald 600
    warning: '#D97706',     // Amber 600
    info: '#0284C7',        // Sky 600
} as const;

// ============================================
// BACKWARD COMPATIBILITY
// ============================================

export const neutral = {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
} as const;

export const blue = {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
} as const;

export const red = {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
} as const;

export const amber = {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
} as const;

export const emerald = {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
} as const;

export const purple = {
    50: '#FAF5FF',
    600: '#7C3AED',
} as const;

export const indigo = {
    50: '#EEF2FF',
    500: '#6366F1',
} as const;

// ============================================
// SEMANTIC MAPPINGS
// ============================================

export const semantic = {
    background: {
        primary: background.primary,
        surface: background.surface,
        card: background.card,
        elevated: background.elevated,
    },
    text: {
        primary: text.primary,
        secondary: text.secondary,
        muted: text.muted,
        inverse: text.inverse,
    },
    border: {
        default: border.default,
        subtle: border.subtle,
        strong: border.strong,
    },
    state: {
        risk: state.risk,
        success: state.success,
        warning: state.warning,
        info: state.info,
    },
    node: {
        system: {
            bg: '#EFF6FF',        // Blue 50
            border: nodeColors.system,
            text: '#1E3A8A',      // Blue 900
        },
        asset: {
            bg: '#EEF2FF',        // Indigo 50
            border: nodeColors.asset,
            text: '#312E81',      // Indigo 900
        },
        pii: {
            bg: '#FFFBEB',        // Amber 50
            border: nodeColors.pii,
            text: '#78350F',      // Amber 900
        },
        sensitive: {
            bg: '#FEF2F2',       // Red 50
            border: nodeColors.sensitive,
            text: '#7F1D1D',     // Red 900
        },
        dataCategory: {
            bg: '#F8FAFC',        // Slate 50
            border: nodeColors.category,
            text: '#475569',      // Slate 600
        },
        finding: {
            bg: background.surface,
            border: border.default,
            text: text.primary,
        },
        findingCritical: {
            bg: '#FEF2F2',        // Red 50
            border: state.risk,
            text: '#7F1D1D',      // Red 900
        },
    },
    edge: {
        default: '#94A3B8',                // Slate 400 - Visible
        highlight: nodeColors.system,
        critical: state.risk,
        classification: state.success,
    },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getNodeColor(type: string, riskScore: number = 0) {
    switch (type) {
        case 'system':
            return semantic.node.system;
        case 'asset':
        case 'file':
        case 'table':
            return semantic.node.asset;
        case 'data_category':
        case 'category':
            return semantic.node.dataCategory;
        case 'finding':
            return riskScore >= 90
                ? semantic.node.findingCritical
                : semantic.node.finding;
        default:
            return semantic.node.finding;
    }
}

export function getEdgeColor(edgeType: string) {
    switch (edgeType) {
        case 'EXPOSES':
        case 'CRITICAL':
            return semantic.edge.critical;
        case 'CLASSIFIED_AS':
        case 'CLASSIFICATION':
            return semantic.edge.classification;
        case 'CONTAINS':
        case 'HAS':
        default:
            return semantic.edge.default;
    }
}

// ============================================
// EXPORTS
// ============================================

export const colors = {
    background,
    border,
    text,
    nodeColors,
    state,
    semantic,
    // Backward compatibility
    neutral,
    blue,
    red,
    amber,
    emerald,
    purple,
    indigo,
} as const;

export default colors;
