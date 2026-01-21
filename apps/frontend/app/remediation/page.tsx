'use client';

import React from 'react';
import { Shield } from 'lucide-react';

export default function RemediationPage() {
    return (
        <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Remediation</h1>
                    <p className="text-slate-400">Manage risk reduction actions and policies.</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <h3 className="text-lg font-medium text-white mb-2">No Active Remediation Tasks</h3>
                <p className="text-slate-400">
                    Remediation tasks will appear here when you initiate actions from the Findings page.
                </p>
            </div>
        </div>
    );
}
