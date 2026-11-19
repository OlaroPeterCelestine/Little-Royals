import { computed, reactive } from 'vue'
import {
  catalog as seed,
  type CatalogModule,
  type CatalogRow,
  type BadgeTheme,
} from '@/data/catalog/catalog'
import { catalogExtra } from '@/data/catalog/catalogExtra'
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
} from '@/data/activity/activity'
import {
  learnerNumberFromStudentNumber,
  nextStudentNumber,
  schoolPayAccountFromStudentNumber,
} from '@/data/students/studentNumber'
import { sortSchoolClassRows } from '@/data/school/grades'
import { asString, type RecordValues } from '@/types/records'
import {
  sanitizeFieldValue,
  sanitizeRecordValues,
  sanitizeText,
} from '@/lib/sanitize'
import { isApiEnabled } from '@/lib/apiMode'
import {
  bodyFromRow,
  createOnServer,
  deleteOnServer,
  isServerModule,
  rowFromApi,
  TYPED_API_MODULES,
  updateOnServer,
  UUID_RE,
} from '@/data/catalog/catalogSync'

function requireServerApi() {
  if (!isApiEnabled()) {
    throw new Error(
      'School API is required — records are saved on the server, not in this browser',
    )
  }
}

function appendAuditLog(input: {
  action: string
  module: string
  recordId?: string
  recordName?: string
  changes?: FieldChange[]
  result?: string
}) {
  // With the API on, audit trails live on the server — do not invent local rows.
  if (isApiEnabled()) return
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

/**
 * Live mutable school catalog.
 * When the Go API is enabled, start with empty rows — never paint hardcoded demo
 * students/fees/etc. Module metadata (columns, forms) still comes from the catalog.
 */
export const schoolStore = reactive(
  Object.fromEntries(
    Object.entries(allSeed).map(([key, mod]) => [
      key,
      {
        ...mod,
        rows: isApiEnabled() ? [] : mod.rows.map((row) => ({ ...row })),
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

function applyAudit(
  action: 'Created' | 'Updated' | 'Deleted',
  key: string,
  mod: CatalogModule,
  row: CatalogRow,
  changes: FieldChange[],
) {
  const severity =
    action === 'Created' ? 'success' : action === 'Deleted' ? 'danger' : 'info'
  logActivity({
    action,
    module: key,
    moduleLabel: mod.singular,
    recordId: row.id,
    recordName: row.name,
    summary: `${action} ${mod.singular.toLowerCase()} ${row.name}`,
    severity,
    changes,
  })
  appendAuditLog({
    action: `${action} ${mod.singular}`,
    module: key,
    recordId: row.id,
    recordName: row.name,
    changes,
  })
}

/**
 * Create a record — always on the school API (never browser-only).
 */
export async function addRecord(
  key: string,
  values: RecordValues,
): Promise<CatalogRow> {
  requireServerApi()
  const mod = schoolStore[key]
  if (!mod) throw new Error(`Unknown module: ${key}`)
  if (!isServerModule(key)) {
    throw new Error(`“${key}” is not available on the server`)
  }
  values = sanitizeRecordValues(values as Record<string, unknown>) as RecordValues
  const name = sanitizeText(asString(values.name), 'name')
  if (!name) throw new Error('Name is required')
  values.name = name

  const duplicate = mod.rows.some(
    (r) => r.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error(`“${name}” already exists in ${mod.title}`)

  const provisionalId =
    asString(values.id).trim() ||
    (key === 'students'
      ? nextStudentNumber(
          mod.rows.map((r) => r.id),
          asString(values.admissionDate) || null,
        )
      : nextId(key, mod.key.slice(0, 3).toUpperCase()))

  if (key === 'students') {
    if (!asString(values.studentNumber).trim()) {
      values.studentNumber = provisionalId
    }
    if (!asString(values.admissionNo).trim()) {
      values.admissionNo = asString(values.studentNumber) || provisionalId
    }
    if (!asString(values.learnerNumber).trim()) {
      values.learnerNumber = learnerNumberFromStudentNumber(
        String(values.studentNumber || provisionalId),
      )
    }
    if (!asString(values.schoolPayAccount).trim()) {
      values.schoolPayAccount = schoolPayAccountFromStudentNumber(
        String(values.studentNumber || provisionalId),
      )
    }
  }
  if (key === 'staff') {
    if (!asString(values.staffNo).trim()) {
      values.staffNo = provisionalId
    }
    if (!asString(values.roleTitle).trim() && asString(values.jobTitle).trim()) {
      values.roleTitle = asString(values.jobTitle)
    }
  }

  const status = values.status ? asString(values.status) : 'Active'
  const draft: CatalogRow = {
    id: provisionalId,
    name,
    status,
    statusTheme: statusTheme(status),
    subtitle: values.subtitle ? asString(values.subtitle) : undefined,
  }
  assignRowFields(draft, mod, values)

  const body = bodyFromRow({ ...draft, ...values, name })
  body.name = name
  if (TYPED_API_MODULES.has(key) && !UUID_RE.test(String(body.id || ''))) {
    delete body.id
  }
  const row = rowFromApi(await createOnServer(key, body as { name: string }))
  if (row.status) row.statusTheme = statusTheme(String(row.status))

  mod.rows.unshift(row)
  keepModuleOrder(key)
  applyAudit('Created', key, mod, row, changesFromCreate(snapshotRecord(row)))
  return row
}

/**
 * Update a record — always on the school API (never browser-only).
 */
export async function updateRecord(
  key: string,
  id: string,
  values: RecordValues,
): Promise<CatalogRow> {
  requireServerApi()
  const mod = schoolStore[key]
  if (!mod) throw new Error(`Unknown module: ${key}`)
  if (!isServerModule(key)) {
    throw new Error(`“${key}” is not available on the server`)
  }
  const row = mod.rows.find((r) => r.id === id)
  if (!row) throw new Error('Record not found')

  values = sanitizeRecordValues(values as Record<string, unknown>) as RecordValues
  // Partial patches (status-only, etc.) keep the existing display name.
  const name =
    sanitizeText(asString(values.name), 'name') ||
    sanitizeText(asString(row.name), 'name')
  if (!name) throw new Error('Name is required')
  values.name = name

  const duplicate = mod.rows.some(
    (r) => r.id !== id && r.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw new Error(`“${name}” already exists in ${mod.title}`)

  const before = snapshotRecord(row)

  const body = bodyFromRow({ ...row, ...values, name })
  body.name = name
  delete body.id
  const updated = await updateOnServer(key, id, body)
  Object.keys(row).forEach((k) => {
    if (k !== 'id') delete (row as Record<string, unknown>)[k]
  })
  Object.assign(row, updated)
  if (row.status) row.statusTheme = statusTheme(String(row.status))

  keepModuleOrder(key)
  const after = snapshotRecord(row)
  applyAudit('Updated', key, mod, row, diffRecords(before, after))
  return row
}

/**
 * Delete records — always on the school API (never browser-only).
 */
export async function deleteRecords(key: string, ids: string[]) {
  requireServerApi()
  const mod = schoolStore[key]
  if (!mod) throw new Error(`Unknown module: ${key}`)
  if (!isServerModule(key)) {
    throw new Error(`“${key}” is not available on the server`)
  }
  if (!ids.length) throw new Error('Select at least one record to delete')
  const doomed = mod.rows.filter((r) => ids.includes(r.id))

  let deletedIds: string[] = []
  try {
    deletedIds = await deleteOnServer(key, ids)
  } catch (err) {
    // If some succeeded, drop those locally before rethrowing.
    // deleteOnServer only returns when all succeed; on partial failure
    // re-pull so the desk matches the server.
    try {
      const { ensureModule } = await import('@/data/catalog/catalogSync')
      await ensureModule(key)
    } catch {
      /* ignore hydrate errors — original delete error matters more */
    }
    throw err
  }

  const deletedSet = new Set(deletedIds)
  const removedRows = doomed.filter((r) => deletedSet.has(r.id))
  mod.rows = mod.rows.filter((r) => !deletedSet.has(r.id))
  for (const row of removedRows) {
    applyAudit(
      'Deleted',
      key,
      mod,
      row,
      changesFromDelete(snapshotRecord(row)),
    )
  }
  return removedRows.length
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
export async function offsetFeeDues(
  feeIds: string[],
  reason: string,
  notes?: string,
): Promise<number> {
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
    await updateRecord('fees', id, {
      name: fee.name,
      status: 'Offset',
      paid: String(fee.amount || fee.paid || ''),
      balance: 'UGX 0',
      leftSchool: 'Yes',
      subtitle: notes?.trim()
        ? `Offset · ${notes.trim()}`
        : `Offset · ${reason || 'Left school'}`,
    })

    await addRecord('fee-offsets', {
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
