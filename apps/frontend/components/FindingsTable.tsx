'use client';

import React, { useState } from 'react';
import { FindingWithDetails, SignalScore } from '@/types';

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

    const renderSignalProgressBar = (signal?: SignalScore, label?: string) => {
        if (!signal) return null;

        const percentage = signal.confidence * 100;
        const weightedPercentage = signal.weighted_score * 100;

        return (
            <div className="signal-row" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                        {label} ({(signal.weight * 100).toFixed(0)}%)
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                        Raw: {signal.raw_score.toFixed(2)} → Weighted: {signal.weighted_score.toFixed(2)}
                    </span>
                </div>
                <div style={{
                    width: '100%',
                    height: 8,
                    backgroundColor: '#e2e8f0',
                    borderRadius: 4,
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)`,
                        transition: 'width 0.3s ease'
                    }} />
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {signal.explanation}
                </div>
            </div>
        );
    };

    const renderSignalBreakdown = (finding: FindingWithDetails) => {
        const classification = finding.classifications[0];
        if (!classification || !classification.signal_breakdown) {
            return (
                <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
                    No signal breakdown available for this finding
                </div>
            );
        }

        const breakdown = classification.signal_breakdown;
        const finalScore = classification.confidence_score;

        return (
            <div style={{
                padding: 20,
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                borderRadius: '0 0 8px 8px'
            }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: '#0f172a' }}>
                    🔍 Multi-Signal Classification Analysis
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                        {renderSignalProgressBar(breakdown.rule_signal, '📋 Rule-based Signal')}
                        {renderSignalProgressBar(breakdown.presidio_signal, '🤖 Presidio ML Signal')}
                    </div>
                    <div>
                        {renderSignalProgressBar(breakdown.context_signal, '🔗 Context Signal')}
                        {renderSignalProgressBar(breakdown.entropy_signal, '📊 Entropy Signal')}
                    </div>
                </div>

                <div style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: '2px solid #cbd5e1',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Final Weighted Score</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                            {finalScore.toFixed(2)}
                        </div>
                    </div>
                    <div>
                        {getConfidenceLevelBadge(classification.confidence_level)}
                    </div>
                    {classification.engine_version && (
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            Engine: {classification.engine_version}
                        </div>
                    )}
                </div>

                {/* Presidio Availability Indicator */}
                {breakdown.presidio_signal && (
                    <div style={{ marginTop: 12, fontSize: 11, color: '#64748b' }}>
                        {breakdown.presidio_signal.confidence > 0 ? (
                            <span style={{ color: '#10b981' }}>✓ Presidio ML validation active</span>
                        ) : (
                            <span style={{ color: '#94a3b8' }}>○ Presidio ML not available (rules-only mode)</span>
                        )}
                    </div>
                )}
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
