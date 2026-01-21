'use client';

import React from 'react';
import { History, Shield, EyeOff, Trash2, CheckCircle, RotateCcw } from 'lucide-react';

// Mock Data
const MOCK_HISTORY = [
    {
        id: 'evt_001',
        date: '2026-01-21 14:30:00',
        action: 'MASK',
        target: 'DB-Prod.users.email',
        user: 'admin@archawk.io',
        scanId: 'SCAN_021',
        status: 'COMPLETED'
    },
    {
        id: 'evt_002',
        date: '2026-01-20 09:15:00',
        action: 'DELETE',
        target: 'S3-Logs.audit.jan_24.log',
        user: 'system_policy',
        scanId: 'SCAN_020',
        status: 'COMPLETED'
    },
    {
        id: 'evt_003',
        date: '2026-01-19 18:45:00',
        action: 'MASK',
        target: 'FS-Backup.exports.2023.csv',
        user: 'admin@archawk.io',
        scanId: 'SCAN_019',
        status: 'ROLLED_BACK'
    }
];

export default function HistoryPage() {
    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <History className="w-6 h-6 text-slate-400" />
                        Remediation History
                    </h1>
                    <p className="text-slate-400 mt-1">Audit log of all remediation actions and policy enforcements.</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Action</th>
                            <th className="px-6 py-4 font-medium">Target Asset</th>
                            <th className="px-6 py-4 font-medium">Executed By</th>
                            <th className="px-6 py-4 font-medium">Scan Context</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {MOCK_HISTORY.map((event) => (
                            <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                                    {event.date}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {event.action === 'MASK' ? (
                                            <div className="p-1 rounded bg-blue-500/10 text-blue-400">
                                                <EyeOff className="w-4 h-4" />
                                            </div>
                                        ) : (
                                            <div className="p-1 rounded bg-red-500/10 text-red-400">
                                                <Trash2 className="w-4 h-4" />
                                            </div>
                                        )}
                                        <span className={`font-medium ${event.action === 'DELETE' ? 'text-red-400' : 'text-blue-400'}`}>
                                            {event.action}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-200">
                                    {event.target}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    {event.user}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono">
                                        {event.scanId}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {event.status === 'ROLLED_BACK' ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                            <RotateCcw className="w-3 h-3" />
                                            Rolled Back
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                                            <CheckCircle className="w-3 h-3" />
                                            Applied
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
