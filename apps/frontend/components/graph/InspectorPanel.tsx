import React from 'react';

interface InspectorPanelProps {
    node: any;
    onClose: () => void;
}

const getClassificationState = (confidence: number) => {
    if (confidence >= 0.90) return { label: 'Confirmed PII', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' };
    if (confidence >= 0.70) return { label: 'High Confidence PII', bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' };
    return { label: 'Needs Review', bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
};

const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 0.90) return '#10b981'; // Green
    if (confidence >= 0.70) return '#3b82f6'; // Blue
    return '#f59e0b'; // Amber
};

export default function InspectorPanel({ node, onClose }: InspectorPanelProps) {
    if (!node) return null;

    const { type, label, risk_score, metadata } = node.data;
    const isFinding = type === 'finding';
    const isClassification = type === 'classification';
    const hasPIIData = isFinding && metadata?.classification;

    const confidence = metadata?.confidence || 0;
    const classificationState = confidence > 0 ? getClassificationState(confidence) : null;
    const signals = metadata?.signals || {};

    return (
        <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            bottom: 16,
            width: 360,
            background: 'white',
            borderRadius: 12,
            boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: '#94a3b8',
                        letterSpacing: '0.05em'
                    }}>
                        {type}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: 24,
                            cursor: 'pointer',
                            color: '#cbd5e1',
                            lineHeight: 1,
                            padding: 0
                        }}
                    >
                        ×
                    </button>
                </div>
                <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.2,
                    marginBottom: 12
                }}>
                    {label}
                </div>

                {/* Classification State Badge */}
                {classificationState && (
                    <div style={{
                        display: 'inline-flex',
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: classificationState.bg,
                        border: `1px solid ${classificationState.border}`,
                        fontSize: 11,
                        fontWeight: 700,
                        color: classificationState.text
                    }}>
                        {classificationState.label}
                    </div>
                )}
            </div>

            {/* Content Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

                {/* Classification Explainability Section */}
                {isFinding && hasPIIData && (
                    <>
                        <SectionTitle>Why This Is Classified</SectionTitle>

                        {/* Pattern Match */}
                        <InfoBox>
                            <Label>Pattern Detected</Label>
                            <ValueMono>{metadata?.pattern || 'Unknown'}</ValueMono>
                        </InfoBox>

                        {/* Confidence Score with Visual Bar */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Label>Confidence Score</Label>
                                <span style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: getConfidenceBarColor(confidence)
                                }}>
                                    {Math.round(confidence * 100)}%
                                </span>
                            </div>
                            <div style={{
                                height: 8,
                                background: '#f1f5f9',
                                borderRadius: 4,
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${confidence * 100}%`,
                                    background: getConfidenceBarColor(confidence),
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>

                        {/* Signals/Evidence */}
                        <div style={{ marginBottom: 20 }}>
                            <Label style={{ marginBottom: 12 }}>Detection Signals</Label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {signals.pattern_match && (
                                    <Signal icon="✓" text="Pattern match detected" positive />
                                )}
                                {signals.context_match && (
                                    <Signal
                                        icon="✓"
                                        text={`Context: ${signals.context_keyword || 'relevant path'}`}
                                        positive
                                    />
                                )}
                                {signals.column_signal && (
                                    <Signal icon="✓" text="Column name indicates PII" positive />
                                )}
                                {signals.is_test_data && (
                                    <Signal icon="⚠" text="Test data detected" warning />
                                )}
                            </div>
                        </div>

                        {/* Justification */}
                        {metadata?.justification && (
                            <InfoBox>
                                <Label>Classification Logic</Label>
                                <Value>{metadata.justification}</Value>
                            </InfoBox>
                        )}

                        {/* Match Evidence */}
                        {metadata?.matches_count && (
                            <div style={{ marginBottom: 20 }}>
                                <Label>Evidence</Label>
                                <div style={{
                                    background: '#f8fafc',
                                    padding: 12,
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    marginTop: 8
                                }}>
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                                        <strong>{metadata.matches_count}</strong> matches found
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                        Sample: [redacted for security]
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Classification Compliance Info */}
                {(isClassification || (isFinding && metadata?.classification)) && (
                    <>
                        <SectionTitle>Compliance</SectionTitle>

                        {metadata?.dpdpa_category && (
                            <InfoBox>
                                <Label>Legal Category (DPDPA)</Label>
                                <Value>{metadata.dpdpa_category}</Value>
                            </InfoBox>
                        )}

                        <InfoBox>
                            <Label>Consent Requirement</Label>
                            <Value>
                                {metadata?.requires_consent ? (
                                    <span style={{ color: '#b91c1c' }}>✓ Explicit Consent Required</span>
                                ) : (
                                    <span style={{ color: '#15803d' }}>Not Required</span>
                                )}
                            </Value>
                        </InfoBox>
                    </>
                )}

                {/* Asset Context */}
                <SectionTitle>Asset Context</SectionTitle>
                <div style={{ display: 'grid', gap: 12 }}>
                    <ContextItem label="Environment" value={metadata?.environment} />
                    <ContextItem label="Owner" value={metadata?.owner} />
                    <ContextItem label="Source System" value={metadata?.source_system} />
                    <ContextItem label="Data Source" value={metadata?.data_source} />
                    <ContextItem label="Path" value={metadata?.path} monospace />
                    {isFinding && metadata?.severity && (
                        <ContextItem label="Severity" value={metadata.severity} />
                    )}
                </div>

            </div>

            {/* Footer Actions */}
            <div style={{
                padding: 16,
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: 8,
                background: '#fafbfc'
            }}>
                <button style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569',
                    transition: 'all 0.15s ease'
                }}>
                    View Details
                </button>
            </div>
        </div>
    );
}

// Helper Components
function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h4 style={{
            fontSize: 12,
            textTransform: 'uppercase',
            color: '#94a3b8',
            marginBottom: 12,
            marginTop: 24,
            fontWeight: 700,
            letterSpacing: '0.05em'
        }}>
            {children}
        </h4>
    );
}

function InfoBox({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            background: '#f8fafc',
            padding: 12,
            borderRadius: 6,
            marginBottom: 12,
            border: '1px solid #e2e8f0'
        }}>
            {children}
        </div>
    );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{
            fontSize: 11,
            color: '#64748b',
            marginBottom: 4,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            ...style
        }}>
            {children}
        </div>
    );
}

function Value({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#0f172a'
        }}>
            {children}
        </div>
    );
}

function ValueMono({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#0f172a',
            fontFamily: 'monospace',
            background: '#ffffff',
            padding: '6px 8px',
            borderRadius: 4,
            border: '1px solid #e2e8f0'
        }}>
            {children}
        </div>
    );
}

function Signal({ icon, text, positive, warning }: { icon: string; text: string; positive?: boolean; warning?: boolean }) {
    const color = positive ? '#15803d' : warning ? '#b45309' : '#64748b';
    const bg = positive ? '#f0fdf4' : warning ? '#fffbeb' : '#f8fafc';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            background: bg,
            borderRadius: 6,
            fontSize: 12,
            color
        }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{icon}</span>
            <span style={{ fontWeight: 500 }}>{text}</span>
        </div>
    );
}

function ContextItem({ label, value, monospace }: { label: string; value?: string; monospace?: boolean }) {
    if (!value) return null;
    return (
        <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
                {label}
            </div>
            <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#334155',
                fontFamily: monospace ? 'monospace' : 'inherit',
                wordBreak: 'break-all',
                lineHeight: 1.4
            }}>
                {value}
            </div>
        </div>
    );
}
