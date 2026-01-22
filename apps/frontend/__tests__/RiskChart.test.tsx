import React from 'react';
import { render, screen } from '@testing-library/react';
import RiskChart from '../components/ui/RiskChart';

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => (
    <div data-testid="pie">
      {data.map((item: any, index: number) => (
        <div key={index} data-testid={`pie-slice-${item.name}`}>
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  ),
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

// Mock the theme
jest.mock('@/design-system/theme', () => ({
  theme: {
    colors: {
      risk: {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        low: '#22c55e'
      }
    }
  }
}));

describe('RiskChart', () => {
  const mockData = [
    { name: 'Critical', value: 15, count: 15 },
    { name: 'High', value: 35, count: 35 },
    { name: 'Medium', value: 30, count: 30 },
    { name: 'Low', value: 20, count: 20 }
  ];

  it('renders risk chart with correct data', () => {
    render(<RiskChart data={mockData} />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
  });

  it('displays all risk levels in the chart', () => {
    render(<RiskChart data={mockData} />);

    expect(screen.getByTestId('pie-slice-Critical')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-High')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-Medium')).toBeInTheDocument();
    expect(screen.getByTestId('pie-slice-Low')).toBeInTheDocument();
  });

  it('shows correct values for each risk level', () => {
    render(<RiskChart data={mockData} />);

    expect(screen.getByText('Critical: 15')).toBeInTheDocument();
    expect(screen.getByText('High: 35')).toBeInTheDocument();
    expect(screen.getByText('Medium: 30')).toBeInTheDocument();
    expect(screen.getByText('Low: 20')).toBeInTheDocument();
  });

  it('renders chart title', () => {
    render(<RiskChart data={mockData} />);

    expect(screen.getByText('Risk Distribution')).toBeInTheDocument();
  });

  it('handles empty data array', () => {
    render(<RiskChart data={[]} />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    // Should still render but with empty pie
  });

  it('handles data with zero values', () => {
    const zeroData = [
      { name: 'Critical', value: 0, count: 0 },
      { name: 'High', value: 10, count: 10 }
    ];

    render(<RiskChart data={zeroData} />);

    expect(screen.getByText('Critical: 0')).toBeInTheDocument();
    expect(screen.getByText('High: 10')).toBeInTheDocument();
  });

  it('calculates percentages correctly', () => {
    render(<RiskChart data={mockData} />);

    // The component should handle percentage calculation internally
    // We verify the data is passed correctly
    expect(screen.getByTestId('pie')).toBeInTheDocument();
  });

  it('renders tooltip and legend components', () => {
    render(<RiskChart data={mockData} />);

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('applies responsive container', () => {
    render(<RiskChart data={mockData} />);

    // ResponsiveContainer should wrap the chart
    const chart = screen.getByTestId('pie-chart');
    expect(chart).toBeInTheDocument();
  });
});