'use client';

import React, { useEffect, useState } from 'react';
import { colors } from '@/design-system/colors';
import { theme } from '@/design-system/themes';
import { assetsApi } from '@/services/assets.api';
import { Asset } from '@/types';
import LoadingState from './LoadingState';

import { BaseNode } from '@/modules/lineage/lineage.types';

interface InfoPanelProps {
    nodeId: string;
    nodeData?: BaseNode;
    onClose: () => void;
}

export default function InfoPanel({ nodeId, nodeData, onClose }: InfoPanelProps) {
    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If it's a System, Classification, or Finding node, we rely on nodeData, NOT the API
        // Findings MIGHT have an API but let's stick to metadata for now to avoid 404s
        const isAsset = nodeData?.type === 'asset' || nodeData?.type === 'file' || nodeData?.type === 'table';

        if (!isAsset) {
            setLoading(false);
            return;
        }

        async function fetchAssetDetails() {
            setLoading(true);
            setError(null);
            try {
                const data = await assetsApi.getAsset(nodeId);
                setAsset(data);
            } catch (err: any) {
                console.error('Error fetching asset:', err);
                // Fallback to nodeData if API fails
                if (nodeData) {
                    console.warn('Falling back to node metadata');
                    setError(null);
                } else {
                    setError(err.message || 'Failed to load asset details');
                }
            } finally {
                setLoading(false);
            }
        }

        fetchAssetDetails();
    }, [nodeId, nodeData]);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    zIndex: theme.zIndex.overlay,
                    backdropFilter: 'blur(2px)',
                }}
            />

            {/* Panel */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '480px',
                    maxWidth: '90vw',
                    backgroundColor: colors.background.surface,
                    boxShadow: theme.shadows['2xl'],
                    zIndex: theme.zIndex.modal,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '24px',
                        borderBottom: `1px solid ${colors.border.default}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: colors.background.elevated,
                    }}
                >
                    <h2
                        style={{
                            fontSize: theme.fontSize.xl,
                            fontWeight: theme.fontWeight.bold,
                            color: colors.text.primary,
                        }}
                    >
                        AssetDetails
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '4px',
                            color: colors.neutral[500],
                            transition: 'color 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = colors.neutral[900];
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = colors.neutral[500];
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '24px',
                    }}
                >
                    {loading && <LoadingState message="Loading asset details..." />}

                    {error && (
                        <div
                            style={{
                                padding: '16px',
                                backgroundColor: colors.red[50],
                                border: `1px solid ${colors.red[200]}`,
                                borderRadius: theme.borderRadius.md,
                                color: colors.red[700],
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Generic Node View (for System, Finding, Classification) */}
                    {!asset && nodeData && !loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <Section title={nodeData.type || 'Node Details'}>
                                <PropertyRow label="Name" value={nodeData.label} />
                                <PropertyRow label="Type" value={nodeData.type} />
                                <PropertyRow label="ID" value={nodeData.id} copyable />
                            </Section>

                            {nodeData.metadata && (
                                <Section title="Metadata">
                                    {Object.entries(nodeData.metadata).map(([key, value]) => (
                                        <PropertyRow
                                            key={key}
                                            label={key.replace(/_/g, ' ')}
                                            value={
                                                typeof value === 'object' && value !== null ? (
                                                    <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace' }}>
                                                        {JSON.stringify(value, null, 2)}
                                                    </pre>
                                                ) : (
                                                    String(value)
                                                )
                                            }
                                        />
                                    ))}
                                </Section>
                            )}

                            {nodeData.risk_score > 0 && (
                                <Section title="Risk Assessment">
                                    <PropertyRow
                                        label="Risk Score"
                                        value={
                                            <div
                                                style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: theme.borderRadius.full,
                                                    backgroundColor:
                                                        nodeData.risk_score >= 80 ? colors.red[100] :
                                                            nodeData.risk_score >= 60 ? colors.amber[100] : colors.emerald[100],
                                                    color:
                                                        nodeData.risk_score >= 80 ? colors.red[700] :
                                                            nodeData.risk_score >= 60 ? colors.amber[700] : colors.emerald[700],
                                                    fontWeight: theme.fontWeight.bold,
                                                }}
                                            >
                                                {nodeData.risk_score}/100
                                            </div>
                                        }
                                    />
                                </Section>
                            )}
                        </div>
                    )}

                    {asset && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Asset Name */}
                            <Section title="Asset">
                                <PropertyRow label="Name" value={asset.name} />
                                <PropertyRow label="Type" value={asset.asset_type} />
                                <PropertyRow
                                    label="Path"
                                    value={asset.path}
                                    highlight
                                    copyable
                                />
                            </Section>

                            {/* Location */}
                            <Section title="Location">
                                <PropertyRow label="Source System" value={asset.source_system} />
                                <PropertyRow label="Data Source" value={asset.data_source} />
                                <PropertyRow label="Host" value={asset.host} />
                                <PropertyRow label="Environment" value={asset.environment} />
                            </Section>

                            {/* Risk & Findings */}
                            <Section title="Risk Assessment">
                                <PropertyRow
                                    label="Risk Score"
                                    value={
                                        <div
                                            style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: theme.borderRadius.full,
                                                backgroundColor:
                                                    asset.risk_score >= 80
                                                        ? colors.red[100]
                                                        : asset.risk_score >= 60
                                                            ? colors.amber[100]
                                                            : colors.emerald[100],
                                                color:
                                                    asset.risk_score >= 80
                                                        ? colors.red[700]
                                                        : asset.risk_score >= 60
                                                            ? colors.amber[700]
                                                            : colors.emerald[700],
                                                fontWeight: theme.fontWeight.bold,
                                            }}
                                        >
                                            {asset.risk_score}/100
                                        </div>
                                    }
                                />
                                <PropertyRow label="Total Findings" value={asset.total_findings} />
                            </Section>

                            {/* Metadata */}
                            {asset.owner && (
                                <Section title="Ownership">
                                    <PropertyRow label="Owner" value={asset.owner} />
                                </Section>
                            )}

                            {/* Timestamps */}
                            <Section title="Metadata">
                                <PropertyRow
                                    label="Created"
                                    value={new Date(asset.created_at).toLocaleString()}
                                />
                                <PropertyRow
                                    label="Last Updated"
                                    value={new Date(asset.updated_at).toLocaleString()}
                                />
                            </Section>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '16px 24px',
                        borderTop: `1px solid ${colors.border.default}`,
                        backgroundColor: colors.neutral[50],
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: colors.blue[600],
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: theme.borderRadius.md,
                            fontSize: theme.fontSize.base,
                            fontWeight: theme.fontWeight.semibold,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.blue[700];
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.blue[600];
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* CSS for slide-in animation */}
            <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
        </>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3
                style={{
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.bold,
                    color: colors.neutral[500],
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '12px',
                }}
            >
                {title}
            </h3>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }}
            >
                {children}
            </div>
        </div>
    );
}

function PropertyRow({
    label,
    value,
    highlight,
    copyable,
}: {
    label: string;
    value: React.ReactNode;
    highlight?: boolean;
    copyable?: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (typeof value === 'string') {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: highlight ? '12px' : '8px 0',
                backgroundColor: highlight ? colors.blue[50] : 'transparent',
                borderRadius: highlight ? theme.borderRadius.md : 0,
                paddingLeft: highlight ? '12px' : 0,
                paddingRight: highlight ? '12px' : 0,
            }}
        >
            <div
                style={{
                    fontSize: theme.fontSize.sm,
                    color: colors.neutral[600],
                    fontWeight: theme.fontWeight.medium,
                    minWidth: '120px',
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: theme.fontSize.sm,
                    color: colors.neutral[900],
                    fontWeight: theme.fontWeight.semibold,
                    textAlign: 'right',
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '8px',
                    wordBreak: 'break-word',
                }}
            >
                {value}
                {copyable && (
                    <button
                        onClick={handleCopy}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '4px',
                        }}
                        title="Copy to clipboard"
                    >
                        {copied ? '✓' : '📋'}
                    </button>
                )}
            </div>
        </div>
    );
}
