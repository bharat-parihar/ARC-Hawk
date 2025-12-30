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
                tooltip="Total number of data points scanned and identified."
            />

            <Card
                label="Sensitive PII"
                value={sensitivePIICount}
                subtitle="Requires consent & protection"
                color={colors.state.risk}
                tooltip="Personal Identifiable Information requiring strict compliance."
            />

            <Card
                label="High-Risk Assets"
                value={highRiskAssets}
                subtitle="Risk score ≥ 70"
                color={colors.state.warning}
                tooltip="Assets containing high volume or high sensitivity data."
            />

            <Card
                label="Critical Findings"
                value={criticalFindings}
                subtitle="Immediate attention required"
                color={colors.state.risk}
                tooltip="Findings with Critical severity requiring immediate remediation."
            />
        </div>
    );
}

function Card({
    label,
    value,
    subtitle,
    color,
    tooltip,
}: {
    label: string;
    value: number;
    subtitle: string;
    color: string;
    tooltip?: string;
}) {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            title={tooltip} // Native tooltip for simplicity
            style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: theme.borderRadius.xl,
                padding: '24px',
                boxShadow: isHovered ? theme.shadows.lg : theme.shadows.sm,
                transition: 'all 0.2s ease',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                cursor: 'help', // Cursor changed to indicate interactivity
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >


            <div
                style={{
                    fontSize: '11px',
                    color: colors.text.secondary,
                    marginBottom: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: '42px',
                    fontWeight: 900,
                    color: color,
                    lineHeight: 1,
                    marginBottom: '8px',
                    letterSpacing: '-0.03em',
                }}
            >
                {value.toLocaleString()}
            </div>
            <div
                style={{
                    fontSize: '13px',
                    color: colors.text.muted,
                    fontWeight: 600,
                }}
            >
                {subtitle}
            </div>
        </div>
    );
}
