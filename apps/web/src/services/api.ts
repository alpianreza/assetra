/**
 * API client.
 *
 * Uses the same-origin path `/api/v1` in both development and production.
 * In development, Vite's proxy forwards `/api/*` to the NestJS backend
 * (http://localhost:3000). In production, the reverse proxy serves the
 * React static build and the `/api/v1/*` route on the same origin.
 */

const API_BASE = '/api/v1'

interface HealthResponse {
  status: 'ok' | 'error'
  database: 'connected' | 'disconnected'
  version: string
  timestamp: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`)
  }
  return res.json()
}
