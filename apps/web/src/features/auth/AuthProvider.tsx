import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe } from './api';
import { Navigate, useLocation } from 'react-router-dom';
import { SanitizedUserDto } from './types';
import { AUTH_QUERY_KEY } from './constants';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Gatekeeper for protected routes.
 * Auth state is driven entirely by the TanStack Query cache (`me` query):
 * - while fetching → render a loading screen (no premature redirect),
 * - authenticated → render children,
 * - 401 / unauthenticated → redirect to /login.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const location = useLocation();

  const { data, isLoading, isError } = useQuery<SanitizedUserDto>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
  });

  // On 401 the query failed — clear the cached user so a later login can repopulate it.
  if (isError) {
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-foreground">Loading user session...</p>
      </div>
    );
  }

  if (!data) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
