'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import FindingsTable from '@/components/FindingsTable';
import LoadingState from '@/components/LoadingState';
import { findingsApi } from '@/services/findings.api';
import { colors } from '@/design-system/colors';
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

            // Polyfill legacy pagination structure if missing from API response (services return raw data)
            const data: FindingsResponse = {
                findings: result.findings,
                total: result.total,
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
        <div style={{ minHeight: '100vh', backgroundColor: colors.background.primary }}>
            <Topbar
                scanTime={new Date().toISOString()} // Ideally fetch this
                environment="Production"
                riskScore={0} // We can fetch this or leave 0 if not relevant here
            />

            <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        color: colors.text.primary,
                        margin: 0
                    }}>
                        Findings Explorer
                    </h1>
                    <p style={{ color: colors.text.secondary, marginTop: '8px' }}>
                        Detailed list of all security findings and PII detections.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {loading && !findingsData ? (
                    <LoadingState message="Loading findings..." />
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
