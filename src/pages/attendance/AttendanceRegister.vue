<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import { gradeSelectOptions } from '@/data/school/grades'
import { addRecord, getLiveModule } from '@/data/catalog/store'
import ListStatCards from '@/components/list/ListStatCards.vue'

const router = useRouter()
const students = computed(() => getLiveModule('students')?.rows || [])

const form = reactive({
  date: new Date().toISOString().slice(0, 10),
  className: gradeSelectOptions[3]?.value || 'P.1',
  stream: '',
  session: 'Morning',
})

const statuses = reactive<Record<string, string>>({})
const remarks = reactive<Record<string, string>>({})

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

const saving = ref(false)

const registerStats = computed(() => {
  const list = classLearners.value
  const counts = { Present: 0, Absent: 0, Late: 0, Excused: 0 }
  for (const learner of list) {
    const s = (statuses[learner.id] || 'Present') as keyof typeof counts
    if (s in counts) counts[s] += 1
  }
  return [
    { title: 'Learners', value: list.length, caption: form.className },
    { title: 'Present', value: counts.Present },
    { title: 'Absent', value: counts.Absent },
    {
      title: 'Late / excused',
      value: counts.Late + counts.Excused,
      caption: `${counts.Late} late · ${counts.Excused} excused`,
    },
  ]
})

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
    router.push('/attendance')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save register')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Take Attendance" />
    <Button
      variant="ghost"
      icon-left="lucide-arrow-left"
      label="Registers"
      @click="router.push('/attendance')"
    />
  </PageHeader>

  <div class="school-page max-w-5xl space-y-6">
    <p class="text-p-base text-ink-gray-6">
      Class-based register — mark every learner in one pass. Do not open a
      separate form per pupil.
    </p>

    <ListStatCards :stats="registerStats" />

    <section class="school-card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <FormControl v-model="form.date" type="date" label="Date *" />
      <FormControl
        v-model="form.className"
        type="select"
        label="Class *"
        :options="[...gradeSelectOptions]"
      />
      <FormControl
        v-model="form.stream"
        type="text"
        label="Stream"
        placeholder="Optional"
      />
      <FormControl
        v-model="form.session"
        type="select"
        label="Session *"
        :options="sessionOptions"
      />
    </section>

    <section class="school-table">
      <div
        class="grid grid-cols-[1fr_8rem_1fr] gap-2 border-b border-outline-gray-1 bg-surface-gray-1 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-gray-5"
      >
        <span>Learner</span>
        <span>Status</span>
        <span>Reason / remarks</span>
      </div>
      <div
        v-if="!classLearners.length"
        class="px-4 py-8 text-center text-sm text-ink-gray-5"
      >
        No registered learners for {{ form.className }}.
      </div>
      <div
        v-for="learner in classLearners"
        :key="learner.id"
        class="grid grid-cols-1 gap-3 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_8rem_1fr] sm:items-center"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-ink-gray-9">{{ learner.name }}</p>
          <p class="text-xs text-ink-gray-5">{{ learner.id }}</p>
        </div>
        <FormControl
          :model-value="statuses[learner.id]"
          type="select"
          :options="statusOptions"
          @update:model-value="
            (v: string | number | boolean | null | undefined) =>
              (statuses[learner.id] = String(v ?? ''))
          "
        />
        <FormControl
          :model-value="remarks[learner.id] || ''"
          type="text"
          placeholder="Required for absences"
          @update:model-value="
            (v: string | number | boolean | null | undefined) =>
              (remarks[learner.id] = String(v ?? ''))
          "
        />
      </div>
    </section>

    <div class="flex flex-wrap gap-2">
      <Button
        variant="solid"
        theme="blue"
        label="Save register"
        :loading="saving"
        @click="saveRegister"
      />
      <Button
        variant="subtle"
        label="Cancel"
        @click="router.push('/attendance')"
      />
    </div>
  </div>
</template>
