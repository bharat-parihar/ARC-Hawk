import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import React from 'react'; // Added React import

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'ARC-Hawk Enterprise Risk', // Changed title
    description: 'Data Lineage and Risk Management', // Changed description
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className} style={{ margin: 0, padding: 0, backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
                    {/* Sidebar */}
                    <Sidebar />

                    {/* Main Content */}
                    <main
                        style={{
                            flex: 1,
                            marginLeft: '280px', // Match sidebar width
                            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            backgroundColor: '#F8FAFC',
                            minHeight: '100vh',
                        }}
                    >
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
