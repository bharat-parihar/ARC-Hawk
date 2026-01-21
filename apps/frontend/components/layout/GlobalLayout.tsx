import React, { ReactNode, useState } from 'react';
import { EnhancedLeftNav } from './EnhancedLeftNav';
import { ScanContextBar } from './ScanContextBar';
import { Plus, Play, FileText } from 'lucide-react';
import Link from 'next/link';
import { AddSourceModal } from '../sources/AddSourceModal';
import { ScanConfigModal } from '../scans/ScanConfigModal';

interface GlobalLayoutProps {
    children: ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
    const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
    const [isRunScanOpen, setIsRunScanOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-950">
            {/* Left Navigation */}
            <EnhancedLeftNav />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center justify-between px-6 py-3">
                        {/* Left: Breadcrumbs or Title */}
                        <div className="flex items-center gap-4">
                            <h1 className="text-lg font-semibold text-white">
                                {/* This will be overridden by page-specific content */}
                            </h1>
                        </div>

                        {/* Right: Quick Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsAddSourceOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Source</span>
                            </button>

                            <button
                                onClick={() => setIsRunScanOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Play className="w-4 h-4" />
                                <span>Run Scan</span>
                            </button>

                            <Link
                                href="/reports"
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                <span>Reports</span>
                            </Link>

                            <Link
                                href="/settings"
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                                <span>Settings</span>
                            </Link>
                        </div>
                    </div>

                    {/* Scan Context Bar */}
                    <ScanContextBar />
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-auto bg-slate-950">
                    {children}
                </main>
            </div>

            {/* Global Modals */}
            <AddSourceModal
                isOpen={isAddSourceOpen}
                onClose={() => setIsAddSourceOpen(false)}
            />
            <ScanConfigModal
                isOpen={isRunScanOpen}
                onClose={() => setIsRunScanOpen(false)}
                onRunScan={(config) => {
                    console.log('Running Scan:', config);
                    setIsRunScanOpen(false);
                }}
            />
        </div>
    );
}
