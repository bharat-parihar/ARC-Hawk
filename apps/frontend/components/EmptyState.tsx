import React from 'react';
import { colors } from '@/design-system/colors';
import { theme } from '@/design-system/themes';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export default function EmptyState({
    icon = '📭',
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 32px',
                minHeight: '400px',
            }}
        >
            {/* Icon */}
            <div
                style={{
                    fontSize: '64px',
                    marginBottom: '24px',
                    opacity: 0.6,
                }}
            >
                {icon}
            </div>

            {/* Title */}
            <h3
                style={{
                    fontSize: theme.fontSize.xl,
                    fontWeight: theme.fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: '8px',
                }}
            >
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p
                    style={{
                        fontSize: theme.fontSize.base,
                        color: colors.text.secondary,
                        textAlign: 'center',
                        maxWidth: '400px',
                        lineHeight: theme.lineHeight.relaxed,
                        marginBottom: action ? '24px' : '0',
                    }}
                >
                    {description}
                </p>
            )}

            {/* Action Button */}
            {action && (
                <button
                    onClick={action.onClick}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: colors.blue[600],
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: theme.borderRadius.md,
                        fontSize: theme.fontSize.base,
                        fontWeight: theme.fontWeight.semibold,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.blue[700];
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = theme.shadows.md;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.blue[600];
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
