<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  dialog,
  toast,
} from 'frappe-ui'
import { schoolStore, addRecord, updateRecord } from '../data/store'
import { schoolSetup } from '../data/schoolSetup'
import { canCurrentUser } from '../data/permissions'
import { logActivity } from '../data/activity'
import ListStatCards from '../components/ListStatCards.vue'

const router = useRouter()

const className = ref('P.5 Blue')
const subject = ref('Mathematics')
const assessment = ref('Mid of Term')

const canWrite = computed(() => canCurrentUser('gradebook', 'write'))
const canCreate = computed(() => canCurrentUser('gradebook', 'create'))

const classOptions = computed(() => {
  const names = new Set(
    (schoolStore.classes?.rows || []).map((c) => String(c.name)),
  )
  if (!names.size) {
    ;['P.5 Blue', 'P.6 Green', 'P.7 Gold', 'Top Class A'].forEach((n) =>
      names.add(n),
    )
  }
  return [...names].map((n) => ({ label: n, value: n }))
})

const subjectOptions = [
  { label: 'Mathematics', value: 'Mathematics' },
  { label: 'English', value: 'English' },
  { label: 'Science', value: 'Science' },
  { label: 'Social Studies', value: 'Social Studies' },
  { label: 'Literacy', value: 'Literacy' },
]

const assessmentOptions = [
  { label: 'Beginning of Term', value: 'Beginning of Term' },
  { label: 'Mid of Term', value: 'Mid of Term' },
  { label: 'End of Term', value: 'End of Term' },
  { label: 'Weekly test', value: 'Weekly test' },
]

type MarkRow = {
  studentId: string
  name: string
  score: number
  grade: string
}

const marks = ref<MarkRow[]>([])

function letterGrade(score: number) {
  if (score >= 80) return 'D1'
  if (score >= 75) return 'D2'
  if (score >= 70) return 'C3'
  if (score >= 65) return 'C4'
  if (score >= 60) return 'C5'
  if (score >= 55) return 'C6'
  if (score >= 45) return 'P7'
  if (score >= 40) return 'P8'
  return 'F9'
}

function loadLearners() {
  const learners = (schoolStore.students?.rows || []).filter(
    (s) => String(s.className) === className.value && s.status === 'Active',
  )
  const base = learners.length
    ? learners
    : (schoolStore.students?.rows || []).slice(0, 6)
  marks.value = base.map((s, i) => {
    const score = Number(s.average || 60 + ((i * 7) % 25))
    return {
      studentId: s.id,
      name: s.name,
      score,
      grade: letterGrade(score),
    }
  })
}

watch([className, subject, assessment], loadLearners, { immediate: true })

const classAverage = computed(() => {
  if (!marks.value.length) return 0
  const sum = marks.value.reduce((n, m) => n + m.score, 0)
  return Math.round(sum / marks.value.length)
})

const stats = computed(() => [
  { title: 'Learners', value: marks.value.length },
  {
    title: 'Class average',
    value: classAverage.value,
    caption: '%',
  },
  {
    title: 'Distinction (D1–D2)',
    value: marks.value.filter((m) => m.score >= 75).length,
  },
  {
    title: 'Below P8',
    value: marks.value.filter((m) => m.score < 40).length,
  },
])

function onScore(row: MarkRow, raw: string | number) {
  const score = Math.max(0, Math.min(100, Number(raw) || 0))
  row.score = score
  row.grade = letterGrade(score)
}

function saveDraft() {
  if (!canCreate.value && !canWrite.value) {
    toast.error('Your role cannot edit the gradebook')
    return
  }
  const name = `${className.value} · ${subject.value} · ${assessment.value}`
  const existing = schoolStore.gradebook?.rows.find((r) => r.name === name)
  if (existing) {
    updateRecord('gradebook', existing.id, {
      name,
      className: className.value,
      subject: subject.value,
      assessment: assessment.value,
      average: classAverage.value,
      status: 'Draft',
    })
  } else {
    addRecord('gradebook', {
      name,
      className: className.value,
      subject: subject.value,
      assessment: assessment.value,
      average: classAverage.value,
      status: 'Draft',
    })
  }
  logActivity({
    action: 'Updated',
    module: 'gradebook',
    moduleLabel: 'Gradebook',
    recordId: name,
    recordName: name,
    summary: `Saved draft marks · avg ${classAverage.value}%`,
    severity: 'info',
  })
  toast.success('Gradebook draft saved')
}

function submitMarks() {
  if (!canWrite.value) {
    toast.error('Your role cannot submit marks')
    return
  }
  dialog.confirm({
    title: 'Submit marks to assessment?',
    message: `Submit ${marks.value.length} scores for ${className.value} · ${subject.value} (${assessment.value})? Class average ${classAverage.value}%.`,
    icon: 'lucide-send',
    theme: 'blue',
    confirmLabel: 'Submit',
    onConfirm: async () => {
      const name = `${className.value} · ${subject.value} · ${assessment.value}`
      const existing = schoolStore.gradebook?.rows.find((r) => r.name === name)
      if (existing) {
        updateRecord('gradebook', existing.id, {
          name,
          average: classAverage.value,
          status: 'Submitted',
        })
      } else {
        addRecord('gradebook', {
          name,
          className: className.value,
          subject: subject.value,
          assessment: assessment.value,
          average: classAverage.value,
          status: 'Submitted',
        })
      }
      for (const m of marks.value.slice(0, 3)) {
        const exists = schoolStore['exam-results']?.rows.some(
          (r) =>
            r.name === m.name &&
            String(r.exam || r.assessment) === assessment.value,
        )
        if (!exists) {
          addRecord('exam-results', {
            name: m.name,
            exam: assessment.value,
            subject: subject.value,
            score: m.score,
            grade: m.grade,
            className: className.value,
            status: m.score >= 40 ? 'Pass' : 'Fail',
          })
        }
      }
      toast.success('Marks submitted')
    },
  })
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Teacher Gradebook" />
    <div class="flex flex-wrap gap-2">
      <Button
        icon-left="lucide-file-badge"
        label="Report cards"
        @click="router.push('/report-cards')"
      />
      <Button
        v-if="canWrite || canCreate"
        label="Save draft"
        @click="saveDraft"
      />
      <Button
        v-if="canWrite"
        variant="solid"
        icon-left="lucide-send"
        label="Submit marks"
        @click="submitMarks"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-5xl">
    <p class="text-p-base text-ink-gray-6">
      Enter continuous assessment using UNEB-style aggregates (D1–F9) for
      {{ schoolSetup.shortName }} · {{ schoolSetup.currentTerm }}.
    </p>

    <ListStatCards :stats="stats" />

    <div class="grid gap-3 sm:grid-cols-3">
      <FormControl
        v-model="className"
        type="select"
        label="Class"
        :options="classOptions"
      />
      <FormControl
        v-model="subject"
        type="select"
        label="Subject"
        :options="subjectOptions"
      />
      <FormControl
        v-model="assessment"
        type="select"
        label="Assessment"
        :options="assessmentOptions"
      />
    </div>

    <section class="school-section">
      <h2 class="school-section-title">Mark sheet</h2>
      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <div
          class="grid grid-cols-[1fr_6rem_5rem] gap-2 border-b border-outline-gray-1 bg-surface-gray-1 px-4 py-2 text-xs font-medium text-ink-gray-6"
        >
          <span>Learner</span>
          <span>Score %</span>
          <span>Agg</span>
        </div>
        <div
          v-for="row in marks"
          :key="row.studentId"
          class="grid grid-cols-[1fr_6rem_5rem] items-center gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
        >
          <div>
            <p class="text-sm-medium text-ink-gray-9">{{ row.name }}</p>
            <p class="text-xs text-ink-gray-5">{{ row.studentId }}</p>
          </div>
          <FormControl
            :model-value="row.score"
            type="number"
            :disabled="!canWrite && !canCreate"
            @update:model-value="onScore(row, $event as number)"
          />
          <Badge :label="row.grade" theme="blue" variant="subtle" />
        </div>
        <p
          v-if="!marks.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No learners in this class.
        </p>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Saved sheets</h2>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="sheet in schoolStore.gradebook?.rows || []"
          :key="sheet.id"
          class="flex flex-wrap items-center gap-2"
        >
          <Button
            :label="String(sheet.name)"
            @click="
              className = String(sheet.className || className);
              subject = String(sheet.subject || subject);
              assessment = String(sheet.assessment || assessment)
            "
          />
          <Badge
            :label="String(sheet.status)"
            :theme="sheet.status === 'Submitted' ? 'green' : 'amber'"
            variant="subtle"
          />
        </div>
      </div>
    </section>
  </div>
</template>
