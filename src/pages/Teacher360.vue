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
import { getTeacher360, teacherAge } from '../data/teacher360'
import { deleteRecords } from '../data/store'
import { openCreateDialog } from '../composables/useModuleForms'
import { printRecordDocument } from '../data/documents'
import type { CatalogRow } from '../data/catalog'
import { useModuleAccess } from '../composables/useModuleAccess'
import { canCurrentUser } from '../data/permissions'

const route = useRoute()
const router = useRouter()
const tab = ref('profile')
const { canWrite, canDelete } = useModuleAccess('teachers')
const canCreateCase = computed(() =>
  canCurrentUser('disciplinary-cases', 'create'),
)
const canPrintDiscipline = computed(() =>
  canCurrentUser('disciplinary-cases', 'print'),
)

const teacherId = computed(() => String(route.params.id || ''))
const bundle = computed(() => getTeacher360(teacherId.value))
const teacher = computed(() => bundle.value?.teacher)

const tabs = [
  { label: 'Profile', value: 'profile' },
  { label: 'Employment', value: 'employment' },
  { label: 'Teaching', value: 'teaching' },
  { label: 'Leave & attendance', value: 'leave' },
  { label: 'Discipline', value: 'discipline' },
  { label: 'Classes', value: 'classes' },
  { label: 'Students', value: 'students' },
]

function field(key: string, fallback = '—') {
  const v = teacher.value?.[key]
  if (v === undefined || v === null || v === '') return fallback
  return String(v)
}

function goBack() {
  router.push('/teachers')
}

function editTeacher() {
  if (!teacher.value) return
  router.push(`/teachers/${teacher.value.id}/edit`)
}

function confirmDelete() {
  const row = teacher.value
  if (!row) return
  dialog.danger({
    title: 'Delete teacher?',
    message: `You are about to permanently delete “${row.name}” (${row.id}). Disciplinary cases they reported stay in the list.\n\nThis cannot be undone.`,
    confirmLabel: 'Yes, delete forever',
    cancelLabel: 'Keep teacher',
    onConfirm: async () => {
      deleteRecords('teachers', [row.id])
      toast.warning(`Teacher “${row.name}” deleted`)
      await router.push('/teachers')
    },
  })
}

function openRow(moduleKey: string, row: CatalogRow) {
  router.push(`/${moduleKey}/${row.id}`)
}

function printCase(row: CatalogRow) {
  if (!canCurrentUser('disciplinary-cases', 'print')) {
    toast.error('Your role cannot print disciplinary notices')
    return
  }
  try {
    printRecordDocument('disciplinary-notice', 'disciplinary-cases', row)
    toast.success('Disciplinary notice ready to print')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function statusTheme(status?: string) {
  const s = String(status || '').toLowerCase()
  if (['active', 'closed', 'present'].some((x) => s.includes(x))) return 'green'
  if (['open', 'high', 'overdue'].some((x) => s.includes(x))) return 'red'
  if (['monitoring', 'medium', 'leave'].some((x) => s.includes(x))) return 'amber'
  return 'blue'
}

const personalFields = computed(() => [
  { label: 'Staff number', value: field('employeeNumber', field('id')) },
  { label: 'Gender', value: field('gender') },
  { label: 'Date of birth', value: field('dateOfBirth') },
  { label: 'Age', value: teacherAge(teacher.value?.dateOfBirth) },
  { label: 'Nationality', value: field('nationality') },
  { label: 'National ID / NIN', value: field('nationalId') },
  { label: 'Marital status', value: field('maritalStatus') },
  { label: 'Languages', value: field('languages') },
  { label: 'Address', value: field('address') },
])

const contactFields = computed(() => [
  { label: 'Phone', value: field('phone') },
  { label: 'Alternative phone', value: field('altPhone') },
  { label: 'Email', value: field('email') },
  { label: 'Emergency contact', value: field('emergencyContact') },
])

const employmentFields = computed(() => [
  { label: 'Job title', value: field('jobTitle', field('subtitle')) },
  { label: 'Section', value: field('department') },
  { label: 'Main subject', value: field('subject') },
  { label: 'Employment type', value: field('employmentType') },
  { label: 'Start date', value: field('startDate') },
  { label: 'Years of experience', value: field('yearsExperience') },
  { label: 'Highest qualification', value: field('qualification') },
  {
    label: 'Additional qualifications',
    value: field('additionalQualifications'),
  },
  { label: 'Status', value: field('status') },
])

const healthFields = computed(() => [
  { label: 'Blood group', value: field('bloodGroup') },
  { label: 'Medical alerts', value: field('medicalAlerts') },
])
</script>

<template>
  <PageHeader>
    <PageHeaderTitle :title="teacher?.name || 'Teacher'" />
    <div class="flex flex-wrap items-center gap-2">
      <Button icon-left="lucide-arrow-left" label="Back" @click="goBack" />
      <template v-if="bundle">
        <Button
          v-if="canWrite"
          icon-left="lucide-pencil"
          label="Edit biodata"
          @click="editTeacher"
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
      <p class="text-sm">Teacher not found.</p>
      <Button class="mt-4" label="Back to teachers" @click="goBack" />
    </div>

    <template v-else>
      <section
        class="flex flex-wrap items-start justify-between gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
      >
        <div class="flex min-w-0 items-start gap-4">
          <Avatar :label="teacher!.name" size="xl" />
          <div class="min-w-0 space-y-1.5">
            <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
              Teacher · {{ field('employeeNumber', teacher!.id) }}
            </p>
            <h1 class="text-2xl-semibold text-ink-gray-9">
              {{ teacher!.name }}
            </h1>
            <p class="text-p-base text-ink-gray-6">
              {{ field('jobTitle', field('subtitle', 'Teacher')) }} ·
              {{ field('subject') }} · {{ field('department') }}
            </p>
            <p v-if="teacher!.bio" class="max-w-2xl text-sm text-ink-gray-6">
              {{ teacher!.bio }}
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              <Badge
                v-if="teacher!.status"
                :label="String(teacher!.status)"
                :theme="statusTheme(String(teacher!.status))"
                variant="subtle"
              />
              <Badge
                :label="`${bundle.stats.openCases} open cases`"
                :theme="bundle.stats.openCases ? 'amber' : 'green'"
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </section>

      <div class="grid gap-3 sm:grid-cols-4">
        <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
          <p class="text-xs text-ink-gray-5">Classes</p>
          <p class="text-xl font-semibold text-ink-gray-9">
            {{ bundle.stats.classCount }}
          </p>
        </div>
        <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
          <p class="text-xs text-ink-gray-5">Pupils</p>
          <p class="text-xl font-semibold text-ink-gray-9">
            {{ bundle.stats.studentCount }}
          </p>
        </div>
        <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
          <p class="text-xs text-ink-gray-5">Experience</p>
          <p class="text-xl font-semibold text-ink-gray-9">
            {{ field('yearsExperience', '—') }}
            <span class="text-sm font-normal text-ink-gray-5">yrs</span>
          </p>
        </div>
        <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
          <p class="text-xs text-ink-gray-5">Leave records</p>
          <p class="text-xl font-semibold text-ink-gray-9">
            {{ bundle.stats.leaveCount }}
          </p>
        </div>
      </div>

      <TabButtons v-model="tab" :options="tabs" />

      <section v-if="tab === 'profile'" class="space-y-4">
        <div class="school-section">
          <h2 class="school-section-title">Personal biodata</h2>
          <dl class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in personalFields"
              :key="item.label"
              class="rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
            >
              <dt class="text-xs text-ink-gray-5">{{ item.label }}</dt>
              <dd class="mt-1 text-sm text-ink-gray-9">{{ item.value }}</dd>
            </div>
          </dl>
        </div>
        <div class="school-section">
          <h2 class="school-section-title">Contact</h2>
          <dl class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in contactFields"
              :key="item.label"
              class="rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
            >
              <dt class="text-xs text-ink-gray-5">{{ item.label }}</dt>
              <dd class="mt-1 text-sm text-ink-gray-9">{{ item.value }}</dd>
            </div>
          </dl>
        </div>
        <div class="school-section">
          <h2 class="school-section-title">Health</h2>
          <dl class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in healthFields"
              :key="item.label"
              class="rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
            >
              <dt class="text-xs text-ink-gray-5">{{ item.label }}</dt>
              <dd class="mt-1 text-sm text-ink-gray-9">{{ item.value }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section v-else-if="tab === 'employment'" class="school-section">
        <h2 class="school-section-title">Employment record</h2>
        <dl class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="item in employmentFields"
            :key="item.label"
            class="rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
          >
            <dt class="text-xs text-ink-gray-5">{{ item.label }}</dt>
            <dd class="mt-1 whitespace-pre-wrap text-sm text-ink-gray-9">
              {{ item.value }}
            </dd>
          </div>
        </dl>
      </section>

      <section v-else-if="tab === 'teaching'" class="school-section">
        <h2 class="school-section-title">Timetable / teaching slots</h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="slot in bundle.timetable"
            :key="slot.id"
            class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ slot.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ slot.day || '—' }} · {{ slot.group || slot.className || '—' }} ·
                {{ slot.course || slot.subject || '—' }}
              </p>
            </div>
            <Badge
              :label="String(slot.status || 'Active')"
              theme="blue"
              variant="subtle"
            />
          </div>
          <p
            v-if="!bundle.timetable.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No timetable rows linked yet. Teaching load:
            {{ field('classes') }} classes · {{ field('subject') }}.
          </p>
        </div>
      </section>

      <section v-else-if="tab === 'leave'" class="space-y-4">
        <div class="school-section">
          <h2 class="school-section-title">Leave applications</h2>
          <div
            class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
          >
            <div
              v-for="row in bundle.leave"
              :key="row.id"
              class="flex cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
              @click="openRow('staff-leave', row)"
            >
              <div>
                <p class="text-sm-medium text-ink-gray-9">{{ row.name }}</p>
                <p class="text-xs text-ink-gray-5">
                  {{ row.leaveType || 'Leave' }} · {{ row.fromDate || '—' }} →
                  {{ row.toDate || '—' }}
                </p>
              </div>
              <Badge
                :label="String(row.status || '')"
                :theme="statusTheme(String(row.status))"
                variant="subtle"
              />
            </div>
            <p
              v-if="!bundle.leave.length"
              class="px-4 py-12 text-center text-sm text-ink-gray-5"
            >
              No leave records linked to this teacher.
            </p>
          </div>
        </div>
        <div class="school-section">
          <h2 class="school-section-title">Staff attendance</h2>
          <div
            class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
          >
            <div
              v-for="row in bundle.attendance"
              :key="row.id"
              class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
            >
              <div>
                <p class="text-sm-medium text-ink-gray-9">{{ row.name }}</p>
                <p class="text-xs text-ink-gray-5">
                  {{ row.date || '—' }} · {{ row.timeIn || row.arrival || '—' }}
                </p>
              </div>
              <Badge
                :label="String(row.status || '')"
                :theme="statusTheme(String(row.status))"
                variant="subtle"
              />
            </div>
            <p
              v-if="!bundle.attendance.length"
              class="px-4 py-12 text-center text-sm text-ink-gray-5"
            >
              No staff attendance rows linked yet.
            </p>
          </div>
        </div>
      </section>

      <section v-else-if="tab === 'discipline'" class="school-section">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Cases reported</h2>
          <Button
            v-if="canCreateCase"
            variant="solid"
            icon-left="lucide-plus"
            label="New case"
            @click="openCreateDialog('disciplinary-cases')"
          />
        </div>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="c in bundle.discipline"
            :key="c.id"
            class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div
              class="min-w-0 flex-1 cursor-pointer"
              @click="openRow('disciplinary-cases', c)"
            >
              <p class="text-sm-medium text-ink-gray-9">{{ c.name }}</p>
              <p class="text-xs text-ink-gray-5">
                Student: {{ c.student }} · {{ c.action || c.severity || '—' }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Badge
                :label="String(c.status || '')"
                :theme="statusTheme(String(c.status))"
                variant="subtle"
              />
              <Button
                v-if="canPrintDiscipline"
                icon="lucide-printer"
                :tooltip="'Print notice'"
                @click="printCase(c)"
              />
            </div>
          </div>
          <p
            v-if="!bundle.discipline.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            This teacher has not reported any cases yet.
          </p>
        </div>
      </section>

      <section v-else-if="tab === 'classes'" class="school-section">
        <h2 class="school-section-title">Classes</h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="c in bundle.classes"
            :key="c.id"
            class="flex cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
            @click="openRow('classes', c)"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ c.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ c.room || '—' }} · {{ c.students || 0 }} pupils
              </p>
            </div>
            <Badge
              :label="String(c.status || 'Active')"
              theme="green"
              variant="subtle"
            />
          </div>
          <p
            v-if="!bundle.classes.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No class rows linked by teacher name. Subject load:
            {{ field('classes') }} classes.
          </p>
        </div>
      </section>

      <section v-else class="school-section">
        <h2 class="school-section-title">Students in linked classes</h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="s in bundle.students"
            :key="s.id"
            class="flex cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
            @click="openRow('students', s)"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ s.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ s.className }} · {{ s.program }}
              </p>
            </div>
            <Badge
              :label="String(s.status || '')"
              :theme="statusTheme(String(s.status))"
              variant="subtle"
            />
          </div>
          <p
            v-if="!bundle.students.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No students matched to this teacher’s classes.
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
