'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import FindingsTable from '@/components/FindingsTable';
import LoadingState from '@/components/LoadingState';
import { findingsApi } from '@/services/findings.api';
import { theme } from '@/design-system/theme';
import type { FindingWithDetails, FindingsResponse } from '@/types';

export default function FindingsPage() {
    const [findingsData, setFindingsData] = useState<FindingsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter state
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');

    useEffect(() => {
        fetchFindings();
    }, [page, searchTerm, severityFilter]);

    const fetchFindings = async () => {
        try {
            setLoading(true);
            setError(null);

            // Note: The current API service might need updating if it doesn't support all filters
            // But for now we use what we have
            const result = await findingsApi.getFindings({
                page,
                page_size: 20,
                severity: severityFilter
            });

            // Explode findings: One row per match
            const explodedFindings: FindingWithDetails[] = [];

            result.findings.forEach(finding => {
                if (finding.matches && finding.matches.length > 0) {
                    finding.matches.forEach((match: string) => {
                        // Create a clone of the finding for this specific match
                        explodedFindings.push({
                            ...finding,
                            // Override matches to display only this specific match
                            matches: [match],
                            // Update ID to be unique for React keys (optional but good practice)
                            id: `${finding.id}-${match}`
                        });
                    });
                } else {
                    // Fallback if no matches array
                    explodedFindings.push(finding);
                }
            });

            // Polyfill legacy pagination structure
            const data: FindingsResponse = {
                findings: explodedFindings,
                total: result.total, // Total findings count remains (or should update?) 
                // Actually total should reflect number of rows, but backend pagination is by finding.
                // It's acceptable to show exploded rows for the current page.
                page: page,
                page_size: 20,
                total_pages: Math.ceil(result.total / 20)
            };

            setFindingsData(data);
        } catch (err: any) {
            console.error('Error fetching findings:', err);
            setError('Failed to load findings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (filters: { severity?: string; search?: string }) => {
        if (filters.search !== undefined) setSearchTerm(filters.search);
        if (filters.severity !== undefined) setSeverityFilter(filters.severity);
        setPage(1); // Reset to first page on filter change
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
            <Topbar
                scanTime={new Date().toISOString()} // Ideally fetch this
                environment="Production"
                riskScore={0} // We can fetch this or leave 0 if not relevant here
            />

            <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 800,
                            color: theme.colors.text.primary,
                            margin: 0
                        }}>
                            Findings Explorer
                        </h1>
                        <p style={{ color: theme.colors.text.secondary, marginTop: '8px' }}>
                            Detailed list of all security findings and PII detections.
                        </p>
                    </div>

                    {/* Export Button */}
                    {findingsData && findingsData.findings.length > 0 && (
                        <button
                            onClick={() => {
                                const { exportToCSV } = require('@/utils/export');
                                exportToCSV(findingsData.findings, 'findings');
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: `1px solid ${theme.colors.border.default}`,
                                backgroundColor: theme.colors.background.card,
                                color: theme.colors.text.primary,
                                fontWeight: 600,
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.background.card;
                            }}
                        >
                            📊 Export CSV
                        </button>
                    )}
                </div>

                {error && (
                    <div style={{
                        backgroundColor: `${theme.colors.status.error}10`,
                        border: `1px solid ${theme.colors.status.error}40`,
                        color: theme.colors.status.error,
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '24px'
                    }}>
                        {error}
                    </div>
                )}

                {loading && !findingsData ? (
                    <LoadingState message="Loading findings..." />
                ) : (
                    <div style={{
                        backgroundColor: theme.colors.background.card,
                        borderRadius: '12px',
                        border: `1px solid ${theme.colors.border.default}`,
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
                    }}>
                        {findingsData ? (
                            <FindingsTable
                                findings={findingsData.findings}
                                total={findingsData.total}
                                page={findingsData.page}
                                pageSize={findingsData.page_size}
                                totalPages={findingsData.total_pages}
                                onPageChange={setPage}
                                onFilterChange={handleFilterChange}
                            />
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                No findings data available.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
