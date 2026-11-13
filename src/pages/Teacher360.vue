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
import { getTeacher360 } from '../data/teacher360'
import { deleteRecords } from '../data/store'
import { openEditDialog, openCreateDialog } from '../composables/useModuleForms'
import { printRecordDocument } from '../data/documents'
import type { CatalogRow } from '../data/catalog'
import { useModuleAccess } from '../composables/useModuleAccess'
import { canCurrentUser } from '../data/permissions'

const route = useRoute()
const router = useRouter()
const tab = ref('overview')
const { canWrite, canDelete } = useModuleAccess('teachers')
const canCreateCase = computed(() =>
  canCurrentUser('disciplinary-cases', 'create'),
)
const canPrintDiscipline = computed(() =>
  canCurrentUser('disciplinary-cases', 'print'),
)

const teacherId = computed(() => String(route.params.id || ''))
const bundle = computed(() => getTeacher360(teacherId.value))

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Discipline', value: 'discipline' },
  { label: 'Classes', value: 'classes' },
  { label: 'Students', value: 'students' },
]

function goBack() {
  router.push('/teachers')
}

function editTeacher() {
  if (!bundle.value) return
  openEditDialog('teachers', bundle.value.teacher)
}

function confirmDelete() {
  const teacher = bundle.value?.teacher
  if (!teacher) return
  dialog.danger({
    title: 'Delete teacher?',
    message: `You are about to permanently delete “${teacher.name}” (${teacher.id}). Disciplinary cases they reported stay in the list.\n\nThis cannot be undone.`,
    confirmLabel: 'Yes, delete forever',
    cancelLabel: 'Keep teacher',
    onConfirm: async () => {
      deleteRecords('teachers', [teacher.id])
      toast.warning(`Teacher “${teacher.name}” deleted`)
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
</script>

<template>
  <PageHeader>
    <PageHeaderTitle :title="bundle?.teacher.name || 'Teacher'" />
    <div class="flex flex-wrap items-center gap-2">
      <Button icon-left="lucide-arrow-left" label="Back" @click="goBack" />
      <template v-if="bundle">
        <Button
          v-if="canWrite"
          icon-left="lucide-pencil"
          label="Edit"
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
          <Avatar :label="bundle.teacher.name" size="xl" />
          <div class="min-w-0 space-y-1.5">
            <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
              Teacher · {{ bundle.teacher.id }}
            </p>
            <h1 class="text-2xl-semibold text-ink-gray-9">
              {{ bundle.teacher.name }}
            </h1>
            <p class="text-p-base text-ink-gray-6">
              {{ bundle.teacher.subject }} · {{ bundle.teacher.department }}
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              <Badge
                v-if="bundle.teacher.status"
                :label="String(bundle.teacher.status)"
                :theme="statusTheme(String(bundle.teacher.status))"
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
          <p class="text-xs text-ink-gray-5">Open discipline</p>
          <p class="text-xl font-semibold text-ink-gray-9">
            {{ bundle.stats.openCases }}
          </p>
        </div>
        <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
          <p class="text-xs text-ink-gray-5">Closed cases</p>
          <p class="text-xl font-semibold text-ink-gray-9">
            {{ bundle.stats.closedCases }}
          </p>
        </div>
      </div>

      <TabButtons v-model="tab" :options="tabs" />

      <section v-if="tab === 'overview'" class="school-section">
        <h2 class="school-section-title">Recent disciplinary cases reported</h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="c in bundle.discipline.slice(0, 5)"
            :key="c.id"
            class="flex cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
            @click="openRow('disciplinary-cases', c)"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ c.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ c.student }} · {{ c.date }} · {{ c.severity }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Badge
                :label="String(c.status || '')"
                :theme="statusTheme(String(c.status))"
                variant="subtle"
              />
              <Button
                v-if="canPrintDiscipline"
                icon="lucide-printer"
                :tooltip="'Print notice'"
                @click.stop="printCase(c)"
              />
            </div>
          </div>
          <p
            v-if="!bundle.discipline.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No disciplinary cases reported by this teacher.
          </p>
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
                Student: {{ c.student }} · {{ c.action }}
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
              <Button
                v-if="canCurrentUser('disciplinary-cases', 'write')"
                icon="lucide-pencil"
                @click="openEditDialog('disciplinary-cases', c)"
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
            {{ bundle.teacher.classes }} classes.
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
