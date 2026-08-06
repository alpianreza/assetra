const API_BASE = '/api/v1';
const CSRF_COOKIE_NAME = 'assetra_csrf';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.status = status;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return matches ? decodeURIComponent(matches[1]) : null;
}

export async function getCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'Failed to get CSRF token');
  const data = await res.json();
  return data.data.csrfToken;
}

async function ensureCsrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;
  return getCsrfToken();
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** JSON and multipart requests share the same session + CSRF behavior. */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {};
  if (options.body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (isMutation) {
    headers['X-CSRF-Token'] = await ensureCsrfToken();
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: options.body === undefined
      ? undefined
      : isFormData
        ? options.body as FormData
        : JSON.stringify(options.body),
  });

  if (!res.ok) {
    let message: string | undefined;
    try {
      const payload = await res.json();
      message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
    } catch {
      message = undefined;
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
