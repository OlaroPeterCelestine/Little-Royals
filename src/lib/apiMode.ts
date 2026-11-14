/**
 * Desk runs fully offline unless the API is explicitly enabled.
 * Set VITE_USE_API=true and VITE_API_BASE_URL to wire the Go backend later.
 */
export function isApiEnabled(): boolean {
  const flag = String(import.meta.env.VITE_USE_API ?? 'false')
    .trim()
    .toLowerCase()
  if (flag !== 'true' && flag !== '1' && flag !== 'on' && flag !== 'yes') {
    return false
  }
  return Boolean(String(import.meta.env.VITE_API_BASE_URL || '').trim())
}

export function apiBaseUrl(): string {
  if (!isApiEnabled()) return ''
  return String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
}

/** Shared local desk password when the API is disabled. */
export function localDemoPassword(): string {
  return String(import.meta.env.VITE_DEMO_PASSWORD || 'demo')
}
