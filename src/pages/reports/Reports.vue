<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
const route = useRoute()

const selectedId = ref<SchoolReportId>('overview')
const detailOpen = ref(false)
const recordQuery = ref('')
const statusFilter = ref('All')
const selectedRecordId = ref('')

const selected = computed(() => reportDef(selectedId.value))

function isReportId(raw: unknown): raw is SchoolReportId {
  return schoolReportCatalog.some((r) => r.id === raw)
}

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

function openReportDetail(id: SchoolReportId) {
  selectedId.value = id
  detailOpen.value = true
  router.replace({
    path: '/reports',
    query: { ...route.query, report: id, view: 'full' },
  })
}

function selectReport(id: SchoolReportId) {
  openReportDetail(id)
}

function closeReportDetail() {
  detailOpen.value = false
  const query = { ...route.query }
  delete query.view
  router.replace({ path: '/reports', query })
}

watch(detailOpen, (open) => {
  document.body.classList.toggle('school-modal-open', open)
})

onUnmounted(() => {
  document.body.classList.remove('school-modal-open')
})

watch(
  () => [route.query.report, route.query.view] as const,
  ([report, view]) => {
    if (isReportId(report)) selectedId.value = report
    if (view === 'full' && isReportId(report || selectedId.value)) {
      detailOpen.value = true
      if (isReportId(report)) selectedId.value = report
    }
  },
  { immediate: true },
)

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
        icon-left="lucide-maximize-2"
        label="School overview"
        @click="openReportDetail('overview')"
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
      <h2 class="school-section-title">Open a full-page preview</h2>
      <p class="mb-3 text-sm text-ink-gray-6">
        Click any report card above — School overview and every other report
        open on a dedicated full-screen page.
      </p>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="solid"
          icon-left="lucide-maximize-2"
          label="Open School overview"
          @click="openReportDetail('overview')"
        />
        <Button
          icon-left="lucide-receipt"
          label="Fees report"
          @click="openReportDetail('fees')"
        />
        <Button
          icon-left="lucide-graduation-cap"
          label="Enrollment"
          @click="openReportDetail('enrollment')"
        />
        <Button
          icon-left="lucide-file-text"
          label="Official documents"
          @click="router.push('/documents')"
        />
      </div>
    </section>
  </div>

  <Teleport to="body">
    <div
      v-if="detailOpen"
      class="school-report-detail"
      role="dialog"
      aria-modal="true"
      :aria-label="`Preview · ${selected.title}`"
    >
      <header class="school-report-detail__bar">
        <div class="school-report-detail__bar-left">
          <Button
            icon="lucide-arrow-left"
            aria-label="Back to reports"
            @click="closeReportDetail"
          />
          <div class="min-w-0">
            <p class="text-base-medium text-ink-gray-9">
              Preview · {{ selected.title }}
            </p>
            <p class="text-sm text-ink-gray-6">
              {{ selected.description }} · {{ schoolSetup.currentTerm }}
              {{ schoolSetup.academicYear }}
            </p>
          </div>
        </div>
        <div class="school-report-detail__bar-actions">
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
          <Button
            size="sm"
            icon="lucide-x"
            aria-label="Close full preview"
            @click="closeReportDetail"
          />
        </div>
      </header>

      <div
        class="school-report-detail__body"
        :class="{ 'school-report-detail__body--split': Boolean(selected.moduleKey) }"
      >
        <div class="school-report-detail__stage">
          <iframe
            class="school-report-detail__frame"
            title="Full report preview"
            :srcdoc="preview.html"
          />
        </div>

        <aside
          v-if="selected.moduleKey"
          class="school-report-detail__side"
        >
          <h3 class="text-sm-medium text-ink-gray-9">
            Browse {{ selected.recordLabel.toLowerCase() }}
          </h3>
          <div class="mt-3 grid gap-3">
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
            <div class="flex flex-wrap gap-2">
              <Button
                variant="solid"
                size="sm"
                icon-left="lucide-printer"
                label="Print record"
                :disabled="!selectedRow || !selected.documentKind"
                @click="selectedRow && printRecord(selectedRow)"
              />
              <Button
                size="sm"
                icon-left="lucide-download"
                label="Download"
                :disabled="!selectedRow || !selected.documentKind"
                @click="selectedRow && downloadRecord(selectedRow)"
              />
              <Button
                size="sm"
                icon-left="lucide-external-link"
                label="Open"
                :disabled="!selectedRow"
                @click="selectedRow && openRecord(selectedRow)"
              />
            </div>
          </div>

          <div class="school-report-detail__rows">
            <button
              v-for="row in filteredRows"
              :key="row.id"
              type="button"
              class="school-report-detail__row"
              :data-active="selectedRecordId === row.id ? '' : undefined"
              @click="selectedRecordId = row.id"
            >
              <span class="school-cell-text text-sm-medium text-ink-gray-9">
                {{ rowLabel(row) }}
              </span>
              <Badge
                v-if="row.status"
                :label="String(row.status)"
                :theme="statusTheme(String(row.status))"
                variant="subtle"
              />
            </button>
            <p
              v-if="!filteredRows.length"
              class="px-2 py-8 text-center text-sm text-ink-gray-5"
            >
              No {{ selected.recordLabel.toLowerCase() }} match.
            </p>
          </div>
        </aside>
      </div>
    </div>
  </Teleport>
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

.school-report-detail {
  position: fixed;
  inset: 0;
  z-index: 190;
  display: flex;
  flex-direction: column;
  background: #ececec;
  isolation: isolate;
}

.school-report-detail__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--outline-gray-2, #e5e5e5);
  background: #ffffff;
}

.school-report-detail__bar-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.school-report-detail__bar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.school-report-detail__body {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.school-report-detail__body--split {
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
}

.school-report-detail__stage {
  min-width: 0;
  min-height: 0;
  padding: 0.85rem;
  overflow: auto;
}

.school-report-detail__frame {
  display: block;
  width: 100%;
  height: 100%;
  min-height: calc(100dvh - 5.5rem);
  border: 0;
  border-radius: 0.5rem;
  background: #ffffff;
  box-shadow: 0 10px 36px rgb(15 23 42 / 0.12);
}

.school-report-detail__side {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem;
  border-left: 1px solid var(--outline-gray-2, #e5e5e5);
  background: #ffffff;
  overflow: hidden;
}

.school-report-detail__rows {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--outline-gray-1, #ededed);
  border-radius: 0.65rem;
}

.school-report-detail__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 0;
  border-bottom: 1px solid var(--outline-gray-1, #ededed);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.school-report-detail__row:last-child {
  border-bottom: 0;
}

.school-report-detail__row:hover,
.school-report-detail__row[data-active] {
  background: var(--surface-gray-1, #f8f8f8);
}

@media (max-width: 960px) {
  .school-report-detail__body--split {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(55dvh, 1fr) minmax(14rem, 40dvh);
  }

  .school-report-detail__side {
    border-left: 0;
    border-top: 1px solid var(--outline-gray-2, #e5e5e5);
  }

  .school-report-detail__frame {
    min-height: 55dvh;
  }
}
</style>
