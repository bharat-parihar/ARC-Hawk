import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ARC Platform - Data Lineage & PII Classification',
    description: 'Enterprise-grade Data Lineage and PII Classification Platform for DPDPA compliance',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
