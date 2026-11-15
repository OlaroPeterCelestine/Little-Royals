/**
 * Desk prefers the Go API when enabled; falls back to local catalog if the API
 * is unreachable (see auth hybrid login + catalogSync).
 *
 * Set VITE_USE_API=true. VITE_API_BASE_URL defaults to http://127.0.0.1:18080.
 */
const DEFAULT_API_BASE = 'http://127.0.0.1:18080'

export function isApiEnabled(): boolean {
  const flag = String(import.meta.env.VITE_USE_API ?? 'false')
    .trim()
    .toLowerCase()
  return flag === 'true' || flag === '1' || flag === 'on' || flag === 'yes'
}

export function apiBaseUrl(): string {
  if (!isApiEnabled()) return ''
  const configured = String(import.meta.env.VITE_API_BASE_URL || '')
    .trim()
    .replace(/\/$/, '')
  return configured || DEFAULT_API_BASE
}

export function wsBaseUrl(): string {
  if (!isApiEnabled()) return ''
  const configured = String(import.meta.env.VITE_WS_URL || '')
    .trim()
    .replace(/\/$/, '')
  if (configured) return configured
  const http = apiBaseUrl()
  if (!http) return ''
  return http.replace(/^http/, 'ws')
}
