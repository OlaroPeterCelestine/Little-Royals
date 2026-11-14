import { reactive } from 'vue'
import { dialog, toast } from 'frappe-ui'
import { deleteRecords, getLiveModule } from '@/data/catalog/store'
import type { CatalogRow } from '@/data/catalog/catalog'
import { canCurrentUser } from '@/data/auth/permissions'
import { currentUser } from '@/data/activity/activity'

/** Shared New / Edit popup state (mounted once in App). */
export const recordFormModal = reactive({
  open: false,
  moduleKey: '',
  recordId: '' as string,
  onSaved: null as null | ((row: CatalogRow) => void),
})

export function closeRecordFormModal() {
  recordFormModal.open = false
  recordFormModal.moduleKey = ''
  recordFormModal.recordId = ''
  recordFormModal.onSaved = null
}

function deny(action: string) {
  toast.error(
    `Your role (${currentUser.role || 'Guest'}) cannot ${action} here`,
  )
}

export function openCreateDialog(
  moduleKey: string,
  onSaved?: (row: CatalogRow) => void,
) {
  const mod = getLiveModule(moduleKey)
  if (!mod) {
    toast.error('Module not found')
    return
  }
  if (!canCurrentUser(moduleKey, 'create')) {
    deny(`create ${mod.singular.toLowerCase()}s`)
    return
  }

  recordFormModal.moduleKey = moduleKey
  recordFormModal.recordId = ''
  recordFormModal.onSaved = onSaved || null
  recordFormModal.open = true
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

  recordFormModal.moduleKey = moduleKey
  recordFormModal.recordId = row.id
  recordFormModal.onSaved = onUpdated || null
  recordFormModal.open = true
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
    title: isOne
      ? `⚠️ Delete ${mod.singular}?`
      : `⚠️ Delete ${ids.length} records?`,
    message: isOne
      ? `Warning: you are about to permanently delete “${names[0]}” (${ids[0]}).\n\nThis cannot be undone. Related lists will no longer show this record.`
      : `Warning: you are about to permanently delete ${names.join(', ')}${extra} from ${mod.title}.\n\nThis cannot be undone.`,
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
