<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ensureModule } from '@/data/catalog/catalogSync'
import { isApiEnabled } from '@/lib/apiMode'
import {
  Badge,
  Button,
  PageHeader,
  TabButtons,
  dialog,
  toast,
} from 'frappe-ui'
import PersonPhotoUpload from '@/components/common/PersonPhotoUpload.vue'
import { getStaff360 } from '@/data/people/staff360'
import {
  employeeContactFields,
  employeeEmploymentFields,
  employeeHealthFields,
  employeePersonalFields,
  fieldOf,
} from '@/data/students/biodata'
import { deleteRecords } from '@/data/catalog/store'
import { useModuleAccess } from '@/composables/useModuleAccess'
import type { CatalogRow } from '@/data/catalog/catalog'
import {
  personDetailPath,
  personEditPath,
  personListPath,
} from '@/lib/personRoutes'
import AppBackButton from '@/components/layout/AppBackButton.vue'
import { pushWithReturn, useAppBack } from '@/composables/useAppBack'

const route = useRoute()
const router = useRouter()
const tab = ref('biodata')
const { canWrite, canDelete } = useModuleAccess('staff')

const staffId = computed(() => String(route.params.id || ''))
const bundle = computed(() => getStaff360(staffId.value))
const staff = computed(() => bundle.value?.staff)
const { goBack } = useAppBack(() => personListPath('staff'))

onMounted(() => {
  if (!isApiEnabled()) return
  for (const mod of [
    'staff',
    'staff-leave',
    'staff-attendance',
    'payroll',
  ] as const) {
    void ensureModule(mod, { force: true })
  }
})

const tabs = [
  { label: 'Biodata', value: 'biodata' },
  { label: 'Employment', value: 'employment' },
  { label: 'Leave & attendance', value: 'leave' },
  { label: 'Payroll', value: 'payroll' },
]

const personalFields = computed(() =>
  staff.value ? employeePersonalFields(staff.value) : [],
)
const contactFields = computed(() =>
  staff.value ? employeeContactFields(staff.value) : [],
)
const employmentFields = computed(() =>
  staff.value ? employeeEmploymentFields(staff.value) : [],
)
const healthFields = computed(() =>
  staff.value ? employeeHealthFields(staff.value) : [],
)


function editStaff() {
  if (!staff.value) return
  pushWithReturn(router, personEditPath('staff', staff.value.id))
}

function confirmDelete() {
  const row = staff.value
  if (!row) return
  dialog.danger({
    title: '⚠️ Delete staff member?',
    message: `Warning: you are about to permanently delete “${row.name}” (${row.id}).\n\nThis cannot be undone.`,
    confirmLabel: 'Yes, delete forever',
    cancelLabel: 'Keep staff',
    onConfirm: async () => {
      await deleteRecords('staff', [row.id])
      toast.warning(`Staff “${row.name}” deleted`)
      await router.push(personListPath('staff'))
    },
  })
}

function openRow(moduleKey: string, row: CatalogRow) {
  pushWithReturn(router, `/${moduleKey}/${row.id}`)
}

function openTeacher() {
  const t = bundle.value?.linkedTeacher
  if (t) pushWithReturn(router, personDetailPath('teachers', t.id))
}

function statusTheme(status?: string) {
  const s = String(status || '').toLowerCase()
  if (['active', 'closed', 'present', 'paid'].some((x) => s.includes(x)))
    return 'green'
  if (['open', 'high', 'overdue'].some((x) => s.includes(x))) return 'red'
  if (['monitoring', 'medium', 'leave'].some((x) => s.includes(x)))
    return 'amber'
  return 'blue'
}
</script>

<template>
  <PageHeader class="school-detail-header">
    <AppBackButton fallback="/people?tab=staff" />
  </PageHeader>

  <div class="school-page max-w-5xl">
    <div
      v-if="!bundle"
      class="rounded-6 border border-outline-gray-1 px-4 py-16 text-center text-ink-gray-5"
    >
      <p class="text-sm">Staff member not found.</p>
      <Button class="mt-4" label="Back to staff" @click="goBack" />
    </div>

    <template v-else>
      <div class="school-page-toolbar">
        <div class="school-page-toolbar__grow" />
        <Button
          v-if="canWrite"
          icon-left="lucide-pencil"
          label="Edit"
          @click="editStaff"
        />
        <Button
          v-if="canDelete"
          icon-left="lucide-trash-2"
          label="Delete"
          theme="red"
          @click="confirmDelete"
        />
      </div>

      <section
        class="flex flex-wrap items-start justify-between gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
      >
        <div class="flex min-w-0 items-start gap-4">
          <PersonPhotoUpload
            :person="staff"
            module-key="staff"
            folder="Photos/staff"
            size="xl"
            :can-edit="canWrite"
            class="school-person-avatar--hero"
          />
          <div class="min-w-0 space-y-1.5">
            <p
              class="text-xs font-medium uppercase tracking-wide text-ink-gray-5"
            >
              Employee biodata ·
              {{ fieldOf(staff, 'employeeNumber', staff!.id) }}
            </p>
            <h1 class="text-2xl-semibold text-ink-gray-9">
              {{ staff!.name }}
            </h1>
            <p class="text-p-base text-ink-gray-6">
              {{ fieldOf(staff, 'jobTitle') }} ·
              {{ fieldOf(staff, 'department') }}
            </p>
            <p v-if="staff!.bio" class="max-w-2xl text-sm text-ink-gray-6">
              {{ staff!.bio }}
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              <Badge
                v-if="staff!.status"
                :label="String(staff!.status)"
                :theme="statusTheme(String(staff!.status))"
                variant="subtle"
              />
              <Badge
                v-if="bundle.linkedTeacher"
                label="Also on teachers list"
                theme="blue"
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </section>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
          <p class="text-xs text-ink-gray-5">Leave records</p>
          <p class="text-xl font-semibold text-ink-gray-9">
            {{ bundle.stats.leaveCount }}
          </p>
        </div>
        <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
          <p class="text-xs text-ink-gray-5">Attendance</p>
          <p class="text-xl font-semibold text-ink-gray-9">
            {{ bundle.stats.attendancePresent }}/{{
              bundle.stats.attendanceTotal || '—'
            }}
          </p>
        </div>
        <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
          <p class="text-xs text-ink-gray-5">Payroll rows</p>
          <p class="text-xl font-semibold text-ink-gray-9">
            {{ bundle.stats.payrollRows }}
          </p>
        </div>
      </div>

      <TabButtons v-model="tab" :options="tabs" />

      <section v-if="tab === 'biodata'" class="space-y-4">
        <div class="school-page-toolbar" v-if="bundle.linkedTeacher">
          <div class="school-page-toolbar__grow" />
          <Button
            icon-left="lucide-graduation-cap"
            label="Open teacher 360"
            @click="openTeacher"
          />
        </div>
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
              No leave records linked to this employee.
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

      <section v-else class="school-section">
        <h2 class="school-section-title">Payroll</h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="row in bundle.payroll"
            :key="row.id"
            class="flex cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
            @click="openRow('payroll', row)"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ row.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ row.period || row.month || '—' }} ·
                {{ row.net || row.amount || '—' }}
              </p>
            </div>
            <Badge
              :label="String(row.status || '')"
              :theme="statusTheme(String(row.status))"
              variant="subtle"
            />
          </div>
          <p
            v-if="!bundle.payroll.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No payroll rows linked to this employee yet.
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
