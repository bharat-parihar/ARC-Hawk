'use client';

import React, { useState } from 'react';
import { FindingWithDetails, SignalScore } from '@/types';
import { findingsApi } from '@/services/findings.api';


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

        const levelClasses: Record<string, string> = {
            'Confirmed': 'bg-green-100 text-green-800 border-green-300',
            'High Confidence': 'bg-blue-100 text-blue-800 border-blue-300',
            'Needs Review': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'Discard': 'bg-gray-100 text-gray-600 border-gray-300',
        };

        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded border ${levelClasses[level] || ''}`}>
                {level}
            </span>
        );
    };

    const renderSignalBadge = (signal?: SignalScore, label?: string) => {
        if (!signal) return null;

        // Minimal visual indicator: Color code based on contribution
        // High contribution (>30% of weight) = Primary Color
        // Low contribution = Muted Color
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
                    backgroundColor: isContributionSignificant ? '#3b82f6' : '#cbd5e1'
                }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>
                    {label}:
                </span>
                <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#0f172a' }}>
                    {signal.confidence.toFixed(2)}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
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
                            {finalScore.toFixed(2)}
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

                {/* Explanation Text */}
                <div style={{ marginTop: 16, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                    "{breakdown.presidio_signal?.explanation || breakdown.rule_signal?.explanation}"
                </div>
            </div>
        );
    };

    return (
        <div className="section">
            <h2 className="section-title">Findings ({total})</h2>

            <div className="filters">
                <input
                    type="text"
                    placeholder="Search by pattern name..."
                    className="filter-input"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{ minWidth: 250 }}
                />

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

            <div style={{ overflowX: 'auto' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}></th>
                            <th>Asset</th>
                            <th>Environment / System</th>
                            <th>Pattern</th>
                            <th>Evidence</th>
                            <th>Severity</th>
                            <th>Classification</th>
                            <th>Confidence</th>
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
                                        <tr style={{
                                            cursor: 'pointer',
                                            backgroundColor: isExpanded ? '#f1f5f9' : 'transparent'
                                        }}>
                                            <td onClick={() => toggleRowExpand(finding.id)}>
                                                <span style={{ fontSize: 18, userSelect: 'none' }}>
                                                    {isExpanded ? '▼' : '▶'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{finding.asset_name}</div>
                                                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{finding.asset_path}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 13 }}>{finding.environment}</div>
                                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{finding.source_system}</div>
                                            </td>
                                            <td>{finding.pattern_name}</td>
                                            <td>
                                                <div style={{ fontSize: 12, fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {finding.matches.length > 0 ? finding.matches[0] : 'No match data'}
                                                    {finding.matches.length > 1 && <span style={{ color: 'var(--color-primary)' }}> (+{finding.matches.length - 1})</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getSeverityBadgeClass(finding.severity)}`}>
                                                    {finding.severity}
                                                </span>
                                            </td>
                                            <td>
                                                {finding.classifications.map((c, i) => (
                                                    <span key={i} className={`tag ${getClassificationTag(c.classification_type)}`}>
                                                        {c.classification_type}
                                                    </span>
                                                ))}
                                            </td>
                                            <td>
                                                {classification && (
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                                                            {classification.confidence_score.toFixed(2)}
                                                        </div>
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
                <div className="pagination">
                    <button
                        className="pagination-button"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                    >
                        Previous
                    </button>

                    <span style={{ fontSize: 14, color: '#666' }}>
                        Page {page} of {totalPages}
                    </span>

                    <button
                        className="pagination-button"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
