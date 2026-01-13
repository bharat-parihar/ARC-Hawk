'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import type { LineageNode as LineageNodeType } from './lineage.types';
import { getNodeColor } from '@/design-system/themes';
import { colors } from '@/design-system/colors';
import { theme } from '@/design-system/themes';

interface LineageNodeProps {
    data: LineageNodeType;
    id: string;
}

export default function LineageNode({ data, id }: LineageNodeProps) {
    const { label, type, metadata } = data;
    // Access properties from metadata or handle potential UI-injected props
    const risk_score = (metadata as any)?.risk_score || 0;
    const review_status = (metadata as any)?.review_status;
    const expanded = (data as any).expanded;
    const onExpand = (data as any).onExpand;
    const childCount = (data as any).childCount;
    const [isHovered, setIsHovered] = React.useState(false);

    const nodeColors = getNodeColor(type, risk_score);
    const showExpandControl = (type === 'system' || type === 'asset') && childCount && childCount > 0;

    // Determine node size based on type (3-level hierarchy)
    const getNodeSize = () => {
        switch (type) {
            case 'system':
                return { width: 280, minHeight: 100 };
            case 'asset':
                return { width: 240, minHeight: 90 };
            case 'pii_category':
                return { width: 220, minHeight: 85 };
            default:
                return { width: 200, minHeight: 80 };
        }
    };

    const size = getNodeSize();

    // Get icon based on type (3-level: System → Asset → PII_Category)
    const getIcon = () => {
        switch (type) {
            case 'system': return '🏢';
            case 'asset': return '📦';
            case 'pii_category': return '🔐'; // Lock icon for PII
            default: return '📋';
        }
    };

    return (
        <div
            style={{
                background: nodeColors.bg,
                border: `2px solid ${nodeColors.border}`,
                borderRadius: '8px',
                minWidth: size.width,
                maxWidth: size.width, // Enforce strict width to prevent overlap
                minHeight: size.minHeight,
                boxShadow: isHovered
                    ? '0 4px 12px rgba(0, 0, 0, 0.15)'
                    : '0 1px 3px rgba(0, 0, 0, 0.1)',
                fontFamily: theme.font.primary,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                cursor: 'pointer',
                opacity: review_status === 'false_positive' ? 0.6 : 1,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Handle
                type="target"
                position={Position.Left}
                style={{
                    background: nodeColors.border,
                    width: 10,
                    height: 10,
                    border: '2px solid white',
                    left: -6,
                }}
            />

            {/* Header */}
            <div
                style={{
                    padding: '12px 16px',
                    background: `linear-gradient(to bottom, #ffffff, ${nodeColors.bg})`, // Subtle light gradient
                    borderBottom: `1px solid ${nodeColors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', filter: 'grayscale(0.2)' }}>{getIcon()}</span>
                    <span
                        style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: nodeColors.text,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            opacity: 0.8,
                        }}
                    >
                        {type.replace('_', ' ')}
                    </span>
                </div>

                {/* Risk Indicator for high-risk nodes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {review_status === 'confirmed' && (
                        <div title="Verified PII" style={{ fontSize: '12px', color: colors.state.success }}>Verified</div>
                    )}
                    {review_status === 'false_positive' && (
                        <span
                            title="Marked False Positive"
                            style={{
                                fontSize: '9px',
                                padding: '2px 4px',
                                background: '#f3f4f6',
                                borderRadius: '4px',
                                color: '#9ca3af',
                                fontWeight: '700',
                                border: '1px solid #e5e7eb'
                            }}
                        >
                            FALSE POS
                        </span>
                    )}
                    {(!review_status || review_status === 'pending') && risk_score >= 1 && (
                        <div
                            title={`Risk Score: ${risk_score}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 800,
                                color: risk_score >= 70 ? colors.state.risk : (risk_score >= 40 ? colors.state.warning : colors.text.muted),
                            }}
                        >
                            {risk_score}
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 16px' }}>
                {/* Label */}
                <div
                    style={{
                        fontWeight: theme.fontWeight.bold,
                        fontSize: '15px', // Hardcoded larger size for visibility
                        color: nodeColors.text,
                        marginBottom: '10px',
                        wordBreak: 'break-word',
                        lineHeight: theme.lineHeight.snug,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxHeight: '4.5em', // approx 3 lines
                    }}
                    title={label} // Show full text on hover
                >
                    {label}
                </div>

                {/* Metadata */}
                {(metadata as any)?.environment && (
                    <div
                        style={{
                            fontSize: theme.fontSize.sm, // Increased from xs
                            color: nodeColors.text,
                            fontWeight: theme.fontWeight.medium,
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span>📍</span>
                        <span>{(metadata as any).environment}</span>
                    </div>
                )}



                {/* Child count indicator */}
                {childCount && childCount > 0 && (
                    <div
                        style={{
                            fontSize: theme.fontSize.xs,
                            color: nodeColors.text,
                            opacity: 0.6,
                            marginTop: '6px',
                        }}
                    >
                        {childCount} {childCount === 1 ? 'child' : 'children'}
                    </div>
                )}

                {/* Expand/Collapse Button */}
                {showExpandControl && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpand && onExpand();
                        }}
                        style={{
                            marginTop: '12px',
                            width: '100%',
                            padding: '8px 12px',
                            background: colors.background.elevated,
                            border: `1px solid ${nodeColors.border}`,
                            borderRadius: '6px',
                            fontSize: theme.fontSize.sm,
                            color: nodeColors.text,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontWeight: theme.fontWeight.semibold,
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = theme.shadows.sm;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <span
                            style={{
                                fontSize: '10px',
                                transition: 'transform 0.2s ease',
                                display: 'inline-block',
                                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}
                        >
                            ▶
                        </span>
                        {expanded ? 'Collapse' : 'Expand'}
                    </button>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                style={{
                    background: nodeColors.border,
                    width: 10,
                    height: 10,
                    border: '2px solid white',
                    right: -6,
                }}
            />
        </div>
    );
}
