'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import SummaryCards from '@/components/SummaryCards';
import HighRiskAssetsList from '@/components/dashboard/HighRiskAssetsList';
import FindingsTable from '@/components/FindingsTable';
import LoadingState from '@/components/LoadingState';
import { assetsApi } from '@/services/assets.api';
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

    // Filters and pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchFindings();
    }, [currentPage, searchQuery, severityFilter]);

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

            // Note: Backend doesn't support search yet, but prepared for future
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
        setCurrentPage(1); // Reset to first page on new search
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
        setCurrentPage(1); // Reset to first page on filter change
    };

    // Calculate metrics
    const totalFindings = classificationSummary?.total || findingsData?.total || 0;
    const sensitivePIICount = classificationSummary?.by_type?.['Sensitive Personal Data']?.count || 0;
    // accurate count from backend aggregation (summing Critical and Highest)
    const criticalFindings = (classificationSummary?.by_severity?.['Critical'] || 0) + (classificationSummary?.by_severity?.['Highest'] || 0);

    // Calculate high-risk assets
    const highRiskAssets = lineageData?.nodes.filter(n => n.risk_score >= 70).length || 0;

    // Calculate overall risk score
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

            <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
                <div style={{ marginBottom: '32px' }}>
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
                    <p style={{ color: colors.text.secondary, fontSize: '16px', maxWidth: '800px' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 400px)', gap: '24px', marginTop: '32px' }}>
                    {/* Main Content: Recent/Critical Findings */}
                    <div>
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

                    {/* Sidebar Widget: High Risk Assets */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {classificationSummary && (
                            <ModelHealthCard
                                verified={classificationSummary.verified_count}
                                falsePositive={classificationSummary.false_positive_count}
                            />
                        )}

                        <div>
                            <div style={{ marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Top Risk Assets</h2>
                            </div>
                            {lineageData && (
                                <HighRiskAssetsList
                                    assets={lineageData.nodes}
                                    onAssetClick={(id) => {
                                        // Navigate to Asset Detail or Lineage
                                        window.location.href = `/lineage?assetId=${id}`;
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModelHealthCard({ verified = 0, falsePositive = 0 }: { verified: number; falsePositive: number }) {
    const total = verified + falsePositive;
    const accuracy = total > 0 ? Math.round((verified / total) * 100) : 0;
    const hasData = total > 0;

    return (
        <div
            style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '8px',
            }}
        >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.text.secondary }}>
                    AI Model Health
                </h3>
                {hasData && (
                    <span
                        style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: accuracy >= 90 ? '#16a34a' : accuracy >= 70 ? '#ca8a04' : '#dc2626',
                            background: accuracy >= 90 ? '#dcfce7' : accuracy >= 70 ? '#fef9c3' : '#fee2e2',
                            padding: '2px 8px',
                            borderRadius: '12px'
                        }}
                    >
                        {accuracy >= 90 ? 'Healthy' : accuracy >= 70 ? 'Needs Tuning' : 'Critical'}
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1, color: colors.text.primary }}>
                    {hasData ? `${accuracy}%` : 'N/A'}
                </span>
                <span style={{ fontSize: '14px', color: colors.text.secondary, marginBottom: '6px', fontWeight: 600 }}>
                    Accuracy
                </span>
            </div>

            <p style={{ fontSize: '14px', color: colors.text.muted, margin: 0 }}>
                Based on <strong>{total}</strong> verified feedback samples.
            </p>

            {hasData && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                        <span>{verified} Verified</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ca8a04' }} />
                        <span>{falsePositive} False Positives</span>
                    </div>
                </div>
            )}
        </div>
    );
}
