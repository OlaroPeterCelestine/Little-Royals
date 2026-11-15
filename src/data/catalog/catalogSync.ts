import { schoolStore } from '@/data/catalog/store'
import { isApiEnabled } from '@/lib/apiMode'
import { clearApiGetCache } from '@/services/http'
import {
  FRONTEND_MODULES,
  catalogServices,
  type FrontendModule,
} from '@/services/index'
import type { CatalogRow as StoreRow } from '@/data/catalog/catalog'
import type { CatalogRow as ApiRow } from '@/services/catalog'
import type { RecordValues } from '@/types/records'
import { asString } from '@/types/records'

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

function rowFromApi(raw: ApiRow): StoreRow {
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

function bodyFromRow(row: StoreRow | RecordValues): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null) continue
    if (k === 'statusTheme') continue
    body[k] = typeof v === 'boolean' ? String(v) : v
  }
  // Typed people resources use first/last name — derive from desk "name" when missing.
  if (!body.firstName && typeof body.name === 'string') {
    const parts = String(body.name).trim().split(/\s+/)
    if (parts[0]) body.firstName = parts[0]
    if (parts.length > 1 && !body.lastName) body.lastName = parts.slice(1).join(' ')
  }
  return body
}

/**
 * Pull live rows from the Go API into the desk store (when API is enabled).
 * Seed data remains as fallback if a module fails.
 */
export async function hydrateCatalogFromApi(): Promise<{
  ok: boolean
  loaded: number
  failed: string[]
}> {
  if (!isApiEnabled()) {
    return { ok: false, loaded: 0, failed: [] }
  }

  const failed: string[] = []
  let loaded = 0

  const batchSize = 8
  for (let i = 0; i < FRONTEND_MODULES.length; i += batchSize) {
    const slice = FRONTEND_MODULES.slice(i, i + batchSize)
    await Promise.all(
      slice.map(async (module) => {
        try {
          const { items } = await catalogServices[module].list({ limit: 500 })
          const mod = schoolStore[module]
          if (!mod) return
          if (items.length) {
            mod.rows = items.map(rowFromApi)
            loaded += 1
          }
        } catch {
          failed.push(module)
        }
      }),
    )
  }

  return { ok: failed.length < FRONTEND_MODULES.length, loaded, failed }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Typed GORM resources expect server-minted UUIDs — don't send desk codes as id. */
const TYPED_API_MODULES = new Set([
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

/** Best-effort create on API after local create. Keeps local id when API accepts it. */
export function syncCreateToApi(key: string, row: StoreRow) {
  if (!isApiEnabled() || !isFrontendModule(key)) return
  const body = bodyFromRow(row)
  body.name = row.name
  if (TYPED_API_MODULES.has(key) && !UUID_RE.test(String(row.id))) {
    delete body.id
  }
  void catalogServices[key]
    .create(body as Partial<ApiRow> & { name: string })
    .then((created) => {
      clearApiGetCache()
      const mod = schoolStore[key]
      if (!mod || !created?.id) return
      const local = mod.rows.find((r) => r.id === row.id)
      if (!local) return
      // Prefer API public id when server minted a new one.
      if (String(created.id) !== row.id) {
        local.id = String(created.id)
      }
      for (const [k, v] of Object.entries(created)) {
        if (k === 'id' || v == null) continue
        local[k] = typeof v === 'boolean' ? String(v) : (v as string | number)
      }
    })
    .catch(() => {
      /* keep local row; API may be down or typed-module id mismatch */
    })
}

/** Best-effort update on API after local update. */
export function syncUpdateToApi(key: string, id: string, values: RecordValues) {
  if (!isApiEnabled() || !isFrontendModule(key)) return
  const body = bodyFromRow(values)
  body.name = asString(values.name) || id
  delete body.id
  void catalogServices[key]
    .update(id, body as Partial<ApiRow>)
    .then(() => clearApiGetCache())
    .catch(() => {
      /* local already updated */
    })
}

/** Best-effort delete on API after local delete. */
export function syncDeleteToApi(key: string, ids: string[]) {
  if (!isApiEnabled() || !isFrontendModule(key) || !ids.length) return
  void Promise.all(
    ids.map((id) =>
      catalogServices[key].remove(id).catch(() => {
        /* local already deleted */
      }),
    ),
  ).then(() => clearApiGetCache())
}
