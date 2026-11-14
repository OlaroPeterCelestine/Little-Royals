import { computed, reactive } from 'vue'
import type { CatalogRow } from './catalog'

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

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function seed(): ActivityEntry[] {
  return [
    {
      id: 'ACT-0012',
      at: ago(8),
      action: 'Updated',
      module: 'students',
      moduleLabel: 'Student',
      recordId: 'LR24001',
      recordName: 'Amina Namukasa',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Updated student Amina Namukasa',
      detail: 'Class: “P.5 Blue” → “P.6 Green”\nAverage: “78” → “81”',
      severity: 'info',
      ip: '41.210.15.22',
      changes: [
        { field: 'className', before: 'P.5 Blue', after: 'P.6 Green' },
        { field: 'average', before: '78', after: '81' },
      ],
    },
    {
      id: 'ACT-0011',
      at: ago(22),
      action: 'Created',
      module: 'fees',
      moduleLabel: 'Fees',
      recordId: 'FEE-014',
      recordName: 'Term 3 · P.5 Blue',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Created fee invoice Term 3 · P.5 Blue',
      detail: 'Amount: added “450000”\nStatus: added “Unpaid”',
      severity: 'success',
      ip: '41.210.15.22',
      changes: [
        { field: 'amount', before: '', after: '450000' },
        { field: 'status', before: '', after: 'Unpaid' },
        { field: 'name', before: '', after: 'Term 3 · P.5 Blue' },
      ],
    },
    {
      id: 'ACT-0010',
      at: ago(45),
      action: 'Permission',
      module: 'permissions',
      moduleLabel: 'Role Permission',
      recordName: 'Teacher → Student',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Updated Teacher permissions on Student',
      detail: 'Delete: “on” → “off”\nWrite: “off” → “on”',
      severity: 'warning',
      ip: '41.210.15.22',
      changes: [
        { field: 'write', before: 'off', after: 'on' },
        { field: 'delete', before: 'on', after: 'off' },
      ],
    },
    {
      id: 'ACT-0009',
      at: ago(70),
      action: 'Published',
      module: 'announcements',
      moduleLabel: 'Announcements',
      recordName: 'Weekly assembly notice',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Published announcement Weekly assembly notice',
      detail: 'Status: “Draft” → “Published”',
      severity: 'success',
      ip: '41.210.15.22',
      changes: [{ field: 'status', before: 'Draft', after: 'Published' }],
    },
    {
      id: 'ACT-0008',
      at: ago(95),
      action: 'Deleted',
      module: 'applicants',
      moduleLabel: 'Student Applicant',
      recordId: 'APP-009',
      recordName: 'Draft applicant',
      user: 'Joseph Mukasa',
      role: 'Admissions Officer',
      summary: 'Deleted applicant Draft applicant',
      detail:
        'Name: removed “Draft applicant”\nProgram: removed “Nursery”\nStatus: removed “Draft”',
      severity: 'danger',
      ip: '41.210.18.41',
      changes: [
        { field: 'name', before: 'Draft applicant', after: '' },
        { field: 'program', before: 'Nursery', after: '' },
        { field: 'status', before: 'Draft', after: '' },
      ],
    },
    {
      id: 'ACT-0007',
      at: ago(140),
      action: 'Updated',
      module: 'attendance',
      moduleLabel: 'Student Attendance',
      recordId: 'ATT-004',
      recordName: 'P.4 Yellow roll',
      user: 'Grace Achieng',
      role: 'Teacher',
      summary: 'Updated attendance P.4 Yellow roll',
      detail: 'Late: “0” → “2”\nAbsent: “0” → “1”',
      severity: 'info',
      ip: '41.210.12.8',
      changes: [
        { field: 'late', before: '0', after: '2' },
        { field: 'absent', before: '0', after: '1' },
      ],
    },
    {
      id: 'ACT-0006',
      at: ago(180),
      action: 'Created',
      module: 'teachers',
      moduleLabel: 'Teacher',
      recordId: 'TCH-012',
      recordName: 'Peter Ssempijja',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Created teacher Peter Ssempijja',
      detail: 'Subject: added “Mathematics”\nStatus: added “Active”',
      severity: 'success',
      ip: '41.210.15.22',
      changes: [
        { field: 'name', before: '', after: 'Peter Ssempijja' },
        { field: 'subject', before: '', after: 'Mathematics' },
        { field: 'status', before: '', after: 'Active' },
      ],
    },
    {
      id: 'ACT-0005',
      at: ago(240),
      action: 'Exported',
      module: 'reports',
      moduleLabel: 'Education Reports',
      recordName: 'Dashboard CSV',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Exported dashboard CSV',
      severity: 'info',
      ip: '41.210.15.22',
    },
    {
      id: 'ACT-0004',
      at: ago(320),
      action: 'Updated',
      module: 'permissions',
      moduleLabel: 'Role Permission',
      recordName: 'Accounts → Fees',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Updated Accounts permissions on Fees',
      detail: 'Create: “off” → “on”\nWrite: “off” → “on”',
      severity: 'warning',
      ip: '41.210.15.22',
      changes: [
        { field: 'create', before: 'off', after: 'on' },
        { field: 'write', before: 'off', after: 'on' },
      ],
    },
    {
      id: 'ACT-0003',
      at: ago(400),
      action: 'Login',
      module: 'system',
      moduleLabel: 'System',
      user: 'Grace Achieng',
      role: 'Teacher',
      summary: 'Grace Achieng signed in',
      detail: 'Desk session started',
      severity: 'info',
      ip: '41.210.12.8',
    },
    {
      id: 'ACT-0002',
      at: ago(520),
      action: 'Created',
      module: 'classes',
      moduleLabel: 'Class',
      recordId: 'CLS-011',
      recordName: 'P.3 Red',
      user: 'Joseph Mukasa',
      role: 'Admissions Officer',
      summary: 'Created class P.3 Red',
      detail: 'Grade: added “P.3”\nRoom: added “Block A · 3”',
      severity: 'success',
      ip: '41.210.18.41',
      changes: [
        { field: 'name', before: '', after: 'P.3 Red' },
        { field: 'grade', before: '', after: 'P.3' },
        { field: 'room', before: '', after: 'Block A · 3' },
      ],
    },
    {
      id: 'ACT-0001',
      at: ago(600),
      action: 'Login',
      module: 'system',
      moduleLabel: 'System',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Sarah Nalwanga signed in',
      detail: 'Admin desk session',
      severity: 'info',
      ip: '41.210.15.22',
    },
  ]
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
