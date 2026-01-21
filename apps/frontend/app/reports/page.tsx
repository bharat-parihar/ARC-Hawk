'use client';

import React from 'react';
import { FileText, Download, Calendar, Filter } from 'lucide-react';

export default function ReportsPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FileText className="w-6 h-6 text-slate-400" />
                        Compliance Reports
                    </h1>
                    <p className="text-slate-400 mt-1">Generate and export detailed compliance and risk assessment reports.</p>
                </div>
            </div>

            {/* Quick Generate Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors group">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                        <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Latest Scan Report</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        Complete summary of the most recent scan (SCAN_021), including all findings and risk scores.
                    </p>
                    <button className="text-sm font-medium text-blue-400 hover:text-white flex items-center gap-2 transition-colors">
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors group">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                        <Calendar className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Monthly Executive Summary</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        High-level overview of risk trends, remediation actions, and compliance posture for Jan 2026.
                    </p>
                    <button className="text-sm font-medium text-purple-400 hover:text-white flex items-center gap-2 transition-colors">
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors group">
                    <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                        <Filter className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Asset-wise Risk Report</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        Detailed breakdown of PII exposure per asset, suitable for technical remediation teams.
                    </p>
                    <button
                        onClick={async () => {
                            try {
                                const { exportToCSV } = require('@/utils/export');
                                const { findingsApi } = require('@/services/findings.api');
                                // Fetch all findings (limit 1000 for now)
                                const result = await findingsApi.getFindings({ page_size: 1000 });
                                exportToCSV(result.findings, 'asset_risk_report');
                            } catch (e) {
                                console.error(e);
                                alert('Failed to generate report');
                            }
                        }}
                        className="text-sm font-medium text-green-400 hover:text-white flex items-center gap-2 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Download CSV
                    </button>
                </div>
            </div>

            {/* Past Reports Table */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Generated Reports Archive</h3>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 border-b border-slate-700">
                                <th className="px-6 py-4 font-medium">Report Name</th>
                                <th className="px-6 py-4 font-medium">Generated On</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Size</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {[1, 2, 3].map((i) => (
                                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 text-slate-200 font-medium">
                                        Compliance_Report_2025_12_{i < 10 ? `0${i}` : i}.pdf
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">
                                        Dec {i}, 2025
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700">
                                            Full Scan
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                        2.4 MB
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-400 hover:text-white transition-colors">
                                            Download
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
