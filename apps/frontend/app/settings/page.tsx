'use client';

import React from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-800 rounded-lg">
                    <Settings className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-slate-400">System configuration and preferences.</p>
                </div>
            </div>

            <div className="max-w-3xl">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                    <div className="text-4xl mb-4">⚙️</div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Configuration & Preferences
                    </h2>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                        System configuration options will be available here. You can configure scanner rules, user permissions, and notification settings.
                    </p>
                    <button className="px-4 py-2 bg-slate-800 text-slate-500 border border-slate-700 rounded-lg cursor-not-allowed text-sm font-medium">
                        Coming Soon
                    </button>
                </div>
            </div>
        </div>
    );
}
