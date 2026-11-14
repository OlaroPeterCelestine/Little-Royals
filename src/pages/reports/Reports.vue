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
import ListStatCards from '@/components/list/ListStatCards.vue'
import { schoolSetup } from '@/data/school/schoolSetup'
import {
  downloadSchoolReport,
  exportSchoolReportCsv,
  previewSchoolReport,
  printSchoolReport,
  reportDef,
  reportRecordColumns,
  reportRecords,
  schoolReportCatalog,
  schoolReportStats,
  type SchoolReportId,
} from '@/data/school/schoolReports'
import {
  downloadRecordDocument,
  printRecordDocument,
  type DocumentKind,
} from '@/data/documents/documents'
import type { CatalogRow } from '@/data/catalog/catalog'
import { canCurrentUser } from '@/data/auth/permissions'

const router = useRouter()

const selectedId = ref<SchoolReportId>('overview')
const recordQuery = ref('')
const statusFilter = ref('All')
const selectedRecordId = ref('')

const selected = computed(() => reportDef(selectedId.value))

const stats = computed(() => {
  const s = schoolReportStats()
  return [
    { title: 'Learners', value: s.students, caption: `${s.activeStudents} active` },
    { title: 'Attendance', value: s.attendancePct, caption: '% present' },
    { title: 'Open invoices', value: s.unpaidFees, caption: 'fees due' },
    {
      title: 'Admissions',
      value: s.pendingAdmissions,
      caption: 'pending review',
    },
  ]
})

const preview = computed(() => previewSchoolReport(selectedId.value))

const allRows = computed(() => reportRecords(selectedId.value))

const columns = computed(() => reportRecordColumns(selectedId.value))

const statusOptions = computed(() => {
  const statuses = Array.from(
    new Set(allRows.value.map((r) => String(r.status || '')).filter(Boolean)),
  )
  return [
    { label: 'All statuses', value: 'All' },
    ...statuses.map((s) => ({
      label: `${s} (${allRows.value.filter((r) => r.status === s).length})`,
      value: s,
    })),
  ]
})

const filteredRows = computed(() => {
  const q = recordQuery.value.trim().toLowerCase()
  return allRows.value.filter((r) => {
    if (statusFilter.value !== 'All' && String(r.status) !== statusFilter.value)
      return false
    if (!q) return true
    return columns.value
      .map((c) => String(r[c.key] ?? (c.key === 'invoice' ? r.id : '')))
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const recordOptions = computed(() =>
  filteredRows.value.map((r) => ({
    label: rowLabel(r),
    value: r.id,
  })),
)

const selectedRow = computed(
  () => allRows.value.find((r) => r.id === selectedRecordId.value) || null,
)

watch(selectedId, () => {
  recordQuery.value = ''
  statusFilter.value = 'All'
  selectedRecordId.value = ''
})

watch(
  filteredRows,
  (rows) => {
    if (!rows.some((r) => r.id === selectedRecordId.value)) {
      selectedRecordId.value = rows[0]?.id || ''
    }
  },
  { immediate: true },
)

function rowLabel(row: CatalogRow) {
  if (selectedId.value === 'fees') {
    return `${row.name} · ${row.invoice || row.id}`
  }
  if (selectedId.value === 'academics') {
    return `${row.name} · ${row.exam || row.id}`
  }
  return `${row.name} (${row.id})`
}

function cellValue(row: CatalogRow, key: string) {
  if (key === 'invoice') return String(row.invoice || row.id)
  if (key === 'subject') return String(row.subject || row.department || '—')
  const v = row[key]
  return v == null || v === '' ? '—' : String(v)
}

function selectReport(id: SchoolReportId) {
  selectedId.value = id
}

function printReport() {
  try {
    const title = printSchoolReport(selectedId.value)
    toast.success(`Print · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function downloadReport() {
  try {
    const title = downloadSchoolReport(selectedId.value)
    toast.success(`Downloaded · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not download')
  }
}

function exportCsv() {
  try {
    exportSchoolReportCsv(selectedId.value)
    toast.success('CSV exported')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not export')
  }
}

function docKindForRow(row: CatalogRow): DocumentKind | null {
  const kind = selected.value.documentKind
  if (!kind) return null
  if (kind === 'invoice' && String(row.status) === 'Paid') return 'receipt'
  return kind
}

function assertCanPrint(moduleKey: string) {
  if (canCurrentUser(moduleKey, 'print') || canCurrentUser(moduleKey, 'read'))
    return true
  toast.error('Your role cannot print this record')
  return false
}

function printRecord(row: CatalogRow) {
  const moduleKey = selected.value.moduleKey
  const kind = docKindForRow(row)
  if (!moduleKey || !kind) {
    toast.info('Open the full report to print this section')
    return
  }
  if (!assertCanPrint(moduleKey)) return
  try {
    const title = printRecordDocument(kind, moduleKey, row)
    toast.success(`Print · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function downloadRecord(row: CatalogRow) {
  const moduleKey = selected.value.moduleKey
  const kind = docKindForRow(row)
  if (!moduleKey || !kind) return
  if (!assertCanPrint(moduleKey)) return
  try {
    const title = downloadRecordDocument(kind, moduleKey, row)
    toast.success(`Downloaded · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not download')
  }
}

function openRecord(row: CatalogRow) {
  const moduleKey = selected.value.moduleKey
  if (!moduleKey) return
  router.push(`/${moduleKey}/${row.id}`)
}

function statusTheme(status: string) {
  const s = status.toLowerCase()
  if (['paid', 'active', 'present', 'approved', 'posted', 'pass'].some((x) => s.includes(x)))
    return 'green'
  if (['unpaid', 'overdue', 'absent', 'rejected', 'fail'].some((x) => s.includes(x)))
    return 'red'
  if (['partial', 'pending', 'late', 'waitlist', 'draft'].some((x) => s.includes(x)))
    return 'amber'
  return 'gray'
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="School Reports" />
    <div class="flex flex-wrap gap-2">
      <Button
        icon-left="lucide-file-text"
        label="Documents"
        @click="router.push('/documents')"
      />
      <Button
        icon-left="lucide-download"
        label="Download report"
        @click="downloadReport"
      />
      <Button
        variant="solid"
        icon-left="lucide-printer"
        label="Print report"
        @click="printReport"
      />
    </div>
  </PageHeader>

  <div class="school-page">
    <p class="text-p-base text-ink-gray-6">
      Get school-wide reports and overview for {{ schoolSetup.shortName }} —
      {{ schoolSetup.currentTerm }} {{ schoolSetup.academicYear }}. Browse
      invoices, learners, attendance and more like Documents, then print the
      full report or a single record.
    </p>

    <ListStatCards :stats="stats" />

    <section class="school-section">
      <h2 class="school-section-title">Get a report</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="report in schoolReportCatalog"
          :key="report.id"
          type="button"
          class="school-report-card"
          :data-active="selectedId === report.id ? '' : undefined"
          @click="selectReport(report.id)"
        >
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm-medium text-ink-gray-9">{{ report.title }}</p>
            <Badge
              v-if="report.id === 'overview'"
              label="Overview"
              theme="blue"
              variant="subtle"
            />
            <Badge
              v-if="report.moduleKey"
              :label="String(reportRecords(report.id).length)"
              theme="gray"
              variant="subtle"
            />
          </div>
          <p class="mt-1 text-xs text-ink-gray-5">{{ report.description }}</p>
          <p class="mt-2 text-xs font-medium text-ink-gray-6">
            {{ report.recordLabel }}
          </p>
        </button>
      </div>
    </section>

    <section class="school-section">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="school-section-title mb-0">
          Preview · {{ selected.title }}
        </h2>
        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            icon-left="lucide-file-spreadsheet"
            label="CSV"
            @click="exportCsv"
          />
          <Button
            size="sm"
            icon-left="lucide-download"
            label="Download"
            @click="downloadReport"
          />
          <Button
            size="sm"
            variant="solid"
            icon-left="lucide-printer"
            label="Print"
            @click="printReport"
          />
        </div>
      </div>
      <div class="school-report-preview">
        <iframe
          class="school-report-preview__frame"
          title="Report preview"
          :srcdoc="preview.html"
        />
      </div>
    </section>

    <section v-if="selected.moduleKey" class="school-section">
      <h2 class="school-section-title">
        Browse {{ selected.recordLabel.toLowerCase() }}
      </h2>
      <p class="mb-3 text-sm text-ink-gray-6">
        Same style as Documents — open any row, or print an invoice / letter /
        report card for that record.
      </p>

      <div
        class="mb-3 grid gap-3 rounded-6 border border-outline-gray-1 bg-surface-white p-4 sm:grid-cols-3"
      >
        <FormControl
          v-model="recordQuery"
          label="Search"
          type="text"
          :placeholder="`Search ${selected.recordLabel.toLowerCase()}…`"
        />
        <FormControl
          v-if="statusOptions.length > 1"
          v-model="statusFilter"
          label="Status"
          type="select"
          :options="statusOptions"
        />
        <FormControl
          v-model="selectedRecordId"
          label="Selected record"
          type="select"
          :options="
            recordOptions.length
              ? recordOptions
              : [{ label: 'No records', value: '' }]
          "
        />
        <div class="flex flex-wrap gap-2 sm:col-span-3">
          <Button
            variant="solid"
            icon-left="lucide-printer"
            :label="
              selectedId === 'fees'
                ? 'Print invoice / receipt'
                : 'Print record'
            "
            :disabled="!selectedRow || !selected.documentKind"
            @click="selectedRow && printRecord(selectedRow)"
          />
          <Button
            icon-left="lucide-download"
            label="Download record"
            :disabled="!selectedRow || !selected.documentKind"
            @click="selectedRow && downloadRecord(selectedRow)"
          />
          <Button
            icon-left="lucide-external-link"
            label="Open record"
            :disabled="!selectedRow"
            @click="selectedRow && openRecord(selectedRow)"
          />
          <Button
            icon-left="lucide-file-text"
            label="All documents"
            @click="router.push('/documents')"
          />
        </div>
      </div>

      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <div
          class="school-report-table-head"
          :style="{
            gridTemplateColumns: `minmax(0, 1.4fr) repeat(${Math.max(columns.length - 1, 1)}, minmax(0, 1fr)) minmax(0, 7rem)`,
          }"
        >
          <span v-for="col in columns" :key="col.key">{{ col.label }}</span>
          <span class="text-end">Actions</span>
        </div>
        <button
          v-for="row in filteredRows"
          :key="row.id"
          type="button"
          class="school-report-table-row"
          :data-active="selectedRecordId === row.id ? '' : undefined"
          :style="{
            gridTemplateColumns: `minmax(0, 1.4fr) repeat(${Math.max(columns.length - 1, 1)}, minmax(0, 1fr)) minmax(0, 7rem)`,
          }"
          @click="selectedRecordId = row.id"
        >
          <span
            v-for="col in columns"
            :key="col.key"
            class="school-cell-text"
            :title="cellValue(row, col.key)"
          >
            <Badge
              v-if="col.key === 'status'"
              :label="cellValue(row, col.key)"
              :theme="statusTheme(cellValue(row, col.key))"
              variant="subtle"
            />
            <template v-else>{{ cellValue(row, col.key) }}</template>
          </span>
          <span class="flex justify-end gap-1">
            <Button
              v-if="selected.documentKind"
              size="sm"
              icon="lucide-printer"
              aria-label="Print"
              @click.stop="printRecord(row)"
            />
            <Button
              size="sm"
              icon="lucide-eye"
              aria-label="Open"
              @click.stop="openRecord(row)"
            />
          </span>
        </button>
        <p
          v-if="!filteredRows.length"
          class="px-4 py-10 text-center text-sm text-ink-gray-5"
        >
          No {{ selected.recordLabel.toLowerCase() }} match your filters.
        </p>
      </div>
    </section>

    <section v-else class="school-section">
      <h2 class="school-section-title">Overview shortcuts</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          icon-left="lucide-receipt"
          label="Browse invoices"
          @click="selectReport('fees')"
        />
        <Button
          icon-left="lucide-graduation-cap"
          label="Browse learners"
          @click="selectReport('enrollment')"
        />
        <Button
          icon-left="lucide-clipboard-check"
          label="Browse attendance"
          @click="selectReport('attendance')"
        />
        <Button
          icon-left="lucide-file-text"
          label="Official documents"
          @click="router.push('/documents')"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.school-report-card {
  border: 1px solid var(--outline-gray-1);
  border-radius: 0.75rem;
  background: var(--surface-white);
  padding: 1rem;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.school-report-card:hover {
  background: var(--surface-gray-1);
}

.school-report-card[data-active] {
  border-color: color-mix(in srgb, var(--school-blue) 45%, white);
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--school-blue) 35%, white);
  background: color-mix(in srgb, var(--school-blue) 6%, white);
}

.school-report-preview {
  overflow: hidden;
  border: 1px solid var(--outline-gray-1);
  border-radius: 0.75rem;
  background: var(--surface-gray-2);
}

.school-report-preview__frame {
  display: block;
  width: 100%;
  min-height: 28rem;
  border: 0;
  background: #fff;
}

.school-report-table-head,
.school-report-table-row {
  display: grid;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
  padding: 0.65rem 1rem;
  min-width: 0;
}

.school-report-table-head {
  background: var(--surface-gray-1);
  border-bottom: 1px solid var(--outline-gray-1);
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--ink-gray-5);
}

.school-report-table-row {
  border: 0;
  border-bottom: 1px solid var(--outline-gray-1);
  background: var(--surface-white);
  text-align: left;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--ink-gray-8);
}

.school-report-table-row:last-child {
  border-bottom: 0;
}

.school-report-table-row:hover,
.school-report-table-row[data-active] {
  background: var(--surface-gray-1);
}
</style>
