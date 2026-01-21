'use client';

import React, { useState } from 'react';
import { X, Play, Zap, Clock } from 'lucide-react';
import { scansApi } from '@/services/scans.api';

interface ScanConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRunScan?: (config: ScanConfig) => void;
}

interface ScanConfig {
    name: string;
    sources: string[];
    piiTypes: string[];
    executionMode: 'sequential' | 'parallel';
}

const PII_TYPES = [
    { id: 'PAN', label: 'PAN', category: 'Financial' },
    { id: 'AADHAAR', label: 'Aadhaar', category: 'Identity' },
    { id: 'EMAIL', label: 'Email', category: 'Contact' },
    { id: 'PHONE', label: 'Phone', category: 'Contact' },
    { id: 'PASSPORT', label: 'Passport', category: 'Identity' },
    { id: 'VOTER_ID', label: 'Voter ID', category: 'Identity' },
    { id: 'DRIVING_LICENSE', label: 'Driving License', category: 'Identity' },
    { id: 'CREDIT_CARD', label: 'Credit Card', category: 'Financial' },
    { id: 'UPI_ID', label: 'UPI ID', category: 'Financial' },
    { id: 'BANK_ACCOUNT', label: 'Bank Account', category: 'Financial' },
    { id: 'GST', label: 'GST Number', category: 'Business' },
];

const MOCK_SOURCES = [
    { id: 'db-prod', name: 'DB-Prod', type: 'PostgreSQL' },
    { id: 's3-logs', name: 'S3-Logs', type: 'S3' },
    { id: 'fs-backup', name: 'FS-Backup', type: 'Filesystem' },
];

export function ScanConfigModal({ isOpen, onClose, onRunScan }: ScanConfigModalProps) {
    const [scanName, setScanName] = useState('');
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedPiiTypes, setSelectedPiiTypes] = useState<string[]>(['PAN', 'AADHAAR', 'EMAIL']);
    const [executionMode, setExecutionMode] = useState<'sequential' | 'parallel'>('parallel');

    if (!isOpen) return null;

    const toggleSource = (sourceId: string) => {
        setSelectedSources(prev =>
            prev.includes(sourceId)
                ? prev.filter(id => id !== sourceId)
                : [...prev, sourceId]
        );
    };

    const togglePiiType = (piiId: string) => {
        setSelectedPiiTypes(prev =>
            prev.includes(piiId)
                ? prev.filter(id => id !== piiId)
                : [...prev, piiId]
        );
    };

    const selectAllPii = () => {
        setSelectedPiiTypes(PII_TYPES.map(p => p.id));
    };

    const deselectAllPii = () => {
        setSelectedPiiTypes([]);
    };

    const estimatePerformance = () => {
        const sourceCount = selectedSources.length;
        const piiCount = selectedPiiTypes.length;
        const isParallel = executionMode === 'parallel';

        const cpuUsage = Math.min(100, (sourceCount * 15) + (piiCount * 5));
        const ioUsage = Math.min(100, (sourceCount * 20) + (piiCount * 3));
        const estimatedTime = isParallel
            ? Math.max(5, sourceCount * 8 + piiCount * 2)
            : sourceCount * 15 + piiCount * 3;

        return { cpuUsage, ioUsage, estimatedTime };
    };

    const { cpuUsage, ioUsage, estimatedTime } = estimatePerformance();


    const handleRunScan = async () => {
        try {
            const config: ScanConfig = {
                name: scanName || `Scan_${new Date().toISOString().split('T')[0]}`,
                sources: selectedSources,
                piiTypes: selectedPiiTypes,
                executionMode
            };

            // Call API
            await scansApi.triggerScan(config);

            onRunScan?.(config);
            onClose();
        } catch (error) {
            console.error('Failed to trigger scan:', error);
            // Optional: Add error state/toast here
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Play className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Run Scan</h2>
                            <p className="text-sm text-slate-400 mt-0.5">Configure and execute PII detection scan</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                    {/* Scan Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Scan Name
                        </label>
                        <input
                            type="text"
                            value={scanName}
                            onChange={(e) => setScanName(e.target.value)}
                            placeholder={`Scan_${new Date().toISOString().split('T')[0]}`}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Target Sources */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                            Target Sources ({selectedSources.length} selected)
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {MOCK_SOURCES.map((source) => (
                                <button
                                    key={source.id}
                                    onClick={() => toggleSource(source.id)}
                                    className={`
                    p-3 rounded-lg border-2 transition-all text-left
                    ${selectedSources.includes(source.id)
                                            ? 'border-green-500 bg-green-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                        }
                  `}
                                >
                                    <div className="font-medium text-white text-sm">{source.name}</div>
                                    <div className="text-xs text-slate-400 mt-1">{source.type}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PII Scope */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-slate-300">
                                PII Scope ({selectedPiiTypes.length}/{PII_TYPES.length} types)
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAllPii}
                                    className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                    Select All
                                </button>
                                <span className="text-slate-600">|</span>
                                <button
                                    onClick={deselectAllPii}
                                    className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                    Deselect All
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {PII_TYPES.map((pii) => (
                                <button
                                    key={pii.id}
                                    onClick={() => togglePiiType(pii.id)}
                                    className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${selectedPiiTypes.includes(pii.id)
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }
                  `}
                                >
                                    {pii.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Execution Mode */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                            Execution Mode
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setExecutionMode('sequential')}
                                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${executionMode === 'sequential'
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                    }
                `}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-green-400" />
                                    <span className="font-semibold text-white">Sequential</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Lower resource usage, longer duration
                                </p>
                            </button>

                            <button
                                onClick={() => setExecutionMode('parallel')}
                                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${executionMode === 'parallel'
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                    }
                `}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-green-400" />
                                    <span className="font-semibold text-white">Parallel</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Faster execution, higher resource usage
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Performance Impact */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="text-sm font-medium text-slate-300 mb-3">
                            Performance Impact Estimate
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                    <span>CPU Usage</span>
                                    <span>{cpuUsage}%</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all"
                                        style={{ width: `${cpuUsage}%` }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                    <span>I/O Usage</span>
                                    <span>{ioUsage}%</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                                        style={{ width: `${ioUsage}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                                <span className="text-xs text-slate-400">Estimated Time</span>
                                <span className="text-sm font-semibold text-white">{estimatedTime}m</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRunScan}
                        disabled={selectedSources.length === 0 || selectedPiiTypes.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
                    >
                        <Play className="w-4 h-4" />
                        <span>Run Scan</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
