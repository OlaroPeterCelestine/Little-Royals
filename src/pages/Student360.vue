<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Avatar,
  Badge,
  Button,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
  dialog,
  toast,
} from 'frappe-ui'
import { getStudent360 } from '../data/student360'
import { deleteRecords } from '../data/store'
import { openEditDialog, openCreateDialog } from '../composables/useModuleForms'
import { printRecordDocument, type DocumentKind } from '../data/documents'
import type { CatalogRow } from '../data/catalog'
import { useModuleAccess } from '../composables/useModuleAccess'
import { canCurrentUser } from '../data/permissions'

const route = useRoute()
const router = useRouter()
const tab = ref('overview')
const { canWrite, canDelete, canPrint, requirePerm } =
  useModuleAccess('students')
const canCreateGuardian = computed(() => canCurrentUser('guardians', 'create'))
const canCreateCase = computed(() =>
  canCurrentUser('disciplinary-cases', 'create'),
)
const canPrintFees = computed(() => canCurrentUser('fees', 'print'))
const canPrintResults = computed(() => canCurrentUser('exam-results', 'print'))
const canPrintDiscipline = computed(() =>
  canCurrentUser('disciplinary-cases', 'print'),
)

const studentId = computed(() => String(route.params.id || ''))
const bundle = computed(() => getStudent360(studentId.value))

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Guardians', value: 'guardians' },
  { label: 'Discipline', value: 'discipline' },
  { label: 'Academics', value: 'academics' },
  { label: 'Fees', value: 'fees' },
  { label: 'Attendance', value: 'attendance' },
  { label: 'Notes', value: 'notes' },
]

function goBack() {
  router.push('/students')
}

function editStudent() {
  if (!bundle.value) return
  openEditDialog('students', bundle.value.student)
}

function confirmDelete() {
  const student = bundle.value?.student
  if (!student) return
  dialog.danger({
    title: 'Delete student?',
    message: `You are about to permanently delete “${student.name}” (${student.id}). Guardians and cases stay in their lists but will no longer link here.\n\nThis cannot be undone.`,
    confirmLabel: 'Yes, delete forever',
    cancelLabel: 'Keep student',
    onConfirm: async () => {
      deleteRecords('students', [student.id])
      toast.warning(`Student “${student.name}” deleted`)
      await router.push('/students')
    },
  })
}

function openRow(moduleKey: string, row: CatalogRow) {
  router.push(`/${moduleKey}/${row.id}`)
}

function printDoc(kind: DocumentKind, moduleKey: string, row: CatalogRow) {
  if (!canCurrentUser(moduleKey, 'print')) {
    toast.error('Your role cannot print this document')
    return
  }
  try {
    const title = printRecordDocument(kind, moduleKey, row)
    toast.success(`Print preview · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function printReportCard() {
  if (!bundle.value) return
  if (!requirePerm('print', 'print report cards')) return
  printDoc('report-card', 'students', bundle.value.student)
}

function statusTheme(status?: string) {
  const s = String(status || '').toLowerCase()
  if (['active', 'present', 'paid', 'closed', 'pass', 'published'].some((x) => s.includes(x)))
    return 'green'
  if (['unpaid', 'absent', 'overdue', 'open', 'fail', 'high'].some((x) => s.includes(x)))
    return 'red'
  if (['partial', 'late', 'monitoring', 'medium', 'pending'].some((x) => s.includes(x)))
    return 'amber'
  return 'blue'
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle :title="bundle?.student.name || 'Student 360'" />
    <div class="flex flex-wrap items-center gap-2">
      <Button icon-left="lucide-arrow-left" label="Back" @click="goBack" />
      <template v-if="bundle">
        <Button
          v-if="canPrint"
          icon-left="lucide-printer"
          label="Report card"
          @click="printReportCard"
        />
        <Button
          v-if="canWrite"
          icon-left="lucide-pencil"
          label="Edit"
          @click="editStudent"
        />
        <Button
          v-if="canCreateGuardian"
          icon-left="lucide-user-plus"
          label="Add guardian"
          @click="openCreateDialog('guardians')"
        />
        <Button
          v-if="canCreateCase"
          icon-left="lucide-shield-alert"
          label="New case"
          @click="openCreateDialog('disciplinary-cases')"
        />
        <Button
          v-if="canDelete"
          icon-left="lucide-trash-2"
          label="Delete"
          theme="red"
          @click="confirmDelete"
        />
      </template>
    </div>
  </PageHeader>

  <div class="school-page max-w-5xl">
    <div
      v-if="!bundle"
      class="rounded-6 border border-outline-gray-1 px-4 py-16 text-center text-ink-gray-5"
    >
      <p class="text-sm">Student not found.</p>
      <Button class="mt-4" label="Back to students" @click="goBack" />
    </div>

    <template v-else>
      <section
        class="flex flex-wrap items-start justify-between gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
      >
        <div class="flex min-w-0 items-start gap-4">
          <Avatar :label="bundle.student.name" size="xl" />
          <div class="min-w-0 space-y-1.5">
            <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
              Student 360 · {{ bundle.student.id }}
            </p>
            <h1 class="truncate text-2xl-semibold text-ink-gray-9">
              {{ bundle.student.name }}
            </h1>
            <p class="text-p-base text-ink-gray-6">
              {{ bundle.student.subtitle || bundle.student.className }}
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              <Badge
                v-if="bundle.student.status"
                :label="bundle.student.status"
                :theme="bundle.student.statusTheme || 'gray'"
                variant="subtle"
              />
              <Badge
                :label="String(bundle.student.className || '—')"
                theme="blue"
                variant="subtle"
              />
              <Badge
                v-if="bundle.stats.average !== null"
                :label="`${bundle.stats.average}% avg`"
                theme="violet"
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </section>

      <div class="school-card-grid sm:grid-cols-2 lg:grid-cols-4">
        <div class="school-card space-y-1">
          <p class="text-xs uppercase tracking-wide text-ink-gray-5">Guardians</p>
          <p class="text-xl-semibold text-ink-gray-9">{{ bundle.stats.guardianCount }}</p>
        </div>
        <div class="school-card space-y-1">
          <p class="text-xs uppercase tracking-wide text-ink-gray-5">Open cases</p>
          <p class="text-xl-semibold text-ink-gray-9">{{ bundle.stats.openCases }}</p>
          <p class="text-xs text-ink-gray-5">{{ bundle.stats.closedCases }} closed</p>
        </div>
        <div class="school-card space-y-1">
          <p class="text-xs uppercase tracking-wide text-ink-gray-5">Attendance</p>
          <p class="text-xl-semibold text-ink-gray-9">
            {{ bundle.stats.attendancePresent }}/{{ bundle.stats.attendanceTotal || '—' }}
          </p>
        </div>
        <div class="school-card space-y-1">
          <p class="text-xs uppercase tracking-wide text-ink-gray-5">Fees due</p>
          <p class="text-xl-semibold text-ink-gray-9">{{ bundle.stats.unpaidFees }}</p>
        </div>
      </div>

      <TabButtons v-model="tab" :options="tabs" />

      <!-- Overview -->
      <section v-if="tab === 'overview'" class="school-section">
        <h2 class="school-section-title">Profile</h2>
        <div
          class="grid gap-0 overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white sm:grid-cols-2"
        >
          <div
            v-for="field in [
              { label: 'ID', value: bundle.student.id },
              { label: 'Class', value: String(bundle.student.className || '—') },
              { label: 'Section', value: String(bundle.student.program || '—') },
              { label: 'Average %', value: String(bundle.student.average ?? '—') },
              { label: 'Email', value: String(bundle.student.email || '—') },
              {
                label: 'Class teacher',
                value: String(bundle.classInfo?.teacher || '—'),
              },
              { label: 'Room', value: String(bundle.classInfo?.room || '—') },
              { label: 'Status', value: String(bundle.student.status || '—') },
            ]"
            :key="field.label"
            class="border-b border-outline-gray-1 px-4 py-3.5 sm:odd:border-e"
          >
            <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
              {{ field.label }}
            </p>
            <p class="mt-1.5 text-sm text-ink-gray-9">{{ field.value }}</p>
          </div>
        </div>

        <div class="grid gap-4 pt-2 lg:grid-cols-2">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm-semibold text-ink-gray-9">Guardians</h3>
              <Button label="View all" @click="tab = 'guardians'" />
            </div>
            <div class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white">
              <div
                v-for="g in bundle.guardians.slice(0, 3)"
                :key="g.id"
                class="flex cursor-pointer items-center justify-between gap-3 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
                @click="openRow('guardians', g)"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm-medium text-ink-gray-9">{{ g.name }}</p>
                  <p class="text-xs text-ink-gray-5">
                    {{ g.relation }} · {{ g.phone }}
                  </p>
                </div>
                <Badge
                  v-if="g.primary === 'Yes'"
                  label="Primary"
                  theme="blue"
                  variant="subtle"
                />
              </div>
              <p
                v-if="!bundle.guardians.length"
                class="px-4 py-8 text-center text-sm text-ink-gray-5"
              >
                No guardians linked.
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm-semibold text-ink-gray-9">Disciplinary cases</h3>
              <Button label="View all" @click="tab = 'discipline'" />
            </div>
            <div class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white">
              <div
                v-for="c in bundle.discipline.slice(0, 3)"
                :key="c.id"
                class="flex cursor-pointer items-start justify-between gap-3 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
                @click="openRow('disciplinary-cases', c)"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm-medium text-ink-gray-9">{{ c.name }}</p>
                  <p class="text-xs text-ink-gray-5">
                    {{ c.severity }} · {{ c.date }}
                  </p>
                </div>
                <Badge
                  :label="String(c.status || '')"
                  :theme="statusTheme(String(c.status))"
                  variant="subtle"
                />
              </div>
              <p
                v-if="!bundle.discipline.length"
                class="px-4 py-8 text-center text-sm text-ink-gray-5"
              >
                No disciplinary cases.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Guardians -->
      <section v-else-if="tab === 'guardians'" class="school-section">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Guardians & contacts</h2>
          <Button
            variant="solid"
            icon-left="lucide-plus"
            label="Add guardian"
            v-if="canCreateGuardian"
            @click="openCreateDialog('guardians')"
          />
        </div>
        <div class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white">
          <div
            v-for="g in bundle.guardians"
            :key="g.id"
            class="grid gap-2 border-b border-outline-gray-1 px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div class="flex min-w-0 items-start gap-3">
              <Avatar :label="g.name" size="md" />
              <div class="min-w-0 space-y-1">
                <p class="text-sm-medium text-ink-gray-9">{{ g.name }}</p>
                <p class="text-xs text-ink-gray-5">
                  {{ g.relation }}
                  <span v-if="g.subtitle"> · {{ g.subtitle }}</span>
                </p>
                <p class="text-sm text-ink-gray-7">{{ g.phone }}</p>
                <p v-if="g.email" class="text-xs text-ink-gray-5">{{ g.email }}</p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Badge
                v-if="g.primary === 'Yes'"
                label="Primary"
                theme="blue"
                variant="subtle"
              />
              <Badge
                :label="String(g.status || '')"
                :theme="statusTheme(String(g.status))"
                variant="subtle"
              />
              <Button
                icon="lucide-eye"
                aria-label="Open"
                @click="openRow('guardians', g)"
              />
              <Button
                icon="lucide-pencil"
                aria-label="Edit"
                @click="openEditDialog('guardians', g)"
              />
            </div>
          </div>
          <p
            v-if="!bundle.guardians.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No guardians linked to this student.
          </p>
        </div>
      </section>

      <!-- Discipline -->
      <section v-else-if="tab === 'discipline'" class="school-section">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Disciplinary cases</h2>
          <Button
            v-if="canCreateCase"
            variant="solid"
            icon-left="lucide-plus"
            label="New case"
            @click="openCreateDialog('disciplinary-cases')"
          />
        </div>
        <div class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white">
          <div
            v-for="c in bundle.discipline"
            :key="c.id"
            class="space-y-2 border-b border-outline-gray-1 px-4 py-4 last:border-b-0"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm-medium text-ink-gray-9">{{ c.name }}</p>
                <p class="text-xs text-ink-gray-5">
                  Opened {{ c.date }} · Reported by {{ c.reportedBy || '—' }}
                </p>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <Badge
                  :label="String(c.severity || '')"
                  :theme="statusTheme(String(c.severity))"
                  variant="subtle"
                />
                <Badge
                  :label="String(c.status || '')"
                  :theme="statusTheme(String(c.status))"
                  variant="subtle"
                />
              </div>
            </div>
            <p class="text-sm text-ink-gray-7">
              Action: {{ c.action || '—' }}
            </p>
            <p v-if="c.subtitle" class="text-xs text-ink-gray-5">{{ c.subtitle }}</p>
            <div class="flex gap-2">
              <Button
                v-if="canPrintDiscipline"
                label="Print notice"
                icon-left="lucide-printer"
                @click="printDoc('disciplinary-notice', 'disciplinary-cases', c)"
              />
              <Button
                label="Open"
                icon-left="lucide-eye"
                @click="openRow('disciplinary-cases', c)"
              />
              <Button
                v-if="canCurrentUser('disciplinary-cases', 'write')"
                label="Edit"
                icon-left="lucide-pencil"
                @click="openEditDialog('disciplinary-cases', c)"
              />
            </div>
          </div>
          <p
            v-if="!bundle.discipline.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            Clean record — no disciplinary cases.
          </p>
        </div>
      </section>

      <!-- Academics -->
      <section v-else-if="tab === 'academics'" class="school-section">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Assessment results</h2>
          <Button
            v-if="canPrint"
            icon-left="lucide-printer"
            label="Report card"
            @click="printReportCard"
          />
        </div>
        <div class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white">
          <div
            v-for="r in bundle.results"
            :key="r.id"
            class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ r.exam }}</p>
              <p class="text-xs text-ink-gray-5">Score {{ r.score }} · {{ r.grade }}</p>
            </div>
            <div class="flex items-center gap-2">
              <Badge
                :label="String(r.status || '')"
                :theme="statusTheme(String(r.status))"
                variant="subtle"
              />
              <Button
                v-if="canPrintResults"
                icon="lucide-printer"
                :tooltip="'Print exam memo'"
                @click="printDoc('exam-memo', 'exam-results', r)"
              />
            </div>
          </div>
          <p
            v-if="!bundle.results.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No assessment results posted yet.
          </p>
        </div>
      </section>

      <!-- Fees -->
      <section v-else-if="tab === 'fees'" class="school-section">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Fee invoices</h2>
          <Button label="All fees" route="/fees" />
        </div>
        <div class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white">
          <div
            v-for="f in bundle.fees"
            :key="f.id"
            class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div
              class="min-w-0 flex-1 cursor-pointer"
              @click="openRow('fees', f)"
            >
              <p class="text-sm-medium text-ink-gray-9">{{ f.invoice }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ f.amount }} · Paid {{ f.paid }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Badge
                :label="String(f.status || '')"
                :theme="statusTheme(String(f.status))"
                variant="subtle"
              />
              <Button
                v-if="canPrintFees"
                icon="lucide-printer"
                :tooltip="'Print invoice'"
                @click="printDoc('invoice', 'fees', f)"
              />
              <Button
                v-if="
                  canPrintFees &&
                  ['Paid', 'Partial'].includes(String(f.status))
                "
                icon="lucide-receipt"
                :tooltip="'Print receipt'"
                @click="printDoc('receipt', 'fees', f)"
              />
            </div>
          </div>
          <p
            v-if="!bundle.fees.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No fee invoices for this student.
          </p>
        </div>
      </section>

      <!-- Attendance -->
      <section v-else-if="tab === 'attendance'" class="school-section">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Attendance</h2>
          <Button label="Attendance list" route="/attendance" />
        </div>
        <div class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white">
          <div
            v-for="a in bundle.attendance"
            :key="a.id"
            class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ a.date }}</p>
              <p class="text-xs text-ink-gray-5">{{ a.className }}</p>
            </div>
            <Badge
              :label="String(a.status || '')"
              :theme="statusTheme(String(a.status))"
              variant="subtle"
            />
          </div>
          <p
            v-if="!bundle.attendance.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No attendance rows for this student.
          </p>
        </div>
      </section>

      <!-- Notes / log -->
      <section v-else class="school-section">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Student log</h2>
          <Button
            v-if="canCurrentUser('student-log', 'create')"
            variant="solid"
            icon-left="lucide-plus"
            label="Add note"
            @click="openCreateDialog('student-log')"
          />
        </div>
        <div class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white">
          <div
            v-for="n in bundle.logs"
            :key="n.id"
            class="flex cursor-pointer flex-wrap items-start justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
            @click="openRow('student-log', n)"
          >
            <div class="min-w-0">
              <p class="text-sm-medium text-ink-gray-9">{{ n.name }}</p>
              <p class="text-xs text-ink-gray-5">{{ n.type }} · {{ n.date }}</p>
            </div>
            <Badge
              :label="String(n.status || '')"
              :theme="statusTheme(String(n.status))"
              variant="subtle"
            />
          </div>
          <p
            v-if="!bundle.logs.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No log entries yet.
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
