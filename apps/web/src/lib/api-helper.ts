// import { SanitizedUserDto } from '../features/auth/types'; // Commented to fix unused-vars


const API_BASE = '/api/v1';
const CSRF_COOKIE_NAME = 'assetra_csrf';

/** Error carrying an HTTP status code. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.status = status;
  }
}

/** Read a non-HttpOnly cookie by name. */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return matches ? decodeURIComponent(matches[1]) : null;
}

/**
 * Obtain a fresh CSRF token from the backend. The backend sets the readable
 * `assetra_csrf` cookie as a side effect.
 */
export async function getCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'Failed to get CSRF token');
  const data = await res.json();
  return data.data.csrfToken;
}

/**
 * Centralized mutation CSRF behavior (double-submit cookie pattern):
 * read the readable CSRF cookie and send it as `X-CSRF-Token`. If the cookie
 * is missing (e.g. first visit), obtain a fresh token first.
 */
async function ensureCsrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;
  return getCsrfToken();
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Same-origin API request helper.
 * - Always sends credentials (HTTPOnly session cookie).
 * - Automatically attaches `X-CSRF-Token` on mutations (POST/PUT/PATCH/DELETE).
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (isMutation) {
    headers['X-CSRF-Token'] = await ensureCsrfToken();
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    throw new ApiError(res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}


