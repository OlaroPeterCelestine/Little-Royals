<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Alert,
  Badge,
  PageHeader,
  PageHeaderTitle,
} from 'frappe-ui'
import {
  pendingApplicantCount,
  schoolStore,
  unpaidFeeCount,
} from '@/data/catalog/store'
import {
  attendanceBreakdown,
  enrollmentByGrade,
} from '@/data/school/school'
import { schoolSetup } from '@/data/school/schoolSetup'
import { currentUser } from '@/data/activity/activity'
import {
  canAccessModule,
  filterRoutesByPermissions,
} from '@/lib/accessControl'
import {
  DESK_HYDRATE_PRIORITY,
  ensureModule,
} from '@/data/catalog/catalogSync'
import { isApiEnabled } from '@/lib/apiMode'
import SchoolLogo from '@/components/layout/SchoolLogo.vue'
import ListStatCards from '@/components/list/ListStatCards.vue'

const route = useRoute()
const accessDenied = computed(() => String(route.query.denied || '') === '1')

onMounted(() => {
  if (!isApiEnabled()) return
  // Force the figures the dashboard paints from — don't wait on the full catalog.
  for (const mod of DESK_HYDRATE_PRIORITY) {
    void ensureModule(mod, { force: true })
  }
})

const BarChart = defineAsyncComponent(() =>
  import('frappe-ui/charts').then((m) => m.BarChart),
)
const DonutChart = defineAsyncComponent(() =>
  import('frappe-ui/charts').then((m) => m.DonutChart),
)

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

const keyStats = computed(() => {
  void currentUser.role
  const stats = []
  if (canAccessModule('students', 'read')) {
    stats.push({
      title: 'Students enrolled',
      value: studentCount.value,
      caption: `${activeStudents.value} active`,
    })
  }
  if (canAccessModule('teachers', 'read')) {
    stats.push({
      title: 'Teachers',
      value: teacherCount.value,
      caption: `${activeTeachers.value} active`,
    })
  }
  if (canAccessModule('attendance', 'read')) {
    stats.push({
      title: 'Attendance today',
      value: attendancePct.value,
      caption: `${presentToday.value} present · %`,
    })
  }
  if (canAccessModule('fees', 'read')) {
    stats.push({
      title: 'Fees outstanding',
      value: unpaidFeeCount.value,
      caption: 'open invoices',
    })
  }
  return stats
})

const quickLinks = computed(() => {
  void currentUser.role
  return filterRoutesByPermissions([
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
      route: '/admissions?tab=applications',
      icon: 'lucide-user-plus',
    },
  ])
})

</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Dashboard" />
  </PageHeader>

  <div class="school-page school-page--workspace">
    <Alert
      v-if="accessDenied"
      theme="amber"
      title="Access restricted"
      description="Your role does not have permission to open that page. Sidebar and actions only show what you can use."
      icon="lucide-shield-alert"
      class="mb-4"
    />

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
            School dashboard
          </h1>
          <p class="max-w-2xl text-p-base text-ink-gray-6 2xl:max-w-3xl">
            {{ schoolSetup.motto }} — Baby Class to P.7 nursery &amp; primary
            desk · enrollment, attendance, fees ·
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

    <section v-if="keyStats.length" class="school-section">
      <h2 class="school-section-title">Key figures</h2>
      <ListStatCards :stats="keyStats" />
    </section>

    <section
      v-if="
        canAccessModule('students', 'read') ||
        canAccessModule('attendance', 'read')
      "
      class="school-section"
    >
      <h2 class="school-section-title">Charts</h2>
      <div class="school-card-grid lg:grid-cols-2">
        <div v-if="canAccessModule('students', 'read')" class="school-chart-card">
          <BarChart
            title="Enrollment by class"
            subtitle="Nursery + Primary · Term III"
            :data="enrollmentByGrade"
            x="grade"
            y="students"
            class="min-h-[280px]"
          />
        </div>
        <div
          v-if="canAccessModule('attendance', 'read')"
          class="school-chart-card"
        >
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

    <section v-if="quickLinks.length" class="school-section">
      <h2 class="school-section-title">Jump to</h2>
      <div class="school-tile-grid">
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
