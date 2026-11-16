/**
 * Desk is server-authoritative when VITE_USE_API is on.
 * Create / update / delete always go through the Go API — never browser-only.
 *
 * Local: VITE_API_BASE_URL=http://127.0.0.1:18080
 * VPS Docker (nginx proxies /api → api): VITE_API_BASE_URL=same-origin
 *
 * same-origin → apiBaseUrl() is "" so fetch("/api/v1/...") hits the desk host.
 */
const DEFAULT_API_BASE = 'http://127.0.0.1:18080'

export function isApiEnabled(): boolean {
  const flag = String(import.meta.env.VITE_USE_API ?? 'false')
    .trim()
    .toLowerCase()
  return flag === 'true' || flag === '1' || flag === 'on' || flag === 'yes'
}

function isSameOrigin(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v === 'same-origin' || v === 'same' || v === '/' || v === '.'
}

/** True when the desk should call the API (absolute base or same-origin). */
export function isApiConfigured(): boolean {
  return isApiEnabled()
}

export function apiBaseUrl(): string {
  if (!isApiEnabled()) return ''
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (isSameOrigin(raw)) return ''
  const configured = raw.replace(/\/$/, '')
  return configured || DEFAULT_API_BASE
}

/** Build an API URL; empty base means same-origin relative path. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl()}${p}`
}

export function wsBaseUrl(): string {
  if (!isApiEnabled()) return ''
  const raw = String(import.meta.env.VITE_WS_URL ?? '').trim()
  if (isSameOrigin(raw) || !raw) {
    const http = apiBaseUrl()
    if (http) return http.replace(/^http/, 'ws')
    // Same-origin: resolve against the current page (works behind host nginx TLS).
    if (typeof window !== 'undefined' && window.location?.host) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${proto}//${window.location.host}`
    }
    return ''
  }
  return raw.replace(/\/$/, '')
}
