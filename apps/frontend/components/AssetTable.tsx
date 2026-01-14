'use client';

import React, { useState } from 'react';
import { Asset } from '@/types';
import { theme } from '@/design-system/theme';

interface AssetTableProps {
    assets: Asset[];
    total: number; // For pagination later
    loading?: boolean;
    onAssetClick: (id: string) => void;
}

export default function AssetTable({ assets, loading, onAssetClick }: AssetTableProps) {
    // Hover state tracking could be implemented, or simple CSS if style tag used. 
    // For simplicity, using inline styles with individual row state logic is unexpected in simple map.
    // Instead we can use a helper component for Row.

    if (loading) {
        return <div style={{ padding: 32, textAlign: 'center', color: theme.colors.text.muted }}>Loading assets...</div>;
    }

    if (assets.length === 0) {
        return (
            <div style={{ padding: 48, textAlign: 'center', border: `1px dashed ${theme.colors.border.default}`, borderRadius: 8 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: theme.colors.text.primary, marginBottom: 8 }}>No Assets Found</h3>
                <p style={{ color: theme.colors.text.secondary }}>Run a scan or adjust filters to see assets.</p>
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto', background: theme.colors.background.card, borderRadius: 12, border: `1px solid ${theme.colors.border.default}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border.default}` }}>
                        <th style={{ padding: 16, textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Asset Name</th>
                        <th style={{ padding: 16, textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Type</th>
                        <th style={{ padding: 16, textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Risk Score</th>
                        <th style={{ padding: 16, textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>System</th>
                        <th style={{ padding: 16, textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Findings</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map((asset) => (
                        <AssetRow key={asset.id} asset={asset} onClick={() => onAssetClick(asset.id)} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AssetRow({ asset, onClick }: { asset: Asset; onClick: () => void }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <tr
            onClick={onClick}
            style={{
                cursor: 'pointer',
                borderBottom: `1px solid ${theme.colors.border.subtle}`,
                backgroundColor: isHovered ? theme.colors.background.secondary : 'transparent',
                transition: 'background-color 0.2s'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <td style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, color: theme.colors.text.primary }}>{asset.name}</div>
                <div style={{ fontSize: 13, color: theme.colors.text.muted, marginTop: 2, fontFamily: 'monospace', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }} title={asset.path}>
                    {asset.path}
                </div>
            </td>
            <td style={{ padding: 16 }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                    borderRadius: 999, fontSize: 12, fontWeight: 500,
                    backgroundColor: theme.colors.background.tertiary,
                    color: theme.colors.text.secondary,
                    border: `1px solid ${theme.colors.border.default}`
                }}>
                    {asset.asset_type}
                </span>
            </td>
            <td style={{ padding: 16 }}>
                <RiskBadge score={asset.risk_score} />
            </td>
            <td style={{ padding: 16, fontSize: 14, color: theme.colors.text.secondary }}>
                {asset.source_system}
            </td>
            <td style={{ padding: 16 }}>
                {asset.total_findings > 0 ? (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                        backgroundColor: `${theme.colors.risk.critical}15`,
                        color: theme.colors.risk.critical
                    }}>
                        ⚠️ {asset.total_findings}
                    </span>
                ) : (
                    <span style={{ color: theme.colors.text.muted, fontSize: 13 }}>Safe</span>
                )}
            </td>
        </tr>
    );
}

function RiskBadge({ score }: { score: number }) {
    const getStyle = (s: number) => {
        if (s >= 90) return { bg: `${theme.colors.risk.critical}15`, text: theme.colors.risk.critical, border: `${theme.colors.risk.critical}40` };
        if (s >= 70) return { bg: `${theme.colors.risk.high}15`, text: theme.colors.risk.high, border: `${theme.colors.risk.high}40` };
        if (s >= 40) return { bg: `${theme.colors.risk.medium}15`, text: theme.colors.risk.medium, border: `${theme.colors.risk.medium}40` };
        return { bg: theme.colors.background.tertiary, text: theme.colors.text.muted, border: theme.colors.border.default };
    };

    const style = getStyle(score);

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '2px 8px', borderRadius: 4, border: `1px solid ${style.border}`,
            fontSize: 12, fontWeight: 700,
            backgroundColor: style.bg, color: style.text
        }}>
            {score}
        </span>
    );
}
