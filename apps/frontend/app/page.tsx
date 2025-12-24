'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import SummaryCards from '@/components/SummaryCards';
import LineageGraph from '@/components/LineageGraph';
import FindingsTable from '@/components/FindingsTable';
import AssetDetailsPanel from '@/components/AssetDetailsPanel';
import { api } from '@/utils/api';
import {
    LineageGraph as LineageGraphType,
    FindingsResponse,
    ClassificationSummary,
} from '@/types';
import './globals.css';

export default function DashboardPage() {
    const [lineageData, setLineageData] = useState<LineageGraphType | null>(null);
    const [findingsData, setFindingsData] = useState<FindingsResponse | null>(null);
    const [classificationSummary, setClassificationSummary] = useState<ClassificationSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState<{ severity?: string; search?: string }>({});

    // V2 State
    const [lineageLevel, setLineageLevel] = useState('asset');
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [lineageLevel]); // Refetch when level changes

    useEffect(() => {
        fetchFindings();
    }, [currentPage, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [lineage, classification] = await Promise.all([
                api.getLineage({ level: lineageLevel }),
                api.getClassificationSummary(),
            ]);

            setLineageData(lineage);
            setClassificationSummary(classification);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Failed to fetch data from backend. Make sure the server is running.');
        } finally {
            setLoading(false);
        }
    };

    const fetchFindings = async () => {
        try {
            const findings = await api.getFindings({
                page: currentPage,
                page_size: 20,
                severity: filters.severity,
                pattern_name: filters.search,
            });

            setFindingsData(findings);
        } catch (err: any) {
            console.error('Error fetching findings:', err);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleFilterChange = (newFilters: { severity?: string; search?: string }) => {
        setFilters(newFilters);
        setCurrentPage(1); // Reset to first page when filters change
    };

    // Calculate metrics
    const totalFindings = findingsData?.total || 0;
    const sensitivePIICount = classificationSummary?.by_type?.['Sensitive Personal Data']?.count || 0;
    const criticalFindings = findingsData?.findings.filter(f => f.severity === 'Critical').length || 0;

    // Estimate high-risk assets (would ideally come from a separate API call)
    const highRiskAssets = lineageData?.nodes.filter(n => n.risk_score >= 70).length || 0;

    // Calculate overall risk score
    const avgRiskScore = lineageData?.nodes.length
        ? Math.round(lineageData.nodes.reduce((sum, n) => sum + n.risk_score, 0) / lineageData.nodes.length)
        : 0;

    if (loading && !lineageData) {
        return (
            <div>
                <Header />
                <div className="container">
                    <div className="loading">Loading dashboard data...</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header
                scanTime={new Date().toISOString()}
                environment="Production"
                riskScore={avgRiskScore}
            />

            <div className="container">
                {error && (
                    <div className="error">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <SummaryCards
                    totalFindings={totalFindings}
                    sensitivePIICount={sensitivePIICount}
                    highRiskAssets={highRiskAssets}
                    criticalFindings={criticalFindings}
                />

                {lineageData && (
                    <LineageGraph
                        nodes={lineageData.nodes}
                        edges={lineageData.edges}
                        level={lineageLevel}
                        onLevelChange={setLineageLevel}
                        onNodeClick={setSelectedAssetId}
                    />
                )}

                {findingsData && (
                    <FindingsTable
                        findings={findingsData.findings}
                        total={findingsData.total}
                        page={findingsData.page}
                        pageSize={findingsData.page_size}
                        totalPages={findingsData.total_pages}
                        onPageChange={handlePageChange}
                        onFilterChange={handleFilterChange}
                    />
                )}

                {selectedAssetId && (
                    <AssetDetailsPanel
                        assetId={selectedAssetId}
                        onClose={() => setSelectedAssetId(null)}
                    />
                )}
            </div>
        </div>
    );
}
