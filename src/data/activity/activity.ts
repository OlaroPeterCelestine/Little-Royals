import { computed, reactive } from 'vue'
import type { CatalogRow } from '@/data/catalog/catalog'

export type ActivityAction =
  | 'Created'
  | 'Updated'
  | 'Deleted'
  | 'Viewed'
  | 'Permission'
  | 'Login'
  | 'Published'
  | 'Exported'
  | 'Printed'

export type ActivitySeverity = 'info' | 'success' | 'warning' | 'danger'

/** One field the user changed: what it was → what it became. */
export interface FieldChange {
  field: string
  before: string
  after: string
}

export interface ActivityEntry {
  id: string
  at: string
  action: ActivityAction
  module: string
  moduleLabel: string
  recordId?: string
  recordName?: string
  user: string
  role: string
  summary: string
  detail?: string
  severity: ActivitySeverity
  ip: string
  /** Field-level trail: previous value → new value. */
  changes?: FieldChange[]
}

/** Current desk user — filled by auth session (JWT roles match backend). */
export const currentUser = reactive({
  name: '',
  email: '',
  role: '',
})

const SESSION_IP_KEY = 'lr_desk_ip'

/** Stable session IP for desk audit trails (client-side). */
export function clientIp(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_IP_KEY)
    if (existing) return existing
    const ip = `41.210.${40 + Math.floor(Math.random() * 40)}.${10 + Math.floor(Math.random() * 200)}`
    sessionStorage.setItem(SESSION_IP_KEY, ip)
    return ip
  } catch {
    return '41.210.15.22'
  }
}

const SKIP_SNAPSHOT = new Set(['statusTheme'])

export function snapshotRecord(
  row: CatalogRow | Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    if (SKIP_SNAPSHOT.has(key)) continue
    if (value === undefined || value === null) continue
    const text = String(value).trim()
    if (!text) continue
    out[key] = text
  }
  return out
}

export function diffRecords(
  before: Record<string, string>,
  after: Record<string, string>,
): FieldChange[] {
  const keys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)]),
  ).sort((a, b) => a.localeCompare(b))
  const changes: FieldChange[] = []
  for (const field of keys) {
    const prev = before[field] || ''
    const next = after[field] || ''
    if (prev === next) continue
    changes.push({ field, before: prev, after: next })
  }
  return changes
}

export function changesFromCreate(
  after: Record<string, string>,
): FieldChange[] {
  return Object.keys(after)
    .sort((a, b) => a.localeCompare(b))
    .filter((field) => field !== 'id')
    .map((field) => ({
      field,
      before: '',
      after: after[field] || '',
    }))
}

export function changesFromDelete(
  before: Record<string, string>,
): FieldChange[] {
  return Object.keys(before)
    .sort((a, b) => a.localeCompare(b))
    .filter((field) => field !== 'id')
    .map((field) => ({
      field,
      before: before[field] || '',
      after: '',
    }))
}

export function formatChangeLine(change: FieldChange): string {
  const label = humanField(change.field)
  if (!change.before && change.after) return `${label}: added “${change.after}”`
  if (change.before && !change.after)
    return `${label}: removed “${change.before}”`
  return `${label}: “${change.before}” → “${change.after}”`
}

export function formatChangeTrail(changes?: FieldChange[]): string {
  if (!changes?.length) return ''
  return changes.map(formatChangeLine).join('\n')
}

export function changeTrailPreview(
  changes?: FieldChange[],
  max = 2,
): string {
  if (!changes?.length) return ''
  const lines = changes.slice(0, max).map(formatChangeLine)
  if (changes.length > max) lines.push(`+${changes.length - max} more`)
  return lines.join(' · ')
}

function humanField(field: string) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim()
}

function seed(): ActivityEntry[] {
  return []
}

export const activityLog = reactive({
  entries: seed() as ActivityEntry[],
})

function nextActivityId() {
  const n = activityLog.entries.length + 1
  return `ACT-${String(n).padStart(4, '0')}`
}

export function logActivity(
  input: Omit<ActivityEntry, 'id' | 'at' | 'user' | 'role' | 'ip'> & {
    user?: string
    role?: string
    at?: string
    ip?: string
    changes?: FieldChange[]
  },
) {
  const changes = input.changes?.length ? input.changes : undefined
  const detail =
    input.detail ||
    (changes?.length ? formatChangeTrail(changes) : undefined)

  const entry: ActivityEntry = {
    id: nextActivityId(),
    at: input.at || new Date().toISOString(),
    action: input.action,
    module: input.module,
    moduleLabel: input.moduleLabel,
    recordId: input.recordId,
    recordName: input.recordName,
    user: input.user || currentUser.name || 'System',
    role: input.role || currentUser.role || 'Guest',
    summary: input.summary,
    detail,
    severity: input.severity,
    ip: input.ip || clientIp(),
    changes,
  }
  activityLog.entries.unshift(entry)
  return entry
}

export const activityStats = computed(() => {
  const entries = activityLog.entries
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const today = entries.filter((e) => new Date(e.at) >= todayStart).length
  return {
    total: entries.length,
    today,
    created: entries.filter((e) => e.action === 'Created').length,
    updated: entries.filter((e) => e.action === 'Updated').length,
    deleted: entries.filter((e) => e.action === 'Deleted').length,
    permissions: entries.filter((e) => e.action === 'Permission').length,
  }
})

export function formatActivityTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function actionTheme(
  action: ActivityAction,
): 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'violet' {
  if (action === 'Created' || action === 'Published') return 'green'
  if (action === 'Deleted') return 'red'
  if (action === 'Permission') return 'amber'
  if (action === 'Updated' || action === 'Exported') return 'blue'
  if (action === 'Login' || action === 'Viewed') return 'violet'
  return 'gray'
}
