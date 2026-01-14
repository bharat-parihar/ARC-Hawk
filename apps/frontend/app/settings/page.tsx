'use client';

import React from 'react';
import Topbar from '@/components/Topbar';
import { theme } from '@/design-system/theme';

export default function SettingsPage() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
            <Topbar
                scanTime={new Date().toISOString()}
                environment="Production"
            />

            <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: theme.colors.text.primary,
                    marginBottom: '24px'
                }}>
                    Settings
                </h1>

                <div style={{
                    backgroundColor: theme.colors.background.card,
                    borderRadius: '12px',
                    border: `1px solid ${theme.colors.border.default}`,
                    padding: '32px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: theme.colors.text.primary, marginBottom: '8px' }}>
                        Configuration & Preferences
                    </h2>
                    <p style={{ color: theme.colors.text.secondary, marginBottom: '24px' }}>
                        System configuration options will be available here. You can configure scanner rules, user permissions, and notification settings.
                    </p>
                    <button style={{
                        padding: '10px 20px',
                        backgroundColor: theme.colors.background.tertiary,
                        color: theme.colors.text.muted,
                        border: `1px solid ${theme.colors.border.default}`,
                        borderRadius: '6px',
                        cursor: 'not-allowed'
                    }} disabled>
                        Coming Soon
                    </button>
                </div>
            </div>
        </div>
    );
}
