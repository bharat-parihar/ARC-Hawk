import React from 'react';
import { Handle, Position } from 'reactflow';

interface SemanticNodeProps {
    data: {
        label: string;
        type: string;
        risk_score: number;
        metadata: any;
        expanded?: boolean;
        onExpand?: () => void;
    };
    id: string;
}

type NodeStyle = {
    bg: string;
    border: string;
    text: string;
    icon: string;
    headerBg?: string;
    fontSize: number;
    fontWeight: number;
};

const getNodeStyle = (type: string, risk: number): NodeStyle => {
    // NEUTRAL-FIRST: All nodes start as muted gray
    // Color is added ONLY for semantic meaning

    if (type === 'system') {
        return {
            bg: '#f8fafc',
            border: '#cbd5e1',
            text: '#475569',
            icon: '🏢',
            headerBg: '#e2e8f0',
            fontSize: 14,
            fontWeight: 700
        };
    }

    if (type === 'data_source') {
        return {
            bg: '#f1f5f9',
            border: '#cbd5e1',
            text: '#475569',
            icon: '📁',
            fontSize: 13,
            fontWeight: 600
        };
    }

    if (type === 'asset' || type === 'table' || type === 'file') {
        return {
            bg: '#ffffff',
            border: '#e2e8f0',
            text: '#0f172a',
            icon: '📦',
            fontSize: 13,
            fontWeight: 600
        };
    }

    if (type === 'field' || type === 'column') {
        return {
            bg: '#ffffff',
            border: '#e2e8f0',
            text: '#64748b',
            icon: '📝',
            fontSize: 12,
            fontWeight: 500
        };
    }

    if (type === 'finding') {
        // Only use red border if CRITICAL
        const isCritical = risk >= 90;
        return {
            bg: '#ffffff',
            border: isCritical ? '#ef4444' : '#e2e8f0',
            text: '#0f172a',
            icon: '🔍',
            fontSize: 12,
            fontWeight: 600
        };
    }

    if (type === 'classification') {
        return {
            bg: '#ffffff',
            border: '#e2e8f0',
            text: '#475569',
            icon: '🏷️',
            fontSize: 11,
            fontWeight: 500
        };
    }

    // Default
    return {
        bg: '#ffffff',
        border: '#e2e8f0',
        text: '#475569',
        icon: '📄',
        fontSize: 13,
        fontWeight: 500
    };
};

const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.90) return { bg: '#f0fdf4', text: '#15803d', label: 'Confirmed' };
    if (confidence >= 0.70) return { bg: '#f0f9ff', text: '#0369a1', label: 'High Confidence' };
    return { bg: '#fffbeb', text: '#b45309', label: 'Needs Review' };
};

export default function SemanticNode({ data, id }: SemanticNodeProps) {
    const { label, type, risk_score, metadata, expanded, onExpand } = data;
    const styles = getNodeStyle(type, risk_score);

    const showExpandControl = (type === 'asset' || type === 'system' || type === 'table' || type === 'file');
    const isCollapsible = showExpandControl;

    return (
        <div style={{
            background: styles.bg,
            border: `1px solid ${styles.border}`,
            borderRadius: 8,
            minWidth: type === 'system' ? 240 : 200,
            maxWidth: 280,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
            transition: 'all 0.2s ease'
        }}>
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#94a3b8', width: 8, height: 8 }}
            />

            {/* Header */}
            <div style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${styles.border}`,
                background: styles.headerBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{styles.icon}</span>
                    <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: styles.text,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {type}
                    </span>
                </div>

                {/* Show confidence badge for findings only */}
                {type === 'finding' && metadata?.confidence && (
                    <div style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: getConfidenceBadgeColor(metadata.confidence).text,
                        background: getConfidenceBadgeColor(metadata.confidence).bg,
                        padding: '2px 6px',
                        borderRadius: 4
                    }}>
                        {Math.round(metadata.confidence * 100)}%
                    </div>
                )}
            </div>

            {/* Body */}
            <div style={{ padding: '10px 12px' }}>
                <div style={{
                    fontWeight: styles.fontWeight,
                    fontSize: styles.fontSize,
                    color: '#0f172a',
                    marginBottom: 4,
                    wordBreak: 'break-word',
                    lineHeight: 1.3
                }}>
                    {label}
                </div>

                {/* Minimal Context */}
                {metadata?.environment && type !== 'finding' && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                        {metadata.environment}
                    </div>
                )}

                {/* Finding-specific metadata */}
                {type === 'finding' && metadata?.severity && (
                    <div style={{
                        fontSize: 10,
                        color: '#64748b',
                        marginTop: 4,
                        display: 'flex',
                        gap: 8
                    }}>
                        <span>{metadata.severity}</span>
                        {metadata.matches_count && <span>• {metadata.matches_count} matches</span>}
                    </div>
                )}

                {/* Expansion Control */}
                {isCollapsible && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpand && onExpand();
                        }}
                        style={{
                            marginTop: 8,
                            width: '100%',
                            padding: '6px 8px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 4,
                            fontSize: 11,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            fontWeight: 600,
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        <span style={{ fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
                        {expanded ? 'Collapse' : 'Expand'}
                    </button>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                style={{ background: '#94a3b8', width: 8, height: 8 }}
            />
        </div>
    );
}
