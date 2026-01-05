'use client';

import React, { useState } from 'react';
import { colors } from '@/design-system/colors';
import { theme } from '@/design-system/themes';

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
                backgroundColor: colors.background.surface,
                borderRight: `1px solid ${colors.border.default}`,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: theme.zIndex.sticky,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: collapsed ? '20px 12px' : '20px 24px',
                    borderBottom: `1px solid ${colors.border.default}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '72px',
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
                                background: colors.nodeColors.system,
                                borderRadius: theme.borderRadius.md,
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
                                fontSize: theme.fontSize.lg,
                                fontWeight: theme.fontWeight.bold,
                                color: colors.text.primary,
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
                        border: `1px solid ${colors.neutral[700]}`,
                        borderRadius: theme.borderRadius.sm,
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: colors.neutral[400],
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.neutral[800];
                        e.currentTarget.style.borderColor = colors.neutral[600];
                        e.currentTarget.style.color = colors.neutral[200];
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = colors.neutral[700];
                        e.currentTarget.style.color = colors.neutral[400];
                    }}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            <nav
                style={{
                    flex: 1,
                    padding: collapsed ? '16px 8px' : '16px',
                    overflowY: 'auto',
                }}
            >
                <div style={{ marginBottom: '24px' }}>
                    <SectionHeader collapsed={collapsed}>Platform</SectionHeader>
                    <NavSection
                        icon="📊"
                        label="Risk Overview"
                        href="/"
                        collapsed={collapsed}
                    />
                    <NavSection
                        icon="📦"
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
                    <NavSection
                        icon="🛡️"
                        label="Posture"
                        href="/posture"
                        collapsed={collapsed}
                    />
                </div>

                <div style={{
                    height: '1px',
                    background: colors.border.subtle,
                    margin: collapsed ? '12px 4px' : '16px 0',
                }} />

                <div style={{ marginBottom: '24px' }}>
                    <SectionHeader collapsed={collapsed}>Configuration</SectionHeader>
                    <NavSection
                        icon="⚙️"
                        label="Settings"
                        href="/settings"
                        collapsed={collapsed}
                    />
                </div>

                {/* Legacy Links during transition - Optional */}
            </nav>

            {/* Footer */}
            <div
                style={{
                    padding: collapsed ? '12px 8px' : '16px',
                    borderTop: `1px solid ${colors.neutral[800]}`,
                }}
            >
                {!collapsed && (
                    <div style={{
                        fontSize: theme.fontSize.xs,
                        color: colors.neutral[500],
                        textAlign: 'center',
                    }}>
                        Version 1.0.0
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
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.bold,
                color: colors.neutral[500],
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                marginTop: '4px',
            }}
        >
            {children}
        </div>
    );
}

function NavSection({ icon, label, href, collapsed }: {
    icon: string;
    label: string;
    href: string;
    collapsed: boolean;
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
                borderRadius: theme.borderRadius.md,
                color: colors.text.primary, // Make text black (primary)
                textDecoration: 'none',
                fontSize: theme.fontSize.base,
                fontWeight: theme.fontWeight.bold, // Make text bold
                marginBottom: '4px',
                transition: 'all 0.2s ease',
                backgroundColor: isHovered ? colors.background.elevated : 'transparent',
                justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span style={{ fontSize: '18px' }}>{icon}</span>
            {!collapsed && <span>{label}</span>}
        </a>
    );
}

function NavItem({ icon, label, count, collapsed, risk }: {
    icon: string;
    label: string;
    count?: number;
    collapsed: boolean;
    risk?: 'low' | 'medium' | 'high' | 'critical';
}) {
    const [isHovered, setIsHovered] = useState(false);

    const getRiskColor = () => {
        if (!risk) return colors.neutral[600];
        switch (risk) {
            case 'critical': return colors.red[500];
            case 'high': return colors.amber[500];
            case 'medium': return colors.amber[600];
            case 'low': return colors.emerald[500];
            default: return colors.neutral[600];
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '10px 8px' : '10px 12px',
                borderRadius: theme.borderRadius.sm,
                color: colors.text.primary, // Make text black (primary)
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.bold, // Make text bold
                marginBottom: '2px',
                transition: 'all 0.2s ease',
                backgroundColor: isHovered ? colors.background.elevated : 'transparent',
                cursor: 'pointer',
                justifyContent: collapsed ? 'center' : 'space-between',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px' }}>{icon}</span>
                {!collapsed && <span>{label}</span>}
            </div>
            {!collapsed && count !== undefined && (
                <span
                    style={{
                        fontSize: theme.fontSize.xs,
                        fontWeight: theme.fontWeight.bold,
                        color: risk ? '#ffffff' : colors.neutral[500],
                        backgroundColor: getRiskColor(),
                        padding: '2px 8px',
                        borderRadius: theme.borderRadius.full,
                        minWidth: '24px',
                        textAlign: 'center',
                    }}
                >
                    {count}
                </span>
            )}
        </div>
    );
}
