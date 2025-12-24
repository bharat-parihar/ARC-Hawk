import React from 'react';

interface InspectorPanelProps {
    node: any;
    onClose: () => void;
}

export default function InspectorPanel({ node, onClose }: InspectorPanelProps) {
    if (!node) return null;

    const { type, label, risk_score, metadata } = node.data;

    return (
        <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            bottom: 16,
            width: 320,
            background: 'white',
            borderRadius: 12,
            boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start'
            }}>
                <div>
                    <div style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: '#64748b',
                        marginBottom: 4
                    }}>
                        {type}
                    </div>
                    <div style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.2
                    }}>
                        {label}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: 20,
                        cursor: 'pointer',
                        color: '#94a3b8'
                    }}
                >
                    ×
                </button>
            </div>

            {/* Risk Badge */}
            {risk_score > 0 && (
                <div style={{
                    padding: '12px 20px',
                    background: risk_score >= 80 ? '#fef2f2' : '#fff7ed',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <div style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: risk_score >= 80 ? '#dc2626' : '#ea580c'
                    }}>
                        {risk_score}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: risk_score >= 80 ? '#991b1b' : '#9a3412' }}>
                            {risk_score >= 80 ? 'CRITICAL RISK' : 'HIGH RISK'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                            Requires Immediate Review
                        </div>
                    </div>
                </div>
            )}

            {/* Content Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

                {/* Findings Specific */}
                {type === 'finding' && (
                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12 }}>Detection Logic</h4>

                        <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>PATTERN NAME</div>
                            <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{metadata?.pattern}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>MATCHES</div>
                                <div style={{ fontWeight: 600 }}>{metadata?.matches_count}</div>
                            </div>
                            <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>CONFIDENCE</div>
                                <div style={{ fontWeight: 600 }}>{(metadata?.confidence * 100).toFixed(0)}%</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Classification Specific */}
                {type === 'classification' && (
                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12 }}>Compliance</h4>

                        <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: '#166534', marginBottom: 4 }}>LEGAL CATEGORY</div>
                            <div style={{ fontWeight: 600, color: '#14532d' }}>{metadata?.dpdpa_category}</div>
                        </div>

                        <div style={{ background: '#fffbeb', padding: 12, borderRadius: 8, border: '1px solid #fde68a' }}>
                            <div style={{ fontSize: 11, color: '#92400e', marginBottom: 4 }}>CONSENT REQUIREMENT</div>
                            <div style={{ fontWeight: 600, color: '#78350f' }}>
                                {metadata?.requires_consent ? 'Explicit Consent Required' : 'Not Required'}
                            </div>
                        </div>
                    </div>
                )}

                {/* General Metadata */}
                <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12 }}>Asset Context</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                    <ContextItem label="Environment" value={metadata?.environment} />
                    <ContextItem label="Owner" value={metadata?.owner} />
                    <ContextItem label="Source System" value={metadata?.source_system} />
                    <ContextItem label="Data Source" value={metadata?.data_source} />
                    <ContextItem label="Path" value={metadata?.path} monospace />
                </div>

            </div>

            {/* Footer Actions */}
            <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
                <button style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                }}>
                    Open Source
                </button>
                <button style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0f172a',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                }}>
                    Details Page
                </button>
            </div>
        </div>
    );
}

function ContextItem({ label, value, monospace }: { label: string, value: string, monospace?: boolean }) {
    if (!value) return null;
    return (
        <div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
            <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#334155',
                fontFamily: monospace ? 'monospace' : 'inherit',
                wordBreak: 'break-all'
            }}>
                {value}
            </div>
        </div>
    );
}
