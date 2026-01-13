'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import SummaryCards from '@/components/SummaryCards';
import FindingsTable from '@/components/FindingsTable';
import InfoPanel from '@/components/InfoPanel';
import LineageCanvas from '@/modules/lineage/LineageCanvas';
import LoadingState from '@/components/LoadingState';
import { lineageApi } from '@/services/lineage.api';
import { findingsApi } from '@/services/findings.api';
import { classificationApi } from '@/services/classification.api';
import type {
    ClassificationSummary,
    FindingsResponse,
} from '@/types';
import type { LineageGraphData, LineageNode } from '@/modules/lineage/lineage.types';
import { colors } from '@/design-system/colors';
import { theme } from '@/design-system/themes';

export default function DashboardPage() {
    const [lineageData, setLineageData] = useState<LineageGraphData | null>(null);
    const [findingsData, setFindingsData] = useState<FindingsResponse | null>(null);
    const [classificationSummary, setClassificationSummary] = useState<ClassificationSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Graph state
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [focusedAssetId, setFocusedAssetId] = useState<string | null>(null);

    useEffect(() => {
        // Parse URL params for assetId
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const assetId = params.get('assetId');
            if (assetId) {
                setFocusedAssetId(assetId);
                // Also set lineagemode if needed? Semantic graph supports full search.
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        fetchFindings();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const dataPromises: Promise<any>[] = [
                classificationApi.getSummary(),
                lineageApi.getLineage(undefined, undefined),
            ];

            const [classification, graphData] = await Promise.all(dataPromises);

            setLineageData(graphData);
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
            const findings = await findingsApi.getFindings({
                page: 1,
                page_size: 20,
            });

            setFindingsData({
                findings: findings.findings,
                total: findings.total,
                page: 1,
                page_size: 20,
                total_pages: Math.ceil(findings.total / 20)
            });
        } catch (err: any) {
            console.error('Error fetching findings:', err);
        }
    };



    // Calculate metrics
    const totalFindings = findingsData?.total || 0;
    const sensitivePIICount = classificationSummary?.by_type?.['Sensitive Personal Data']?.count || 0;
    const criticalFindings = findingsData?.findings.filter(f => f.severity === 'Critical').length || 0;

    // Calculate high-risk assets
    const highRiskAssets = lineageData?.nodes?.filter(n => {
        if (n.type === 'asset' && 'risk_score' in n.metadata) {
            return (n.metadata.risk_score as number) >= 70;
        }
        return false;
    }).length || 0;

    // Calculate overall risk score
    const avgRiskScore = lineageData?.nodes?.length
        ? Math.round(lineageData.nodes.reduce((sum, n) => {
            if (n.type === 'asset' && 'risk_score' in n.metadata) {
                return sum + (n.metadata.risk_score as number);
            }
            return sum;
        }, 0) / lineageData.nodes.length)
        : 0;

    // Filter nodes based on search
    const [searchQuery, setSearchQuery] = useState('');

    const filteredNodes = React.useMemo(() => {
        const nodes = lineageData?.nodes || [];
        if (!searchQuery) return nodes;
        const lower = searchQuery.toLowerCase();
        return nodes.filter(n =>
            n.label.toLowerCase().includes(lower) ||
            n.type.toLowerCase().includes(lower)
        );
    }, [lineageData, searchQuery]);

    // Filter edges to only those connecting visible nodes
    const filteredEdges = React.useMemo(() => {
        const edges = lineageData?.edges || [];
        if (!searchQuery) return edges;
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        return edges.filter(e =>
            nodeIds.has(e.source) && nodeIds.has(e.target)
        );
    }, [lineageData, filteredNodes, searchQuery]);

    if (loading && !lineageData) {
        return <LoadingState fullScreen message="Loading ARC-Hawk dashboard..." />;
    }

    return (
        <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: colors.background.primary }}>
            <Topbar
                scanTime={new Date().toISOString()}
                environment="Production"
                riskScore={avgRiskScore}
                onSearch={setSearchQuery}
            />

            <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto', height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
                {error && (
                    <div
                        style={{
                            padding: '16px 24px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '12px',
                            color: '#B91C1C',
                            marginBottom: '24px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Lineage Graph Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Section Header */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px',
                        }}
                    >
                        <h2
                            style={{
                                fontSize: '24px',
                                fontWeight: 800,
                                color: colors.text.primary,
                                margin: 0,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Data Lineage
                        </h2>

                        <span
                            style={{
                                fontSize: '14px',
                                color: colors.text.secondary,
                                fontWeight: 600,
                                backgroundColor: colors.background.surface,
                                padding: '6px 12px',
                                borderRadius: '20px',
                                border: `1px solid ${colors.border.subtle}`,
                            }}
                        >
                            🔗 Neo4j Semantic Graph
                        </span>
                    </div>

                    {/* Lineage Canvas */}
                    {lineageData ? (
                        <div style={{
                            flex: 1,
                            border: `1px solid ${colors.border.strong}`,
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}>
                            <LineageCanvas
                                nodes={filteredNodes}
                                edges={filteredEdges}
                                onNodeClick={setSelectedNodeId}
                                focusedNodeId={focusedAssetId}
                            />
                        </div>
                    ) : (
                        <LoadingState message="Initializing visualization..." />
                    )}
                </div>

                {/* Findings Table moved to /findings page */}
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <a href="/findings" className="text-blue-600 hover:underline text-sm font-medium">
                        View Detailed Findings &rarr;
                    </a>
                </div>

                {/* InfoPanel */}
                {selectedNodeId && (
                    <InfoPanel
                        nodeId={selectedNodeId}
                        nodeData={lineageData?.nodes.find(n => n.id === selectedNodeId)}
                        onClose={() => setSelectedNodeId(null)}
                    />
                )}
            </div>

            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
