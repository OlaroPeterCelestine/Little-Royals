<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Avatar,
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  dialog,
  toast,
} from 'frappe-ui'
import { getLiveModule, updateRecord, deleteRecords } from '../data/store'
import { openEditDialog } from '../composables/useModuleForms'
import {
  defaultDocumentKind,
  printRecordDocument,
  type DocumentKind,
} from '../data/documents'
import { asOptionalNumber, type RecordValues } from '../types/records'
import { useModuleAccess } from '../composables/useModuleAccess'

const route = useRoute()
const router = useRouter()

const moduleKey = computed(() => {
  if (route.params.module) return String(route.params.module)
  const segment = String(route.path).split('/').filter(Boolean)[0]
  return segment || ''
})
const recordId = computed(() => String(route.params.id || ''))

const mod = computed(() => getLiveModule(moduleKey.value))
const row = computed(() =>
  mod.value?.rows.find((r) => r.id === recordId.value),
)
const { canWrite, canDelete, canPrint, requirePerm } =
  useModuleAccess(moduleKey)

const editing = ref(false)
const saving = ref(false)
const form = reactive<Record<string, string>>({})

const statusOptions = computed(() => {
  const statuses = Array.from(
    new Set(
      (mod.value?.rows || [])
        .map((r) => r.status)
        .filter((s): s is string => Boolean(s)),
    ),
  )
  const extras = [
    'Active',
    'Draft',
    'Pending',
    'On Leave',
    'Alumni',
    'Paid',
    'Unpaid',
    'Partial',
    'Overdue',
  ]
  return Array.from(new Set([...statuses, ...extras])).map((value) => ({
    label: value,
    value,
  }))
})

function syncForm() {
  const current = row.value
  const module = mod.value
  if (!current || !module) return
  form.name = current.name || ''
  form.status = current.status || 'Active'
  form.subtitle = current.subtitle || ''
  for (const col of module.columns) {
    if (col.key === 'name' || col.key === 'status' || col.key === 'id') continue
    const value = current[col.key]
    form[col.key] =
      value === undefined || value === null ? '' : String(value)
  }
}

watch([row, mod], syncForm, { immediate: true })

const displayFields = computed(() => {
  if (!mod.value || !row.value) return []
  const fields: Array<{
    key: string
    label: string
    value: string
    badge?: boolean
  }> = [
    { key: 'id', label: 'ID', value: row.value.id },
    ...mod.value.columns
      .filter((c) => c.key !== 'name')
      .map((c) => ({
        key: c.key,
        label: c.label,
        value:
          row.value![c.key] === undefined || row.value![c.key] === null
            ? '—'
            : String(row.value![c.key]),
        badge: c.badge,
      })),
  ]
  if (row.value.subtitle) {
    fields.push({
      key: 'subtitle',
      label: 'Note',
      value: row.value.subtitle,
      badge: false as boolean | undefined,
    })
  }
  return fields
})

const editableColumns = computed(() =>
  (mod.value?.columns || []).filter((c) => c.key !== 'id'),
)

function startEdit() {
  syncForm()
  editing.value = true
}

function cancelEdit() {
  syncForm()
  editing.value = false
}

async function saveUpdate() {
  if (!mod.value || !row.value) return
  const name = form.name?.trim()
  if (!name) {
    toast.error('Name is required')
    return
  }
  saving.value = true
  try {
    const values: RecordValues = {
      name,
      status: form.status || 'Active',
      subtitle: form.subtitle || '',
    }
    for (const col of editableColumns.value) {
      if (col.key === 'name' || col.key === 'status') continue
      const raw = form[col.key]
      const sample = mod.value.rows[0]?.[col.key]
      values[col.key] =
        typeof sample === 'number' && raw !== ''
          ? (asOptionalNumber(raw) ?? raw)
          : raw
    }
    updateRecord(moduleKey.value, row.value.id, values)
    editing.value = false
    toast.success(`${mod.value.singular} “${name}” updated`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not update')
  } finally {
    saving.value = false
  }
}

function openQuickEdit() {
  if (!row.value) return
  openEditDialog(moduleKey.value, row.value)
}

function confirmDelete() {
  if (!mod.value || !row.value) return
  const current = row.value
  const singular = mod.value.singular
  const title = mod.value.title

  dialog.danger({
    title: `Delete ${singular}?`,
    message: `You are about to permanently delete “${current.name}” (${current.id}) from ${title}.\n\nThis cannot be undone. Related lists will no longer show this record.`,
    confirmLabel: 'Yes, delete forever',
    cancelLabel: 'Keep record',
    onConfirm: async () => {
      deleteRecords(moduleKey.value, [current.id])
      toast.warning(`${singular} “${current.name}” deleted`)
      await router.push(`/${moduleKey.value}`)
    },
  })
}

function goBack() {
  router.push(`/${moduleKey.value}`)
}

function printDoc(kind?: DocumentKind) {
  if (!row.value) return
  if (!requirePerm('print', 'print')) return
  const k = kind || defaultDocumentKind(moduleKey.value)
  try {
    const title = printRecordDocument(k, moduleKey.value, row.value)
    toast.success(`Print preview · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

const showReceiptPrint = computed(
  () =>
    moduleKey.value === 'fees' &&
    ['Paid', 'Partial'].includes(String(row.value?.status || '')),
)
</script>

<template>
  <PageHeader>
    <PageHeaderTitle :title="row?.name || 'Record'" />
    <div class="flex flex-wrap items-center gap-2">
      <Button icon-left="lucide-arrow-left" label="Back" @click="goBack" />
      <template v-if="row && mod">
        <Button
          v-if="!editing && canPrint"
          icon-left="lucide-printer"
          label="Print"
          @click="printDoc()"
        />
        <Button
          v-if="!editing && canPrint && showReceiptPrint"
          icon-left="lucide-receipt"
          label="Receipt"
          @click="printDoc('receipt')"
        />
        <Button
          v-if="!editing && canWrite"
          icon-left="lucide-pencil"
          label="Edit"
          @click="startEdit"
        />
        <Button
          v-if="!editing && canWrite"
          icon-left="lucide-pen-line"
          label="Quick edit"
          @click="openQuickEdit"
        />
        <Button
          v-if="editing"
          label="Cancel"
          :disabled="saving"
          @click="cancelEdit"
        />
        <Button
          v-if="editing"
          variant="solid"
          icon-left="lucide-check"
          label="Update"
          :loading="saving"
          @click="saveUpdate"
        />
        <Button
          v-if="canDelete"
          icon-left="lucide-trash-2"
          label="Delete"
          theme="red"
          :disabled="editing"
          @click="confirmDelete"
        />
      </template>
    </div>
  </PageHeader>

  <div class="school-page max-w-4xl">
    <div
      v-if="!mod || !row"
      class="rounded-6 border border-outline-gray-1 px-4 py-16 text-center text-ink-gray-5"
    >
      <p class="text-sm">Record not found.</p>
      <Button class="mt-4" label="Back to list" @click="goBack" />
    </div>

    <template v-else>
      <section
        class="flex flex-wrap items-start justify-between gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
      >
        <div class="flex min-w-0 items-start gap-4">
          <Avatar :label="row.name" size="xl" />
          <div class="min-w-0 space-y-1.5">
            <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
              {{ mod.singular }} · {{ row.id }}
            </p>
            <h1 class="truncate text-2xl-semibold text-ink-gray-9">
              {{ row.name }}
            </h1>
            <p v-if="row.subtitle" class="text-p-base text-ink-gray-6">
              {{ row.subtitle }}
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              <Badge
                v-if="row.status"
                :label="row.status"
                :theme="row.statusTheme || 'gray'"
                variant="subtle"
              />
              <Badge :label="mod.title" theme="blue" variant="subtle" />
            </div>
          </div>
        </div>
      </section>

      <!-- View mode -->
      <section v-if="!editing" class="school-section">
        <h2 class="school-section-title">Details</h2>
        <div
          class="grid gap-0 overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white sm:grid-cols-2"
        >
          <div
            v-for="field in displayFields"
            :key="field.key"
            class="border-b border-outline-gray-1 px-4 py-3.5 sm:odd:border-e"
          >
            <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
              {{ field.label }}
            </p>
            <div class="mt-1.5">
              <Badge
                v-if="field.badge && field.value !== '—'"
                :label="field.value"
                :theme="row.statusTheme || 'gray'"
                variant="subtle"
              />
              <p
                v-else
                class="break-words text-sm text-ink-gray-9"
                :title="field.value"
              >
                {{ field.value }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Edit / update mode -->
      <section v-else class="school-section">
        <h2 class="school-section-title">Update {{ mod.singular.toLowerCase() }}</h2>
        <div
          class="space-y-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
        >
          <FormControl
            v-model="form.name"
            :label="`${mod.singular} name (required)`"
            type="text"
            required
          />
          <FormControl
            v-for="col in editableColumns.filter((c) => c.key !== 'name' && c.key !== 'status')"
            :key="col.key"
            v-model="form[col.key]"
            :label="col.label"
            type="text"
          />
          <FormControl
            v-model="form.status"
            label="Status (required)"
            type="select"
            :options="statusOptions"
          />
          <FormControl
            v-model="form.subtitle"
            label="Note / subtitle"
            type="textarea"
          />
          <div class="flex flex-wrap gap-2 pt-2">
            <Button
              variant="solid"
              icon-left="lucide-check"
              label="Save update"
              :loading="saving"
              @click="saveUpdate"
            />
            <Button label="Cancel" :disabled="saving" @click="cancelEdit" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
