import { useQuery } from '@tanstack/react-query';
import { fetchMe } from './api';
import { AUTH_QUERY_KEY } from './constants';

/**
 * Access current user + permissions (TanStack Query canonical auth state).
 * Used for permission-aware navigation and actions.
 */
export function useAuth() {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
  });

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  };

  return { user, isLoading, isError, hasPermission };
}
