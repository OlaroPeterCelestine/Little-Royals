<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
  toast,
} from 'frappe-ui'
import { gradeSelectOptions } from '../data/grades'
import { addRecord, getLiveModule } from '../data/store'
import CatalogTabDesk from '../components/CatalogTabDesk.vue'

const router = useRouter()
const route = useRoute()

type AttTab = 'registers' | 'take' | 'early' | 'staff'

function parseTab(raw: unknown): AttTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'take' || v === 'mark') return 'take'
  if (v === 'early' || v === 'early-departures') return 'early'
  if (v === 'staff' || v === 'staff-attendance') return 'staff'
  return 'registers'
}

const tab = ref<AttTab>(parseTab(route.query.tab))
const tabs = [
  { label: 'Registers', value: 'registers' },
  { label: 'Take attendance', value: 'take' },
  { label: 'Early departures', value: 'early' },
  { label: 'Staff attendance', value: 'staff' },
]

watch(tab, (value) => {
  router.replace({ path: '/attendance', query: { ...route.query, tab: value } })
})
watch(
  () => route.query.tab,
  (value) => {
    const next = parseTab(value)
    if (tab.value !== next) tab.value = next
  },
)

const registerTabs = [
  { label: 'Registers', value: 'registers', module: 'attendance' },
]
const earlyTabs = [
  {
    label: 'Early departures',
    value: 'early',
    module: 'early-departures',
  },
]
const staffTabs = [
  {
    label: 'Staff attendance',
    value: 'staff',
    module: 'staff-attendance',
  },
]

const students = computed(() => getLiveModule('students')?.rows || [])
const form = reactive({
  date: new Date().toISOString().slice(0, 10),
  className: gradeSelectOptions[3]?.value || 'P.1',
  stream: '',
  session: 'Morning',
})
const statuses = reactive<Record<string, string>>({})
const remarks = reactive<Record<string, string>>({})
const saving = ref(false)

const classLearners = computed(() =>
  students.value.filter((s) => String(s.className || '') === form.className),
)

watch(
  classLearners,
  (list) => {
    for (const learner of list) {
      if (!statuses[learner.id]) statuses[learner.id] = 'Present'
    }
  },
  { immediate: true },
)

const statusOptions = ['Present', 'Absent', 'Late', 'Excused'].map((v) => ({
  label: v,
  value: v,
}))
const sessionOptions = ['Morning', 'Afternoon', 'Period'].map((v) => ({
  label: v,
  value: v,
}))

function saveRegister() {
  if (!classLearners.value.length) {
    toast.error('No learners registered for this class')
    return
  }
  saving.value = true
  try {
    for (const learner of classLearners.value) {
      addRecord('attendance', {
        name: learner.name,
        status: statuses[learner.id] || 'Present',
        className: form.className,
        date: form.date,
        session: form.session,
        stream: form.stream,
        subtitle: remarks[learner.id] || `${form.session} register`,
      })
    }
    toast.success(`Attendance saved for ${classLearners.value.length} learners`)
    tab.value = 'registers'
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save register')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Attendance" />
  </PageHeader>

  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Registers, take class, early departures, and staff — one desk (was four
      pages).
    </p>

    <TabButtons v-model="tab" :options="tabs" class="school-tabs" />

    <CatalogTabDesk v-if="tab === 'registers'" :tabs="registerTabs" />
    <CatalogTabDesk v-else-if="tab === 'early'" :tabs="earlyTabs" />
    <CatalogTabDesk v-else-if="tab === 'staff'" :tabs="staffTabs" />

    <template v-else>
      <div class="school-page-toolbar">
        <FormControl v-model="form.date" type="date" label="Date" />
        <FormControl
          v-model="form.className"
          type="select"
          label="Class"
          :options="gradeSelectOptions"
        />
        <FormControl
          v-model="form.session"
          type="select"
          label="Session"
          :options="sessionOptions"
        />
        <FormControl
          v-model="form.stream"
          type="text"
          label="Stream"
          placeholder="Optional"
        />
        <div class="school-page-toolbar__grow" />
        <Button
          variant="solid"
          icon-left="lucide-check"
          label="Save register"
          :loading="saving"
          @click="saveRegister"
        />
      </div>

      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <div
          v-for="learner in classLearners"
          :key="learner.id"
          class="grid gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] sm:items-center"
        >
          <div>
            <p class="text-sm-medium text-ink-gray-9">{{ learner.name }}</p>
            <p class="text-xs text-ink-gray-5">{{ learner.id }}</p>
          </div>
          <FormControl
            v-model="statuses[learner.id]"
            type="select"
            :options="statusOptions"
          />
          <FormControl
            v-model="remarks[learner.id]"
            type="text"
            placeholder="Remark"
          />
        </div>
        <p
          v-if="!classLearners.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No active learners in this class.
        </p>
      </div>
    </template>
  </div>
</template>
