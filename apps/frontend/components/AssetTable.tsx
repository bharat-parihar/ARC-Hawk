'use client';

import React from 'react';
import { Asset } from '@/types';
import { colors } from '@/design-system/colors';

interface AssetTableProps {
    assets: Asset[];
    total: number; // For pagination later
    loading?: boolean;
    onAssetClick: (id: string) => void;
}

export default function AssetTable({ assets, loading, onAssetClick }: AssetTableProps) {
    if (loading) {
        return <div style={{ padding: 32, textAlign: 'center', color: colors.text.muted }}>Loading assets...</div>;
    }

    if (assets.length === 0) {
        return (
            <div style={{ padding: 48, textAlign: 'center', border: `1px dashed ${colors.border.default}`, borderRadius: 8 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: colors.text.primary, marginBottom: 8 }}>No Assets Found</h3>
                <p style={{ color: colors.text.secondary }}>Run a scan or adjust filters to see assets.</p>
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto', background: colors.background.surface, borderRadius: 12, border: `1px solid ${colors.border.default}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <table className="table">
                <thead>
                    <tr>
                        <th style={{ padding: 16 }}>Asset Name</th>
                        <th style={{ padding: 16 }}>Type</th>
                        <th style={{ padding: 16 }}>Risk Score</th>
                        <th style={{ padding: 16 }}>System</th>
                        <th style={{ padding: 16 }}>Findings</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map((asset) => (
                        <tr
                            key={asset.id}
                            onClick={() => onAssetClick(asset.id)}
                            style={{ cursor: 'pointer', borderBottom: `1px solid ${colors.border.subtle}` }}
                            className="hover:bg-slate-50 transition-colors"
                        >
                            <td style={{ padding: 16 }}>
                                <div style={{ fontWeight: 600, color: colors.text.primary }}>{asset.name}</div>
                                <div style={{ fontSize: 13, color: colors.text.muted, marginTop: 2, fontFamily: 'monospace', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }} title={asset.path}>
                                    {asset.path}
                                </div>
                            </td>
                            <td style={{ padding: 16 }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                                    borderRadius: 999, fontSize: 12, fontWeight: 500,
                                    backgroundColor: colors.background.muted,
                                    color: colors.text.secondary,
                                    border: `1px solid ${colors.border.default}`
                                }}>
                                    {asset.asset_type}
                                </span>
                            </td>
                            <td style={{ padding: 16 }}>
                                <RiskBadge score={asset.risk_score} />
                            </td>
                            <td style={{ padding: 16, fontSize: 14, color: colors.text.secondary }}>
                                {asset.source_system}
                            </td>
                            <td style={{ padding: 16 }}>
                                {asset.total_findings > 0 ? (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                                        backgroundColor: '#FEF2F2', color: '#B91C1C'
                                    }}>
                                        ⚠️ {asset.total_findings}
                                    </span>
                                ) : (
                                    <span style={{ color: colors.text.muted, fontSize: 13 }}>Safe</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RiskBadge({ score }: { score: number }) {
    let colorClass, bgClass, borderClass;

    const getStyle = (s: number) => {
        if (s >= 90) return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' }; // Red
        if (s >= 70) return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }; // Amber
        if (s >= 40) return { bg: '#FEF9C3', text: '#A16207', border: '#FEF08A' }; // Yellow
        return { bg: colors.background.muted, text: colors.text.secondary, border: colors.border.default };
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
