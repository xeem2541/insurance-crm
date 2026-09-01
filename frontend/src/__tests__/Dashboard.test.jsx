import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import api from '../services/api';

import { vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API and Chart JS
vi.mock('../services/api');
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders loading state initially or fetches data', async () => {
    // Mock the dashboard stats response
    api.get.mockResolvedValueOnce({
      data: {
        totalCustomers: 150,
        totalPolicies: 200,
        salesThisMonth: 50000,
        expiringPolicies: [],
        topCompanies: [],
        monthlySales: []
      }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Should wait for stats to be fetched and rendered
    await waitFor(() => {
      expect(screen.getByText(/150/i)).toBeInTheDocument();
    });
  });
});
