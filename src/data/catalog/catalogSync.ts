import { ref } from 'vue'
import { schoolStore } from '@/data/catalog/store'
import { isApiEnabled } from '@/lib/apiMode'
import { clearApiGetCacheFor } from '@/services/http'
import {
  FRONTEND_MODULES,
  catalogServices,
  type FrontendModule,
} from '@/services/index'
import type { CatalogRow as StoreRow } from '@/data/catalog/catalog'
import type { CatalogRow as ApiRow } from '@/services/catalog'
import type { RecordValues } from '@/types/records'
import { asString } from '@/types/records'

/** True while background API hydrate is running (Gmail-style quiet sync). */
export const catalogSyncing = ref(false)
export const catalogSyncLabel = ref('')

const moduleFreshAt = new Map<string, number>()
const moduleInflight = new Map<string, Promise<boolean>>()
const MODULE_FRESH_MS = 20_000

function isFrontendModule(key: string): key is FrontendModule {
  return (FRONTEND_MODULES as readonly string[]).includes(key)
}

function fieldText(raw: ApiRow, key: string): string {
  const value = (raw as Record<string, unknown>)[key]
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function displayNameFromApi(raw: ApiRow): string {
  const direct = fieldText(raw, 'name')
  if (direct) return direct
  const full = `${fieldText(raw, 'firstName')} ${fieldText(raw, 'lastName')}`.trim()
  if (full) return full
  const admission = fieldText(raw, 'admissionNo')
  if (admission) return admission
  return String(raw.id)
}

export function rowFromApi(raw: ApiRow): StoreRow {
  const out: StoreRow = {
    id: String(raw.id),
    name: displayNameFromApi(raw),
  }
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'id' || k === 'name') continue
    if (v === null || v === undefined) continue
    if (typeof v === 'boolean') out[k] = String(v)
    else out[k] = v
  }
  if (raw.status != null) out.status = String(raw.status)
  return out
}

const LOOKS_LIKE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Desk date inputs are YYYY-MM-DD; Go time.Time needs RFC3339. */
function apiDateValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const v = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00Z`
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return `${v}:00Z`
  return value
}

export function bodyFromRow(row: StoreRow | RecordValues): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null) continue
    if (k === 'statusTheme') continue
    const normalized = apiDateValue(v)
    body[k] = typeof normalized === 'boolean' ? String(normalized) : normalized
  }
  // Typed people resources use first/last name — derive from desk "name" when missing.
  if (!body.firstName && typeof body.name === 'string') {
    const parts = String(body.name).trim().split(/\s+/)
    if (parts[0]) body.firstName = parts[0]
    if (parts.length > 1 && !body.lastName) body.lastName = parts.slice(1).join(' ')
  }
  // Desk ↔ typed API field aliases
  if (!body.admissionNo && body.studentNumber) {
    body.admissionNo = body.studentNumber
  }
  if (!body.staffNo && body.id && !LOOKS_LIKE_UUID.test(String(body.id))) {
    body.staffNo = body.id
  }
  if (!body.roleTitle && body.jobTitle) {
    body.roleTitle = body.jobTitle
  }
  if (!body.relation && body.relationship) {
    body.relation = body.relationship
  }
  return body
}

export function isServerModule(key: string): key is FrontendModule {
  return isFrontendModule(key)
}

/** Map a desk path to a catalog module when possible. */
export function moduleFromPath(path?: string): FrontendModule | null {
  if (!path) return null
  const seg = String(path).split('?')[0].replace(/^\//, '').split('/')[0]
  if (!seg) return null
  const aliases: Record<string, FrontendModule> = {
    people: 'parents',
    payment: 'payments',
    meals: 'meals-menus',
    library: 'library-books',
    transport: 'transport-routes',
    health: 'health-records',
    discipline: 'disciplinary-cases',
    inventory: 'inventory-items',
    applicants: 'admissions',
  }
  const key = aliases[seg] || seg
  return isFrontendModule(key) ? key : null
}

async function pullModule(module: FrontendModule, bust = false): Promise<boolean> {
  try {
    if (bust) clearApiGetCacheFor(`/api/v1/${module}`)
    const { items } = await catalogServices[module].list({ limit: 500 })
    const mod = schoolStore[module]
    if (!mod) return false
    // API is authoritative — even an empty list replaces hardcoded seed rows.
    mod.rows = items.map(rowFromApi)
    moduleFreshAt.set(module, Date.now())
    return true
  } catch {
    return false
  }
}

/** Modules the dashboard / post-login desk needs first. */
export const DESK_HYDRATE_PRIORITY: FrontendModule[] = [
  'students',
  'teachers',
  'staff',
  'parents',
  'attendance',
  'classes',
  'subjects',
  'admissions',
  'invoices',
  'payments',
  'fees',
  'users',
  'school-events',
]

/**
 * Ensure a single module is warm — shows seed instantly, revalidates in background.
 * Safe to call on route enter / sidebar hover.
 */
export function ensureModule(module: string, opts?: { force?: boolean }): Promise<boolean> {
  if (!isApiEnabled() || !isFrontendModule(module)) return Promise.resolve(false)
  const force = opts?.force === true
  const at = moduleFreshAt.get(module) || 0
  if (!force && Date.now() - at < MODULE_FRESH_MS) return Promise.resolve(true)
  // A forced pull must not reuse a stale in-flight soft pull.
  if (!force) {
    const existing = moduleInflight.get(module)
    if (existing) return existing
  }
  const p = pullModule(module, force).finally(() => {
    moduleInflight.delete(module)
  })
  moduleInflight.set(module, p)
  return p
}

/**
 * Pull live rows from the Go API into the desk store (when API is enabled).
 * Prioritizes `priority` modules first. Pass `force` after login so JWT-gated
 * lists replace empty shells immediately.
 */
export async function hydrateCatalogFromApi(
  priority: string[] = [],
  opts?: { force?: boolean; priorityOnly?: boolean },
): Promise<{
  ok: boolean
  loaded: number
  failed: string[]
}> {
  if (!isApiEnabled()) {
    return { ok: false, loaded: 0, failed: [] }
  }

  const force = opts?.force === true
  catalogSyncing.value = true
  catalogSyncLabel.value = 'Updating…'
  const failed: string[] = []
  let loaded = 0

  const seen = new Set<string>()
  const order: FrontendModule[] = []
  for (const key of priority) {
    if (isFrontendModule(key) && !seen.has(key)) {
      seen.add(key)
      order.push(key)
    }
  }
  if (!opts?.priorityOnly) {
    for (const key of FRONTEND_MODULES) {
      if (!seen.has(key)) {
        seen.add(key)
        order.push(key)
      }
    }
  }

  const batchSize = 10
  try {
    for (let i = 0; i < order.length; i += batchSize) {
      const slice = order.slice(i, i + batchSize)
      catalogSyncLabel.value =
        i === 0 ? 'Updating…' : `Updating… ${Math.min(i + batchSize, order.length)}/${order.length}`
      await Promise.all(
        slice.map(async (module) => {
          // Force only the first priority batch after login; rest soft-revalidate.
          const forceThis = force && i === 0
          const ok = await ensureModule(module, { force: forceThis })
          if (ok) loaded += 1
          else failed.push(module)
        }),
      )
    }
  } finally {
    catalogSyncing.value = false
    catalogSyncLabel.value = ''
  }

  return { ok: failed.length < order.length, loaded, failed }
}

/** After login / focus: warm the desk modules users see first. */
export async function hydrateDeskAfterAuth(extraPriority: string[] = []): Promise<void> {
  if (!isApiEnabled()) return
  const priority = [...extraPriority, ...DESK_HYDRATE_PRIORITY]
  await hydrateCatalogFromApi(priority, { force: true })
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Typed GORM resources expect server-minted UUIDs — don't send desk codes as id. */
export const TYPED_API_MODULES = new Set([
  'students',
  'staff',
  'parents',
  'classes',
  'subjects',
  'attendance',
  'fees',
  'invoices',
  'payments',
])

function bumpModule(key: string) {
  clearApiGetCacheFor(`/api/v1/${key}`)
  moduleFreshAt.delete(key)
}

/** Server-authoritative create — throws if the API rejects. */
export async function createOnServer(
  key: FrontendModule,
  body: Record<string, unknown> & { name: string },
): Promise<StoreRow> {
  const created = await catalogServices[key].create(
    body as Partial<ApiRow> & { name: string },
  )
  bumpModule(key)
  return rowFromApi(created)
}

/** Server-authoritative update — throws if the API rejects. */
export async function updateOnServer(
  key: FrontendModule,
  id: string,
  body: Record<string, unknown>,
): Promise<StoreRow> {
  const updated = await catalogServices[key].update(id, body as Partial<ApiRow>)
  bumpModule(key)
  return rowFromApi(updated)
}

/** Server-authoritative delete — throws if any id fails. */
export async function deleteOnServer(key: FrontendModule, ids: string[]) {
  const results = await Promise.allSettled(
    ids.map((id) => catalogServices[key].remove(id)),
  )
  const failed = results.filter((r) => r.status === 'rejected').length
  bumpModule(key)
  if (failed) {
    throw new Error(
      failed === ids.length
        ? 'Server rejected the delete'
        : `${failed} of ${ids.length} deletes failed on the server`,
    )
  }
}
