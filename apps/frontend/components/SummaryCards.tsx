import React from 'react';

interface SummaryCardsProps {
    totalFindings?: number;
    sensitivePIICount?: number;
    highRiskAssets?: number;
    criticalFindings?: number;
}

export default function SummaryCards({
    totalFindings = 0,
    sensitivePIICount = 0,
    highRiskAssets = 0,
    criticalFindings = 0,
}: SummaryCardsProps) {
    return (
        <div className="summary-cards">
            <div className="card">
                <div className="card-label">Total Findings</div>
                <div className="card-value">{totalFindings.toLocaleString()}</div>
                <div className="card-subtitle">Across all assets</div>
            </div>

            <div className="card">
                <div className="card-label">Sensitive PII</div>
                <div className="card-value" style={{ color: 'var(--risk-high)' }}>
                    {sensitivePIICount.toLocaleString()}
                </div>
                <div className="card-subtitle">Requires consent & protection</div>
            </div>

            <div className="card">
                <div className="card-label">High-Risk Assets</div>
                <div className="card-value" style={{ color: 'var(--risk-medium)' }}>
                    {highRiskAssets.toLocaleString()}
                </div>
                <div className="card-subtitle">Risk score ≥ 70</div>
            </div>

            <div className="card">
                <div className="card-label">Critical Findings</div>
                <div className="card-value" style={{ color: 'var(--risk-critical)' }}>
                    {criticalFindings.toLocaleString()}
                </div>
                <div className="card-subtitle">Immediate attention required</div>
            </div>
        </div>
    );
}
