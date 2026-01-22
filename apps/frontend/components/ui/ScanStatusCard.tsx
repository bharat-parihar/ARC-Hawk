import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Play, Pause, AlertCircle } from 'lucide-react';

interface ScanStatusCardProps {
    scanId: string | null;
}

const scanStatuses = {
    'idle': { label: 'Idle', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Pause },
    'running': { label: 'Running', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Play },
    'completed': { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
    'failed': { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle },
};

type ScanStatus = 'idle' | 'running' | 'completed' | 'failed';

export default function ScanStatusCard({ scanId }: ScanStatusCardProps) {
    // In production, this would come from real-time API
    const status: ScanStatus = scanId ? 'completed' : 'idle';
    const startTime = scanId ? new Date(Date.now() - 1000 * 60 * 15) : null; // 15 minutes ago
    const endTime = status === 'completed' && scanId ? new Date(Date.now() - 1000 * 60 * 2) : null; // 2 minutes ago
    const progress = status === 'completed' ? 100 : 0;

    const StatusIcon = scanStatuses[status as keyof typeof scanStatuses].icon;

    const getStatusDescription = () => {
        switch (status) {
            case 'idle':
                return 'System ready. No active scans running.';
            case 'completed':
                return 'Scan completed. Findings are ready for review.';
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'idle': return 'text-slate-400';
            case 'completed': return 'text-emerald-400';
        }
        return 'text-slate-400';
    };

    const getRecommendedActions = () => {
        switch (status) {
            case 'idle':
                return [
                    { label: 'Add Data Source', description: 'Connect databases, files, or cloud storage', priority: 'high' as const },
                    { label: 'Configure Scan', description: 'Set scan parameters and rules', priority: 'medium' as const },
                    { label: 'Start Scan', description: 'Begin comprehensive PII discovery', priority: 'high' as const }
                ];
            case 'completed':
                return [
                    { label: 'Review Findings', description: 'Examine discovered PII instances', priority: 'high' as const },
                    { label: 'Generate Report', description: 'Create compliance documentation', priority: 'medium' as const },
                    { label: 'Generate Report', description: 'Create compliance documentation', priority: 'medium' as const }
                ];
        }
        return [];
    };

    const recommendedActions = getRecommendedActions();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 rounded-xl p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${scanStatuses[status as keyof typeof scanStatuses].bg} ring-2 ring-white/10`}>
                        <StatusIcon className={`w-6 h-6 ${scanStatuses[status as keyof typeof scanStatuses].color}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Scan Status</h3>
                        <p className={`text-sm font-medium ${getStatusColor()}`}>
                            {scanStatuses[status as keyof typeof scanStatuses].label}
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                            {getStatusDescription()}
                        </p>
                    </div>
                </div>

                {scanId && (
                    <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">Latest Scan</div>
                        <div className="text-sm font-mono text-slate-300 bg-slate-900/50 px-2 py-1 rounded">
                            {scanId}
                        </div>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Progress</span>
                    <span className="text-sm text-slate-300">{progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-2 rounded-full ${status === 'completed' ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                    />
                </div>
            </div>

            {/* Time Information */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-slate-500 mb-1">Started</div>
                    <div className="text-slate-300 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {startTime ? startTime.toLocaleTimeString() : 'N/A'}
                    </div>
                </div>

                {endTime && (
                    <div>
                        <div className="text-slate-500 mb-1">
                            {status === 'completed' ? 'Completed' : 'Failed'}
                        </div>
                        <div className="text-slate-300 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            {endTime ? endTime.toLocaleTimeString() : 'N/A'}
                        </div>
                    </div>
                )}

                {status === 'completed' && (
                    <div>
                        <div className="text-slate-500 mb-1">Duration</div>
                        <div className="text-slate-300">
                            {endTime && startTime ? `${Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)}m total` : 'N/A'}
                        </div>
                    </div>
                )}
            </div>

            {/* Recommended Actions */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Recommended Next Steps</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {recommendedActions.map((action, index) => (
                        <motion.button
                            key={action.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-3 rounded-lg border transition-all duration-200 text-left group ${action.priority === 'high'
                                    ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50'
                                    : action.priority === 'medium'
                                        ? 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 hover:border-slate-500/50'
                                        : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50'
                                }`}
                            title={action.description}
                        >
                            <div className={`text-sm font-medium mb-1 ${action.priority === 'high' ? 'text-blue-400' : 'text-slate-300'
                                }`}>
                                {action.label}
                            </div>
                            <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                                {action.description}
                            </div>
                            {action.priority === 'high' && (
                                <div className="mt-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        Priority
                                    </span>
                                </div>
                            )}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white px-4 py-2.5 rounded-lg transition-all duration-200 border border-slate-600/50 hover:border-slate-500/50">
                    View Details
                </button>
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl">
                    {status === 'completed' ? 'New Scan' : status === 'idle' ? 'Start Scan' : 'Manage'}
                </button>
            </div>
        </motion.div>
    );
}