'use client';

import React, { useEffect, useState } from 'react';
import { assetsApi } from '@/services/assets.api';

interface AssetDetailsPanelProps {
    assetId: string;
    onClose: () => void;
}

export default function AssetDetailsPanel({ assetId, onClose }: AssetDetailsPanelProps) {
    const [asset, setAsset] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAsset = async () => {
            setLoading(true);
            try {
                const data = await assetsApi.getAsset(assetId);
                setAsset(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (assetId) fetchAsset();
    }, [assetId]);

    if (!assetId) return null;

    return (
        <div className="asset-panel">
            <div className="panel-header">
                <h2>Asset Details</h2>
                <button onClick={onClose} className="close-btn">×</button>
            </div>

            {loading ? (
                <div className="loading-state">Loading details...</div>
            ) : asset ? (
                <div className="panel-content">
                    <div className="detail-group">
                        <label>Name</label>
                        <div className="value primary">{asset.name}</div>
                    </div>

                    <div className="detail-group">
                        <label>Type</label>
                        <div className="value">{asset.asset_type}</div>
                    </div>

                    <div className="detail-group">
                        <label>Environment</label>
                        <div className="value">
                            <span className={`tag ${asset.environment === 'Production' ? 'tag-critical' : 'tag-low'}`}>
                                {asset.environment || 'Unknown'}
                            </span>
                        </div>
                    </div>

                    <div className="detail-group">
                        <label>Owner</label>
                        <div className="value">{asset.owner || 'Unassigned'}</div>
                    </div>

                    <div className="detail-group">
                        <label>Source System</label>
                        <div className="value code-style">{asset.source_system || asset.host}</div>
                    </div>

                    <div className="detail-group">
                        <label>Full Path</label>
                        <div className="value path" title={asset.path}>{asset.path}</div>
                    </div>

                    <div className="detail-group">
                        <label>Risk Score</label>
                        <div className="value">
                            <span style={{ fontWeight: 600, color: asset.risk_score > 80 ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                                {asset.risk_score}/100
                            </span>
                        </div>
                    </div>

                    {asset.file_metadata && Object.keys(asset.file_metadata).length > 0 && (
                        <div className="detail-group">
                            <label>Metadata</label>
                            <pre className="metadata-block">
                                {JSON.stringify(asset.file_metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            ) : (
                <div className="error-state">Failed to load asset details.</div>
            )}

            <style jsx>{`
                .asset-panel {
                    position: fixed;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    width: 400px;
                    background: var(--color-bg);
                    border-left: 1px solid var(--color-border);
                    box-shadow: -4px 0 20px rgba(0,0,0,0.2);
                    z-index: 1000;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                }
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    border-bottom: 1px solid var(--color-border);
                    padding-bottom: 16px;
                }
                .panel-header h2 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--color-text-primary);
                }
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: var(--color-text-muted);
                    cursor: pointer;
                }
                .detail-group {
                    margin-bottom: 20px;
                }
                .detail-group label {
                    display: block;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--color-text-muted);
                    margin-bottom: 8px;
                }
                .value {
                    font-size: 14px;
                    color: var(--color-text-primary);
                }
                .value.primary {
                    font-size: 16px;
                    font-weight: 500;
                }
                .value.code-style {
                    font-family: monospace;
                    background: rgba(255,255,255,0.05);
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                .value.path {
                    white-space: pre-wrap;
                    word-break: break-all;
                    font-family: monospace;
                    font-size: 12px;
                }
                .metadata-block {
                    background: #1e293b;
                    padding: 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #e2e8f0;
                    overflow-x: auto;
                }
                .tag-critical { background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 2px 8px; border-radius: 4px; }
                .tag-low { background: rgba(34, 197, 94, 0.2); color: #86efac; padding: 2px 8px; border-radius: 4px; }
            `}</style>
        </div>
    );
}
