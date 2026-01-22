import { get } from '@/utils/api-client';
import { ClassificationSummary, Finding } from '@/types';

export interface DashboardMetrics {
    totalPII: number;
    highRiskFindings: number;
    assetsHit: number;
    actionsRequired: number;
}

export interface DashboardFinding {
    id: string;
    assetName: string;
    assetPath: string;
    field: string;
    piiType: string;
    confidence: number;
    risk: 'High' | 'Medium' | 'Low';
    sourceType: 'Database' | 'Filesystem' | 'S3';
}

export interface DashboardData {
    metrics: DashboardMetrics;
    recentFindings: DashboardFinding[];
    riskDistribution: Record<string, number>;
    riskByAsset: Record<string, number>;
    riskByConfidence: Record<string, number>;
    latestScanId: string | null;
}

async function getMetricsFromSummary(summary: ClassificationSummary | null): Promise<DashboardMetrics> {
    if (!summary) {
        return { totalPII: 0, highRiskFindings: 0, assetsHit: 0, actionsRequired: 0 };
    }

    const highRiskCount = summary.by_severity?.['High'] ||
        Object.entries(summary.by_type || {}).reduce((acc, [_, data]) => {
            if (data.count > 0) return acc + data.count;
            return acc;
        }, 0);

    return {
        totalPII: summary.total || 0,
        highRiskFindings: highRiskCount,
        assetsHit: Object.keys(summary.by_type || {}).length,
        actionsRequired: summary.total - (summary.verified_count || 0) - (summary.false_positive_count || 0)
    };
}

async function getRecentFindings(): Promise<DashboardFinding[]> {
    try {
        const response = await get<{ data: { findings: any[], total: number } }>('/findings', {
            page: 1,
            page_size: 10,
            severity: 'High,Medium'
        });

        const findings = response.data?.findings || [];

        return findings.slice(0, 5).map((f: any) => ({
            id: f.id || f.finding_id,
            assetName: f.asset_name || f.asset?.name || 'Unknown Asset',
            assetPath: f.asset_path || f.asset?.path || f.field_name || '',
            field: f.field_name || f.matches?.[0] || '',
            piiType: f.pattern_name || f.classifications?.[0]?.classification_type || 'Unknown',
            confidence: f.confidence_score || f.confidence || 0.85,
            risk: mapSeverityToRisk(f.severity || f.risk),
            sourceType: mapSourceType(f.source_type || f.asset?.asset_type || f.data_source)
        }));
    } catch (error) {
        console.error('Failed to fetch recent findings:', error);
        return getFallbackFindings();
    }
}

function mapSeverityToRisk(severity: string): 'High' | 'Medium' | 'Low' {
    const s = severity?.toLowerCase();
    if (s === 'high' || s === 'critical') return 'High';
    if (s === 'medium') return 'Medium';
    return 'Low';
}

function mapSourceType(sourceType: string): 'Database' | 'Filesystem' | 'S3' {
    if (!sourceType) return 'Database';
    const s = sourceType.toLowerCase();
    if (s.includes('s3') || s.includes('bucket')) return 'S3';
    if (s.includes('fs') || s.includes('file') || s.includes('filesystem')) return 'Filesystem';
    return 'Database';
}

async function getRiskDistribution(): Promise<{
    byPiiType: Record<string, number>;
    byAsset: Record<string, number>;
    byConfidence: Record<string, number>;
}> {
    try {
        const summaryRes = await get<{ data: ClassificationSummary }>('/classification/summary');
        const summary = summaryRes.data;

        const byPiiType: Record<string, number> = {};
        const byAsset: Record<string, number> = {};
        const byConfidence: Record<string, number> = {
            '> 90% (High)': 0,
            '70-90% (Med)': 0,
            '< 70% (Low)': 0
        };

        if (summary?.by_type) {
            for (const [piiType, data] of Object.entries(summary.by_type as Record<string, any>)) {
                byPiiType[piiType] = data.count || 0;
            }
        }

        const findingsRes = await get<{ data: { findings: any[] } }>('/findings', {
            page: 1,
            page_size: 1000
        });

        const findings = findingsRes.data?.findings || [];

        for (const f of findings) {
            const assetName = f.asset_name || f.asset?.name || 'Unknown';
            byAsset[assetName] = (byAsset[assetName] || 0) + 1;

            const conf = f.confidence_score || f.confidence || 0.85;
            if (conf > 0.9) byConfidence['> 90% (High)']++;
            else if (conf >= 0.7) byConfidence['70-90% (Med)']++;
            else byConfidence['< 70% (Low)']++;
        }

        return { byPiiType: byPiiType || {}, byAsset, byConfidence };
    } catch (error) {
        console.error('Failed to fetch risk distribution:', error);
        return {
            byPiiType: { 'Email': 0, 'Phone': 0, 'PAN': 0, 'Aadhaar': 0 },
            byAsset: {},
            byConfidence: { '> 90% (High)': 0, '70-90% (Med)': 0, '< 70% (Low)': 0 }
        };
    }
}

function getFallbackFindings(): DashboardFinding[] {
    return [];
}

export const dashboardApi = {
    async getDashboardData(): Promise<DashboardData> {
        try {
            const [summaryRes, latestScanRes] = await Promise.allSettled([
                get<{ data: ClassificationSummary }>('/classification/summary'),
                get<{ data: any }>('/scans/latest')
            ]);

            const summary = summaryRes.status === 'fulfilled' ? summaryRes.value.data : null;
            const latestScan = latestScanRes.status === 'fulfilled' ? latestScanRes.value.data : null;

            const metrics = await getMetricsFromSummary(summary);
            const [recentFindings, riskDist] = await Promise.all([
                getRecentFindings(),
                getRiskDistribution()
            ]);

            return {
                metrics,
                recentFindings,
                riskDistribution: riskDist.byPiiType,
                riskByAsset: riskDist.byAsset,
                riskByConfidence: riskDist.byConfidence,
                latestScanId: latestScan?.id || latestScan?.scan_id || null
            };
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            throw error;
        }
    }
};

export default dashboardApi;
