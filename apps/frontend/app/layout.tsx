import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'ARC-Hawk Enterprise Risk',
    description: 'Data Lineage and Risk Management',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className} style={{ margin: 0, padding: 0, backgroundColor: '#0f172a' }}>
                <AppLayout>{children}</AppLayout>
            </body>
        </html>
    );
}
