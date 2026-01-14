'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import AssetTable from '@/components/AssetTable';
import LoadingState from '@/components/LoadingState';
import { assetsApi } from '@/services/assets.api';
import { theme } from '@/design-system/theme';
import { Asset } from '@/types';
import { useRouter } from 'next/navigation';

export default function AssetInventoryPage() {
    const router = useRouter();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const response = await assetsApi.getAssets({ page: 1, page_size: 50 });
            setAssets(response.assets);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssetClick = (assetId: string) => {
        router.push(`/assets/${assetId}`);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
            <Topbar
                scanTime={new Date().toISOString()} // Todo: fetch real scan time
                environment="Production"
            />

            <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        color: theme.colors.text.primary,
                        marginBottom: '8px',
                        letterSpacing: '-0.02em',
                    }}>
                        Asset Inventory
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: theme.colors.background.tertiary,
                            color: theme.colors.text.secondary,
                            fontSize: '12px',
                            fontWeight: 700
                        }}>
                            Total: {total}
                        </span>
                        <span style={{ color: theme.colors.text.muted, fontSize: '14px' }}>
                            Canonical source of truth for all tracked data assets.
                        </span>
                    </div>
                </div>

                {loading ? (
                    <LoadingState message="Syncing Asset Inventory..." />
                ) : (
                    <AssetTable
                        assets={assets}
                        total={total}
                        loading={loading}
                        onAssetClick={handleAssetClick}
                    />
                )}
            </div>
        </div>
    );
}
