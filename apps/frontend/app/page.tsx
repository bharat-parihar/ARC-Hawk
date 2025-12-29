'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import SummaryCards from '@/components/SummaryCards';
import HighRiskAssetsList from '@/components/dashboard/HighRiskAssetsList';
import FindingsTable from '@/components/FindingsTable';
import LoadingState from '@/components/LoadingState';
import { api } from '@/utils/api';
import { lineageApi } from '@/services/lineage.api';
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

    useEffect(() => {
        fetchData();
        fetchFindings();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [classification, graphData] = await Promise.all([
                api.getClassificationSummary(),
                // We still need basic asset data for stats, even if we don't render the big graph
                lineageApi.getSemanticGraph({})
            ]);

            setLineageData(graphData);
            setClassificationSummary(classification);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Failed to fetch dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    const fetchFindings = async () => {
        try {
            const findings = await api.getFindings({
                page: 1,
                page_size: 10, // Limit to 10 for overview
            });
            setFindingsData(findings);
        } catch (err: any) {
            console.error('Error fetching findings:', err);
        }
    };

    // Calculate metrics
    const totalFindings = findingsData?.total || 0;
    const sensitivePIICount = classificationSummary?.by_type?.['Sensitive Personal Data']?.count || 0;
    const criticalFindings = findingsData?.findings.filter(f => f.severity === 'Critical').length || 0;

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
                scanTime={new Date().toISOString()}
                environment="Production"
                riskScore={avgRiskScore}
                onSearch={() => { }} // Search to be connected later
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
                    <p style={{ color: colors.text.secondary, fontSize: '16px' }}>
                        Executive summary of data privacy and security posture.
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
                                page={1}
                                pageSize={10}
                                totalPages={1}
                                onPageChange={() => { }}
                                onFilterChange={() => { }}
                            />
                        ) : (
                            <LoadingState message="Loading findings..." />
                        )}
                    </div>

                    {/* Sidebar Widget: High Risk Assets */}
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
    );
}
