export const theme = {
    colors: {
        // Backgrounds - Dark Enterprise Theme
        background: {
            primary: '#0F172A',   // Slate 900
            secondary: '#1E293B', // Slate 800
            tertiary: '#334155',  // Slate 700
            card: '#1E293B',
            overlay: 'rgba(15, 23, 42, 0.8)',
        },

        // Text
        text: {
            primary: '#F8FAFC',   // Slate 50
            secondary: '#CBD5E1', // Slate 300
            tertiary: '#94A3B8',  // Slate 400
            muted: '#64748B',     // Slate 500
            inverse: '#0F172A',
        },

        // Risk Levels (MANDATORY: Risk-First Color Language)
        risk: {
            critical: '#DC2626', // Red 600
            high: '#EA580C',     // Orange 600
            medium: '#EAB308',   // Yellow 500
            low: '#10B981',      // Emerald 500
            info: '#3B82F6',     // Blue 500
            none: '#64748B',     // Slate 500
        },

        // Brand / Interactive
        primary: {
            DEFAULT: '#3B82F6', // Blue 500
            hover: '#2563EB',   // Blue 600
            active: '#1D4ED8',  // Blue 700
            text: '#FFFFFF',
        },

        // Borders
        border: {
            default: '#334155', // Slate 700
            active: '#475569',  // Slate 600
            subtle: '#1E293B',  // Slate 800
        },

        // Status
        status: {
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
            info: '#3B82F6',
        },
    },

    // Spacing & Layout
    layout: {
        sidebarWidth: '280px',
        headerHeight: '64px',
        containerMaxWidth: '1440px',
    },

    // Typography
    fonts: {
        sans: 'Inter, system-ui, sans-serif',
        mono: 'Fira Code, monospace',
    },
};

// Helper for risk colors
export const getRiskColor = (riskLevel: string) => {
    const level = riskLevel?.toLowerCase();
    switch (level) {
        case 'critical': return theme.colors.risk.critical;
        case 'high': return theme.colors.risk.high;
        case 'medium': return theme.colors.risk.medium;
        case 'low': return theme.colors.risk.low;
        case 'info': return theme.colors.risk.info;
        default: return theme.colors.risk.none;
    }
};

// Start Risk Badge Component Styles
export const riskBadgeStyles = {
    critical: 'bg-red-900/30 text-red-400 border-red-800',
    high: 'bg-orange-900/30 text-orange-400 border-orange-800',
    medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    low: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
    info: 'bg-blue-900/30 text-blue-400 border-blue-800',
    default: 'bg-slate-800 text-slate-400 border-slate-700',
};
