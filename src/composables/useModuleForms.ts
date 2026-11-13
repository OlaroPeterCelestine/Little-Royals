import { dialog, toast, type PromptField } from 'frappe-ui'
import {
  addRecord,
  deleteRecords,
  getLiveModule,
  updateRecord,
} from '../data/store'
import type { CatalogModule, CatalogRow } from '../data/catalog'
import { asOptionalNumber, type RecordValues } from '../types/records'
import { canCurrentUser } from '../data/permissions'
import { currentUser } from '../data/activity'
import {
  gradeSelectOptions,
  sectionSelectOptions,
} from '../data/grades'

function deny(action: string) {
  toast.error(
    `Your role (${currentUser.role || 'Guest'}) cannot ${action} here`,
  )
}

const STATUS_OPTIONS = [
  'Active',
  'Draft',
  'Pending',
  'Open',
  'Scheduled',
  'Published',
  'Paid',
  'Unpaid',
  'Partial',
  'Overdue',
  'Available',
  'Closed',
  'On Leave',
  'Alumni',
].map((value) => ({ label: value, value }))

function fieldForColumn(
  mod: CatalogModule,
  colKey: string,
  row?: CatalogRow,
): PromptField | null {
  const col = mod.columns.find((c) => c.key === colKey)
  if (!col) return null
  if (colKey === 'id' && row) return null

  if (col.badge || colKey === 'status') {
    const options = Array.from(
      new Set([
        ...STATUS_OPTIONS.map((o) => o.value),
        ...mod.rows.map((r) => String(r.status || '')).filter(Boolean),
      ]),
    ).map((value) => ({ label: value, value }))

    return {
      name: 'status',
      label: col.label,
      type: 'select',
      required: true,
      defaultValue: String(row?.status || options[0]?.value || 'Active'),
      options,
      validate: (value) =>
        value ? null : 'Pick a status before saving',
    }
  }

  if (colKey === 'name' || col.primary) {
    return {
      name: 'name',
      label: col.label,
      type: 'text',
      required: true,
      placeholder: `Enter ${mod.singular.toLowerCase()} name`,
      defaultValue: row?.name || '',
      validate: (value) => {
        const v = String(value || '').trim()
        if (!v) return 'Name is required'
        if (v.length < 2) return 'Name must be at least 2 characters'
        return null
      },
    }
  }

  if (
    (colKey === 'grade' || colKey === 'className') &&
    ['students', 'applicants', 'admissions', 'classes'].includes(mod.key)
  ) {
    const current = String(row?.[colKey] || gradeSelectOptions[0].value)
    return {
      name: colKey,
      label: col.label,
      type: 'select',
      required: true,
      options: [...gradeSelectOptions],
      defaultValue: current,
    }
  }

  if (
    colKey === 'program' &&
    ['students', 'applicants', 'admissions', 'programs'].includes(mod.key)
  ) {
    const current = String(row?.[colKey] || 'Primary')
    return {
      name: colKey,
      label: col.label,
      type: 'select',
      required: true,
      options: [...sectionSelectOptions],
      defaultValue: current,
    }
  }

  const current = row?.[colKey]
  const isNumber = typeof current === 'number'
  return {
    name: colKey,
    label: col.label,
    type: 'text',
    placeholder: col.label,
    defaultValue: current !== undefined && current !== null ? String(current) : '',
    validate: (value) => {
      if (isNumber && value !== '' && Number.isNaN(Number(value))) {
        return `${col.label} must be a number`
      }
      return null
    },
  }
}

function buildFields(mod: CatalogModule, row?: CatalogRow): PromptField[] {
  const keys = mod.columns.map((c) => c.key).filter((k) => k !== 'id')

  if (!keys.includes('name')) keys.unshift('name')
  if (!keys.includes('status') && mod.columns.some((c) => c.badge)) {
    keys.push('status')
  }

  const fields = keys
    .map((key) => fieldForColumn(mod, key, row))
    .filter((f): f is PromptField => Boolean(f))

  fields.push({
    name: 'subtitle',
    label: 'Note / subtitle',
    type: 'textarea',
    placeholder: 'Optional short note',
    defaultValue: row?.subtitle || '',
  })

  return fields
}

function normalizeValues(
  mod: CatalogModule,
  values: Record<string, unknown>,
): RecordValues {
  const out: RecordValues = {}
  for (const [key, raw] of Object.entries(values)) {
    if (
      typeof raw === 'string' ||
      typeof raw === 'number' ||
      typeof raw === 'boolean' ||
      raw === null ||
      raw === undefined
    ) {
      out[key] = raw
    } else {
      out[key] = String(raw)
    }
  }
  for (const col of mod.columns) {
    const raw = out[col.key]
    if (raw === undefined || raw === '') continue
    const sample = mod.rows[0]?.[col.key]
    if (typeof sample === 'number') {
      out[col.key] = asOptionalNumber(raw) ?? raw
    }
  }
  return out
}

export function openCreateDialog(moduleKey: string) {
  const mod = getLiveModule(moduleKey)
  if (!mod) {
    toast.error('Module not found')
    return
  }
  if (!canCurrentUser(moduleKey, 'create')) {
    deny(`create ${mod.singular.toLowerCase()}s`)
    return
  }

  dialog.prompt({
    title: `New ${mod.singular}`,
    message: `Fill in the details for this ${mod.singular.toLowerCase()}. Required fields are marked.`,
    icon: 'lucide-plus',
    theme: 'blue',
    confirmLabel: 'Create',
    fields: buildFields(mod),
    onConfirm: async ({ values }) => {
      try {
        const row = addRecord(moduleKey, normalizeValues(mod, values))
        toast.success(`${mod.singular} “${row.name}” created`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not create')
        throw err
      }
    },
  })
}

export function openEditDialog(
  moduleKey: string,
  row: CatalogRow,
  onUpdated?: (row: CatalogRow) => void,
) {
  const mod = getLiveModule(moduleKey)
  if (!mod) {
    toast.error('Module not found')
    return
  }
  if (!canCurrentUser(moduleKey, 'write')) {
    deny(`edit ${mod.singular.toLowerCase()}s`)
    return
  }

  dialog.prompt({
    title: `Edit ${mod.singular}`,
    message: `Update “${row.name}”. Changes save to the live school catalog.`,
    icon: 'lucide-pencil',
    theme: 'blue',
    confirmLabel: 'Save changes',
    size: 'lg',
    fields: buildFields(mod, row),
    onConfirm: async ({ values }) => {
      try {
        const updated = updateRecord(
          moduleKey,
          row.id,
          normalizeValues(mod, values),
        )
        toast.success(`${mod.singular} “${updated.name}” updated`)
        onUpdated?.(updated)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save')
        throw err
      }
    },
  })
}

export function openDeleteDialog(
  moduleKey: string,
  ids: string[],
  onDeleted?: (removed: number) => void,
) {
  const mod = getLiveModule(moduleKey)
  if (!mod) {
    toast.error('Module not found')
    return
  }
  if (!canCurrentUser(moduleKey, 'delete')) {
    deny(`delete ${mod.singular.toLowerCase()}s`)
    return
  }
  if (!ids.length) {
    dialog.confirm({
      title: 'Nothing selected',
      message:
        'Select one or more rows with the checkboxes, then try delete again.',
      icon: 'lucide-alert-triangle',
      theme: 'amber',
      confirmLabel: 'Got it',
      onConfirm: async () => {},
    })
    return
  }

  const names = mod.rows
    .filter((r) => ids.includes(r.id))
    .map((r) => r.name)
    .slice(0, 5)
  const extra = ids.length > 5 ? ` and ${ids.length - 5} more` : ''
  const isOne = ids.length === 1

  dialog.danger({
    title: isOne ? `Delete ${mod.singular}?` : `Delete ${ids.length} records?`,
    message: isOne
      ? `You are about to permanently delete “${names[0]}”.\n\nThis cannot be undone.`
      : `You are about to permanently delete ${names.join(', ')}${extra} from ${mod.title}.\n\nThis cannot be undone.`,
    confirmLabel: isOne ? 'Yes, delete forever' : `Yes, delete ${ids.length}`,
    cancelLabel: 'Keep records',
    onConfirm: async () => {
      const removed = deleteRecords(moduleKey, ids)
      toast.warning(
        `${removed} ${removed === 1 ? 'record' : 'records'} deleted`,
      )
      onDeleted?.(removed)
    },
  })
}

export function openDiscardSelectionDialog(onDiscard: () => void) {
  dialog.confirm({
    title: 'Clear selection?',
    message: 'Selected checkboxes will be cleared. No records are deleted.',
    icon: 'lucide-list-checks',
    theme: 'amber',
    confirmLabel: 'Clear selection',
    onConfirm: async () => {
      onDiscard()
      toast.info('Selection cleared')
    },
  })
}
