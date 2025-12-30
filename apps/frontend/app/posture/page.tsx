'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';
import LoadingState from '@/components/LoadingState';
import { classificationApi } from '@/services/classification.api';
import { colors } from '@/design-system/colors';
import type { ClassificationSummary } from '@/types';

export default function PosturePage() {
    const [summary, setSummary] = useState<ClassificationSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await classificationApi.getSummary();
                setSummary(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <LoadingState fullScreen message="Loading security posture..." />;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.background.primary }}>
            <Topbar environment="Production" />

            <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: colors.text.primary, marginBottom: '24px' }}>
                    Security Posture
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card title="Total Findings" value={summary?.total || 0} />
                    <Card title="High Confidence" value={summary?.high_confidence_count || 0} color="text-green-600" />
                    <Card title="Requires Consent" value={summary?.requiring_consent_count || 0} color="text-orange-600" />
                    <Card title="Verified" value={summary?.verified_count || 0} color="text-blue-600" />
                </div>

                {/* Detailed breakdown can go here */}
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-lg mb-4">Data Categories</h3>
                    <pre className="bg-slate-50 p-4 rounded text-sm overflow-auto">
                        {JSON.stringify(summary?.dpdpa_categories, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
}

function Card({ title, value, color = 'text-slate-900' }: { title: string, value: number, color?: string }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-sm text-slate-500 font-medium mb-1">{title}</div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
        </div>
    );
}
