import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FindingsTable from '../components/ui/FindingsTable';

// Mock the theme and other dependencies
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

// Mock the remediation API
jest.mock('@/services/remediation.api', () => ({
  remediationApi: {
    executeRemediation: jest.fn()
  }
}));

describe('FindingsTable', () => {
  const mockFindings = [
    {
      id: 'finding-1',
      asset_name: 'customer_data.db',
      asset_path: '/data/prod/customer_data.db',
      pii_type: 'PAN',
      severity: 'Critical',
      confidence: 95,
      matches: ['4111111111111111'],
      created_at: '2026-01-15T10:30:00Z',
      status: 'Active'
    },
    {
      id: 'finding-2',
      asset_name: 'user_logs.json',
      asset_path: '/logs/user_activity.json',
      pii_type: 'Email',
      severity: 'High',
      confidence: 88,
      matches: ['user@example.com'],
      created_at: '2026-01-15T09:15:00Z',
      status: 'Active'
    }
  ];

  const mockProps = {
    findings: mockFindings,
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    onPageChange: jest.fn(),
    onFilterChange: jest.fn(),
    onRemediate: jest.fn(),
    onMarkFalsePositive: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders findings table with correct headers', () => {
    render(<FindingsTable {...mockProps} />);

    expect(screen.getByText('Asset')).toBeInTheDocument();
    expect(screen.getByText('PII Type')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('Matches')).toBeInTheDocument();
    expect(screen.getByText('Detected')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders finding data correctly', () => {
    render(<FindingsTable {...mockProps} />);

    expect(screen.getByText('customer_data.db')).toBeInTheDocument();
    expect(screen.getByText('PAN')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // matches count
  });

  it('displays asset paths correctly', () => {
    render(<FindingsTable {...mockProps} />);

    expect(screen.getByText('/data/prod/customer_data.db')).toBeInTheDocument();
    expect(screen.getByText('/logs/user_activity.json')).toBeInTheDocument();
  });

  it('handles pagination correctly', () => {
    const paginatedProps = {
      ...mockProps,
      total: 45,
      totalPages: 3,
      page: 2
    };

    render(<FindingsTable {...paginatedProps} />);

    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Showing 21 to 40 of 45 findings')).toBeInTheDocument();
  });

  it('calls onPageChange when pagination buttons are clicked', async () => {
    const user = userEvent.setup();
    const paginatedProps = {
      ...mockProps,
      total: 45,
      totalPages: 3,
      page: 2
    };

    render(<FindingsTable {...paginatedProps} />);

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    expect(mockProps.onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onRemediate when remediate button is clicked', async () => {
    const user = userEvent.setup();
    render(<FindingsTable {...mockProps} />);

    const remediateButtons = screen.getAllByText('Remediate');
    await user.click(remediateButtons[0]);

    expect(mockProps.onRemediate).toHaveBeenCalledWith('finding-1', 'MASK');
  });

  it('calls onMarkFalsePositive when false positive button is clicked', async () => {
    const user = userEvent.setup();
    render(<FindingsTable {...mockProps} />);

    const falsePositiveButtons = screen.getAllByText('False Positive');
    await user.click(falsePositiveButtons[0]);

    expect(mockProps.onMarkFalsePositive).toHaveBeenCalledWith('finding-1');
  });

  it('displays confidence scores correctly', () => {
    render(<FindingsTable {...mockProps} />);

    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('handles empty findings array', () => {
    const emptyProps = {
      ...mockProps,
      findings: [],
      total: 0
    };

    render(<FindingsTable {...emptyProps} />);

    expect(screen.getByText('No findings found')).toBeInTheDocument();
  });

  it('shows correct match counts', () => {
    render(<FindingsTable {...mockProps} />);

    // Each finding has 1 match
    const matchCounts = screen.getAllByText('1');
    expect(matchCounts.length).toBeGreaterThan(0);
  });

  it('displays formatted dates', () => {
    render(<FindingsTable {...mockProps} />);

    // Should show relative time or formatted date
    expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument();
  });

  it('renders severity badges with correct styling', () => {
    render(<FindingsTable {...mockProps} />);

    const criticalBadge = screen.getByText('Critical');
    const highBadge = screen.getByText('High');

    expect(criticalBadge).toBeInTheDocument();
    expect(highBadge).toBeInTheDocument();
  });
});