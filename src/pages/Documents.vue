<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import {
  defaultDocumentKind,
  documentCatalog,
  printRecordDocument,
  type DocumentKind,
} from '../data/documents'
import { getLiveModule } from '../data/store'
import type { CatalogRow } from '../data/catalog'
import { canCurrentUser } from '../data/permissions'

const router = useRouter()

const selectedKind = ref<DocumentKind>('invoice')
const selectedModule = ref('fees')
const selectedRecordId = ref('')

const currentDef = computed(
  () => documentCatalog.find((d) => d.kind === selectedKind.value) || null,
)

const moduleOptions = computed(() => {
  const mods = currentDef.value?.modules || []
  if (mods.includes('*')) {
    return [
      { label: 'Fees', value: 'fees' },
      { label: 'Admissions', value: 'admissions' },
      { label: 'Exam results', value: 'exam-results' },
      { label: 'Students', value: 'students' },
      { label: 'Attendance', value: 'attendance' },
      { label: 'Disciplinary cases', value: 'disciplinary-cases' },
    ]
  }
  return mods.map((m) => ({
    label: getLiveModule(m)?.title || m,
    value: m,
  }))
})

const recordOptions = computed(() => {
  const mod = getLiveModule(selectedModule.value)
  return (mod?.rows || []).map((r) => ({
    label: `${r.name} (${r.id})`,
    value: r.id,
  }))
})

const selectedRow = computed<CatalogRow | null>(() => {
  const mod = getLiveModule(selectedModule.value)
  return mod?.rows.find((r) => r.id === selectedRecordId.value) || null
})

watch(
  selectedKind,
  () => {
    const mods = currentDef.value?.modules || []
    selectedModule.value = mods.includes('*') ? 'fees' : mods[0] || 'fees'
  },
)

watch(
  [selectedModule, recordOptions],
  () => {
    if (!recordOptions.value.some((o) => o.value === selectedRecordId.value)) {
      selectedRecordId.value = recordOptions.value[0]?.value || ''
    }
  },
  { immediate: true },
)

function assertCanPrint(moduleKey: string) {
  if (canCurrentUser(moduleKey, 'print')) return true
  toast.error('Your role cannot print documents for this module')
  return false
}

function printSelected() {
  if (!selectedRow.value) {
    toast.error('Pick a record to print')
    return
  }
  if (!assertCanPrint(selectedModule.value)) return
  try {
    const title = printRecordDocument(
      selectedKind.value,
      selectedModule.value,
      selectedRow.value,
    )
    toast.success(`Opened print preview · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function quickPrint(kind: DocumentKind) {
  selectedKind.value = kind
  const mods = documentCatalog.find((d) => d.kind === kind)?.modules || []
  selectedModule.value = mods.includes('*') ? 'fees' : mods[0] || 'fees'
  if (!assertCanPrint(selectedModule.value)) return
  const first = getLiveModule(selectedModule.value)?.rows[0]
  if (!first) {
    toast.warning('No records in that module yet')
    return
  }
  selectedRecordId.value = first.id
  try {
    printRecordDocument(kind, selectedModule.value, first)
    toast.success('Print preview opened')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function printAttendanceReport() {
  if (!assertCanPrint('attendance')) return
  const first = getLiveModule('attendance')?.rows[0]
  if (!first) {
    toast.warning('No attendance records')
    return
  }
  try {
    printRecordDocument('attendance-report', 'attendance', first)
    toast.success('Attendance report ready to print')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

const kindOptions = documentCatalog.map((d) => ({
  label: d.label,
  value: d.kind,
}))
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Print Documents" />
    <div class="flex flex-wrap items-center gap-2">
      <Button
        icon-left="lucide-file-code"
        label="Reports"
        @click="router.push('/reports')"
      />
      <Button
        variant="solid"
        icon-left="lucide-printer"
        label="Print selected"
        @click="printSelected"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-4xl">
    <p class="text-p-base text-ink-gray-6">
      Print fee invoices, receipts, letters of admission, exam memos, report
      cards, attendance reports and disciplinary notices on Little Royals
      letterhead.
    </p>

    <section class="school-section">
      <h2 class="school-section-title">Quick print</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="doc in documentCatalog.filter((d) => d.kind !== 'generic')"
          :key="doc.kind"
          type="button"
          class="rounded-6 border border-outline-gray-1 bg-surface-white p-4 text-left transition hover:border-outline-gray-3 hover:bg-surface-gray-1"
          @click="
            doc.kind === 'attendance-report'
              ? printAttendanceReport()
              : quickPrint(doc.kind)
          "
        >
          <p class="text-sm-medium text-ink-gray-9">{{ doc.label }}</p>
          <p class="mt-1 text-xs text-ink-gray-5">{{ doc.description }}</p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <Badge
              v-for="m in doc.modules.filter((x) => x !== '*')"
              :key="m"
              :label="m"
              theme="gray"
              variant="subtle"
            />
          </div>
        </button>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Print a specific record</h2>
      <div
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <FormControl
          v-model="selectedKind"
          label="Document type"
          type="select"
          :options="kindOptions"
        />
        <FormControl
          v-model="selectedModule"
          label="Module"
          type="select"
          :options="moduleOptions"
        />
        <FormControl
          v-model="selectedRecordId"
          class="sm:col-span-2"
          label="Record"
          type="select"
          :options="recordOptions"
        />
        <div class="sm:col-span-2 flex flex-wrap gap-2">
          <Button
            variant="solid"
            icon-left="lucide-printer"
            label="Print document"
            @click="printSelected"
          />
          <Button
            label="Open record"
            :disabled="!selectedRow"
            @click="
              selectedRow &&
              router.push(`/${selectedModule}/${selectedRow.id}`)
            "
          />
        </div>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Also printable from records</h2>
      <p class="text-sm text-ink-gray-6">
        Every detail page has a Print button. Fees can print invoice or receipt;
        admissions print letters; exam results print memos; disciplinary cases
        print parent notices; students print term report cards. Default for
        this desk:
        <strong>{{ defaultDocumentKind('fees') }}</strong> on fees,
        <strong>{{ defaultDocumentKind('admissions') }}</strong> on admissions,
        <strong>{{ defaultDocumentKind('exam-results') }}</strong> on exams.
      </p>
    </section>
  </div>
</template>
