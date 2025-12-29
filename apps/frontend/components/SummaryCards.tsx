import React from 'react';
import { colors } from '@/design-system/colors';
import { theme } from '@/design-system/themes';

interface SummaryCardsProps {
    totalFindings?: number;
    sensitivePIICount?: number;
    highRiskAssets?: number;
    criticalFindings?: number;
}

export default function SummaryCards({
    totalFindings = 0,
    sensitivePIICount = 0,
    highRiskAssets = 0,
    criticalFindings = 0,
}: SummaryCardsProps) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                marginBottom: '32px',
            }}
        >
            <Card
                label="Total Findings"
                value={totalFindings}
                subtitle="Across all assets"
                color={colors.nodeColors.asset}
            />

            <Card
                label="Sensitive PII"
                value={sensitivePIICount}
                subtitle="Requires consent & protection"
                color={colors.state.risk}
            />

            <Card
                label="High-Risk Assets"
                value={highRiskAssets}
                subtitle="Risk score ≥ 70"
                color={colors.state.warning}
            />

            <Card
                label="Critical Findings"
                value={criticalFindings}
                subtitle="Immediate attention required"
                color={colors.state.risk}
            />
        </div>
    );
}

function Card({
    label,
    value,
    subtitle,
    color,
}: {
    label: string;
    value: number;
    subtitle: string;
    color: string;
}) {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: theme.borderRadius.xl,
                padding: '24px',
                boxShadow: isHovered ? theme.shadows.lg : theme.shadows.sm,
                transition: 'all 0.2s ease',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                cursor: 'default',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                style={{
                    fontSize: theme.fontSize.sm,
                    color: colors.text.secondary,
                    marginBottom: '12px',
                    fontWeight: theme.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: '40px',
                    fontWeight: theme.fontWeight.extrabold,
                    color: color,
                    lineHeight: 1.2,
                    marginBottom: '8px',
                }}
            >
                {value.toLocaleString()}
            </div>
            <div
                style={{
                    fontSize: theme.fontSize.sm,
                    color: colors.text.muted,
                    fontWeight: theme.fontWeight.medium,
                }}
            >
                {subtitle}
            </div>
        </div>
    );
}
