'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import FindingsTable from '@/components/FindingsTable';
import LoadingState from '@/components/LoadingState';
import { assetsApi } from '@/services/assets.api';
import { findingsApi } from '@/services/findings.api';
import { colors } from '@/design-system/colors';
import { Asset, FindingsResponse } from '@/types';

export default function AssetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [asset, setAsset] = useState<Asset | null>(null);
    const [findingsData, setFindingsData] = useState<FindingsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<'findings' | 'lineage' | 'metadata'>('findings');

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [assetData, findingsRes] = await Promise.all([
                assetsApi.getAsset(id),
                findingsApi.getFindings({ asset_id: id, page: 1, page_size: 50 })
            ]);

            setAsset(assetData);
            // @ts-ignore
            setFindingsData(findingsRes as FindingsResponse);

        } catch (err: any) {
            console.error('Error fetching asset details:', err);
            setError('Failed to load asset details.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingState fullScreen message="Loading Asset Details..." />;
    if (error || !asset) return (
        <div style={{ padding: '32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>Error</h2>
            <p style={{ color: '#475569' }}>{error || 'Asset not found'}</p>
            <button
                onClick={() => router.push('/')} // Back to Dashboard for now as inventory list might not utilize page router yet
                style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    backgroundColor: '#1e293b',
                    color: 'white',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                }}
            >
                Back to Dashboard
            </button>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background.primary }}>
            <Topbar environment="Production" />

            <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
                {/* Header / Breadcrumb */}
                <button
                    onClick={() => router.push('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: colors.text.secondary,
                        marginBottom: '24px',
                        fontSize: '14px',
                        fontWeight: 500,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    ← Back to Dashboard
                </button>

                {/* Asset Header Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: `1px solid ${colors.border.default}`,
                    padding: '32px',
                    marginBottom: '32px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: colors.text.secondary,
                                    backgroundColor: colors.background.surface,
                                    padding: '4px 8px',
                                    borderRadius: '4px'
                                }}>
                                    {asset.asset_type}
                                </span>
                                <span style={{ color: '#94a3b8', fontSize: '14px' }}>{asset.id}</span>
                            </div>
                            <h1 style={{ fontSize: '32px', fontWeight: 800, color: colors.text.primary, marginBottom: '12px' }}>
                                {asset.name}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '14px', color: colors.text.secondary, fontWeight: 500 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🏢 System:</span>
                                    <span style={{ color: colors.text.primary }}>{asset.source_system}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>👤 Owner:</span>
                                    <span style={{ color: colors.text.primary }}>{asset.owner || 'Unassigned'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>📍 Path:</span>
                                    <span style={{
                                        fontFamily: 'monospace',
                                        backgroundColor: '#f8fafc',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '12px'
                                    }}>
                                        {asset.path}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', color: colors.text.secondary, marginBottom: '4px', fontWeight: 600 }}>Risk Score</div>
                            <div style={{
                                fontSize: '48px',
                                fontWeight: 900,
                                lineHeight: 1,
                                color: asset.risk_score >= 90 ? '#dc2626' : asset.risk_score >= 70 ? '#f97316' : '#334155'
                            }}>
                                {asset.risk_score}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: `1px solid ${colors.border.default}` }}>
                    <TabButton
                        active={activeTab === 'findings'}
                        onClick={() => setActiveTab('findings')}
                        label={`Findings (${asset.total_findings})`}
                    />
                    <TabButton
                        active={activeTab === 'lineage'}
                        onClick={() => setActiveTab('lineage')}
                        label="Lineage Graph"
                    />
                    <TabButton
                        active={activeTab === 'metadata'}
                        onClick={() => setActiveTab('metadata')}
                        label="Metadata"
                    />
                </div>

                {/* Content */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: `1px solid ${colors.border.default}`,
                    padding: '24px',
                    minHeight: '400px'
                }}>
                    {activeTab === 'findings' && (
                        findingsData ? (
                            <FindingsTable
                                findings={findingsData.findings}
                                total={findingsData.total}
                                page={1}
                                pageSize={50}
                                totalPages={1}
                                onPageChange={() => { }}
                                onFilterChange={() => { }}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>No findings loaded.</div>
                        )
                    )}

                    {activeTab === 'lineage' && (
                        <div style={{ textAlign: 'center', padding: '48px' }}>
                            <p style={{ color: colors.text.secondary, marginBottom: '16px' }}>Visualize how data flows into and out of this asset.</p>
                            <button
                                onClick={() => router.push(`/lineage?assetId=${asset.id}`)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                            >
                                🔗 Open Lineage Graph
                            </button>
                        </div>
                    )}

                    {activeTab === 'metadata' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                            <div>
                                <h3 style={{ fontWeight: 700, color: colors.text.primary, marginBottom: '16px' }}>Technical Metadata</h3>
                                <pre style={{
                                    backgroundColor: '#f8fafc',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    overflow: 'auto',
                                    border: '1px solid #e2e8f0',
                                    color: '#334155'
                                }}>
                                    {JSON.stringify(asset.file_metadata || {}, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, color: colors.text.primary, marginBottom: '16px' }}>System Info</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Host</span>
                                        <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{asset.host}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Last Scanned</span>
                                        <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{new Date(asset.updated_at).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Environment</span>
                                        <span style={{ fontWeight: 500, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>{asset.environment}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                color: active ? '#2563eb' : '#64748b',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
        >
            {label}
        </button>
    );
}
