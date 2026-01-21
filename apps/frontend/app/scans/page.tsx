'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { colors } from '@/design-system/colors';
import { theme } from '@/design-system/themes';

// Mock Data
const SCANS = [
    {
        id: 'SCAN_021',
        name: 'ARC_SCAN_2026_01_21',
        date: 'Jan 21, 2026 10:30 AM',
        status: 'Completed',
        duration: '42m',
        parallel: true,
        findings: 12480,
    },
    {
        id: 'SCAN_020',
        name: 'ARC_SCAN_2026_01_18',
        date: 'Jan 18, 2026 09:15 AM',
        status: 'Completed',
        duration: '39m',
        parallel: false,
        findings: 11200,
    },
    {
        id: 'SCAN_019',
        name: 'ARC_SCAN_2026_01_15',
        date: 'Jan 15, 2026 02:00 PM',
        status: 'Failed',
        duration: '12m',
        parallel: false,
        findings: 0,
    },
];

export default function ScansPage() {
    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Scans</h1>
                    <p className="text-slate-400 mt-1">Manage and review PII detection scans.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                    <Play className="w-4 h-4" />
                    <span>New Scan</span>
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                            <th className="px-6 py-4 font-medium">Scan Name</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Duration</th>
                            <th className="px-6 py-4 font-medium">Parallel</th>
                            <th className="px-6 py-4 font-medium text-right">Findings</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {SCANS.map((scan) => (
                            <tr
                                key={scan.id}
                                className="group hover:bg-slate-800/50 transition-colors cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <Link href={`/scans/${scan.id}`} className="block">
                                        <div className="font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                                            {scan.name}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">{scan.id}</div>
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-slate-300">
                                    <Link href={`/scans/${scan.id}`} className="block">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-500" />
                                            {scan.date}
                                        </div>
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/scans/${scan.id}`} className="block">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${scan.status === 'Completed'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {scan.status === 'Completed' ? (
                                                <CheckCircle className="w-3 h-3" />
                                            ) : (
                                                <AlertCircle className="w-3 h-3" />
                                            )}
                                            {scan.status}
                                        </div>
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-slate-300">
                                    <Link href={`/scans/${scan.id}`} className="block">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-500" />
                                            {scan.duration}
                                        </div>
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-slate-300">
                                    <Link href={`/scans/${scan.id}`} className="block">
                                        {scan.parallel ? 'Yes' : 'No'}
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-300">
                                    <Link href={`/scans/${scan.id}`} className="block">
                                        {scan.findings.toLocaleString()}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
