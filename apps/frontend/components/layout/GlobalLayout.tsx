'use client';

import React, { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { EnhancedLeftNav } from './EnhancedLeftNav';
import { ScanContextBar } from './ScanContextBar';
import { Plus, Play, FileText, Bell, User, Shield } from 'lucide-react';
import Link from 'next/link';
import { AddSourceModal } from '../sources/AddSourceModal';
import { ScanConfigModal } from '../scans/ScanConfigModal';
import ErrorBoundary from '../ErrorBoundary';

interface GlobalLayoutProps {
    children: ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
    const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
    const [isRunScanOpen, setIsRunScanOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Left Navigation */}
            <EnhancedLeftNav />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <motion.header
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50 shadow-lg"
                >
                    <div className="flex items-center justify-between px-6 py-4">
                        {/* Left: Brand & Title */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                    <Shield className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                        ARC-Hawk
                                    </h1>
                                    <p className="text-xs text-slate-500">Enterprise PII Governance</p>
                                </div>
                            </div>
                        </div>

                        {/* Right: User Actions */}
                        <div className="flex items-center gap-4">
                            {/* Quick Actions */}
                            <div className="hidden md:flex items-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsAddSourceOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Source</span>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsRunScanOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl"
                                >
                                    <Play className="w-4 h-4" />
                                    <span>Run Scan</span>
                                </motion.button>
                            </div>

                            {/* Navigation Links */}
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/reports"
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="hidden lg:inline">Reports</span>
                                </Link>

                                <Link
                                    href="/settings"
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15-.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                                    <span className="hidden lg:inline">Settings</span>
                                </Link>
                            </div>

                            {/* User Menu */}
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                                <button className="relative p-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white rounded-lg transition-all">
                                    <Bell className="w-5 h-5" />
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center">3</span>
                                </button>

                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-all">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="hidden md:block">
                                        <div className="text-sm font-medium text-white">Admin User</div>
                                        <div className="text-xs text-slate-400">admin@company.com</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scan Context Bar */}
                    <ScanContextBar />
                </motion.header>

                {/* Main Content */}
                <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
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


