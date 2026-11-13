import { computed, reactive } from 'vue'
import {
  catalog as seed,
  type CatalogModule,
  type CatalogRow,
  type BadgeTheme,
} from './catalog'
import { logActivity } from './activity'
import { asString, type RecordValues } from '../types/records'

function statusTheme(status: string): BadgeTheme {
  const s = status.toLowerCase()
  if (
    ['active', 'present', 'paid', 'approved', 'published', 'pass', 'available'].some(
      (x) => s.includes(x),
    )
  )
    return 'green'
  if (['unpaid', 'absent', 'rejected', 'overdue', 'fail'].some((x) => s.includes(x)))
    return 'red'
  if (
    ['draft', 'pending', 'late', 'partial', 'waitlist', 'maintenance'].some((x) =>
      s.includes(x),
    )
  )
    return 'amber'
  if (['excused', 'scheduled', 'enrolled', 'open', 'term'].some((x) => s.includes(x)))
    return 'blue'
  return 'gray'
}

/** Live mutable school catalog — dialogs create/update/delete against this. */
export const schoolStore = reactive(
  Object.fromEntries(
    Object.entries(seed).map(([key, mod]) => [
      key,
      {
        ...mod,
        rows: mod.rows.map((row) => ({ ...row })),
      } satisfies CatalogModule,
    ]),
  ),
) as Record<string, CatalogModule>

export function getLiveModule(key: string) {
  return schoolStore[key]
}

export function nextId(key: string, prefix: string) {
  const mod = schoolStore[key]
  const n = (mod?.rows.length || 0) + 1
  return `${prefix}-${String(n).padStart(3, '0')}`
}

function assignRowFields(row: CatalogRow, mod: CatalogModule, values: RecordValues) {
  const reserved = new Set(['name', 'status', 'id', 'subtitle'])
  const keys = new Set([
    ...mod.columns.map((c) => c.key),
    ...Object.keys(values),
  ])
  for (const key of keys) {
    if (reserved.has(key)) continue
    const raw = values[key]
    if (raw === undefined || raw === null || raw === '') continue
    row[key] = typeof raw === 'boolean' ? String(raw) : (raw as string | number)
  }
}

export function addRecord(key: string, values: RecordValues): CatalogRow {
  const mod = schoolStore[key]
  if (!mod) throw new Error(`Unknown module: ${key}`)
  const name = asString(values.name).trim()
  if (!name) throw new Error('Name is required')

  const duplicate = mod.rows.some(
    (r) => r.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error(`“${name}” already exists in ${mod.title}`)

  const id =
    asString(values.id).trim() ||
    nextId(key, mod.key.slice(0, 3).toUpperCase())

  const status = values.status ? asString(values.status) : 'Active'
  const row: CatalogRow = {
    id,
    name,
    status,
    statusTheme: statusTheme(status),
    subtitle: values.subtitle ? asString(values.subtitle) : undefined,
  }

  assignRowFields(row, mod, values)

  mod.rows.unshift(row)
  logActivity({
    action: 'Created',
    module: key,
    moduleLabel: mod.singular,
    recordId: row.id,
    recordName: row.name,
    summary: `Created ${mod.singular.toLowerCase()} ${row.name}`,
    severity: 'success',
  })
  return row
}

export function updateRecord(
  key: string,
  id: string,
  values: RecordValues,
): CatalogRow {
  const mod = schoolStore[key]
  if (!mod) throw new Error(`Unknown module: ${key}`)
  const row = mod.rows.find((r) => r.id === id)
  if (!row) throw new Error('Record not found')

  const name = asString(values.name).trim()
  if (!name) throw new Error('Name is required')

  const duplicate = mod.rows.some(
    (r) => r.id !== id && r.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error(`“${name}” already exists in ${mod.title}`)

  row.name = name
  if (values.status) {
    const status = asString(values.status)
    row.status = status
    row.statusTheme = statusTheme(status)
  }
  if (values.subtitle !== undefined) {
    row.subtitle = values.subtitle ? asString(values.subtitle) : undefined
  }
  assignRowFields(row, mod, values)
  logActivity({
    action: 'Updated',
    module: key,
    moduleLabel: mod.singular,
    recordId: row.id,
    recordName: row.name,
    summary: `Updated ${mod.singular.toLowerCase()} ${row.name}`,
    severity: 'info',
  })
  return row
}

export function deleteRecords(key: string, ids: string[]) {
  const mod = schoolStore[key]
  if (!mod) throw new Error(`Unknown module: ${key}`)
  if (!ids.length) throw new Error('Select at least one record to delete')
  const doomed = mod.rows.filter((r) => ids.includes(r.id))
  const before = mod.rows.length
  mod.rows = mod.rows.filter((r) => !ids.includes(r.id))
  const removed = before - mod.rows.length
  for (const row of doomed) {
    logActivity({
      action: 'Deleted',
      module: key,
      moduleLabel: mod.singular,
      recordId: row.id,
      recordName: row.name,
      summary: `Deleted ${mod.singular.toLowerCase()} ${row.name}`,
      severity: 'danger',
    })
  }
  return removed
}

export const unpaidFeeCount = computed(() =>
  (schoolStore.fees?.rows || []).filter((r) =>
    ['Unpaid', 'Overdue', 'Partial'].includes(String(r.status)),
  ).length,
)

export const pendingApplicantCount = computed(() =>
  (schoolStore.applicants?.rows || []).filter((r) =>
    ['Pending', 'Waitlist'].includes(String(r.status)),
  ).length,
)
