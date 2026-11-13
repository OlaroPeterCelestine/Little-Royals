<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import type { Extension } from '@codemirror/state'
import {
  Badge,
  Button,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import {
  CodeEditor,
  CodeEditorContent,
  CodeKit,
  loadLanguage,
} from 'frappe-ui/code-editor'
import { useRouter } from 'vue-router'
import { defaultReportSql } from '../data/school'
import { schoolStore } from '../data/store'
import { printRecordDocument } from '../data/documents'

const router = useRouter()

const sql = ref(defaultReportSql)
const extensions = shallowRef<Extension[]>([CodeKit])
const ran = ref(false)

onMounted(async () => {
  const language = await loadLanguage('sql')
  extensions.value = language ? [CodeKit, language] : [CodeKit]
})

const results = computed(() =>
  schoolStore.attendance.rows.map((row) => ({
    student: row.name,
    className: String(row.className || '—'),
    date: String(row.date || '—'),
    status: String(row.status || '—'),
    attendance_pct:
      row.status === 'Present' || row.status === 'Late'
        ? row.status === 'Late'
          ? 50
          : 100
        : 0,
  })),
)

function runReport() {
  if (!sql.value.trim()) {
    toast.error('Query cannot be empty')
    return
  }
  ran.value = true
  toast.success(`Report ready — ${results.value.length} rows`)
}

function exportResults() {
  if (!ran.value) {
    toast.warning('Run the query first')
    return
  }
  const header = 'student,class_name,date,status,attendance_pct'
  const lines = results.value.map(
    (r) =>
      `"${r.student}","${r.className}","${r.date}","${r.status}",${r.attendance_pct}`,
  )
  const blob = new Blob([[header, ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV exported')
}

function printReport() {
  const first = schoolStore.attendance.rows[0]
  if (!first) {
    toast.warning('No attendance data to print')
    return
  }
  try {
    printRecordDocument('attendance-report', 'attendance', first)
    toast.success('Attendance report ready to print')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Reports" />
    <div class="flex items-center gap-2">
      <Button
        icon-left="lucide-printer"
        label="Print documents"
        @click="router.push('/documents')"
      />
      <Button
        icon-left="lucide-printer"
        label="Print report"
        @click="printReport"
      />
      <Button
        icon-left="lucide-download"
        label="Export CSV"
        @click="exportResults"
      />
      <Button
        variant="solid"
        icon-left="lucide-play"
        label="Run query"
        @click="runReport"
      />
    </div>
  </PageHeader>

  <div class="school-page mx-auto max-w-4xl">
    <div class="space-y-2">
      <h1 class="text-lg-semibold text-ink-gray-9">Attendance SQL report</h1>
      <p class="text-p-base text-ink-gray-6">
        Edit the query, run it against live attendance, then export the result
        set.
      </p>
    </div>

    <div
      class="overflow-hidden rounded-6 border border-outline-gray-2 bg-surface-white"
    >
      <div
        class="border-b border-outline-gray-1 px-3 py-2 text-xs text-ink-gray-5"
      >
        SQL · Little Royals attendance
      </div>
      <CodeEditor v-model="sql" :extensions="extensions">
        <CodeEditorContent class="min-h-72 font-mono text-sm" />
      </CodeEditor>
    </div>

    <div v-if="ran" class="school-section">
      <div class="flex items-center justify-between gap-3">
        <h2 class="school-section-title">Results</h2>
        <Badge
          :label="`${results.length} rows`"
          theme="green"
          variant="subtle"
        />
      </div>
      <div class="school-table overflow-x-auto">
        <table class="w-full min-w-[36rem] text-left text-sm">
          <thead class="bg-surface-gray-1 text-xs uppercase text-ink-gray-5">
            <tr>
              <th class="px-4 py-3 font-semibold">Student</th>
              <th class="px-4 py-3 font-semibold">Class</th>
              <th class="px-4 py-3 font-semibold">Date</th>
              <th class="px-4 py-3 font-semibold">Status</th>
              <th class="px-4 py-3 font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in results"
              :key="row.student + row.date"
              class="border-t border-outline-gray-1"
            >
              <td class="px-4 py-3 text-ink-gray-9">{{ row.student }}</td>
              <td class="px-4 py-3 text-ink-gray-7">{{ row.className }}</td>
              <td class="px-4 py-3 text-ink-gray-7">{{ row.date }}</td>
              <td class="px-4 py-3">
                <Badge :label="row.status" theme="gray" variant="subtle" />
              </td>
              <td class="px-4 py-3 tabular-nums text-ink-gray-7">
                {{ row.attendance_pct }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
