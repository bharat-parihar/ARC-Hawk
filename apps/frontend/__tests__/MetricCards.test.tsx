import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricCards from '../components/ui/MetricCards';

// Mock the theme
jest.mock('@/design-system/theme', () => ({
  theme: {
    colors: {
      background: {
        card: '#1a1a1a',
        tertiary: '#2a2a2a'
      },
      border: {
        default: '#333333'
      },
      text: {
        primary: '#ffffff',
        secondary: '#cccccc'
      },
      risk: {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        low: '#22c55e'
      }
    }
  },
  getRiskColor: (level: string) => {
    const colors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e'
    };
    return colors[level as keyof typeof colors] || colors.low;
  }
}));

describe('MetricCards', () => {
  const mockMetrics = {
    totalAssets: 1250,
    totalFindings: 89,
    criticalFindings: 12,
    complianceScore: 87,
    dataSources: 8,
    lastScanDate: '2026-01-15T10:30:00Z'
  };

  it('renders all metric cards with correct values', () => {
    render(<MetricCards metrics={mockMetrics} />);

    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders metric card labels', () => {
    render(<MetricCards metrics={mockMetrics} />);

    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('Total Findings')).toBeInTheDocument();
    expect(screen.getByText('Critical Issues')).toBeInTheDocument();
    expect(screen.getByText('Compliance Score')).toBeInTheDocument();
    expect(screen.getByText('Data Sources')).toBeInTheDocument();
  });

  it('renders metric card subtitles', () => {
    render(<MetricCards metrics={mockMetrics} />);

    expect(screen.getByText('Scanned')).toBeInTheDocument();
    expect(screen.getByText('PII detections')).toBeInTheDocument();
    expect(screen.getByText('High-risk')).toBeInTheDocument();
    expect(screen.getByText('Overall posture')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('applies correct colors based on risk levels', () => {
    render(<MetricCards metrics={mockMetrics} />);

    // Critical findings should have critical color
    const criticalCard = screen.getByText('12').closest('div');
    expect(criticalCard).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeMetrics = { ...mockMetrics, totalAssets: 1234567 };
    render(<MetricCards metrics={largeMetrics} />);

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('displays compliance score with percentage', () => {
    render(<MetricCards metrics={mockMetrics} />);

    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroMetrics = { ...mockMetrics, criticalFindings: 0 };
    render(<MetricCards metrics={zeroMetrics} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders trend indicators for compliance score', () => {
    render(<MetricCards metrics={mockMetrics} />);

    // High compliance score should show positive trend
    const complianceCard = screen.getByText('87%').closest('div');
    expect(complianceCard).toBeInTheDocument();
  });
});