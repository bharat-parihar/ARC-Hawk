'use client';

import React, { useState } from 'react';
import { FindingWithDetails, SignalScore } from '@/types';
import { findingsApi } from '@/services/findings.api';
import { theme, getRiskColor } from '@/design-system/theme';

interface FindingsTableProps {
    findings: FindingWithDetails[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onFilterChange: (filters: { severity?: string; search?: string }) => void;
}

export default function FindingsTable({
    findings,
    total,
    page,
    pageSize,
    totalPages,
    onPageChange,
    onFilterChange,
}: FindingsTableProps) {
    const [search, setSearch] = useState('');
    const [severity, setSeverity] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const handleSearchChange = (value: string) => {
        setSearch(value);
        onFilterChange({ severity, search: value });
    };

    const handleSeverityChange = (value: string) => {
        setSeverity(value);
        onFilterChange({ severity: value, search });
    };

    const handleFeedback = async (finding: FindingWithDetails, type: 'FALSE_POSITIVE' | 'CONFIRMED') => {
        try {
            await findingsApi.submitFeedback(finding.id, {
                feedback_type: type,
                original_classification: finding.classifications[0]?.classification_type,
            });
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Failed to submit feedback');
        }
    };

    const toggleRowExpand = (findingId: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(findingId)) {
                next.delete(findingId);
            } else {
                next.add(findingId);
            }
            return next;
        });
    };

    const getSeverityStyle = (sev: string) => {
        const color = getRiskColor(sev);
        return {
            backgroundColor: `${color}15`,
            color: color,
            border: `1px solid ${color}40`,
        };
    };

    const getClassificationStyle = (type: string) => {
        if (type.includes('Sensitive')) return { bg: `${theme.colors.risk.critical}15`, text: theme.colors.risk.critical };
        if (type.includes('Secret')) return { bg: `${theme.colors.risk.high}15`, text: theme.colors.risk.high };
        if (type.includes('Personal')) return { bg: `${theme.colors.risk.medium}15`, text: theme.colors.risk.medium };
        return { bg: theme.colors.background.tertiary, text: theme.colors.text.secondary };
    };

    const getConfidenceLevelBadge = (level?: string) => {
        if (!level) return null;

        const getStyle = (l: string) => {
            switch (l) {
                case 'Confirmed': return { bg: `${theme.colors.status.success}15`, text: theme.colors.status.success, border: `${theme.colors.status.success}40` };
                case 'High Confidence': return { bg: `${theme.colors.status.info}15`, text: theme.colors.status.info, border: `${theme.colors.status.info}40` };
                case 'Needs Review': return { bg: `${theme.colors.status.warning}15`, text: theme.colors.status.warning, border: `${theme.colors.status.warning}40` };
                case 'Discard': return { bg: theme.colors.background.tertiary, text: theme.colors.text.muted, border: theme.colors.border.default };
                default: return { bg: theme.colors.background.tertiary, text: theme.colors.text.muted, border: theme.colors.border.default };
            }
        };

        const style = getStyle(level);

        return (
            <span style={{
                padding: '2px 8px', borderRadius: 4, border: `1px solid ${style.border}`,
                fontSize: 12, fontWeight: 600,
                backgroundColor: style.bg, color: style.text
            }}>
                {level}
            </span>
        );
    };

    const renderSignalBadge = (signal?: SignalScore, label?: string) => {
        if (!signal) return null;
        const isContributionSignificant = signal.weighted_score > 0.1;

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
                opacity: isContributionSignificant ? 1 : 0.6
            }}>
                <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: isContributionSignificant ? theme.colors.status.info : theme.colors.border.active
                }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: theme.colors.text.secondary }}>
                    {label}:
                </span>
                <span style={{ fontSize: 13, fontFamily: 'monospace', color: theme.colors.text.primary }}>
                    {(signal.confidence * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: 12, color: theme.colors.text.muted }}>
                    ({(signal.weight * 100).toFixed(0)}% wgt)
                </span>
            </div>
        );
    };

    const renderSignalBreakdown = (finding: FindingWithDetails) => {
        const classification = finding.classifications[0];
        if (!classification || !classification.signal_breakdown) return null;

        const breakdown = classification.signal_breakdown;
        const finalScore = classification.confidence_score;

        return (
            <div style={{
                padding: '16px 24px',
                backgroundColor: theme.colors.background.secondary,
                borderTop: `1px solid ${theme.colors.border.subtle}`,
            }}>
                <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: theme.colors.text.muted, fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
                            Signal Analysis
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 24px' }}>
                            {renderSignalBadge(breakdown.rule_signal, 'Rules')}
                            {renderSignalBadge(breakdown.context_signal, 'Context')}
                            {renderSignalBadge(breakdown.presidio_signal, 'ML/AI')}
                            {renderSignalBadge(breakdown.entropy_signal, 'Entropy')}
                        </div>
                    </div>

                    <div style={{ paddingLeft: 32, borderLeft: `1px solid ${theme.colors.border.subtle}` }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: theme.colors.text.muted, fontWeight: 600, marginBottom: 4 }}>
                            Final Score
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: theme.colors.text.primary, lineHeight: 1 }}>
                            {(finalScore * 100).toFixed(0)}%
                        </div>
                        <div style={{ marginTop: 4 }}>
                            {getConfidenceLevelBadge(classification.confidence_level)}
                        </div>
                    </div>

                    <div style={{ paddingLeft: 32, borderLeft: `1px solid ${theme.colors.border.subtle}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: theme.colors.text.muted, fontWeight: 600 }}>
                            Validity
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleFeedback(finding, 'CONFIRMED'); }}
                                style={{
                                    border: `1px solid ${theme.colors.status.success}40`,
                                    background: `${theme.colors.status.success}10`,
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    color: theme.colors.status.success,
                                    display: 'flex', alignItems: 'center', gap: 4
                                }}
                            >
                                <span>Correct</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleFeedback(finding, 'FALSE_POSITIVE'); }}
                                style={{
                                    border: `1px solid ${theme.colors.status.error}40`,
                                    background: `${theme.colors.status.error}10`,
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    color: theme.colors.status.error,
                                    display: 'flex', alignItems: 'center', gap: 4
                                }}
                            >
                                <span>False Positive</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: theme.colors.text.muted, fontWeight: 600, marginBottom: 8 }}>
                        Full Evidence ({finding.matches.length})
                    </div>
                    <div style={{
                        background: theme.colors.background.tertiary,
                        padding: '8px 12px',
                        borderRadius: 6,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: theme.colors.text.secondary,
                        maxHeight: 100,
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        border: `1px solid ${theme.colors.border.default}`
                    }}>
                        {finding.matches.join('\n')}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: theme.colors.text.primary, margin: 0 }}>
                    Findings ({total})
                </h2>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        style={{
                            backgroundColor: theme.colors.background.tertiary,
                            border: `1px solid ${theme.colors.border.default}`,
                            color: theme.colors.text.primary,
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            minWidth: '250px'
                        }}
                    />
                    <select
                        value={severity}
                        onChange={(e) => handleSeverityChange(e.target.value)}
                        style={{
                            backgroundColor: theme.colors.background.tertiary,
                            border: `1px solid ${theme.colors.border.default}`,
                            color: theme.colors.text.primary,
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '14px',
                        }}
                    >
                        <option value="">All Severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${theme.colors.border.default}` }}>
                            <th style={{ width: 40, padding: '12px', color: theme.colors.text.muted }}></th>
                            <th style={{ padding: '12px', textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Asset</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Environment</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Pattern</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Evidence</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Severity</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: theme.colors.text.muted, fontWeight: 600 }}>Classification</th>
                        </tr>
                    </thead>
                    <tbody>
                        {findings.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: theme.colors.text.muted }}>
                                    No findings match the current filters
                                </td>
                            </tr>
                        ) : (
                            findings.map((finding) => {
                                const isExpanded = expandedRows.has(finding.id);
                                const classification = finding.classifications[0];
                                const severityStyle = getSeverityStyle(finding.severity);

                                return (
                                    <React.Fragment key={finding.id}>
                                        <tr
                                            onClick={() => toggleRowExpand(finding.id)}
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: isExpanded ? theme.colors.background.secondary : 'transparent',
                                                borderBottom: `1px solid ${theme.colors.border.subtle}`,
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isExpanded ? theme.colors.background.secondary : theme.colors.background.tertiary}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isExpanded ? theme.colors.background.secondary : 'transparent'}
                                        >
                                            <td style={{ padding: '16px 8px', textAlign: 'center', color: theme.colors.text.muted }}>
                                                {isExpanded ? '▼' : '▶'}
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                <div style={{ fontWeight: 600, color: theme.colors.text.primary }}>{finding.asset_name}</div>
                                                <div style={{ fontSize: 13, color: theme.colors.text.secondary }}>{finding.asset_path}</div>
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                <div style={{ fontSize: 13, color: theme.colors.text.primary }}>{finding.environment}</div>
                                                <div style={{ fontSize: 12, color: theme.colors.text.muted }}>{finding.source_system}</div>
                                            </td>
                                            <td style={{ padding: 16, fontFamily: 'monospace', fontSize: 13, color: theme.colors.text.secondary }}>{finding.pattern_name}</td>
                                            <td style={{ padding: 16 }}>
                                                <div style={{ fontSize: 12, fontFamily: 'monospace', color: theme.colors.text.muted, maxHeight: '60px', overflowY: 'hidden' }}>
                                                    {finding.matches[0]} {finding.matches.length > 1 && `+${finding.matches.length - 1} more`}
                                                </div>
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    ...severityStyle
                                                }}>
                                                    {finding.severity}
                                                </span>
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                {finding.classifications.map((c, i) => {
                                                    const style = getClassificationStyle(c.classification_type);
                                                    return (
                                                        <span key={i} style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            backgroundColor: style.bg,
                                                            color: style.text,
                                                            marginRight: '4px'
                                                        }}>
                                                            {c.classification_type}
                                                        </span>
                                                    );
                                                })}
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 0 }}>
                                                    {renderSignalBreakdown(finding)}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div style={{ borderTop: `1px solid ${theme.colors.border.default}`, paddingTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        style={{
                            border: `1px solid ${theme.colors.border.default}`,
                            borderRadius: 4,
                            padding: '6px 12px',
                            background: page <= 1 ? theme.colors.background.secondary : theme.colors.background.card,
                            color: page <= 1 ? theme.colors.text.muted : theme.colors.text.primary
                        }}
                    >
                        Previous
                    </button>
                    <span style={{ fontSize: 14, color: theme.colors.text.secondary, alignSelf: 'center' }}>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        style={{
                            border: `1px solid ${theme.colors.border.default}`,
                            borderRadius: 4,
                            padding: '6px 12px',
                            background: page >= totalPages ? theme.colors.background.secondary : theme.colors.background.card,
                            color: page >= totalPages ? theme.colors.text.muted : theme.colors.text.primary
                        }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
