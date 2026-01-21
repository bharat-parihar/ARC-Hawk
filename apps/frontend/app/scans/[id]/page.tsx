'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Database, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

// Mock Data
const SCAN_DETAIL = {
    id: 'SCAN_021',
    name: 'ARC_SCAN_2026_01_21',
    environment: 'PROD',
    date: 'Jan 21, 2026 10:30 AM',
    duration: '42m',
    totalFindings: 12480,
    piiScope: 8,
    piiSummary: [
        { type: 'PAN', count: 9, status: 'Detected', selected: true },
        { type: 'Aadhaar', count: 4, status: 'Detected', selected: true },
        { type: 'Email', count: 27, status: 'Detected', selected: true },
        { type: 'Passport', count: 0, status: 'Not Found', selected: true },
        { type: 'Voter ID', count: 3, status: 'Found (Unselected)', selected: false },
        { type: 'Driving License', count: 0, status: 'Not Found', selected: true },
        { type: 'Credit Card', count: 12, status: 'Detected', selected: true },
        { type: 'UPI ID', count: 5, status: 'Detected', selected: true },
    ]
};

export default function ScanDetailPage({ params }: { params: { id: string } }) {
    // In a real app, use params.id to fetch data
    const scan = SCAN_DETAIL;

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-8 py-6">
                <div className="flex items-center gap-4 mb-4">
                    <Link
                        href="/scans"
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">{scan.name}</h1>
                    <div className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        {scan.environment}
                    </div>
                </div>

                <div className="flex items-center gap-8 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                            {scan.id}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{scan.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{scan.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        <span>PII Scope: {scan.piiScope} types</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* PII Detection Summary */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-white">PII Detection Summary</h2>
                            <span className="text-sm text-slate-400">
                                Click a PII type to filter findings
                            </span>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                                    <th className="px-6 py-3 font-medium">PII Type</th>
                                    <th className="px-6 py-3 font-medium text-right">Detected Count</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {scan.piiSummary.map((item) => (
                                    <tr
                                        key={item.type}
                                        className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-200">
                                            {item.type}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                                            {item.count.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.status === 'Detected' && (
                                                <div className="flex items-center gap-2 text-green-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>Detected</span>
                                                </div>
                                            )}
                                            {item.status === 'Not Found' && (
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                                                    <span>Selected, Not Found</span>
                                                </div>
                                            )}
                                            {item.status === 'Found (Unselected)' && (
                                                <div className="flex items-center gap-2 text-red-400">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span>Found (Unselected)</span>
                                                </div>
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
    );
}
