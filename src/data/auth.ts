import { computed, reactive } from 'vue'
import { currentUser } from './activity'
import { getUserByEmail, type SystemUser } from './permissions'
import { logActivity } from './activity'

const STORAGE_KEY = 'little-royals-auth'

export interface AuthSession {
  email: string
  name: string
  role: string
  remember: boolean
}

const state = reactive({
  session: loadSession() as AuthSession | null,
  booted: true,
})

function loadSession(): AuthSession | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

function persist(session: AuthSession | null) {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  if (!session) return
  const raw = JSON.stringify(session)
  if (session.remember) localStorage.setItem(STORAGE_KEY, raw)
  else sessionStorage.setItem(STORAGE_KEY, raw)
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
  const email = input.email.trim()
  const password = input.password
  if (!email) throw new Error('Email is required')
  if (!password) throw new Error('Password is required')

  const user = getUserByEmail(email)
  if (!user) {
    throw new Error('No account found for that email. Ask your school admin.')
  }
  if (user.status !== 'Active') {
    throw new Error('This account is not active yet. Contact your school admin.')
  }

  // Demo desk: any non-empty password works for seeded users
  const session: AuthSession = {
    email: user.email,
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

