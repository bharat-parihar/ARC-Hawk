'use client';

import React from 'react';
import SummaryCards from '@/components/SummaryCards';
import SpecificFindingsSnapshot from '@/components/dashboard/SpecificFindingsSnapshot';
import RiskDistribution from '@/components/dashboard/RiskDistribution';

// Mock Data for Dashboard
const DASHBOARD_DATA = {
    metrics: {
        totalPII: 12480,
        highRiskFindings: 2130,
        assetsHit: 14,
        actionsRequired: 417,
    },
    recentFindings: [
        {
            id: 'f1',
            assetName: 'DB-Prod',
            assetPath: 'users.profile.pan_number',
            field: 'pan_number',
            piiType: 'PAN',
            confidence: 0.96,
            risk: 'High' as const,
            sourceType: 'Database' as const,
        },
        {
            id: 'f2',
            assetName: 'FS-Backup',
            assetPath: '/exports/2023.csv',
            field: 'content',
            piiType: 'Aadhaar',
            confidence: 0.93,
            risk: 'High' as const,
            sourceType: 'Filesystem' as const,
        },
        {
            id: 'f3',
            assetName: 'S3-Logs',
            assetPath: 'payments/transaction_logs/jan_2024.log',
            field: 'message',
            piiType: 'UPI ID',
            confidence: 0.91,
            risk: 'High' as const,
            sourceType: 'S3' as const,
        },
        {
            id: 'f4',
            assetName: 'DB-Prod',
            assetPath: 'users.contacts.primary_email',
            field: 'email',
            piiType: 'Email',
            confidence: 0.89,
            risk: 'Medium' as const,
            sourceType: 'Database' as const,
        },
    ],
    riskDistribution: {
        'PAN': 156,
        'Aadhaar': 89,
        'Email': 2400,
        'Phone': 1200,
        'Credit Card': 45,
    },
    riskByAsset: {
        'DB-Prod.users': 4500,
        'S3-Logs.payments': 3200,
        'FS-Backup.exports': 1800,
        'DB-Prod.orders': 1200,
        'S3-Logs.audit': 800,
    },
    riskByConfidence: {
        '> 90% (High)': 8500,
        '70-90% (Med)': 3200,
        '< 70% (Low)': 780,
    }
};

export default function Home() {
    return (
        <div className="p-8 space-y-8">
            {/* Header section with scan info could go here or be part of layout */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                    <p className="text-slate-400">Overview of latest compliance scan results.</p>
                </div>
                <div className="text-sm text-slate-500">
                    Latest Scan: <span className="text-blue-400 font-mono font-medium">ARC_SCAN_2026_01_21</span>
                </div>
            </div>

            {/* Metrics Cards */}
            <SummaryCards
                totalPII={DASHBOARD_DATA.metrics.totalPII}
                highRiskFindings={DASHBOARD_DATA.metrics.highRiskFindings}
                assetsHit={DASHBOARD_DATA.metrics.assetsHit}
                actionsRequired={DASHBOARD_DATA.metrics.actionsRequired}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Specific Findings Snapshot - Takes up 2 columns */}
                <div className="lg:col-span-2 h-[400px]">
                    <SpecificFindingsSnapshot findings={DASHBOARD_DATA.recentFindings} />
                </div>

                {/* Risk Distribution - Takes up 1 column */}
                <div className="lg:col-span-1 h-[400px]">
                    <RiskDistribution
                        byPiiType={DASHBOARD_DATA.riskDistribution}
                        byAsset={DASHBOARD_DATA.riskByAsset}
                        byConfidence={DASHBOARD_DATA.riskByConfidence}
                    />
                </div>
            </div>
        </div>
    );
}
