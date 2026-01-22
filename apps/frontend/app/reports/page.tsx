'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import { theme } from '@/design-system/theme';
import Topbar from '@/components/Topbar';

import { exportToCSV } from '@/utils/export';
import { findingsApi } from '@/services/findings.api';
import { assetsApi } from '@/services/assets.api';

interface ReportMetrics {
    totalFindings: number;
    criticalFindings: number;
    assetsScanned: number;
    complianceScore: number;
    generatedAt: string;
}

export default function ReportsPage() {
    const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchReportMetrics();
    }, []);

    const fetchReportMetrics = async () => {
        try {
            // Get metrics from multiple APIs
            const [findingsRes, assetsRes] = await Promise.all([
                findingsApi.getFindings({ page_size: 1000 }),
                assetsApi.getAssets({ page_size: 1000 })
            ]);

            const totalFindings = findingsRes.total || 0;
            const criticalFindings = findingsRes.findings?.filter(f => f.severity === 'Critical').length || 0;
            const assetsScanned = assetsRes.total || 0;

            // Calculate compliance score based on findings (simplified)
            const complianceScore = Math.max(0, 100 - (totalFindings * 2));

            setMetrics({
                totalFindings,
                criticalFindings,
                assetsScanned,
                complianceScore,
                generatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCSV = async (reportType: string) => {
        setGenerating(true);
        try {
            let data: any[] = [];
            let filename = '';

            switch (reportType) {
                case 'findings':
                    const findingsResult = await findingsApi.getFindings({ page_size: 1000 });
                    data = findingsResult.findings || [];
                    filename = 'findings_report';
                    break;
                case 'assets':
                    const assetsResult = await assetsApi.getAssets({ page_size: 1000 });
                    data = assetsResult.assets || [];
                    filename = 'assets_report';
                    break;
                case 'compliance':
                    // Generate compliance summary
                    data = [{
                        report_type: 'Compliance Summary',
                        generated_at: new Date().toISOString(),
                        compliance_score: metrics?.complianceScore || 0,
                        total_findings: metrics?.totalFindings || 0,
                        critical_findings: metrics?.criticalFindings || 0,
                        assets_scanned: metrics?.assetsScanned || 0
                    }];
                    filename = 'compliance_summary';
                    break;
            }

            exportToCSV(data, filename);
        } catch (e) {
            console.error(e);
            alert('Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
            <Topbar />
            <div className="container" style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.colors.text.primary, marginBottom: '8px', letterSpacing: '-0.02em' }}>
                                Compliance Reports
                            </h1>
                            <p style={{ color: theme.colors.text.secondary, fontSize: '16px' }}>
                                Generate and export detailed compliance and risk assessment reports
                            </p>
                        </div>
                        <div style={{ fontSize: '14px', color: theme.colors.text.muted }}>
                            Last updated: {metrics?.generatedAt ? new Date(metrics.generatedAt).toLocaleString() : 'Loading...'}
                        </div>
                    </div>
                </div>

                {/* Metrics Overview */}
                {metrics && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
                        <MetricCard
                            title="Compliance Score"
                            value={`${Math.round(metrics.complianceScore)}%`}
                            subtitle="Overall posture"
                            color={metrics.complianceScore > 80 ? theme.colors.status.success : theme.colors.status.warning}
                            icon="🛡️"
                        />
                        <MetricCard
                            title="Total Findings"
                            value={metrics.totalFindings.toLocaleString()}
                            subtitle="PII detections"
                            color={theme.colors.status.info}
                            icon="🔍"
                        />
                        <MetricCard
                            title="Critical Issues"
                            value={metrics.criticalFindings.toLocaleString()}
                            subtitle="High-risk findings"
                            color={theme.colors.risk.critical}
                            icon="⚠️"
                        />
                        <MetricCard
                            title="Assets Scanned"
                            value={metrics.assetsScanned.toLocaleString()}
                            subtitle="Data sources"
                            color={theme.colors.primary.DEFAULT}
                            icon="📦"
                        />
                    </div>
                )}

                {/* Report Types */}
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: theme.colors.text.primary, marginBottom: '20px' }}>
                        Generate Reports
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                        <ReportCard
                            title="Compliance Executive Summary"
                            description="High-level overview of risk trends, remediation actions, and compliance posture for executive stakeholders."
                            icon={<FileText style={{ width: '20px', height: '20px' }} />}
                            color={theme.colors.primary.DEFAULT}
                            onDownload={() => handleDownloadCSV('compliance')}
                            loading={generating}
                            features={['Executive metrics', 'Risk trends', 'Compliance score', 'PDF format']}
                        />
                        <ReportCard
                            title="Technical Findings Report"
                            description="Detailed breakdown of all PII detections with technical details for remediation teams."
                            icon={<AlertTriangle style={{ width: '20px', height: '20px' }} />}
                            color={theme.colors.risk.high}
                            onDownload={() => handleDownloadCSV('findings')}
                            loading={generating}
                            features={['All findings', 'Technical details', 'Severity levels', 'CSV/Excel format']}
                        />
                        <ReportCard
                            title="Asset Inventory Report"
                            description="Complete catalog of scanned assets with risk scores and compliance status."
                            icon={<Shield style={{ width: '20px', height: '20px' }} />}
                            color={theme.colors.primary.DEFAULT}
                            onDownload={() => handleDownloadCSV('assets')}
                            loading={generating}
                            features={['Asset catalog', 'Risk assessment', 'Compliance status', 'Multiple formats']}
                        />
                        <ReportCard
                            title="Trend Analysis Report"
                            description="Historical analysis of PII exposure trends and remediation effectiveness over time."
                            icon={<TrendingUp style={{ width: '20px', height: '20px' }} />}
                            color={theme.colors.status.info}
                            onDownload={() => handleDownloadCSV('trend')}
                            loading={false}
                            features={['Historical data', 'Trend analysis', 'Effectiveness metrics', 'Visual charts']}
                        />
                    </div>
                </div>

                {/* Report Archive */}
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: theme.colors.text.primary, marginBottom: '20px' }}>
                        Report Archive
                    </h2>
                    <div style={{
                        backgroundColor: theme.colors.background.card,
                        border: `1px solid ${theme.colors.border.default}`,
                        borderRadius: '12px',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '24px', borderBottom: `1px solid ${theme.colors.border.default}` }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: theme.colors.text.primary, margin: 0 }}>
                                Recent Reports
                            </h3>
                            <p style={{ fontSize: '13px', color: theme.colors.text.secondary, marginTop: '4px' }}>
                                Previously generated reports and scheduled exports
                            </p>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: theme.colors.background.tertiary }}>
                                        <th style={tableHeaderStyle}>Report Name</th>
                                        <th style={tableHeaderStyle}>Generated</th>
                                        <th style={tableHeaderStyle}>Type</th>
                                        <th style={tableHeaderStyle}>Format</th>
                                        <th style={tableHeaderStyle}>Size</th>
                                        <th style={tableHeaderStyle}>Status</th>
                                        <th style={tableHeaderStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { name: 'Compliance_Summary_Jan_2026', date: '2026-01-15', type: 'Executive', format: 'PDF', size: '2.4 MB', status: 'Ready' },
                                        { name: 'Findings_Detailed_Report', date: '2026-01-14', type: 'Technical', format: 'CSV', size: '1.8 MB', status: 'Ready' },
                                        { name: 'Asset_Risk_Assessment', date: '2026-01-13', type: 'Inventory', format: 'Excel', size: '3.1 MB', status: 'Ready' },
                                        { name: 'Monthly_Trend_Analysis', date: '2026-01-10', type: 'Analytics', format: 'PDF', size: '4.2 MB', status: 'Processing' },
                                    ].map((report, i) => (
                                        <tr key={i} style={{
                                            borderBottom: `1px solid ${theme.colors.border.subtle}`,
                                            transition: 'background 0.2s'
                                        }}>
                                            <td style={tableCellStyle}>
                                                <div style={{ fontWeight: 600, color: theme.colors.text.primary }}>
                                                    {report.name.replace(/_/g, ' ')}
                                                </div>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <div style={{ fontSize: '13px', color: theme.colors.text.secondary }}>
                                                    {new Date(report.date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: theme.colors.background.tertiary,
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: theme.colors.text.secondary
                                                }}>
                                                    {report.type}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: getFormatColor(report.format),
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: '#fff'
                                                }}>
                                                    {report.format}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <span style={{ fontSize: '13px', color: theme.colors.text.secondary, fontFamily: 'monospace' }}>
                                                    {report.size}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    backgroundColor: report.status === 'Ready' ? `${theme.colors.status.success}20` : `${theme.colors.status.warning}20`,
                                                    color: report.status === 'Ready' ? theme.colors.status.success : theme.colors.status.warning
                                                }}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td style={tableCellStyle}>
                                                {report.status === 'Ready' ? (
                                                    <button style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        border: `1px solid ${theme.colors.primary.DEFAULT}`,
                                                        backgroundColor: 'transparent',
                                                        color: theme.colors.primary.DEFAULT,
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}>
                                                        Download
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '12px', color: theme.colors.text.muted }}>
                                                        Processing...
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, subtitle, color, icon }: any) {
    return (
        <div style={{
            backgroundColor: theme.colors.background.card,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border.default}`,
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                bottom: 0,
                backgroundColor: color
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: theme.colors.text.secondary }}>
                    {title}
                </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color, marginBottom: '4px' }}>
                {value}
            </div>
            <div style={{ fontSize: '13px', color: theme.colors.text.muted }}>
                {subtitle}
            </div>
        </div>
    );
}

function ReportCard({ title, description, icon, color, onDownload, loading, features }: any) {
    return (
        <div style={{
            backgroundColor: theme.colors.background.card,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border.default}`,
            padding: '24px',
            transition: 'all 0.2s',
            cursor: 'pointer'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 25px rgba(0,0,0,0.3)`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: `${color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color
                }}>
                    {icon}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.colors.text.primary, margin: 0 }}>
                    {title}
                </h3>
            </div>

            <p style={{ fontSize: '14px', color: theme.colors.text.secondary, marginBottom: '20px', lineHeight: '1.5' }}>
                {description}
            </p>

            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: theme.colors.text.muted, marginBottom: '8px' }}>
                    Includes:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {features.map((feature: string, i: number) => (
                        <span key={i} style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: theme.colors.background.tertiary,
                            fontSize: '11px',
                            color: theme.colors.text.secondary
                        }}>
                            {feature}
                        </span>
                    ))}
                </div>
            </div>

            <button
                onClick={onDownload}
                disabled={loading}
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: loading ? theme.colors.background.tertiary : color,
                    color: loading ? theme.colors.text.muted : '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                }}
            >
                {loading ? (
                    <>
                        <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid currentColor',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                        Generating...
                    </>
                ) : (
                    <>
                        <Download style={{ width: '16px', height: '16px' }} />
                        Generate Report
                    </>
                )}
            </button>
        </div>
    );
}

const tableHeaderStyle: React.CSSProperties = {
    padding: '16px 20px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 700,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${theme.colors.border.default}`
};

const tableCellStyle: React.CSSProperties = {
    padding: '16px 20px',
    fontSize: '14px',
    color: theme.colors.text.primary
};

function getFormatColor(format: string) {
    switch (format.toLowerCase()) {
        case 'pdf': return '#DC2626'; // red
        case 'csv': return '#059669'; // green
        case 'excel': return '#2563EB'; // blue
        default: return theme.colors.text.secondary;
    }
}
