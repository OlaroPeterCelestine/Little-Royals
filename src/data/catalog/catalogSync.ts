import { schoolStore } from '@/data/catalog/store'
import { isApiEnabled } from '@/lib/apiMode'
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

function rowFromApi(raw: ApiRow): StoreRow {
  const out: StoreRow = {
    id: String(raw.id),
    name: String(raw.name || raw.id),
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

/** Best-effort create on API after local create. */
export function syncCreateToApi(key: string, row: StoreRow) {
  if (!isApiEnabled() || !isFrontendModule(key)) return
  void catalogServices[key]
    .create({
      ...row,
      name: row.name,
    })
    .catch(() => {
      /* keep local row; API may be down */
    })
}

/** Best-effort update on API after local update. */
export function syncUpdateToApi(key: string, id: string, values: RecordValues) {
  if (!isApiEnabled() || !isFrontendModule(key)) return
  const body: Partial<ApiRow> & { name: string } = {
    name: asString(values.name) || id,
  }
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null) continue
    body[k] = typeof v === 'boolean' ? String(v) : (v as string | number)
  }
  void catalogServices[key].update(id, body).catch(() => {
    /* local already updated */
  })
}

/** Best-effort delete on API after local delete. */
export function syncDeleteToApi(key: string, ids: string[]) {
  if (!isApiEnabled() || !isFrontendModule(key) || !ids.length) return
  for (const id of ids) {
    void catalogServices[key].remove(id).catch(() => {
      /* local already deleted */
    })
  }
}
