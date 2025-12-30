/**
 * ARC-Hawk Design System - Colors (High Contrast Monochrome)
 *
 * Strict, high-visibility black & white palette.
 * Text is pure black or very dark gray.
 * Backgrounds are white.
 */

// ============================================
// PRIMITIVES
// ============================================

export const neutral = {
    50: '#F9FAFB',  // Very light gray
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D4D4D4', // Distinct border
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#000000', // Pure Black
} as const;

export const brand = {
    primary: '#000000',     // Black Brand (Swiss Style)
    hover: '#333333',       // Dark Gray
} as const;

export const status = {
    success: '#166534',     // Dark Green (High Contrast)
    warning: '#854D0E',     // Dark Amber
    risk: '#991B1B',        // Dark Red
    info: '#1E40AF',        // Dark Blue
} as const;

// ============================================
// SEMANTIC MAPPINGS
// ============================================

export const background = {
    primary: '#FFFFFF',     // Pure White
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    muted: neutral[100],
    card: '#FFFFFF',
} as const;

export const border = {
    default: '#D4D4D4',     // High contrast border
    subtle: '#E5E7EB',
    strong: '#000000',      // Black border for emphasis
} as const;

export const text = {
    primary: '#000000',     // Pure Black
    secondary: '#262626',   // Almost Black
    muted: '#525252',       // Dark Gray (AA Compliant)
    inverse: '#FFFFFF',
} as const;

export const nodeColors = {
    system: '#000000',      // Black
    asset: '#404040',       // Dark Gray
    pii: '#D97706',         // Dark Amber
    sensitive: '#DC2626',   // Red
    category: '#525252',    // Gray
} as const;

// ============================================
// THEME EXPORTS
// ============================================

export const colors = {
    neutral,
    brand,
    status,
    background,
    border,
    text,
    nodeColors,

    // Backward compatibility for existing components
    state: {
        risk: status.risk,
        success: status.success,
        warning: status.warning,
        info: status.info,
    },
    semantic: {
        background,
        border,
        text,
        state: status,
        node: nodeColors,
    },
    // Legacy palettes (kept for build safety, but we should avoid using them directly)
    blue: {
        50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD',
        400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
        800: '#1E40AF', 900: '#1E3A8A'
    },
    red: {
        50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5',
        400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C',
        800: '#991B1B', 900: '#7F1D1D'
    },
    amber: {
        50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D',
        400: '#FBBF24', 500: '#F59E0B', 600: '#D97706', 700: '#B45309',
        800: '#92400E', 900: '#78350F'
    },
    emerald: {
        50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7',
        400: '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857',
        800: '#065F46', 900: '#064E3B'
    },
    indigo: {
        50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 300: '#A5B4FC',
        400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA',
        800: '#3730A3', 900: '#312E81'
    },
    purple: {
        50: '#FAF5FF', 100: '#F3E8FF', 200: '#E9D5FF', 300: '#D8B4FE',
        400: '#C084FC', 500: '#A855F7', 600: '#9333EA', 700: '#7E22CE',
        800: '#6B21A8', 900: '#581C87'
    },
} as const;

export function getNodeColor(type: string, riskScore: number = 0) {
    switch (type) {
        case 'system':
            return { bg: '#F3F4F6', border: '#000000', text: '#000000' };
        case 'asset':
        case 'file':
        case 'table':
            return { bg: '#FFFFFF', border: '#525252', text: '#000000' };
        case 'finding':
            const isRisk = riskScore >= 90;
            return {
                bg: isRisk ? '#FEF2F2' : '#FFFFFF',
                border: isRisk ? status.risk : border.default,
                text: isRisk ? '#991B1B' : '#000000'
            };
        default:
            return { bg: '#F9FAFB', border: border.default, text: '#000000' };
    }
}

export function getEdgeColor(type: string) {
    if (type === 'EXPOSES') return status.risk;
    return '#525252'; // Dark gray edges
}

export default colors;
