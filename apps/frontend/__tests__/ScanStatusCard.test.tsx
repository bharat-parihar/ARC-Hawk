import React from 'react';
import { render, screen } from '@testing-library/react';
import ScanStatusCard from '../components/ui/ScanStatusCard';

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
        secondary: '#cccccc',
        muted: '#888888'
      },
      status: {
        success: '#22c55e',
        info: '#3b82f6',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    }
  }
}));

describe('ScanStatusCard', () => {
  const mockScan = {
    id: 'scan-001',
    status: 'COMPLETED',
    total_assets: 150,
    total_findings: 23,
    critical_findings: 5,
    scan_started_at: '2026-01-15T09:00:00Z',
    scan_completed_at: '2026-01-15T09:45:00Z',
    duration_seconds: 2700
  };

  it('renders scan status card with correct information', () => {
    render(<ScanStatusCard scan={mockScan} />);

    expect(screen.getByText('Latest Scan')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument(); // assets
    expect(screen.getByText('23')).toBeInTheDocument(); // findings
    expect(screen.getByText('5')).toBeInTheDocument(); // critical
  });

  it('displays scan duration correctly', () => {
    render(<ScanStatusCard scan={mockScan} />);

    expect(screen.getByText('45m 0s')).toBeInTheDocument();
  });

  it('shows formatted completion time', () => {
    render(<ScanStatusCard scan={mockScan} />);

    expect(screen.getByText(/Completed/)).toBeInTheDocument();
  });

  it('renders different status badges correctly', () => {
    const runningScan = { ...mockScan, status: 'RUNNING' };
    const { rerender } = render(<ScanStatusCard scan={runningScan} />);

    expect(screen.getByText('RUNNING')).toBeInTheDocument();

    const failedScan = { ...mockScan, status: 'FAILED' };
    rerender(<ScanStatusCard scan={failedScan} />);

    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('displays scan metrics with proper labels', () => {
    render(<ScanStatusCard scan={mockScan} />);

    expect(screen.getByText('Assets Scanned')).toBeInTheDocument();
    expect(screen.getByText('Total Findings')).toBeInTheDocument();
    expect(screen.getByText('Critical Issues')).toBeInTheDocument();
  });

  it('handles scans without completion time', () => {
    const runningScan = {
      ...mockScan,
      status: 'RUNNING',
      scan_completed_at: null
    };

    render(<ScanStatusCard scan={runningScan} />);

    expect(screen.getByText('RUNNING')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeScan = {
      ...mockScan,
      total_assets: 1234,
      total_findings: 567
    };

    render(<ScanStatusCard scan={largeScan} />);

    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('567')).toBeInTheDocument();
  });

  it('shows zero values correctly', () => {
    const cleanScan = {
      ...mockScan,
      total_findings: 0,
      critical_findings: 0
    };

    render(<ScanStatusCard scan={cleanScan} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('displays scan ID', () => {
    render(<ScanStatusCard scan={mockScan} />);

    expect(screen.getByText('scan-001')).toBeInTheDocument();
  });
});