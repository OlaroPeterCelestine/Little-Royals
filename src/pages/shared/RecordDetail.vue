<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Button,
  PageHeader,
  toast,
} from 'frappe-ui'
import PersonAvatar from '@/components/common/PersonAvatar.vue'
import { getLiveModule } from '@/data/catalog/store'
import {
  openDeleteDialog,
  openEditDialog,
} from '@/composables/useModuleForms'
import {
  defaultDocumentKind,
  printExamPack,
  moduleShowsListPrint,
  printRecordDocument,
  type DocumentKind,
} from '@/data/documents/documents'
import { useModuleAccess } from '@/composables/useModuleAccess'
import { logActivity } from '@/data/activity/activity'
import { personListPath } from '@/lib/personRoutes'
import AppBackButton from '@/components/layout/AppBackButton.vue'
import { useAppBack } from '@/composables/useAppBack'

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

const isExam = computed(() => moduleKey.value === 'exams')

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

function startEdit() {
  if (!row.value) return
  openEditDialog(moduleKey.value, row.value)
}

function confirmDelete() {
  if (!row.value) return
  openDeleteDialog(moduleKey.value, [row.value.id], () => {
    void router.push(personListPath(moduleKey.value))
  })
}

const { goBack } = useAppBack(() => personListPath(moduleKey.value))

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
  <PageHeader class="school-detail-header">
    <AppBackButton :fallback="personListPath(moduleKey)" />
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
      <div class="school-page-toolbar">
        <Button
          v-if="isExam"
          icon-left="lucide-pen-line"
          label="Enter marks"
          @click="openMarks"
        />
        <Button
          v-if="canPrint && isExam"
          icon-left="lucide-printer"
          label="Print paper"
          @click="printExam(['paper'])"
        />
        <Button
          v-if="canPrint && isExam"
          icon-left="lucide-table-2"
          label="Mark sheet"
          @click="printExam(['marksheet'])"
        />
        <Button
          v-if="canPrint && !isExam && moduleShowsListPrint(moduleKey)"
          icon-left="lucide-printer"
          label="Print"
          @click="printDoc()"
        />
        <Button
          v-if="canPrint && showReceiptPrint"
          icon-left="lucide-receipt"
          label="Receipt"
          @click="printDoc('receipt')"
        />
        <div class="school-page-toolbar__grow" />
        <Button
          v-if="canWrite"
          icon-left="lucide-pencil"
          label="Edit"
          @click="startEdit"
        />
        <Button
          v-if="canDelete"
          icon-left="lucide-trash-2"
          label="Delete"
          theme="red"
          @click="confirmDelete"
        />
      </div>

      <section class="school-detail-hero">
        <div class="school-detail-hero__main">
          <PersonAvatar
            :person="row"
            size="3xl"
            class="school-person-avatar--hero"
          />
          <div class="school-detail-hero__text">
            <p class="school-detail-hero__meta">
              {{ mod.singular }} · {{ row.id }}
            </p>
            <h1
              class="school-detail-hero__title school-detail-hero__title--profile"
              :title="row.name"
            >
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

      <section class="school-section">
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
    </template>
  </div>
</template>
