'use client';

import React, { useEffect, useState, useRef } from 'react';
import Topbar from '@/components/Topbar';
import SummaryCards from '@/components/SummaryCards';
import FindingsTable from '@/components/FindingsTable';
import LoadingState from '@/components/LoadingState';
import { findingsApi } from '@/services/findings.api';
import { lineageApi } from '@/services/lineage.api';
import { classificationApi } from '@/services/classification.api';
import { scansApi } from '@/services/scans.api';
import type {
    ClassificationSummary,
    FindingsResponse,
} from '@/types';
import type { LineageGraph } from '@/modules/lineage/lineage.types';
import { colors } from '@/design-system/colors';

export default function DashboardPage() {
    const [lineageData, setLineageData] = useState<LineageGraph | null>(null);
    const [findingsData, setFindingsData] = useState<FindingsResponse | null>(null);
    const [classificationSummary, setClassificationSummary] = useState<ClassificationSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scanTime, setScanTime] = useState<string | undefined>(undefined);
    const [lastScanId, setLastScanId] = useState<string | null>(null);

    // Filters and pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');

    // Auto-refresh polling
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchData();

        // Start auto-polling for new scan data every 10 seconds
        pollingInterval.current = setInterval(() => {
            checkForNewScan();
        }, 10000); // Poll main page API every 10s

        return () => {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, []);

    useEffect(() => {
        fetchFindings();
    }, [currentPage, searchQuery, severityFilter]);

    const checkForNewScan = async () => {
        try {
            const lastScan = await scansApi.getLastScanRun();
            if (lastScan && lastScan.id !== lastScanId) {
                // New scan detected! Auto-refresh all data
                console.log('New scan detected, refreshing data...');
                setLastScanId(lastScan.id);
                await fetchData();
                await fetchFindings();
            }
        } catch (err) {
            // Silently fail polling, don't disrupt UX
            console.debug('Polling check failed:', err);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [classification, graphData, lastScan] = await Promise.all([
                classificationApi.getSummary(),
                lineageApi.getSemanticGraph({}),
                scansApi.getLastScanRun()
            ]);

            setLineageData(graphData);
            setClassificationSummary(classification);
            if (lastScan) {
                setScanTime(lastScan.scan_completed_at);
                setLastScanId(lastScan.id);
            }
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Failed to fetch dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    const fetchFindings = async () => {
        try {
            const params: any = {
                page: currentPage,
                page_size: pageSize,
            };

            if (severityFilter) {
                params.severity = severityFilter;
            }

            const findings = await findingsApi.getFindings(params);
            setFindingsData({
                ...findings,
                page: currentPage,
                page_size: pageSize,
                total_pages: Math.ceil(findings.total / pageSize)
            });
        } catch (err: any) {
            console.error('Error fetching findings:', err);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleFilterChange = (filters: { severity?: string; search?: string }) => {
        if (filters.severity !== undefined) {
            setSeverityFilter(filters.severity);
        }
        if (filters.search !== undefined) {
            setSearchQuery(filters.search);
        }
        setCurrentPage(1);
    };

    // Calculate metrics
    const totalFindings = classificationSummary?.total || findingsData?.total || 0;
    const sensitivePIICount = classificationSummary?.by_type?.['Sensitive Personal Data']?.count || 0;
    const criticalFindings = (classificationSummary?.by_severity?.['CRITICAL'] || 0) + (classificationSummary?.by_severity?.['Critical'] || 0);
    const highRiskAssets = lineageData?.nodes.filter(n => n.risk_score >= 70).length || 0;
    const avgRiskScore = lineageData?.nodes.length
        ? Math.round(lineageData.nodes.reduce((sum, n) => sum + n.risk_score, 0) / lineageData.nodes.length)
        : 0;

    if (loading && !lineageData) {
        return <LoadingState fullScreen message="Loading Risk Overview..." />;
    }

    return (
        <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: colors.background.primary }}>
            <Topbar
                scanTime={scanTime}
                environment="Production"
                riskScore={avgRiskScore}
                onSearch={handleSearch}
            />

            <div style={{ padding: '20px', maxWidth: '1800px', margin: '0 auto' }}>
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{
                                fontSize: '32px',
                                fontWeight: 800,
                                color: colors.text.primary,
                                marginBottom: '8px',
                                letterSpacing: '-0.02em',
                            }}>
                                Risk Overview
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <p style={{ color: colors.text.secondary, fontSize: '16px', margin: 0 }}>
                                    Executive summary of data privacy and security posture.
                                </p>
                                <span style={{
                                    fontSize: '12px',
                                    color: colors.text.secondary,
                                    background: colors.background.surface,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    border: `1px solid ${colors.border.default}`
                                }}>
                                    Live Data
                                </span>
                            </div>
                        </div>
                        {/* Auto-refresh indicator */}
                        <div style={{
                            fontSize: '12px',
                            color: '#10b981',
                            background: '#d1fae5',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: '1px solid #6ee7b7'
                        }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#10b981',
                                animation: 'pulse 2s infinite'
                            }} />
                            Auto-refreshing
                        </div>
                    </div>
                    <p style={{ color: colors.text.secondary, fontSize: '16px', maxWidth: '800px', marginTop: '12px' }}>
                        Your environment has <strong>{criticalFindings} critical issues</strong> that require immediate attention.
                        We analyzed <strong>{totalFindings} detections</strong> spanning <strong>{sensitivePIICount} confirmed sensitive items</strong>.
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '16px 24px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '12px',
                        color: '#B91C1C',
                        marginBottom: '24px',
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <SummaryCards
                    totalFindings={totalFindings}
                    sensitivePIICount={sensitivePIICount}
                    highRiskAssets={highRiskAssets}
                    criticalFindings={criticalFindings}
                />

                {/* Full-width Findings Table */}
                <div style={{ marginTop: '32px' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Recent Critical Findings</h2>
                    </div>
                    {findingsData ? (
                        <FindingsTable
                            findings={findingsData.findings}
                            total={findingsData.total}
                            page={currentPage}
                            pageSize={pageSize}
                            totalPages={findingsData.total_pages}
                            onPageChange={handlePageChange}
                            onFilterChange={handleFilterChange}
                        />
                    ) : (
                        <LoadingState message="Loading findings..." />
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
