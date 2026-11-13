<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import ListStatCards from '../components/ListStatCards.vue'
import { schoolSetup } from '../data/schoolSetup'
import {
  downloadSchoolReport,
  exportSchoolReportCsv,
  printSchoolReport,
  schoolReportCatalog,
  schoolReportStats,
  type SchoolReportId,
} from '../data/schoolReports'

const router = useRouter()
const stats = computed(() => {
  const s = schoolReportStats()
  return [
    { title: 'Learners', value: s.students, caption: `${s.activeStudents} active` },
    { title: 'Attendance', value: s.attendancePct, caption: '% present' },
    { title: 'Open fees', value: s.unpaidFees, caption: 'need attention' },
    {
      title: 'Admissions',
      value: s.pendingAdmissions,
      caption: 'pending review',
    },
  ]
})

function print(id: SchoolReportId) {
  try {
    const title = printSchoolReport(id)
    toast.success(`Print dialog · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function download(id: SchoolReportId) {
  try {
    const title = downloadSchoolReport(id)
    toast.success(`Downloaded · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not download')
  }
}

function exportCsv(id: SchoolReportId) {
  try {
    exportSchoolReportCsv(id)
    toast.success('CSV exported')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not export')
  }
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="School Reports" />
    <div class="flex flex-wrap gap-2">
      <Button
        icon-left="lucide-printer"
        label="Important documents"
        @click="router.push('/documents')"
      />
      <Button
        variant="solid"
        icon-left="lucide-printer"
        label="Print overview"
        @click="print('overview')"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-5xl">
    <p class="text-p-base text-ink-gray-6">
      Overall school reports for {{ schoolSetup.name }} —
      {{ schoolSetup.currentTerm }} {{ schoolSetup.academicYear }}. Print,
      download, or export CSV. Official parent letters stay under Important
      Documents.
    </p>

    <ListStatCards :stats="stats" />

    <section class="school-section">
      <h2 class="school-section-title">Overall reports</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="report in schoolReportCatalog"
          :key="report.id"
          class="flex flex-col gap-3 rounded-6 border border-outline-gray-1 bg-surface-white p-4"
        >
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm-medium text-ink-gray-9">{{ report.title }}</p>
              <Badge
                v-if="report.id === 'overview'"
                label="Summary"
                theme="blue"
                variant="subtle"
              />
            </div>
            <p class="text-xs text-ink-gray-5">{{ report.description }}</p>
          </div>
          <div class="mt-auto flex flex-wrap gap-2">
            <Button
              variant="solid"
              icon-left="lucide-printer"
              label="Print"
              @click="print(report.id)"
            />
            <Button
              icon-left="lucide-download"
              label="Download"
              @click="download(report.id)"
            />
            <Button
              icon-left="lucide-file-spreadsheet"
              label="CSV"
              @click="exportCsv(report.id)"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
