import { computed, reactive } from 'vue'
import { currentUser, logActivity } from '@/data/activity/activity'
import { getUserByEmail, normalizeRole, type SystemUser } from '@/data/auth/permissions'
import {
  assertLoginAllowed,
  clearLoginFailures,
  clearStorageKeys,
  parseAuthSession,
  readJsonStorage,
  recordLoginFailure,
  writeJsonStorage,
  type AuthSessionShape,
} from '@/lib/security'
import { apiBaseUrl, isApiEnabled } from '@/lib/apiMode'

const STORAGE_KEY = 'little-royals-auth'
const BOOT_KEY = 'little-royals-auth-boot'

/** One-time: clear API JWT sessions when switching to offline desk. */
try {
  if (localStorage.getItem(BOOT_KEY) !== '4') {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(BOOT_KEY, '4')
  }
} catch {
  /* ignore */
}

export type AuthSession = AuthSessionShape

const state = reactive({
  session: null as AuthSession | null,
  booted: true,
})

function loadSession(): AuthSession | null {
  const fromSession = readJsonStorage(
    sessionStorage,
    STORAGE_KEY,
    parseAuthSession,
  )
  const fromLocal = readJsonStorage(
    localStorage,
    STORAGE_KEY,
    parseAuthSession,
  )
  const parsed = fromSession || (fromLocal?.remember ? fromLocal : null)
  if (!parsed) {
    if (fromLocal && !fromLocal.remember) {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
    return null
  }

  // Offline desk: ignore leftover API JWT tokens; keep any local session.
  if (!isApiEnabled() || !parsed.token) {
    const user = getUserByEmail(parsed.email)
    if (user && user.status === 'Active') {
      return {
        email: user.email.toLowerCase(),
        name: user.name,
        role: user.role,
        remember: parsed.remember,
      }
    }
    if (!isApiEnabled() && parsed.email) {
      return {
        email: parsed.email.toLowerCase(),
        name: parsed.name || parsed.email.split('@')[0] || 'Guest',
        role: normalizeRole(parsed.role) || parsed.role || 'Admin',
        remember: parsed.remember,
      }
    }
    clearStorageKeys([STORAGE_KEY])
    return null
  }

  return {
    email: parsed.email.toLowerCase(),
    name: parsed.name,
    role: normalizeRole(parsed.role) || parsed.role,
    remember: parsed.remember,
    token: parsed.token,
  }
}

function persist(session: AuthSession | null) {
  clearStorageKeys([STORAGE_KEY])
  if (!session) return
  const store = session.remember ? localStorage : sessionStorage
  writeJsonStorage(store, STORAGE_KEY, session)
}

function applyUser(user: Pick<SystemUser, 'name' | 'email' | 'role'> | null) {
  if (!user) {
    currentUser.name = ''
    currentUser.email = ''
    currentUser.role = ''
    return
  }
  currentUser.name = user.name
  currentUser.email = user.email
  currentUser.role = user.role
}

state.session = loadSession()
if (state.session) {
  applyUser(state.session)
} else {
  applyUser(null)
}

export const isAuthenticated = computed(() => Boolean(state.session))

export const authSession = computed(() => state.session)

export function authToken(): string | undefined {
  if (!isApiEnabled()) return undefined
  return state.session?.token
}

type LoginAPIResponse = {
  ok: boolean
  data?: {
    token: string
    expiresAt: string
    email: string
    name: string
    role: string
    userId: string
  }
  error?: string
}

async function loginViaApi(input: {
  email: string
  password: string
  remember?: boolean
}): Promise<SystemUser> {
  const email = input.email
  let payload: LoginAPIResponse
  try {
    const res = await fetch(`${apiBaseUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email,
        password: input.password,
        remember: Boolean(input.remember),
      }),
    })
    payload = (await res.json()) as LoginAPIResponse
    if (!res.ok || !payload.ok || !payload.data?.token) {
      recordLoginFailure(email)
      throw new Error(payload.error || 'Incorrect email or password')
    }
  } catch (err) {
    if (err instanceof Error && err.message !== 'Failed to fetch') throw err
    recordLoginFailure(email)
    throw new Error('Cannot reach the school API. Is the backend running?')
  }

  clearLoginFailures(email)

  const data = payload.data!
  const role = normalizeRole(data.role) || data.role
  const session: AuthSession = {
    email: data.email.toLowerCase(),
    name: data.name,
    role,
    remember: Boolean(input.remember),
    token: data.token,
  }
  state.session = session
  persist(session)
  applyUser({ name: data.name, email: data.email, role })

  const local = getUserByEmail(data.email)
  if (local) {
    local.lastLogin = new Date().toISOString()
    local.role = role
    local.name = data.name
  }

  logActivity({
    action: 'Login',
    module: 'system',
    moduleLabel: 'System',
    recordName: data.name,
    summary: `${data.name} signed in`,
    detail: data.email,
    severity: 'success',
  })

  return { name: data.name, email: data.email, role } as SystemUser
}

function loginLocal(input: {
  email: string
  password: string
  remember?: boolean
}): SystemUser {
  // Offline desk: any non-empty email + password is accepted.
  const email = input.email
  const existing = getUserByEmail(email)
  const user: SystemUser =
    existing && existing.status === 'Active'
      ? existing
      : {
          id: `LOCAL-${email}`,
          name:
            existing?.name ||
            email
              .split('@')[0]
              .replace(/[._-]+/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase()) ||
            'Guest',
          email,
          role: existing?.role || 'Admin',
          status: 'Active',
        }

  clearLoginFailures(email)

  const session: AuthSession = {
    email: user.email.toLowerCase(),
    name: user.name,
    role: user.role,
    remember: Boolean(input.remember),
  }
  state.session = session
  persist(session)
  applyUser(user)
  if (existing) existing.lastLogin = new Date().toISOString()

  logActivity({
    action: 'Login',
    module: 'system',
    moduleLabel: 'System',
    recordName: user.name,
    summary: `${user.name} signed in (local desk)`,
    detail: user.email,
    severity: 'success',
  })

  return user
}

export async function loginWithCredentials(input: {
  email: string
  password: string
  remember?: boolean
}) {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  if (!email) throw new Error('Email is required')
  if (!password) throw new Error('Password is required')

  assertLoginAllowed(email)

  if (!isApiEnabled()) {
    return loginLocal({ email, password, remember: input.remember })
  }
  return loginViaApi({ email, password, remember: input.remember })
}

export function logout() {
  const name = state.session?.name
  state.session = null
  persist(null)
  applyUser(null)
  if (name) {
    logActivity({
      action: 'Login',
      module: 'system',
      moduleLabel: 'System',
      recordName: name,
      summary: `${name} signed out`,
      severity: 'info',
    })
  }
}

/** Re-check stored session (local directory when API is off). */
export function refreshAuthSession() {
  if (!state.session) return
  if (isApiEnabled() && state.session.token) {
    applyUser(state.session)
    return
  }
  const user = getUserByEmail(state.session.email)
  if (user && user.status === 'Active') {
    state.session = {
      ...state.session,
      name: user.name,
      role: user.role,
      email: user.email.toLowerCase(),
      token: undefined,
    }
    persist(state.session)
    applyUser(user)
    return
  }
  if (!isApiEnabled() && state.session.email) {
    applyUser(state.session)
    return
  }
  logout()
}
