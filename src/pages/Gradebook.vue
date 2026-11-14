<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
  dialog,
  toast,
} from 'frappe-ui'
import { schoolStore, addRecord, updateRecord } from '../data/store'
import { schoolSetup } from '../data/schoolSetup'
import { canCurrentUser } from '../data/permissions'
import { currentUser, logActivity } from '../data/activity'
import {
  isNurseryClass,
  percentToAggregate,
  percentToNurseryBand,
  sectionForGrade,
} from '../data/grades'
import ListStatCards from '../components/ListStatCards.vue'
import type { CatalogRow } from '../data/catalog'
import { printExamPack, printRecordDocument } from '../data/documents'

const router = useRouter()
const route = useRoute()

type DeskTab = 'exams' | 'marks' | 'create'

function parseTab(raw: unknown): DeskTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'marks' || v === 'mark') return 'marks'
  if (v === 'create' || v === 'new') return 'create'
  return 'exams'
}

const tab = ref<DeskTab>(parseTab(route.query.tab))
const tabs = [
  { label: 'Class exams', value: 'exams' },
  { label: 'Enter marks', value: 'marks' },
  { label: 'Create exam', value: 'create' },
]

watch(tab, (value) => {
  router.replace({ path: '/gradebook', query: { ...route.query, tab: value } })
})

watch(
  () => route.query.tab,
  (value) => {
    const next = parseTab(value)
    if (tab.value !== next) tab.value = next
  },
)

const canWrite = computed(
  () =>
    canCurrentUser('gradebook', 'write') || canCurrentUser('exams', 'write'),
)
const canCreate = computed(
  () =>
    canCurrentUser('gradebook', 'create') || canCurrentUser('exams', 'create'),
)
const canPrint = computed(
  () =>
    canCurrentUser('exams', 'print') || canCurrentUser('gradebook', 'print'),
)

const filterClass = ref('All')
const selectedExamId = ref<string>('')

const classOptions = computed(() => {
  const names = new Set(
    (schoolStore.classes?.rows || []).map((c) => String(c.name)),
  )
  if (!names.size) {
    ;['P.5 Blue', 'P.6 Green', 'P.7 Gold', 'Top Class A'].forEach((n) =>
      names.add(n),
    )
  }
  return [
    { label: 'All classes', value: 'All' },
    ...[...names].sort().map((n) => ({ label: n, value: n })),
  ]
})

const classSelectOptions = computed(() =>
  classOptions.value.filter((o) => o.value !== 'All'),
)

const nurserySubjects = [
  { label: 'Literacy readiness', value: 'Literacy readiness' },
  { label: 'Numeracy play', value: 'Numeracy play' },
  { label: 'Creative arts', value: 'Creative arts' },
  { label: 'Religious education', value: 'Religious education' },
]

const primarySubjects = [
  { label: 'English', value: 'English' },
  { label: 'Mathematics', value: 'Mathematics' },
  { label: 'Science', value: 'Science' },
  { label: 'Social Studies', value: 'Social Studies' },
  { label: 'Luganda', value: 'Luganda' },
  { label: 'Religious Education', value: 'Religious Education' },
  { label: 'Integrated', value: 'Integrated' },
]

const typeOptions = [
  { label: 'BOT · Beginning of term', value: 'BOT' },
  { label: 'MOT · Mid of term', value: 'MOT' },
  { label: 'EOT · End of term', value: 'EOT' },
  { label: 'Weekly CA', value: 'Weekly CA' },
  { label: 'Class test', value: 'Class test' },
  { label: 'PLE mock', value: 'PLE mock' },
]

const statusOptions = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Open (ready for marks)', value: 'Open' },
  { label: 'Closed', value: 'Closed' },
]

const exams = computed(() => schoolStore.exams?.rows || [])

const filteredExams = computed(() => {
  return exams.value.filter((e) => {
    if (filterClass.value === 'All') return true
    return String(e.className || '') === filterClass.value
  })
})

const examOptions = computed(() =>
  filteredExams.value.map((e) => ({
    label: `${e.name} · ${e.className || '—'}`,
    value: e.id,
  })),
)

const selectedExam = computed(
  () => exams.value.find((e) => e.id === selectedExamId.value) || null,
)

type ExamQuestion = {
  id: string
  text: string
  marks: number
}

const createForm = reactive({
  name: '',
  className: 'P.5 Blue',
  course: 'Mathematics',
  type: 'MOT',
  maxScore: 100,
  date: new Date().toISOString().slice(0, 10),
  status: 'Open',
  subtitle: '',
})

const createQuestions = ref<ExamQuestion[]>([
  { id: `q-${Date.now()}`, text: '', marks: 10 },
])

const questionsTotal = computed(() =>
  createQuestions.value.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
)

function addQuestion() {
  createQuestions.value.push({
    id: `q-${Date.now()}-${createQuestions.value.length}`,
    text: '',
    marks: 5,
  })
}

function removeQuestion(id: string) {
  if (createQuestions.value.length <= 1) {
    createQuestions.value[0].text = ''
    createQuestions.value[0].marks = 10
    return
  }
  createQuestions.value = createQuestions.value.filter((q) => q.id !== id)
}

const createSubjectOptions = computed(() =>
  isNurseryClass(createForm.className) ? nurserySubjects : primarySubjects,
)

watch(
  () => createForm.className,
  () => {
    const opts = createSubjectOptions.value
    if (!opts.some((o) => o.value === createForm.course)) {
      createForm.course = opts[0]?.value || 'Mathematics'
    }
  },
)

type MarkRow = {
  studentId: string
  name: string
  score: number
  grade: string
}

const marks = ref<MarkRow[]>([])
const dirty = ref(false)

const maxScore = computed(() =>
  Math.max(1, Number(selectedExam.value?.maxScore || 100)),
)

function letterGrade(score: number, className: string, max: number) {
  const pct = Math.round((score / Math.max(max, 1)) * 100)
  if (isNurseryClass(className)) return percentToNurseryBand(pct)
  return percentToAggregate(pct)
}

function scorePercent(score: number) {
  return Math.round((score / maxScore.value) * 100)
}

function loadMarksForExam(exam: CatalogRow | null) {
  dirty.value = false
  if (!exam) {
    marks.value = []
    return
  }
  const className = String(exam.className || '')
  const examName = String(exam.name)
  const max = Math.max(1, Number(exam.maxScore || 100))
  const learners = (schoolStore.students?.rows || []).filter(
    (s) => String(s.className) === className && s.status === 'Active',
  )
  const base = learners.length
    ? learners
    : (schoolStore.students?.rows || []).slice(0, 6)

  marks.value = base.map((s) => {
    const existing = (schoolStore['exam-results']?.rows || []).find(
      (r) =>
        String(r.exam) === examName &&
        (String(r.studentId) === s.id || r.name === s.name),
    )
    const score = existing
      ? Number(existing.score || 0)
      : 0
    return {
      studentId: s.id,
      name: s.name,
      score,
      grade: letterGrade(score, className, max),
    }
  })
}

watch(selectedExamId, (id) => {
  const exam = exams.value.find((e) => e.id === id) || null
  loadMarksForExam(exam)
  if (id && tab.value === 'exams') tab.value = 'marks'
})

watch(
  () => route.query.exam,
  (examId) => {
    if (examId && typeof examId === 'string') {
      selectedExamId.value = examId
      tab.value = 'marks'
    }
  },
  { immediate: true },
)

if (!selectedExamId.value && exams.value[0]) {
  const open = exams.value.find((e) => e.status === 'Open') || exams.value[0]
  selectedExamId.value = open.id
}

const classAverage = computed(() => {
  if (!marks.value.length) return 0
  const sum = marks.value.reduce((n, m) => n + scorePercent(m.score), 0)
  return Math.round(sum / marks.value.length)
})

const markedCount = computed(
  () => marks.value.filter((m) => m.score > 0).length,
)

const stats = computed(() => [
  { title: 'Exams', value: filteredExams.value.length },
  {
    title: 'Learners',
    value: marks.value.length,
    caption: selectedExam.value
      ? String(selectedExam.value.className || '')
      : 'Select an exam',
  },
  {
    title: 'Marked',
    value: markedCount.value,
    caption: `of ${marks.value.length}`,
  },
  {
    title: 'Class average',
    value: classAverage.value,
    caption: '%',
  },
])

function statusTheme(status: string) {
  if (status === 'Open') return 'green'
  if (status === 'Scheduled') return 'blue'
  if (status === 'Draft') return 'amber'
  if (status === 'Closed') return 'gray'
  return 'gray'
}

function onScore(row: MarkRow, raw: string | number) {
  const max = maxScore.value
  const score = Math.max(0, Math.min(max, Number(raw) || 0))
  row.score = score
  row.grade = letterGrade(
    score,
    String(selectedExam.value?.className || ''),
    max,
  )
  dirty.value = true
}

function openMarks(examId: string) {
  selectedExamId.value = examId
  tab.value = 'marks'
  router.replace({
    path: '/gradebook',
    query: { tab: 'marks', exam: examId },
  })
}

function createExam() {
  if (!canCreate.value) {
    toast.error('Your role cannot create examinations')
    return
  }
  const name = createForm.name.trim()
  if (name.length < 3) {
    toast.error('Enter an examination name')
    return
  }
  if (!createForm.className) {
    toast.error('Choose a class')
    return
  }
  if (!createForm.course) {
    toast.error('Choose a subject')
    return
  }
  const questions = createQuestions.value
    .map((q, i) => ({
      id: q.id || `q-${i + 1}`,
      text: q.text.trim(),
      marks: Math.max(0, Number(q.marks) || 0),
    }))
    .filter((q) => q.text.length > 0)

  if (!questions.length) {
    toast.error('Add at least one exam question')
    return
  }

  const marksFromQuestions = questions.reduce((sum, q) => sum + q.marks, 0)
  const max = Math.max(
    1,
    marksFromQuestions || Number(createForm.maxScore) || 100,
  )
  createForm.maxScore = max
  const program =
    sectionForGrade(createForm.className) ||
    (isNurseryClass(createForm.className) ? 'Nursery' : 'Primary')

  const record = addRecord('exams', {
    name,
    className: createForm.className,
    course: createForm.course,
    type: createForm.type,
    maxScore: max,
    date: createForm.date,
    program,
    subtitle: createForm.subtitle.trim() || undefined,
    status: createForm.status || 'Open',
    questionsJson: JSON.stringify(questions),
    questionCount: questions.length,
  })

  toast.success(
    `Exam “${name}” created with ${questions.length} question${questions.length === 1 ? '' : 's'}`,
  )
  selectedExamId.value = record.id
  loadMarksForExam(record)
  createForm.name = ''
  createForm.subtitle = ''
  createQuestions.value = [
    { id: `q-${Date.now()}`, text: '', marks: 10 },
  ]
  tab.value = 'marks'
}

function saveMarks(submit: boolean) {
  const exam = selectedExam.value
  if (!exam) {
    toast.error('Select or create an exam first')
    return
  }
  if (!canWrite.value && !canCreate.value) {
    toast.error('Your role cannot enter marks')
    return
  }

  const run = () => {
    const examName = String(exam.name)
    const className = String(exam.className || '')
    const subject = String(exam.course || '')
    const max = maxScore.value

    for (const m of marks.value) {
      const existing = (schoolStore['exam-results']?.rows || []).find(
        (r) =>
          String(r.exam) === examName &&
          (String(r.studentId) === m.studentId || r.name === m.name),
      )
      const payload = {
        name: m.name,
        studentId: m.studentId,
        exam: examName,
        examId: exam.id,
        subject,
        className,
        score: m.score,
        maxScore: max,
        percent: scorePercent(m.score),
        grade: m.grade,
        status:
          m.score <= 0
            ? 'Pending'
            : scorePercent(m.score) >= 40 || isNurseryClass(className)
              ? 'Posted'
              : 'Remedial',
      }
      if (existing) updateRecord('exam-results', existing.id, payload)
      else addRecord('exam-results', payload)
    }

    const sheetName = `${className} · ${subject} · ${examName}`
    const sheet = schoolStore.gradebook?.rows.find(
      (r) => String(r.examId) === exam.id || r.name === sheetName,
    )
    const sheetPayload = {
      name: sheetName,
      className,
      subject,
      assessment: String(exam.type || examName),
      examId: exam.id,
      exam: examName,
      average: classAverage.value,
      teacher: currentUser.name,
      maxScore: max,
      status: submit ? 'Submitted' : 'Draft',
    }
    if (sheet) updateRecord('gradebook', sheet.id, sheetPayload)
    else addRecord('gradebook', sheetPayload)

    if (submit && exam.status !== 'Closed') {
      updateRecord('exams', exam.id, { status: 'Open' })
    }

    dirty.value = false
    logActivity({
      action: submit ? 'Updated' : 'Updated',
      module: 'exam-results',
      moduleLabel: 'Exam marks',
      recordId: exam.id,
      recordName: examName,
      summary: submit
        ? `Submitted marks for ${examName}`
        : `Saved draft marks for ${examName}`,
      detail: `${marks.value.length} learners · avg ${classAverage.value}%`,
      severity: submit ? 'success' : 'info',
    })
    toast.success(
      submit
        ? `Marks submitted for ${examName}`
        : `Draft marks saved for ${examName}`,
    )
  }

  if (!submit) {
    run()
    return
  }

  dialog.confirm({
    title: 'Submit marks?',
    message: `Post ${marks.value.length} scores for ${exam.name} (${classNameForConfirm()}). Class average ${classAverage.value}%.`,
    icon: 'lucide-send',
    theme: 'blue',
    confirmLabel: 'Submit marks',
    onConfirm: async () => run(),
  })
}

function classNameForConfirm() {
  return String(selectedExam.value?.className || 'class')
}

function closeExam() {
  const exam = selectedExam.value
  if (!exam || !canWrite.value) return
  dialog.confirm({
    title: 'Close this exam?',
    message: `“${exam.name}” will be marked Closed. You can still view results.`,
    icon: 'lucide-lock',
    theme: 'amber',
    confirmLabel: 'Close exam',
    onConfirm: async () => {
      updateRecord('exams', exam.id, { status: 'Closed' })
      toast.success('Examination closed')
    },
  })
}

function printExam(
  exam: CatalogRow,
  parts: Array<'paper' | 'marksheet'> = ['paper'],
  event?: Event,
) {
  event?.stopPropagation()
  if (!canPrint.value) {
    toast.error('Your role cannot print examinations')
    return
  }
  const titles = printExamPack(exam, parts)
  logActivity({
    action: 'Printed',
    module: 'exams',
    moduleLabel: 'Examination',
    recordId: exam.id,
    recordName: exam.name,
    summary: `Printed ${parts.join(' + ')} for ${exam.name}`,
    detail: titles.join(' · '),
    severity: 'info',
  })
  toast.success(
    parts.includes('marksheet') && parts.includes('paper')
      ? 'Exam paper and mark sheet sent to print'
      : parts.includes('marksheet')
        ? 'Mark sheet sent to print'
        : 'Exam paper sent to print',
  )
}

function printSelectedPaper() {
  if (!selectedExam.value) return
  printExam(selectedExam.value, ['paper'])
}

function printSelectedMarksheet() {
  if (!selectedExam.value) return
  printExam(selectedExam.value, ['marksheet'])
}

function printSelectedPack() {
  if (!selectedExam.value) return
  printExam(selectedExam.value, ['paper', 'marksheet'])
}

function printLearnerResult(row: { studentId: string; name: string; score: number; grade: string }) {
  if (!canPrint.value || !selectedExam.value) {
    toast.error('Select an exam to print results')
    return
  }
  const title = printRecordDocument('exam-memo', 'exam-results', {
    id: `${selectedExam.value.id}-${row.studentId}`,
    name: row.name,
    exam: selectedExam.value.name,
    score: row.score,
    grade: row.grade,
    className: selectedExam.value.className,
    status: row.score > 0 ? 'Posted' : 'Pending',
  } as CatalogRow)
  toast.success(`Printing ${title}`)
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Exams & marks" />
    <div class="flex flex-wrap gap-2">
      <Button
        icon-left="lucide-list"
        label="All examinations"
        @click="router.push('/exams')"
      />
      <Button
        icon-left="lucide-award"
        label="Results"
        @click="router.push('/exam-results')"
      />
      <Button
        v-if="tab === 'marks' && canPrint && selectedExam"
        icon-left="lucide-printer"
        label="Print paper"
        @click="printSelectedPaper"
      />
      <Button
        v-if="tab === 'marks' && canPrint && selectedExam"
        icon-left="lucide-table-2"
        label="Print mark sheet"
        @click="printSelectedMarksheet"
      />
      <Button
        v-if="tab === 'marks' && (canWrite || canCreate)"
        label="Save draft"
        :disabled="!selectedExam"
        @click="saveMarks(false)"
      />
      <Button
        v-if="tab === 'marks' && canWrite"
        variant="solid"
        icon-left="lucide-send"
        label="Submit marks"
        :disabled="!selectedExam"
        @click="saveMarks(true)"
      />
      <Button
        v-if="tab === 'create' && canCreate"
        variant="solid"
        icon-left="lucide-plus"
        label="Create exam"
        @click="createExam"
      />
    </div>
  </PageHeader>

  <div class="school-page">
    <p class="text-p-base text-ink-gray-6">
      Teachers set class-specific exams, then enter marks for that class.
      {{ schoolSetup.shortName }} · {{ schoolSetup.currentTerm }}
      {{ schoolSetup.academicYear }}.
    </p>

    <ListStatCards :stats="stats" />

    <TabButtons v-model="tab" :options="tabs" class="school-tabs" />

    <!-- Class exams -->
    <template v-if="tab === 'exams'">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <FormControl
          v-model="filterClass"
          class="school-filter-select"
          type="select"
          label="Class"
          :options="classOptions"
        />
        <Button
          v-if="canCreate"
          variant="solid"
          icon-left="lucide-plus"
          label="Create exam"
          @click="tab = 'create'"
        />
      </div>

      <section
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <button
          v-for="exam in filteredExams"
          :key="exam.id"
          type="button"
          class="flex w-full flex-wrap items-center justify-between gap-3 border-b border-outline-gray-1 px-4 py-3.5 text-left last:border-b-0 hover:bg-surface-gray-1"
          @click="openMarks(exam.id)"
        >
          <div class="min-w-0 space-y-1">
            <p class="text-sm-medium text-ink-gray-9">{{ exam.name }}</p>
            <p class="text-xs text-ink-gray-5">
              {{ exam.className || '—' }} · {{ exam.course || '—' }} · max
              {{ exam.maxScore || 100 }} · {{ exam.date || '—' }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Badge
              :label="String(exam.type || 'Exam')"
              theme="blue"
              variant="subtle"
            />
            <Badge
              :label="String(exam.status || 'Draft')"
              :theme="statusTheme(String(exam.status))"
              variant="subtle"
            />
            <Button
              v-if="canPrint"
              size="sm"
              icon-left="lucide-printer"
              label="Print"
              @click.stop="printExam(exam, ['paper', 'marksheet'], $event)"
            />
            <Button
              size="sm"
              icon-left="lucide-pen-line"
              label="Enter marks"
              @click.stop="openMarks(exam.id)"
            />
          </div>
        </button>
        <p
          v-if="!filteredExams.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No exams for this class yet. Create one to start marking.
        </p>
      </section>
    </template>

    <!-- Enter marks -->
    <template v-else-if="tab === 'marks'">
      <div class="grid gap-3 sm:grid-cols-2">
        <FormControl
          v-model="filterClass"
          type="select"
          label="Filter by class"
          :options="classOptions"
        />
        <FormControl
          v-model="selectedExamId"
          type="select"
          label="Examination"
          :options="
            examOptions.length
              ? examOptions
              : [{ label: 'No exams — create one', value: '' }]
          "
        />
      </div>

      <div
        v-if="selectedExam"
        class="flex flex-wrap items-center gap-2 rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
      >
        <Badge
          :label="String(selectedExam.className)"
          theme="blue"
          variant="subtle"
        />
        <Badge
          :label="String(selectedExam.course)"
          theme="gray"
          variant="subtle"
        />
        <Badge
          :label="`Max ${maxScore}`"
          theme="amber"
          variant="subtle"
        />
        <Badge
          :label="String(selectedExam.status)"
          :theme="statusTheme(String(selectedExam.status))"
          variant="subtle"
        />
        <Button
          v-if="canPrint"
          size="sm"
          icon-left="lucide-printer"
          label="Print pack"
          @click="printSelectedPack"
        />
        <Button
          v-if="canWrite && selectedExam.status !== 'Closed'"
          size="sm"
          label="Close exam"
          @click="closeExam"
        />
      </div>

      <section class="school-section">
        <h2 class="school-section-title">
          Mark sheet
          <span v-if="dirty" class="text-xs font-normal text-ink-gray-5">
            · unsaved changes
          </span>
        </h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            class="grid grid-cols-[minmax(0,1fr)_5rem_3.5rem_4rem_2.5rem] gap-2 border-b border-outline-gray-1 bg-surface-gray-1 px-4 py-2 text-xs font-medium text-ink-gray-6"
          >
            <span>Learner</span>
            <span>Score</span>
            <span>%</span>
            <span>Grade</span>
            <span />
          </div>
          <div
            v-for="row in marks"
            :key="row.studentId"
            class="grid grid-cols-[minmax(0,1fr)_5rem_3.5rem_4rem_2.5rem] items-center gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div class="min-w-0">
              <p class="school-cell-text text-sm-medium text-ink-gray-9">
                {{ row.name }}
              </p>
              <p class="school-cell-text text-xs text-ink-gray-5">
                {{ row.studentId }}
              </p>
            </div>
            <FormControl
              :model-value="row.score"
              type="number"
              :disabled="
                (!canWrite && !canCreate) ||
                selectedExam?.status === 'Closed'
              "
              @update:model-value="onScore(row, $event as number)"
            />
            <span class="tabular-nums text-sm text-ink-gray-7">{{
              scorePercent(row.score)
            }}</span>
            <Badge :label="row.grade" theme="blue" variant="subtle" />
            <Button
              v-if="canPrint"
              class="shrink-0"
              icon="lucide-printer"
              aria-label="Print learner result"
              @click="printLearnerResult(row)"
            />
          </div>
          <p
            v-if="!selectedExam"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            Select an examination, or create one for your class.
          </p>
          <p
            v-else-if="!marks.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No active learners in {{ selectedExam.className }}.
          </p>
        </div>
      </section>
    </template>

    <!-- Create exam -->
    <template v-else>
      <section
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <FormControl
          v-model="createForm.name"
          class="sm:col-span-2"
          label="Examination name"
          type="text"
          placeholder="e.g. Term III MOT · Mathematics"
        />
        <FormControl
          v-model="createForm.className"
          type="select"
          label="Class"
          :options="classSelectOptions"
        />
        <FormControl
          v-model="createForm.course"
          type="select"
          label="Subject"
          :options="createSubjectOptions"
        />
        <FormControl
          v-model="createForm.type"
          type="select"
          label="Assessment type"
          :options="typeOptions"
        />
        <FormControl
          v-model="createForm.maxScore"
          type="number"
          label="Maximum marks"
        />
        <FormControl
          v-model="createForm.date"
          type="date"
          label="Exam date"
        />
        <FormControl
          v-model="createForm.status"
          type="select"
          label="Status"
          :options="statusOptions"
        />
        <FormControl
          v-model="createForm.subtitle"
          class="sm:col-span-2"
          type="textarea"
          label="Notes"
          placeholder="Topics covered, materials, or marking notes"
        />
      </section>

      <section
        class="space-y-3 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base-medium text-ink-gray-9">Exam questions</h2>
            <p class="text-sm text-ink-gray-6">
              Type each question here. They print on the exam paper. Marks total
              {{ questionsTotal }}
              <span v-if="questionsTotal !== Number(createForm.maxScore)">
                (max will sync to {{ questionsTotal || createForm.maxScore }})
              </span>
              .
            </p>
          </div>
          <Button
            icon-left="lucide-plus"
            label="Add question"
            @click="addQuestion"
          />
        </div>

        <div
          v-for="(q, index) in createQuestions"
          :key="q.id"
          class="grid gap-3 rounded-5 border border-outline-gray-1 bg-surface-gray-1 p-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_6rem_auto]"
        >
          <div
            class="flex size-9 items-center justify-center rounded-full bg-surface-white text-sm-medium text-ink-gray-7"
          >
            {{ index + 1 }}
          </div>
          <FormControl
            v-model="q.text"
            type="textarea"
            :label="`Question ${index + 1}`"
            placeholder="e.g. Solve for x: 2x + 5 = 17. Show your working."
          />
          <FormControl
            v-model="q.marks"
            type="number"
            label="Marks"
          />
          <div class="flex items-end">
            <Button
              icon="lucide-trash-2"
              variant="subtle"
              :aria-label="`Remove question ${index + 1}`"
              @click="removeQuestion(q.id)"
            />
          </div>
        </div>
      </section>

      <p class="text-sm text-ink-gray-6">
        After creating, open <strong>Enter marks</strong> for the class, or use
        <strong>Print paper</strong> to get the questions for learners.
      </p>
    </template>
  </div>
</template>
