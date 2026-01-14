'use client';

import React, { useState } from 'react';
import { theme } from '@/design-system/theme';

interface SidebarProps {
    children?: React.ReactNode;
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ children, collapsed, onToggle }: SidebarProps) {
    return (
        <aside
            style={{
                width: collapsed ? '64px' : '280px',
                height: '100vh',
                backgroundColor: theme.colors.background.secondary,
                borderRight: `1px solid ${theme.colors.border.default}`,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: collapsed ? '20px 12px' : '20px 24px',
                    borderBottom: `1px solid ${theme.colors.border.default}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '72px',
                    backgroundColor: theme.colors.background.primary
                }}
            >
                {!collapsed && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <div
                            style={{
                                width: '32px',
                                height: '32px',
                                background: theme.colors.primary.DEFAULT,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                            }}
                        >
                            🦅
                        </div>
                        <span
                            style={{
                                fontSize: '18px',
                                fontWeight: 800,
                                color: theme.colors.text.primary,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            ARC-Hawk
                        </span>
                    </div>
                )}

                <button
                    onClick={onToggle}
                    style={{
                        background: 'transparent',
                        border: `1px solid ${theme.colors.border.active}`,
                        borderRadius: '6px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: theme.colors.text.tertiary,
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.text.secondary;
                        e.currentTarget.style.color = theme.colors.text.secondary;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border.active;
                        e.currentTarget.style.color = theme.colors.text.tertiary;
                    }}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            <nav
                style={{
                    flex: 1,
                    padding: collapsed ? '16px 8px' : '24px 16px',
                    overflowY: 'auto',
                }}
            >
                <div style={{ marginBottom: '32px' }}>
                    <SectionHeader collapsed={collapsed}>Compliance Controls</SectionHeader>
                    <NavSection
                        icon="🛡️"
                        label="Compliance Posture"
                        href="/compliance"
                        collapsed={collapsed}
                        active={true}
                    />
                    <NavSection
                        icon="🔥"
                        label="Risk Analytics"
                        href="/analytics"
                        collapsed={collapsed}
                    />
                </div>

                <div style={{ marginBottom: '32px' }}>
                    <SectionHeader collapsed={collapsed}>Data Assets</SectionHeader>
                    <NavSection
                        icon="🗂️"
                        label="Asset Inventory"
                        href="/assets"
                        collapsed={collapsed}
                    />
                    <NavSection
                        icon="🔗"
                        label="Lineage Map"
                        href="/lineage"
                        collapsed={collapsed}
                    />
                    <NavSection
                        icon="🔍"
                        label="Findings"
                        href="/findings"
                        collapsed={collapsed}
                    />
                </div>

                <div style={{
                    height: '1px',
                    background: theme.colors.border.default,
                    margin: collapsed ? '12px 4px' : '16px 0',
                }} />

                <div style={{ marginBottom: '24px' }}>
                    <SectionHeader collapsed={collapsed}>System</SectionHeader>
                    <NavSection
                        icon="⚙️"
                        label="Settings"
                        href="/settings"
                        collapsed={collapsed}
                    />
                </div>
            </nav>

            {/* Footer */}
            <div
                style={{
                    padding: collapsed ? '12px 8px' : '16px',
                    borderTop: `1px solid ${theme.colors.border.default}`,
                    backgroundColor: theme.colors.background.primary
                }}
            >
                <a
                    href="https://digitalindia.gov.in/dpdpa"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'center',
                        gap: '8px',
                        padding: '10px',
                        marginBottom: '12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: theme.colors.primary.DEFAULT,
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: `${theme.colors.primary.DEFAULT}15`,
                        transition: 'background 0.2s',
                    }}
                >
                    <span style={{ fontSize: '16px' }}>📚</span>
                    {!collapsed && <span>DPDPA Guide</span>}
                </a>
                {!collapsed && (
                    <div style={{
                        fontSize: '12px',
                        color: theme.colors.text.muted,
                        textAlign: 'center',
                    }}>
                        v1.2.0 • DPDPA Edition
                    </div>
                )}
            </div>
        </aside>
    );
}

// Helper Components
function SectionHeader({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
    if (collapsed) return null;

    return (
        <div
            style={{
                fontSize: '11px',
                fontWeight: 700,
                color: theme.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
                marginTop: '4px',
                paddingLeft: '12px'
            }}
        >
            {children}
        </div>
    );
}

function NavSection({ icon, label, href, collapsed, active }: {
    icon: string;
    label: string;
    href: string;
    collapsed: boolean;
    active?: boolean;
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <a
            href={href}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '12px 8px' : '12px 16px',
                borderRadius: '8px',
                color: active ? theme.colors.text.primary : theme.colors.text.secondary,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: active ? 700 : 500,
                marginBottom: '4px',
                transition: 'all 0.2s ease',
                backgroundColor: active || isHovered ? theme.colors.background.tertiary : 'transparent',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderLeft: active ? `3px solid ${theme.colors.primary.DEFAULT}` : '3px solid transparent'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span style={{ fontSize: '18px' }}>{icon}</span>
            {!collapsed && <span>{label}</span>}
        </a>
    );
}
