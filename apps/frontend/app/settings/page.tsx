'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Database, Users, Key, Save, RefreshCw } from 'lucide-react';
import { theme } from '@/design-system/theme';
import Topbar from '@/components/Topbar';
import { settingsApi } from '@/services/settings.api';

interface SettingSection {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    settings: SettingItem[];
}

interface SettingItem {
    id: string;
    label: string;
    description: string;
    type: 'toggle' | 'select' | 'input' | 'textarea';
    value: any;
    options?: { value: string; label: string }[];
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Record<string, any>>({
        // Security Settings
        enableJWT: true,
        sessionTimeout: '3600',
        passwordPolicy: 'strong',
        twoFactorEnabled: false,

        // Scanner Settings
        scanFrequency: 'daily',
        maxFileSize: '100',
        supportedFormats: ['json', 'csv', 'xml', 'sql'],
        enableDeepScan: true,

        // Notification Settings
        emailNotifications: true,
        slackNotifications: false,
        criticalAlertsOnly: false,
        weeklyReports: true,

        // Data Retention
        logRetention: '90',
        scanHistoryRetention: '365',
        backupFrequency: 'weekly'
    });

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await settingsApi.getSettings();
                if (data && Object.keys(data).length > 0) {
                    setSettings(prev => ({
                        ...prev,
                        ...data
                    }));
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const key = JSON.stringify(settings); // Force re-render of inputs when settings change significantly if needed, but standard React state should handle it.

    const settingSections: SettingSection[] = [
        {
            id: 'security',
            title: 'Security Configuration',
            description: 'Authentication, authorization, and access control settings',
            icon: <Shield style={{ width: '20px', height: '20px' }} />,
            settings: [
                {
                    id: 'enableJWT',
                    label: 'Enable JWT Authentication',
                    description: 'Use JSON Web Tokens for API authentication',
                    type: 'toggle',
                    value: settings.enableJWT
                },
                {
                    id: 'sessionTimeout',
                    label: 'Session Timeout (seconds)',
                    description: 'Maximum session duration before requiring re-authentication',
                    type: 'select',
                    value: settings.sessionTimeout,
                    options: [
                        { value: '1800', label: '30 minutes' },
                        { value: '3600', label: '1 hour' },
                        { value: '7200', label: '2 hours' },
                        { value: '86400', label: '24 hours' }
                    ]
                },
                {
                    id: 'passwordPolicy',
                    label: 'Password Policy',
                    description: 'Password complexity requirements',
                    type: 'select',
                    value: settings.passwordPolicy,
                    options: [
                        { value: 'basic', label: 'Basic (8+ characters)' },
                        { value: 'strong', label: 'Strong (12+ chars, mixed case, numbers)' },
                        { value: 'complex', label: 'Complex (16+ chars, special characters)' }
                    ]
                },
                {
                    id: 'twoFactorEnabled',
                    label: 'Enable Two-Factor Authentication',
                    description: 'Require 2FA for all user accounts',
                    type: 'toggle',
                    value: settings.twoFactorEnabled
                }
            ]
        },
        {
            id: 'scanner',
            title: 'Scanner Configuration',
            description: 'PII detection engine settings and scan parameters',
            icon: <Database style={{ width: '20px', height: '20px' }} />,
            settings: [
                {
                    id: 'scanFrequency',
                    label: 'Default Scan Frequency',
                    description: 'How often to run automated scans',
                    type: 'select',
                    value: settings.scanFrequency,
                    options: [
                        { value: 'hourly', label: 'Every hour' },
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'manual', label: 'Manual only' }
                    ]
                },
                {
                    id: 'maxFileSize',
                    label: 'Maximum File Size (MB)',
                    description: 'Skip files larger than this size during scanning',
                    type: 'input',
                    value: settings.maxFileSize
                },
                {
                    id: 'enableDeepScan',
                    label: 'Enable Deep Content Analysis',
                    description: 'Perform detailed analysis of file contents (slower but more accurate)',
                    type: 'toggle',
                    value: settings.enableDeepScan
                }
            ]
        },
        {
            id: 'notifications',
            title: 'Notification Settings',
            description: 'Configure alerts and reporting preferences',
            icon: <Bell style={{ width: '20px', height: '20px' }} />,
            settings: [
                {
                    id: 'emailNotifications',
                    label: 'Email Notifications',
                    description: 'Send alerts via email',
                    type: 'toggle',
                    value: settings.emailNotifications
                },
                {
                    id: 'slackNotifications',
                    label: 'Slack Integration',
                    description: 'Send alerts to Slack channels',
                    type: 'toggle',
                    value: settings.slackNotifications
                },
                {
                    id: 'criticalAlertsOnly',
                    label: 'Critical Alerts Only',
                    description: 'Only send notifications for critical findings',
                    type: 'toggle',
                    value: settings.criticalAlertsOnly
                },
                {
                    id: 'weeklyReports',
                    label: 'Weekly Summary Reports',
                    description: 'Send weekly compliance and activity reports',
                    type: 'toggle',
                    value: settings.weeklyReports
                }
            ]
        },
        {
            id: 'retention',
            title: 'Data Retention',
            description: 'Configure how long to keep logs, scans, and backups',
            icon: <RefreshCw style={{ width: '20px', height: '20px' }} />,
            settings: [
                {
                    id: 'logRetention',
                    label: 'Log Retention (days)',
                    description: 'How long to keep system and audit logs',
                    type: 'input',
                    value: settings.logRetention
                },
                {
                    id: 'scanHistoryRetention',
                    label: 'Scan History (days)',
                    description: 'How long to keep scan results and findings',
                    type: 'input',
                    value: settings.scanHistoryRetention
                },
                {
                    id: 'backupFrequency',
                    label: 'Backup Frequency',
                    description: 'How often to create system backups',
                    type: 'select',
                    value: settings.backupFrequency,
                    options: [
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'monthly', label: 'Monthly' }
                    ]
                }
            ]
        }
    ];

    const handleSettingChange = (settingId: string, value: any) => {
        setSettings(prev => ({ ...prev, [settingId]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await settingsApi.updateSettings(settings);
            setHasUnsavedChanges(false);
            // Optionally add a toast here
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const renderSettingInput = (setting: SettingItem) => {
        switch (setting.type) {
            case 'toggle':
                return (
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={setting.value}
                            onChange={(e) => handleSettingChange(setting.id, e.target.checked)}
                            style={{
                                width: '16px',
                                height: '16px',
                                marginRight: '8px',
                                accentColor: theme.colors.primary.DEFAULT
                            }}
                        />
                        <span style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                            {setting.value ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                );
            case 'select':
                return (
                    <select
                        value={setting.value}
                        onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: `1px solid ${theme.colors.border.default}`,
                            backgroundColor: theme.colors.background.card,
                            color: theme.colors.text.primary,
                            fontSize: '14px',
                            width: '200px'
                        }}
                    >
                        {setting.options?.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );
            case 'input':
                return (
                    <input
                        type="text"
                        value={setting.value}
                        onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: `1px solid ${theme.colors.border.default}`,
                            backgroundColor: theme.colors.background.card,
                            color: theme.colors.text.primary,
                            fontSize: '14px',
                            width: '200px'
                        }}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.colors.background.primary }}>
            <Topbar />
            <div className="container" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: 800, color: theme.colors.text.primary, marginBottom: '8px', letterSpacing: '-0.02em' }}>
                                System Settings
                            </h1>
                            <p style={{ color: theme.colors.text.secondary, fontSize: '16px' }}>
                                Configure ARC-Hawk system behavior, security policies, and preferences
                            </p>
                        </div>
                        {hasUnsavedChanges && (
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: saving ? theme.colors.background.tertiary : theme.colors.primary.DEFAULT,
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {saving ? (
                                    <>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            border: '2px solid currentColor',
                                            borderTopColor: 'transparent',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save style={{ width: '16px', height: '16px' }} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Settings Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {settingSections.map(section => (
                        <div key={section.id} style={{
                            backgroundColor: theme.colors.background.card,
                            borderRadius: '12px',
                            border: `1px solid ${theme.colors.border.default}`,
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '24px', borderBottom: `1px solid ${theme.colors.border.default}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        backgroundColor: `${theme.colors.primary.DEFAULT}20`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: theme.colors.primary.DEFAULT
                                    }}>
                                        {section.icon}
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: theme.colors.text.primary, margin: 0 }}>
                                            {section.title}
                                        </h2>
                                        <p style={{ fontSize: '14px', color: theme.colors.text.secondary, margin: '4px 0 0 0' }}>
                                            {section.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {section.settings.map(setting => (
                                        <div key={setting.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            paddingBottom: '16px',
                                            borderBottom: `1px solid ${theme.colors.border.subtle}`
                                        }}>
                                            <div style={{ flex: 1, marginRight: '24px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: theme.colors.text.primary, marginBottom: '4px' }}>
                                                    {setting.label}
                                                </div>
                                                <div style={{ fontSize: '13px', color: theme.colors.text.secondary }}>
                                                    {setting.description}
                                                </div>
                                            </div>
                                            <div style={{ flexShrink: 0 }}>
                                                {renderSettingInput(setting)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* System Information */}
                <div style={{
                    marginTop: '32px',
                    backgroundColor: theme.colors.background.card,
                    borderRadius: '12px',
                    border: `1px solid ${theme.colors.border.default}`,
                    padding: '24px'
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: theme.colors.text.primary, marginBottom: '16px' }}>
                        System Information
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: theme.colors.text.secondary, fontWeight: 600, marginBottom: '4px' }}>
                                VERSION
                            </div>
                            <div style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                                ARC-Hawk v1.2.0
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: theme.colors.text.secondary, fontWeight: 600, marginBottom: '4px' }}>
                                LAST UPDATED
                            </div>
                            <div style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                                January 15, 2026
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: theme.colors.text.secondary, fontWeight: 600, marginBottom: '4px' }}>
                                ENVIRONMENT
                            </div>
                            <div style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                                Production
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: theme.colors.text.secondary, fontWeight: 600, marginBottom: '4px' }}>
                                LICENSE
                            </div>
                            <div style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                                Enterprise
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
