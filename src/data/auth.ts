import { computed, reactive } from 'vue'
import { currentUser, logActivity } from './activity'
import { getUserByEmail, normalizeRole, type SystemUser } from './permissions'
import {
  assertLoginAllowed,
  clearLoginFailures,
  clearStorageKeys,
  parseAuthSession,
  readJsonStorage,
  recordLoginFailure,
  writeJsonStorage,
  type AuthSessionShape,
} from '../lib/security'

const STORAGE_KEY = 'little-royals-auth'
const BOOT_KEY = 'little-royals-auth-boot'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(
  /\/$/,
  '',
)

/** One-time: force Login as the first screen after this auth boot bump. */
try {
  if (localStorage.getItem(BOOT_KEY) !== '3') {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(BOOT_KEY, '3')
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

  // Prefer JWT session from API; fall back to local user directory for offline desk.
  if (parsed.token) {
    return {
      email: parsed.email.toLowerCase(),
      name: parsed.name,
      role: normalizeRole(parsed.role) || parsed.role,
      remember: parsed.remember,
      token: parsed.token,
    }
  }

  const user = getUserByEmail(parsed.email)
  if (!user || user.status !== 'Active') {
    clearStorageKeys([STORAGE_KEY])
    return null
  }

  return {
    email: user.email.toLowerCase(),
    name: user.name,
    role: user.role,
    remember: parsed.remember,
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

  let payload: LoginAPIResponse
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email,
        password,
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

/** Re-check stored session (JWT preferred). */
export function refreshAuthSession() {
  if (!state.session) return
  if (state.session.token) {
    applyUser(state.session)
    return
  }
  const user = getUserByEmail(state.session.email)
  if (!user || user.status !== 'Active') {
    logout()
    return
  }
  state.session = {
    ...state.session,
    name: user.name,
    role: user.role,
    email: user.email.toLowerCase(),
  }
  persist(state.session)
  applyUser(user)
}
