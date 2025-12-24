'use client';

import React, { useState } from 'react';
import { FindingWithDetails } from '@/types';

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

    const handleSearchChange = (value: string) => {
        setSearch(value);
        onFilterChange({ severity, search: value });
    };

    const handleSeverityChange = (value: string) => {
        setSeverity(value);
        onFilterChange({ severity: value, search });
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
                            <th>Asset</th>
                            <th>Environment / System</th>
                            <th>Pattern</th>
                            <th>Evidence</th>
                            <th>Severity</th>
                            <th>Classification</th>
                            <th>Review Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {findings.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                                    No findings match the current filters
                                </td>
                            </tr>
                        ) : (
                            findings.map((finding) => (
                                <tr key={finding.id}>
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
                                        <span style={{
                                            fontSize: 12,
                                            color: finding.review_status === 'approved' ? '#28a745' :
                                                finding.review_status === 'rejected' ? '#dc3545' : '#666'
                                        }}>
                                            {finding.review_status}
                                        </span>
                                    </td>
                                </tr>
                            ))
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
