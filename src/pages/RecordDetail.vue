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
  printExamPack,
  printRecordDocument,
  type DocumentKind,
} from '../data/documents'
import { asOptionalNumber, type RecordValues } from '../types/records'
import { useModuleAccess } from '../composables/useModuleAccess'
import { logActivity } from '../data/activity'

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

const isExam = computed(() => moduleKey.value === 'exams')

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
    'Open',
    'Scheduled',
    'Closed',
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
        badge: Boolean(c.badge),
      })),
  ]
  if (row.value.subtitle) {
    fields.push({
      key: 'subtitle',
      label: 'Notes',
      value: row.value.subtitle,
      badge: false,
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

function printExam(parts: Array<'paper' | 'marksheet'>) {
  if (!row.value || !canPrint.value) return
  if (!requirePerm('print', 'print')) return
  const titles = printExamPack(row.value, parts)
  logActivity({
    action: 'Printed',
    module: 'exams',
    moduleLabel: 'Examination',
    recordId: row.value.id,
    recordName: row.value.name,
    summary: `Printed ${parts.join(' + ')} for ${row.value.name}`,
    detail: titles.join(' · '),
    severity: 'info',
  })
  toast.success(
    parts.length > 1
      ? 'Exam paper and mark sheet sent to print'
      : parts[0] === 'marksheet'
        ? 'Mark sheet sent to print'
        : 'Exam paper sent to print',
  )
}

function openMarks() {
  if (!row.value) return
  router.push({
    path: '/gradebook',
    query: { tab: 'marks', exam: row.value.id },
  })
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
          v-if="!editing && isExam"
          icon-left="lucide-pen-line"
          label="Enter marks"
          @click="openMarks"
        />
        <Button
          v-if="!editing && canPrint && isExam"
          icon-left="lucide-printer"
          label="Print paper"
          @click="printExam(['paper'])"
        />
        <Button
          v-if="!editing && canPrint && isExam"
          icon-left="lucide-table-2"
          label="Mark sheet"
          @click="printExam(['marksheet'])"
        />
        <Button
          v-if="!editing && canPrint && !isExam"
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

  <div class="school-page">
    <div
      v-if="!mod || !row"
      class="rounded-6 border border-outline-gray-1 px-4 py-16 text-center text-ink-gray-5"
    >
      <p class="text-sm">Record not found.</p>
      <Button class="mt-4" label="Back to list" @click="goBack" />
    </div>

    <template v-else>
      <section class="school-detail-hero">
        <div class="school-detail-hero__main">
          <Avatar :label="row.name" size="xl" class="shrink-0" />
          <div class="school-detail-hero__text">
            <p class="school-detail-hero__meta">
              {{ mod.singular }} · {{ row.id }}
            </p>
            <h1 class="school-detail-hero__title" :title="row.name">
              {{ row.name }}
            </h1>
            <p
              v-if="row.subtitle"
              class="school-detail-hero__sub"
              :title="row.subtitle"
            >
              {{ row.subtitle }}
            </p>
            <div class="school-detail-hero__badges">
              <Badge
                v-if="row.status"
                :label="row.status"
                :theme="row.statusTheme || 'gray'"
                variant="subtle"
              />
              <Badge :label="mod.title" theme="blue" variant="subtle" />
              <Badge
                v-if="isExam && row.className"
                :label="String(row.className)"
                theme="amber"
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- View mode -->
      <section v-if="!editing" class="school-section">
        <h2 class="school-section-title">Details</h2>
        <div class="school-detail-grid">
          <div
            v-for="field in displayFields"
            :key="field.key"
            class="school-detail-field"
          >
            <p class="school-detail-field__label">{{ field.label }}</p>
            <div class="mt-1.5 min-w-0">
              <Badge
                v-if="field.badge && field.value !== '—'"
                :label="field.value"
                :theme="row.statusTheme || 'gray'"
                variant="subtle"
              />
              <p
                v-else
                class="school-detail-field__value"
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
        <h2 class="school-section-title">
          Update {{ mod.singular.toLowerCase() }}
        </h2>
        <div class="school-detail-form">
          <FormControl
            v-model="form.name"
            class="school-detail-form__full"
            :label="`${mod.singular} name`"
            type="text"
            required
          />
          <FormControl
            v-for="col in editableColumns.filter(
              (c) => c.key !== 'name' && c.key !== 'status',
            )"
            :key="col.key"
            v-model="form[col.key]"
            :label="col.label"
            type="text"
          />
          <FormControl
            v-model="form.status"
            label="Status"
            type="select"
            :options="statusOptions"
          />
          <FormControl
            v-model="form.subtitle"
            class="school-detail-form__full"
            label="Note / subtitle"
            type="textarea"
          />
          <div class="school-detail-form__actions">
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
