import { computed, reactive } from 'vue'
import {
  catalog as seed,
  type CatalogModule,
  type CatalogRow,
  type BadgeTheme,
} from './catalog'
import { catalogExtra } from './catalogExtra'
import {
  changesFromCreate,
  changesFromDelete,
  clientIp,
  currentUser,
  diffRecords,
  formatActivityTime,
  formatChangeTrail,
  logActivity,
  snapshotRecord,
  type FieldChange,
} from './activity'
import {
  learnerNumberFromStudentNumber,
  nextStudentNumber,
  schoolPayAccountFromStudentNumber,
} from './studentNumber'
import { sortSchoolClassRows } from './grades'
import { asString, type RecordValues } from '../types/records'
import { sanitizeFieldValue, sanitizeText } from '../lib/sanitize'

function appendAuditLog(input: {
  action: string
  module: string
  recordId?: string
  recordName?: string
  changes?: FieldChange[]
  result?: string
}) {
  const audit = schoolStore['audit-logs']
  if (!audit) return
  const n = audit.rows.length + 1
  const id = `AUD-${String(n).padStart(3, '0')}`
  const trail = formatChangeTrail(input.changes)
  const first = input.changes?.[0]
  const when = formatActivityTime(new Date().toISOString())
  audit.rows.unshift({
    id,
    name: input.action,
    status: input.result || 'Success',
    statusTheme: 'green',
    subtitle: when,
    user: currentUser.name || currentUser.email || 'System',
    module: input.module,
    recordId: input.recordId || '',
    recordName: input.recordName || '',
    ip: clientIp(),
    when,
    before: first?.before || '',
    after: first?.after || '',
    changes: trail,
  })
}

function statusTheme(status: string): BadgeTheme {
  const s = status.toLowerCase()
  if (
    [
      'active',
      'present',
      'paid',
      'approved',
      'published',
      'pass',
      'available',
      'offset',
      'posted',
    ].some((x) => s.includes(x))
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

const allSeed: Record<string, CatalogModule> = { ...seed, ...catalogExtra }

/** Live mutable school catalog — dialogs create/update/delete against this. */
export const schoolStore = reactive(
  Object.fromEntries(
    Object.entries(allSeed).map(([key, mod]) => [
      key,
      {
        ...mod,
        rows: mod.rows.map((row) => ({ ...row })),
      } satisfies CatalogModule,
    ]),
  ),
) as Record<string, CatalogModule>

function keepModuleOrder(key: string) {
  const mod = schoolStore[key]
  if (!mod) return
  if (key === 'classes') {
    mod.rows = sortSchoolClassRows(mod.rows)
  }
}

keepModuleOrder('classes')

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
    if (typeof raw === 'boolean') {
      row[key] = String(raw)
      continue
    }
    const cleaned = sanitizeFieldValue(key, raw)
    if (cleaned === '' || cleaned == null) continue
    row[key] = cleaned as string | number
  }
}

export function addRecord(key: string, values: RecordValues): CatalogRow {
  const mod = schoolStore[key]
  if (!mod) throw new Error(`Unknown module: ${key}`)
  const name = sanitizeText(asString(values.name), 'name')
  if (!name) throw new Error('Name is required')
  values.name = name

  const duplicate = mod.rows.some(
    (r) => r.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error(`“${name}” already exists in ${mod.title}`)

  const id =
    asString(values.id).trim() ||
    (key === 'students'
      ? nextStudentNumber(
          mod.rows.map((r) => r.id),
          asString(values.admissionDate) || null,
        )
      : nextId(key, mod.key.slice(0, 3).toUpperCase()))

  if (key === 'students') {
    if (!asString(values.studentNumber).trim()) values.studentNumber = id
    if (!asString(values.learnerNumber).trim()) {
      values.learnerNumber = learnerNumberFromStudentNumber(id)
    }
    if (!asString(values.schoolPayAccount).trim()) {
      values.schoolPayAccount = schoolPayAccountFromStudentNumber(id)
    }
  }

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
  keepModuleOrder(key)
  const changes = changesFromCreate(snapshotRecord(row))
  logActivity({
    action: 'Created',
    module: key,
    moduleLabel: mod.singular,
    recordId: row.id,
    recordName: row.name,
    summary: `Created ${mod.singular.toLowerCase()} ${row.name}`,
    severity: 'success',
    changes,
  })
  appendAuditLog({
    action: `Created ${mod.singular}`,
    module: key,
    recordId: row.id,
    recordName: row.name,
    changes,
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

  const name = sanitizeText(asString(values.name), 'name')
  if (!name) throw new Error('Name is required')
  values.name = name

  const duplicate = mod.rows.some(
    (r) => r.id !== id && r.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error(`“${name}” already exists in ${mod.title}`)

  const before = snapshotRecord(row)

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
  keepModuleOrder(key)

  const after = snapshotRecord(row)
  const changes = diffRecords(before, after)
  logActivity({
    action: 'Updated',
    module: key,
    moduleLabel: mod.singular,
    recordId: row.id,
    recordName: row.name,
    summary: `Updated ${mod.singular.toLowerCase()} ${row.name}`,
    severity: 'info',
    changes,
  })
  appendAuditLog({
    action: `Updated ${mod.singular}`,
    module: key,
    recordId: row.id,
    recordName: row.name,
    changes,
  })
  return row
}

export function deleteRecords(key: string, ids: string[]) {
  const mod = schoolStore[key]
  if (!mod) throw new Error(`Unknown module: ${key}`)
  if (!ids.length) throw new Error('Select at least one record to delete')
  const doomed = mod.rows.filter((r) => ids.includes(r.id))
  const countBefore = mod.rows.length
  mod.rows = mod.rows.filter((r) => !ids.includes(r.id))
  const removed = countBefore - mod.rows.length
  for (const row of doomed) {
    const changes = changesFromDelete(snapshotRecord(row))
    logActivity({
      action: 'Deleted',
      module: key,
      moduleLabel: mod.singular,
      recordId: row.id,
      recordName: row.name,
      summary: `Deleted ${mod.singular.toLowerCase()} ${row.name}`,
      severity: 'danger',
      changes,
    })
    appendAuditLog({
      action: `Deleted ${mod.singular}`,
      module: key,
      recordId: row.id,
      recordName: row.name,
      changes,
    })
  }
  return removed
}

export const unpaidFeeCount = computed(() =>
  (schoolStore.fees?.rows || []).filter((r) =>
    ['Unpaid', 'Overdue', 'Partial'].includes(String(r.status)),
  ).length,
)

/** Outstanding invoices for learners marked as having left the school. */
export const leftSchoolOutstandingFees = computed(() =>
  (schoolStore.fees?.rows || []).filter(
    (r) =>
      String(r.leftSchool || '').toLowerCase() === 'yes' &&
      ['Unpaid', 'Overdue', 'Partial'].includes(String(r.status)),
  ),
)

/**
 * Write off remaining balances for children who left.
 * Marks fee invoices Offset and posts fee-offsets audit rows.
 */
export function offsetFeeDues(
  feeIds: string[],
  reason: string,
  notes?: string,
): number {
  if (!feeIds.length) throw new Error('Select at least one invoice to offset')
  const fees = schoolStore.fees
  if (!fees) throw new Error('Fees module missing')

  const today = new Date().toISOString().slice(0, 10)
  let posted = 0

  for (const id of feeIds) {
    const fee = fees.rows.find((r) => r.id === id)
    if (!fee) continue
    if (String(fee.status) === 'Offset' || String(fee.status) === 'Paid') continue

    const balance = String(fee.balance || fee.amount || 'UGX 0')
    fee.status = 'Offset'
    fee.statusTheme = statusTheme('Offset')
    fee.paid = String(fee.amount || fee.paid || '')
    fee.balance = 'UGX 0'
    fee.leftSchool = 'Yes'
    fee.subtitle = notes?.trim()
      ? `Offset · ${notes.trim()}`
      : `Offset · ${reason || 'Left school'}`

    addRecord('fee-offsets', {
      name: `Offset · ${fee.name} · ${fee.invoice || fee.id}`,
      learner: fee.name,
      className: String(fee.className || ''),
      invoice: String(fee.invoice || ''),
      amount: balance,
      exitReason: String(fee.exitReason || reason || 'Left school'),
      offsetDate: today,
      feeRef: fee.id,
      subtitle: notes?.trim() || undefined,
      status: 'Posted',
    })
    posted += 1
  }

  if (!posted) throw new Error('No eligible outstanding invoices to offset')
  return posted
}

export const pendingApplicantCount = computed(() =>
  (schoolStore.applicants?.rows || []).filter((r) =>
    ['Pending', 'Waitlist'].includes(String(r.status)),
  ).length,
)
