'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import AssetInventoryList from '@/modules/assets/AssetInventoryList';
import AssetDetailPanel from '@/modules/assets/AssetDetailPanel';
import LoadingState from '@/components/LoadingState';
import { lineageApi } from '@/services/lineage.api';
import { colors } from '@/design-system/colors';
import { Node } from '@/types';

export default function AssetInventoryPage() {
    const [assets, setAssets] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            // We fetch the semantic graph to get all nodes, then filter for assets
            const graphData = await lineageApi.getSemanticGraph({});
            const assetNodes = graphData.nodes.filter((n: any) => n.type === 'asset' || n.type === 'system');
            setAssets(assetNodes);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssetClick = (assetId: string) => {
        setSelectedAssetId(assetId);
    };

    const handleViewLineage = (assetId: string) => {
        window.location.href = `/lineage?assetId=${assetId}`;
    };

    return (
        <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: colors.background.primary }}>
            <Topbar
                scanTime={new Date().toISOString()}
                environment="Production"
                riskScore={0} // Placeholder or calculate
                onSearch={() => { }}
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
                        Asset Inventory
                    </h1>
                    <p style={{ color: colors.text.secondary, fontSize: '16px' }}>
                        Comprehensive list of all systems and data assets tracked by ARC-Hawk.
                    </p>
                </div>

                {loading ? (
                    <LoadingState message="Loading assets..." />
                ) : (
                    <AssetInventoryList
                        assets={assets}
                        onAssetClick={handleAssetClick}
                    />
                )}
            </div>

            <AssetDetailPanel
                asset={assets.find(a => a.id === selectedAssetId) || null}
                isOpen={!!selectedAssetId}
                onClose={() => setSelectedAssetId(null)}
                onViewLineage={handleViewLineage}
            />
        </div>
    );
}
