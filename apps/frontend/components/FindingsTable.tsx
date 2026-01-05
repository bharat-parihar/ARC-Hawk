'use client';

import React, { useState } from 'react';
import { FindingWithDetails, SignalScore } from '@/types';
import { findingsApi } from '@/services/findings.api';
import { colors } from '@/design-system/colors';


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

            // Optimistic Update: Refresh page or ideally update local state
            // For now, simpler to reload page to see effect
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

    const getSeverityBadgeClass = (sev: string) => {
        switch (sev.toLowerCase()) {
            case 'critical':
                return 'badge-critical';
            case 'high':
                return 'badge-high';
            case 'medium':
                return 'badge-medium';
            case 'low':
                return 'badge-low';
            default:
                return '';
        }
    };

    const getClassificationTag = (type: string) => {
        if (type.includes('Sensitive')) return 'tag-sensitive';
        if (type.includes('Secret')) return 'tag-secret';
        if (type.includes('Personal')) return 'tag-pii';
        return '';
    };

    const getConfidenceLevelBadge = (level?: string) => {
        if (!level) return null;

        const getStyle = (l: string) => {
            switch (l) {
                case 'Confirmed': return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
                case 'High Confidence': return { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' };
                case 'Needs Review': return { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' };
                case 'Discard': return { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' };
                default: return { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' };
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
                    backgroundColor: isContributionSignificant ? colors.status.info : colors.border.strong
                }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: colors.text.secondary }}>
                    {label}:
                </span>
                <span style={{ fontSize: 13, fontFamily: 'monospace', color: colors.text.primary }}>
                    {(signal.confidence * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: 12, color: colors.text.muted }}>
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
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
            }}>
                <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

                    {/* Left: Signals List */}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
                            Signal Analysis
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 24px' }}>
                            {renderSignalBadge(breakdown.rule_signal, 'Rules')}
                            {renderSignalBadge(breakdown.context_signal, 'Context')}
                            {renderSignalBadge(breakdown.presidio_signal, 'ML/AI')}
                            {renderSignalBadge(breakdown.entropy_signal, 'Entropy')}
                        </div>
                    </div>

                    {/* Middle: Final Score */}
                    <div style={{ paddingLeft: 32, borderLeft: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>
                            Final Score
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
                            {(finalScore * 100).toFixed(0)}%
                        </div>
                        <div style={{ marginTop: 4 }}>
                            {getConfidenceLevelBadge(classification.confidence_level)}
                        </div>
                    </div>

                    {/* Right: Feedback */}
                    <div style={{ paddingLeft: 32, borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
                            Validity
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleFeedback(finding, 'CONFIRMED'); }}
                                style={{
                                    border: '1px solid #d1d5db',
                                    background: 'white',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    color: '#15803d',
                                    display: 'flex', alignItems: 'center', gap: 4
                                }}
                            >
                                <span>Correct</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleFeedback(finding, 'FALSE_POSITIVE'); }}
                                style={{
                                    border: '1px solid #d1d5db',
                                    background: 'white',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    color: '#b91c1c',
                                    display: 'flex', alignItems: 'center', gap: 4
                                }}
                            >
                                <span>False Positive</span>
                            </button>
                        </div>

                        {/* Status Feedback */}
                        {finding.review_status === 'confirmed' && (
                            <div style={{ fontSize: 11, color: '#15803d' }}>✓ User Verified</div>
                        )}
                        {finding.review_status === 'false_positive' && (
                            <div style={{ fontSize: 11, color: '#b91c1c' }}>✕ User Rejected</div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                        Full Evidence ({finding.matches.length})
                    </div>
                    <div style={{
                        background: '#f1f5f9',
                        padding: '8px 12px',
                        borderRadius: 6,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: '#334155',
                        maxHeight: 100,
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {finding.matches.join('\n')}
                    </div>
                </div>

                <div style={{ marginTop: 16, fontSize: 13, color: '#64748b', fontStyle: 'italic', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                    "{breakdown.presidio_signal?.explanation || breakdown.rule_signal?.explanation || 'No specific explanation available.'}"
                </div>
            </div>
        );
    };

    return (
        <div className="section">
            <h2 className="section-title">Findings ({total})</h2>

            <div className="filters">
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <input
                        type="text"
                        placeholder="Search by pattern name... (Coming Soon)"
                        className="filter-input"
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        style={{ minWidth: 250, opacity: 0.6, cursor: 'not-allowed' }}
                        disabled={true}
                        title="Search functionality coming soon - backend implementation pending"
                    />
                </div>

                <select
                    className="filter-select"
                    value={severity}
                    onChange={(e) => handleSeverityChange(e.target.value)}
                >
                    <option value="">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>
            </div>

            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="table" style={{ minWidth: '1200px' }}>
                    <thead>
                        <tr>
                            <th style={{ width: 40, minWidth: 40 }}></th>
                            <th style={{ minWidth: 200, width: '15%' }}>Asset</th>
                            <th style={{ minWidth: 150, width: '12%' }}>Environment / System</th>
                            <th style={{ minWidth: 120, width: '10%' }}>Pattern</th>
                            <th style={{ minWidth: 150, width: '15%' }}>Evidence</th>
                            <th style={{ minWidth: 100, width: '8%' }}>Severity</th>
                            <th style={{ minWidth: 140, width: '12%' }}>Classification</th>
                            <th style={{ minWidth: 180, width: '15%' }}>Confidence</th>
                        </tr>
                    </thead>
                    <tbody>
                        {findings.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                                    No findings match the current filters
                                </td>
                            </tr>
                        ) : (
                            findings.map((finding) => {
                                const isExpanded = expandedRows.has(finding.id);
                                const classification = finding.classifications[0];

                                return (
                                    <React.Fragment key={finding.id}>
                                        <tr
                                            onClick={() => toggleRowExpand(finding.id)}
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: isExpanded ? '#f8fafc' : 'transparent',
                                                borderBottom: '1px solid #e2e8f0',
                                            }}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            <td style={{ padding: '16px 8px', textAlign: 'center', color: '#94a3b8' }}>
                                                {isExpanded ? '▼' : '▶'}
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{finding.asset_name}</div>
                                                <div style={{ fontSize: 13, color: '#64748b' }}>{finding.asset_path}</div>
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                <div style={{ fontSize: 13 }}>{finding.environment}</div>
                                                <div style={{ fontSize: 12, color: '#64748b' }}>{finding.source_system}</div>
                                            </td>
                                            <td style={{ padding: 16, fontFamily: 'monospace', fontSize: 13 }}>{finding.pattern_name}</td>
                                            <td style={{ padding: 16 }}>
                                                <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b', maxHeight: '100px', overflowY: 'auto' }}>
                                                    {finding.matches.map((match, idx) => (
                                                        <div key={idx} style={{ marginBottom: 2 }}>{match}</div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                <span className={`badge ${getSeverityBadgeClass(finding.severity)}`} style={{ borderRadius: 4, fontWeight: 600 }}>
                                                    {finding.severity}
                                                </span>
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                {finding.classifications.map((c, i) => (
                                                    <span key={i} className={`tag ${getClassificationTag(c.classification_type)}`} style={{ borderRadius: 4 }}>
                                                        {c.classification_type}
                                                    </span>
                                                ))}
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                {classification && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                                                            {(classification.confidence_score * 100).toFixed(0)}%
                                                        </span>
                                                        {getConfidenceLevelBadge(classification.confidence_level)}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={8} style={{ padding: 0 }}>
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
                <div className="pagination" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                        className="pagination-button"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 12px' }}
                    >
                        Previous
                    </button>
                    <span style={{ fontSize: 14, color: '#64748b', alignSelf: 'center' }}>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="pagination-button"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 12px' }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
