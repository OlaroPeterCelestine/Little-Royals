<script setup lang="ts">
import { computed } from 'vue'
import {
  Badge,
  Button,
  PageHeader,
  PageHeaderTitle,
} from 'frappe-ui'
import { BarChart, DonutChart, NumberCard } from 'frappe-ui/charts'
import { CircleCheckIcon } from 'frappe-ui/icons'
import {
  pendingApplicantCount,
  schoolStore,
  unpaidFeeCount,
} from '../data/store'
import {
  attendanceBreakdown,
  enrollmentByGrade,
} from '../data/school'
import { schoolSetup } from '../data/schoolSetup'
import { exportDashboardCsv } from '../composables/useAppActions'
import { openCreateDialog } from '../composables/useModuleForms'
import { canCurrentUser } from '../data/permissions'
import SchoolLogo from '../components/SchoolLogo.vue'

const canAddStudent = computed(() => canCurrentUser('students', 'create'))
const canExportDash = computed(() => canCurrentUser('students', 'export'))

const studentCount = computed(() => schoolStore.students.rows.length)
const activeStudents = computed(
  () =>
    schoolStore.students.rows.filter((r) => r.status === 'Active').length,
)
const teacherCount = computed(() => schoolStore.teachers.rows.length)
const activeTeachers = computed(
  () =>
    schoolStore.teachers.rows.filter((r) => r.status === 'Active').length,
)
const nurseryCount = computed(
  () =>
    schoolStore.students.rows.filter((r) => r.program === 'Nursery').length,
)
const primaryCount = computed(
  () =>
    schoolStore.students.rows.filter((r) => r.program === 'Primary').length,
)
const presentToday = computed(
  () =>
    schoolStore.attendance.rows.filter((r) => r.status === 'Present').length,
)
const attendancePct = computed(() =>
  Math.round(
    (presentToday.value /
      Math.max(schoolStore.attendance.rows.length, 1)) *
      100,
  ),
)

const quickLinks = computed(() => [
  {
    label: 'Students',
    description: `${activeStudents.value} active learners`,
    route: '/students',
    icon: 'lucide-graduation-cap',
  },
  {
    label: 'Payment',
    description:
      unpaidFeeCount.value > 0
        ? `${unpaidFeeCount.value} invoices open · MoMo desk`
        : 'Collections clear',
    route: '/payment',
    icon: 'lucide-wallet',
  },
  {
    label: 'Fees',
    description:
      unpaidFeeCount.value > 0
        ? `${unpaidFeeCount.value} need attention`
        : 'All clear',
    route: '/fees',
    icon: 'lucide-receipt',
  },
  {
    label: 'Attendance',
    description: `${attendancePct.value}% present today`,
    route: '/attendance',
    icon: 'lucide-clipboard-check',
  },
  {
    label: 'Admissions',
    description:
      pendingApplicantCount.value > 0
        ? `${pendingApplicantCount.value} pending review`
        : 'No pending applications',
    route: '/applicants',
    icon: 'lucide-user-plus',
  },
])
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Dashboard" />
    <div class="flex items-center gap-2">
      <Button
        v-if="canExportDash"
        icon-left="lucide-download"
        label="Export"
        @click="exportDashboardCsv()"
      />
      <Button
        v-if="canAddStudent"
        variant="solid"
        icon-left="lucide-plus"
        label="Add student"
        @click="openCreateDialog('students')"
      />
    </div>
  </PageHeader>

  <div class="school-page school-page--workspace">
    <section class="school-hero">
      <div class="flex items-start gap-4">
        <div
          class="school-brand-mark flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full"
        >
          <SchoolLogo size="lg" />
        </div>
        <div class="space-y-2">
          <p
            class="text-xs font-medium uppercase tracking-wide"
            style="color: var(--school-blue)"
          >
            {{ schoolSetup.name }} · {{ schoolSetup.city }}
          </p>
          <h1 class="text-2xl-semibold text-ink-gray-9">
            Education Dashboard
          </h1>
          <p class="max-w-xl text-p-base text-ink-gray-6">
            {{ schoolSetup.motto }} — enrollment, attendance, and fees ·
            {{ schoolSetup.currentTerm }} {{ schoolSetup.academicYear }}.
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2.5">
        <Badge
          :label="`${schoolSetup.currentTerm} ${schoolSetup.academicYear}`"
          theme="blue"
          variant="subtle"
        />
        <Badge label="NCDC / UNEB" theme="red" variant="subtle" />
        <Badge
          :label="`${nurseryCount} nursery · ${primaryCount} primary`"
          theme="gray"
          variant="subtle"
        />
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Key figures</h2>
      <div class="school-card-grid sm:grid-cols-2 lg:grid-cols-4">
        <NumberCard
          title="Students enrolled"
          :value="studentCount"
          :delta="activeStudents"
          delta-caption="active"
          :sparkline="{
            data: [6, 7, 8, 9, 10, studentCount],
            type: 'area',
          }"
        />
        <NumberCard
          title="Teachers"
          :value="teacherCount"
          :delta="activeTeachers"
          delta-caption="active"
          :sparkline="{
            data: [3, 4, 5, 5, 6, teacherCount],
            type: 'bar',
          }"
        />
        <NumberCard
          title="Attendance today"
          :value="attendancePct"
          suffix="%"
          :delta="presentToday"
          delta-caption="present now"
        />
        <NumberCard
          title="Fees outstanding"
          :value="unpaidFeeCount"
          :delta="-2"
          delta-caption="cleared today"
          negative-is-better
        >
          <template #title-suffix>
            <CircleCheckIcon class="size-3.5 text-ink-green-5" />
          </template>
        </NumberCard>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Charts</h2>
      <div class="school-card-grid lg:grid-cols-2">
        <div class="school-chart-card">
          <BarChart
            title="Enrollment by class"
            subtitle="Nursery + Primary · Term III"
            :data="enrollmentByGrade"
            x="grade"
            y="students"
            class="min-h-[280px]"
          />
        </div>
        <div class="school-chart-card">
          <DonutChart
            title="Attendance today"
            subtitle="Baby Class–P.7"
            :data="attendanceBreakdown"
            category="status"
            value="count"
            center-label="Pupils"
            class="min-h-[280px]"
          />
        </div>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Jump to</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RouterLink
          v-for="link in quickLinks"
          :key="link.route"
          :to="link.route"
          class="flex flex-col gap-3 rounded-6 border border-outline-gray-1 bg-surface-white p-5 transition hover:border-outline-gray-3 hover:bg-surface-gray-1"
        >
          <span
            class="flex size-10 items-center justify-center rounded-5 bg-surface-gray-2 text-ink-gray-7"
            aria-hidden="true"
          >
            <span :class="[link.icon, 'size-5']" />
          </span>
          <div class="space-y-1">
            <p class="text-sm-semibold text-ink-gray-9">{{ link.label }}</p>
            <p class="text-sm text-ink-gray-6">{{ link.description }}</p>
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
