'use client';

import React from 'react';
import { colors } from '@/design-system/colors';
import { theme } from '@/design-system/themes';

interface TopbarProps {
    environment?: string;
    scanTime?: string;
    riskScore?: number;
    onSearch?: (query: string) => void;
}

export default function Topbar({
    environment = 'Production',
    scanTime,
    riskScore = 0,
    onSearch,
}: TopbarProps) {
    const getRiskLevel = (score: number) => {
        if (score >= 80) return { label: 'Critical', color: colors.red[500], bg: colors.red[50] };
        if (score >= 60) return { label: 'High', color: colors.amber[600], bg: colors.amber[50] };
        if (score >= 40) return { label: 'Medium', color: colors.amber[500], bg: colors.amber[50] };
        return { label: 'Low', color: colors.emerald[600], bg: colors.emerald[50] };
    };

    const risk = getRiskLevel(riskScore);

    return (
        <header
            style={{
                height: '72px',
                backgroundColor: colors.background.surface,
                borderBottom: `1px solid ${colors.border.default}`,
                position: 'sticky',
                top: 0,
                zIndex: theme.zIndex.sticky,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 32px',
                boxShadow: theme.shadows.sm,
            }}
        >
            {/* Left section - Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <h1
                    style={{
                        fontSize: theme.fontSize['2xl'],
                        fontWeight: theme.fontWeight.extrabold,
                        color: colors.text.primary,
                        letterSpacing: '-0.02em',
                    }}
                >
                    Data Lineage & Classification
                </h1>
            </div>

            {/* Right section - Metadata */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Environment Badge */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        backgroundColor: environment === 'Production' ? colors.red[50] : colors.blue[50],
                        borderRadius: theme.borderRadius.full,
                        border: `1px solid ${environment === 'Production' ? colors.red[200] : colors.blue[200]}`,
                    }}
                >
                    <div
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: environment === 'Production' ? colors.red[500] : colors.blue[500],
                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        }}
                    />
                    <span
                        style={{
                            fontSize: theme.fontSize.sm,
                            fontWeight: theme.fontWeight.semibold,
                            color: environment === 'Production' ? colors.red[700] : colors.blue[700],
                        }}
                    >
                        {environment}
                    </span>
                </div>

                {/* Scan Time */}
                {scanTime && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                        }}
                    >
                        <div style={{
                            fontSize: theme.fontSize.xs,
                            color: colors.neutral[500],
                            fontWeight: theme.fontWeight.medium,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            Last Scan
                        </div>
                        <div
                            style={{
                                fontSize: theme.fontSize.sm,
                                color: colors.neutral[700],
                                fontWeight: theme.fontWeight.semibold,
                            }}
                            suppressHydrationWarning
                        >
                            {new Date(scanTime).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </div>
                    </div>
                )}

                {/* Risk Score */}
                {riskScore > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '8px 20px',
                            backgroundColor: risk.bg,
                            borderRadius: theme.borderRadius.lg,
                            border: `2px solid ${risk.color}`,
                            minWidth: '100px',
                        }}
                    >
                        <div style={{
                            fontSize: theme.fontSize.xs,
                            color: colors.neutral[600],
                            fontWeight: theme.fontWeight.bold,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '2px',
                        }}>
                            Risk
                        </div>
                        <div
                            style={{
                                fontSize: theme.fontSize.xl,
                                color: risk.color,
                                fontWeight: theme.fontWeight.extrabold,
                                lineHeight: 1,
                            }}
                        >
                            {riskScore}
                        </div>
                        <div style={{
                            fontSize: theme.fontSize.xs,
                            color: risk.color,
                            fontWeight: theme.fontWeight.semibold,
                            marginTop: '2px',
                        }}>
                            {risk.label}
                        </div>
                    </div>
                )}

                {/* Global Search */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            left: '12px',
                            fontSize: '16px',
                            pointerEvents: 'none',
                        }}
                    >
                        🔍
                    </span>
                    <input
                        type="text"
                        placeholder="Search assets..."
                        onChange={(e) => onSearch && onSearch(e.target.value)}
                        style={{
                            padding: '10px 16px 10px 40px',
                            backgroundColor: colors.neutral[50],
                            border: `1px solid ${colors.neutral[300]}`,
                            borderRadius: theme.borderRadius.md,
                            fontSize: theme.fontSize.sm,
                            color: colors.neutral[900],
                            minWidth: '240px',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = colors.blue[500];
                            e.target.style.boxShadow = `0 0 0 2px ${colors.blue[100]}`;
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = colors.neutral[300];
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>
            </div>

            {/* CSS for pulse animation */}
            <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
        </header>
    );
}
