/** Frontend security helpers — escape, storage, redirects, auth session shape. */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Escape each line, then join with <br> for print HTML. */
export function escapeHtmlMultiline(value: unknown): string {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => escapeHtml(line))
    .join('<br>')
}

/**
 * Only allow same-origin relative paths (block //evil.com, javascript:, etc.).
 */
export function isSafeInternalPath(path: unknown): path is string {
  if (typeof path !== 'string') return false
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) return false
  if (trimmed.startsWith('//')) return false
  if (trimmed.includes('://')) return false
  if (/[\u0000-\u001F]/.test(trimmed)) return false
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false
  return true
}

export function safeInternalPath(path: unknown, fallback = '/'): string {
  return isSafeInternalPath(path) ? path : fallback
}

export interface AuthSessionShape {
  email: string
  name: string
  role: string
  remember: boolean
  /** JWT from the Go school API */
  token?: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function parseAuthSession(raw: unknown): AuthSessionShape | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (
    !isNonEmptyString(o.email) ||
    !isNonEmptyString(o.name) ||
    !isNonEmptyString(o.role)
  ) {
    return null
  }
  const email = o.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  const token =
    typeof o.token === 'string' && o.token.trim().length > 20
      ? o.token.trim()
      : undefined
  return {
    email,
    name: o.name.trim().slice(0, 120),
    role: o.role.trim().slice(0, 80),
    remember: Boolean(o.remember),
    token,
  }
}

export function readJsonStorage<T>(
  storage: Storage,
  key: string,
  parse: (raw: unknown) => T | null,
): T | null {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    return parse(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function writeJsonStorage(
  storage: Storage,
  key: string,
  value: unknown,
): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / private mode */
  }
}

export function clearStorageKeys(keys: string[]): void {
  for (const key of keys) {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

/** Simple in-memory login throttle (front-end demo only). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export function assertLoginAllowed(email: string): void {
  const key = email.trim().toLowerCase() || 'unknown'
  const now = Date.now()
  const row = loginAttempts.get(key)
  if (!row || now > row.resetAt) {
    loginAttempts.set(key, { count: 0, resetAt: now + 15 * 60_000 })
    return
  }
  if (row.count >= 8) {
    const mins = Math.ceil((row.resetAt - now) / 60_000)
    throw new Error(
      `Too many sign-in attempts. Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`,
    )
  }
}

export function recordLoginFailure(email: string): void {
  const key = email.trim().toLowerCase() || 'unknown'
  const now = Date.now()
  const row = loginAttempts.get(key)
  if (!row || now > row.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 })
    return
  }
  row.count += 1
}

export function clearLoginFailures(email: string): void {
  loginAttempts.delete(email.trim().toLowerCase())
}

/** Parent desk routes only — used by the router. */
export const PARENT_ALLOWED_PREFIXES = [
  '/parent-portal',
  '/calendar',
  '/announcements',
  '/report-cards',
  '/me',
  '/login',
] as const

export function isParentAllowedPath(path: string): boolean {
  return PARENT_ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}
