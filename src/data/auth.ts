import { computed, reactive } from 'vue'
import { currentUser, logActivity } from './activity'
import { getUserByEmail, type SystemUser } from './permissions'
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

/** Demo desk shared password — replace with server auth in production. */
export const DEMO_PASSWORD = 'royals123'

/** One-time: force Login as the first screen after this auth boot bump. */
try {
  if (localStorage.getItem(BOOT_KEY) !== '2') {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(BOOT_KEY, '2')
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
  // Session tab first — a fresh browser visit should start at Login unless
  // this tab already signed in. "Remember me" may restore from localStorage.
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
    // Drop stale local sessions that were saved without an explicit remember
    if (fromLocal && !fromLocal.remember) {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
    return null
  }

  const user = getUserByEmail(parsed.email)
  if (!user || user.status !== 'Active') {
    clearStorageKeys([STORAGE_KEY])
    return null
  }

  // Rehydrate name/role from the live user record (never trust stale role alone)
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

export function loginWithCredentials(input: {
  email: string
  password: string
  remember?: boolean
}) {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  if (!email) throw new Error('Email is required')
  if (!password) throw new Error('Password is required')

  assertLoginAllowed(email)

  const user = getUserByEmail(email)
  if (!user) {
    recordLoginFailure(email)
    throw new Error('No account found for that email. Ask your school admin.')
  }
  if (user.status !== 'Active') {
    recordLoginFailure(email)
    throw new Error('This account is not active yet. Contact your school admin.')
  }

  // Demo desk: shared password for seeded users (never ship real secrets here)
  if (password !== DEMO_PASSWORD) {
    recordLoginFailure(email)
    throw new Error('Incorrect email or password')
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
  user.lastLogin = new Date().toISOString()

  logActivity({
    action: 'Login',
    module: 'system',
    moduleLabel: 'System',
    recordName: user.name,
    summary: `${user.name} signed in`,
    detail: user.email,
    severity: 'success',
  })

  return user
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

/** Re-check stored session against the live user list (call on focus/boot). */
export function refreshAuthSession() {
  if (!state.session) return
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
