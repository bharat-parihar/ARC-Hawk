'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import AssetTable from '@/components/AssetTable';
import LoadingState from '@/components/LoadingState';
import { assetsApi } from '@/services/assets.api';
import { colors } from '@/design-system/colors';
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
        <div style={{ minHeight: '100vh', backgroundColor: colors.background.primary }}>
            <Topbar
                scanTime={new Date().toISOString()} // Todo: fetch real scan time
                environment="Production"
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
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                            Total: {total}
                        </span>
                        <span className="text-slate-500 text-sm">
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
