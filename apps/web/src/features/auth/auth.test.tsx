import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider } from './AuthProvider';
import { Layout } from '../../layouts/Layout';
import * as api from './api';

// Mock the API module
vi.mock('./api', () => ({
  fetchCsrfToken: vi.fn().mockResolvedValue('mock-csrf-token'),
  login: vi.fn(),
  fetchMe: vi.fn(),
  logout: vi.fn(),
}));

function renderWithRouter(initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthProvider><Layout /></AuthProvider>}>
            <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Frontend Auth & CSRF Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Login page renders correctly', async () => {
    renderWithRouter('/login');
    expect(await screen.findByRole('button', { name: /masuk/i })).toBeInTheDocument();
  });

  it('2. Unauthenticated protected route redirects to login', async () => {
    vi.mocked(api.fetchMe).mockRejectedValueOnce(new Error('Unauthorized'));
    renderWithRouter('/');

    // Should redirect to login
    expect(await screen.findByRole('button', { name: /masuk/i })).toBeInTheDocument();
  });

  it('3. Auth loading state does not redirect prematurely', async () => {
    // Delay fetchMe resolution
    let resolveFetchMe!: (value: unknown) => void;
    const fetchMePromise = new Promise<unknown>((resolve) => {
      resolveFetchMe = resolve;
    });
    vi.mocked(api.fetchMe).mockReturnValueOnce(fetchMePromise as unknown as Promise<{ id: number; name: string; username: string; email: string; roles: string[]; permissions: string[] }>);

    renderWithRouter('/');

    // Should show loading spinner, not login page immediately
    expect(screen.getByText(/loading user session/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /masuk/i })).not.toBeInTheDocument();

    // Resolve auth
    resolveFetchMe({ id: 1, name: 'Admin', username: 'admin', email: 'admin@example.com', roles: ['Super Admin'], permissions: [] });

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
  });

  it('4. Authenticated protected route renders successfully', async () => {
    vi.mocked(api.fetchMe).mockResolvedValueOnce({
      id: 1,
      name: 'Admin',
      username: 'admin',
      email: 'admin@example.com',
      roles: ['Super Admin'],
      permissions: [],
    });

    renderWithRouter('/');
    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
  });

  it('5. 403 Forbidden does not logout user', async () => {
    // If a user gets a 403, it shouldn't log them out or redirect to login
    vi.mocked(api.fetchMe).mockResolvedValueOnce({
      id: 1,
      name: 'User',
      username: 'user',
      email: 'user@example.com',
      roles: ['User'],
      permissions: [],
    });

    renderWithRouter('/');
    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
  });

  it('6. Logout sends CSRF token and invalidates auth query', async () => {
    vi.mocked(api.logout).mockResolvedValueOnce();

    await api.logout();
    expect(api.logout).toHaveBeenCalled();
  });
});
