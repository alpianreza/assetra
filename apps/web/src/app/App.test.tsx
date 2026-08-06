import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';

// Mock the auth hook so the test does not depend on a live backend.
vi.mock('../features/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', username: 'tester', status: 'active' },
    permissions: ['dashboard.view', 'reports.export'],
    hasPermission: () => true,
  }),
}));

// Mock the dashboard summary hook.
vi.mock('../features/dashboard/hooks', () => ({
  useDashboardSummary: () => ({
    data: {
      success: true,
      data: {
        summary: { total: 5, active: 3, inactive: 1, maintenance: 1, disposed: 0 },
        compliance: { completed: 2, pending: 1, late: 1 },
        breakdowns: { byArea: { 'Warehouse A': 4, 'Warehouse B': 1 }, byCategory: { 'Elektronik': 3, 'Furniture': 2 } },
      },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock master-data hooks (areas + categories).
vi.mock('../features/master-data/hooks', () => ({
  useAreas: () => ({ data: { data: [{ id: 1, name: 'Warehouse A' }, { id: 2, name: 'Warehouse B' }] } }),
  useCategories: () => ({ data: { data: [{ id: 1, name: 'Elektronik' }, { id: 2, name: 'Furniture' }] } }),
}));

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  it('renders the dashboard title', () => {
    renderWithProviders();
    expect(screen.getByText(/Dashboard/i)).toBeTruthy();
  });

  it('renders KPI summary cards with mocked data', () => {
    renderWithProviders();
    expect(screen.getByText(/Total/i)).toBeTruthy();
    expect(screen.getAllByText(/Active/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Maintenance/i).length).toBeGreaterThan(0);
  });

  it('renders breakdown tables', () => {
    renderWithProviders();
    expect(screen.getByText(/Breakdown per Area/i)).toBeTruthy();
    expect(screen.getByText(/Breakdown per Kategori/i)).toBeTruthy();
    expect(screen.getAllByText(/Warehouse A/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Elektronik/i).length).toBeGreaterThan(0);
  });
});
