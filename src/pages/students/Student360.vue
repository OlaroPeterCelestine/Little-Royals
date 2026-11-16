<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ensureModule } from '@/data/catalog/catalogSync'
import { isApiEnabled } from '@/lib/apiMode'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  TabButtons,
  dialog,
  toast,
} from 'frappe-ui'
import PersonAvatar from '@/components/common/PersonAvatar.vue'
import PersonPhotoUpload from '@/components/common/PersonPhotoUpload.vue'
import { getStudent360 } from '@/data/students/student360'
import {
  buildSubjectAggregates,
  saveStudentSubjectMark,
  termsForStudent,
  type ExamReport,
  type SubjectMarkRow,
} from '@/data/students/studentSubjects'
import {
  studentContactFields,
  studentHealthFields,
  studentPersonalFields,
  studentSchoolFields,
} from '@/data/students/biodata'
import { deleteRecords } from '@/data/catalog/store'
import { openEditDialog, openCreateDialog } from '@/composables/useModuleForms'
import { printRecordDocument, type DocumentKind } from '@/data/documents/documents'
import type { CatalogRow } from '@/data/catalog/catalog'
import { useModuleAccess } from '@/composables/useModuleAccess'
import { canCurrentUser } from '@/data/auth/permissions'
import { personListPath } from '@/lib/personRoutes'
import AppBackButton from '@/components/layout/AppBackButton.vue'
import { pushWithReturn, useAppBack } from '@/composables/useAppBack'
import {
  academicTermsList,
  attendanceStatusByDate,
  attendanceStatusTone,
  isoDate,
  monthAttendanceCells,
  parseIsoDate,
  termAttendanceCells,
  weekAttendanceCells,
} from '@/data/students/studentAttendance'

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
const student = computed(() => bundle.value?.student)
const { goBack } = useAppBack(() => personListPath('students'))

onMounted(() => {
  if (!isApiEnabled()) return
  for (const mod of [
    'students',
    'guardians',
    'parents',
    'classes',
    'attendance',
    'fees',
    'exam-results',
    'disciplinary-cases',
    'student-log',
    'subjects',
  ] as const) {
    void ensureModule(mod, { force: true })
  }
})

const personalFields = computed(() =>
  student.value ? studentPersonalFields(student.value) : [],
)
const schoolFields = computed(() =>
  student.value
    ? studentSchoolFields(student.value, bundle.value?.classInfo)
    : [],
)
const contactFields = computed(() =>
  student.value ? studentContactFields(student.value) : [],
)
const healthFields = computed(() =>
  student.value ? studentHealthFields(student.value) : [],
)

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Biodata', value: 'biodata' },
  { label: 'Guardians', value: 'guardians' },
  { label: 'Discipline', value: 'discipline' },
  { label: 'Academics', value: 'academics' },
  { label: 'Fees', value: 'fees' },
  { label: 'Attendance', value: 'attendance' },
  { label: 'Notes', value: 'notes' },
]

/** Academics drill: term → exam list → exam detail → subject detail */
const selectedTerm = ref('all')
const selectedExam = ref('')
const selectedSubject = ref('')
const academicsLevel = ref<'summary' | 'exam' | 'subject'>('summary')

const markForm = reactive({
  exam: '',
  subject: '',
  score: 0,
  maxScore: 100,
})
const savingMark = ref(false)

const examReports = computed(() => bundle.value?.examReports || [])
const subjectReports = computed(() => bundle.value?.subjectReports || [])

const availableTerms = computed(() =>
  student.value ? termsForStudent(student.value) : [],
)

const filteredExamReports = computed(() => {
  if (selectedTerm.value === 'all') return examReports.value
  return examReports.value.filter((e) => e.term === selectedTerm.value)
})

const academicSummary = computed(() => {
  if (!student.value) return null
  if (selectedTerm.value === 'all') return bundle.value?.academicSummary || null
  return buildSubjectAggregates(student.value, { term: selectedTerm.value })
})

const activeExamReport = computed(() => {
  const list = filteredExamReports.value
  if (!list.length) return null
  return list.find((r) => r.examKey === selectedExam.value) || null
})

const activeSubjectMark = computed((): SubjectMarkRow | null => {
  const exam = activeExamReport.value
  if (!exam || !selectedSubject.value) return null
  return (
    exam.subjects.find((m) => m.subject === selectedSubject.value) || null
  )
})

const activeSubjectResult = computed(() => {
  const mark = activeSubjectMark.value
  if (!mark || !bundle.value) return null
  return bundle.value.results.find((r) => r.id === mark.id) || null
})

const activeSubjectReport = computed(() => {
  if (!selectedSubject.value) return null
  return (
    subjectReports.value.find((r) => r.subject === selectedSubject.value) ||
    null
  )
})

const subjectMarksInTerm = computed(() => {
  if (!selectedSubject.value) return []
  const report = activeSubjectReport.value
  if (!report) return []
  const marks = report.marks
  if (selectedTerm.value === 'all') return marks
  return marks.filter((m) => {
    const exam = examReports.value.find((e) => e.examKey === m.examKey)
    return exam?.term === selectedTerm.value
  })
})

watch(
  filteredExamReports,
  (list) => {
    if (!list.length) {
      selectedExam.value = ''
      if (academicsLevel.value !== 'summary') academicsLevel.value = 'summary'
      return
    }
    if (
      selectedExam.value &&
      !list.some((r) => r.examKey === selectedExam.value)
    ) {
      selectedExam.value = ''
      selectedSubject.value = ''
      academicsLevel.value = 'summary'
    }
  },
  { immediate: true },
)

watch(activeExamReport, (exam) => {
  if (exam && academicsLevel.value === 'exam') markForm.exam = exam.examKey
})

watch(selectedTerm, () => {
  selectedExam.value = ''
  selectedSubject.value = ''
  academicsLevel.value = 'summary'
})

function openExamDetail(examKey: string) {
  selectedExam.value = examKey
  selectedSubject.value = ''
  academicsLevel.value = 'exam'
  markForm.exam = examKey
}

function openSubjectDetail(subject: string) {
  selectedSubject.value = subject
  academicsLevel.value = 'subject'
}

function openSubjectFromSummary(subject: string) {
  const exam = filteredExamReports.value.find((e) =>
    e.subjects.some((m) => m.subject === subject),
  )
  selectedExam.value = exam?.examKey || ''
  selectedSubject.value = subject
  academicsLevel.value = 'subject'
}

function backToAcademicsSummary() {
  selectedExam.value = ''
  selectedSubject.value = ''
  academicsLevel.value = 'summary'
}

function backToExamDetail() {
  selectedSubject.value = ''
  academicsLevel.value = 'exam'
}

const canEnterMarks = computed(() =>
  subjectReports.value.some((r) => r.canTeacherMark),
)

const markableSubjects = computed(() =>
  subjectReports.value.filter((r) => r.canTeacherMark),
)

function submitSubjectMark() {
  if (!bundle.value) return
  const subject = markForm.subject || markableSubjects.value[0]?.subject || ''
  if (!subject) {
    toast.error('Pick a subject')
    return
  }
  const report = subjectReports.value.find((r) => r.subject === subject)
  if (!report?.canTeacherMark) {
    toast.error('Your role cannot enter marks for this subject')
    return
  }
  const examBase = markForm.exam.trim() || activeExamReport.value?.examKey || ''
  if (!examBase) {
    toast.error('Enter an exam name (e.g. Term II EOT)')
    return
  }
  const examName = examBase.includes('·')
    ? examBase
    : `${examBase} · ${subject}`
  savingMark.value = true
  try {
    saveStudentSubjectMark({
      student: bundle.value.student,
      subject,
      exam: examName,
      score: Number(markForm.score),
      maxScore: Number(markForm.maxScore) || 100,
    })
    toast.success(`Saved ${subject} under ${examBase}`)
    selectedExam.value = examBase.includes('·')
      ? examBase.split(/·|—/)[0].trim()
      : examBase
    markForm.score = 0
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save mark')
  } finally {
    savingMark.value = false
  }
}

function openGradebook() {
  pushWithReturn(router, {
    path: '/gradebook',
    query: { tab: 'marks' },
  })
}

function examAverageLabel(report: ExamReport) {
  return report.average != null ? `${report.average}% avg` : 'No average'
}

function aggregateTheme(agg: string) {
  const a = String(agg || '')
  if (['D1', 'D2', 'Exceeding', 'Secure'].includes(a)) return 'green'
  if (['C3', 'C4', 'C5', 'Developing'].includes(a)) return 'blue'
  if (['C6', 'P7'].includes(a)) return 'amber'
  if (['P8', 'F9', 'Emerging'].includes(a)) return 'red'
  return 'gray'
}

function attendancePercentTheme(pct: number | null) {
  if (pct == null) return 'gray'
  if (pct >= 90) return 'green'
  if (pct >= 75) return 'blue'
  if (pct >= 60) return 'amber'
  return 'red'
}

type AttCalView = 'day' | 'week' | 'month' | 'term'

const attCalView = ref<AttCalView>('month')
const attCalViews = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Term', value: 'term' },
]
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const attCursor = ref(new Date(2026, 10, 1))
const attSelectedDay = ref('2026-11-13')
const attTermId = ref('')

const attByDate = computed(() =>
  student.value ? attendanceStatusByDate(student.value) : new Map(),
)

const attTerms = computed(() => academicTermsList())

watch(
  attTerms,
  (list) => {
    if (!attTermId.value && list.length) {
      const open = list.find((t) => String(t.status) === 'Open') || list[0]
      attTermId.value = open?.id || ''
    }
  },
  { immediate: true },
)

const attActiveTerm = computed(
  () => attTerms.value.find((t) => t.id === attTermId.value) || null,
)

const attMonthLabel = computed(() =>
  attCursor.value.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  }),
)

const attWeekLabel = computed(() => {
  const mon = weekAttendanceCells(attCursor.value, attByDate.value)[0]
  const sun = weekAttendanceCells(attCursor.value, attByDate.value)[6]
  if (!mon || !sun) return ''
  const a = parseIsoDate(mon.key)
  const b = parseIsoDate(sun.key)
  return `${a.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
})

const attMonthCells = computed(() =>
  monthAttendanceCells(
    attCursor.value.getFullYear(),
    attCursor.value.getMonth(),
    attByDate.value,
  ),
)

const attWeekCells = computed(() =>
  weekAttendanceCells(attCursor.value, attByDate.value),
)

const attTermCells = computed(() => {
  const t = attActiveTerm.value
  if (!t?.start || !t?.end) return []
  return termAttendanceCells(
    String(t.start).slice(0, 10),
    String(t.end).slice(0, 10),
    attByDate.value,
  )
})

const attSelectedRow = computed(
  () => attByDate.value.get(attSelectedDay.value) || null,
)

const attSelectedLabel = computed(() => {
  const d = parseIsoDate(attSelectedDay.value)
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const attVisibleRangeStats = computed(() => {
  const cells =
    attCalView.value === 'week'
      ? attWeekCells.value
      : attCalView.value === 'term'
        ? attTermCells.value
        : attMonthCells.value
  const marked = cells.filter((c) => c.inRange && c.status)
  const present = marked.filter((c) =>
    ['Present', 'Late'].includes(String(c.status)),
  ).length
  const total = marked.length
  return {
    present,
    total,
    percent: total ? Math.round((present / total) * 100) : null,
  }
})

function attPrev() {
  if (attCalView.value === 'day') {
    const d = parseIsoDate(attSelectedDay.value)
    d.setDate(d.getDate() - 1)
    attSelectedDay.value = isoDate(d)
    attCursor.value = d
    return
  }
  if (attCalView.value === 'week') {
    const d = new Date(attCursor.value)
    d.setDate(d.getDate() - 7)
    attCursor.value = d
    return
  }
  if (attCalView.value === 'term') {
    const idx = attTerms.value.findIndex((t) => t.id === attTermId.value)
    const next = attTerms.value[idx + 1]
    if (next) attTermId.value = next.id
    return
  }
  attCursor.value = new Date(
    attCursor.value.getFullYear(),
    attCursor.value.getMonth() - 1,
    1,
  )
}

function attNext() {
  if (attCalView.value === 'day') {
    const d = parseIsoDate(attSelectedDay.value)
    d.setDate(d.getDate() + 1)
    attSelectedDay.value = isoDate(d)
    attCursor.value = d
    return
  }
  if (attCalView.value === 'week') {
    const d = new Date(attCursor.value)
    d.setDate(d.getDate() + 7)
    attCursor.value = d
    return
  }
  if (attCalView.value === 'term') {
    const idx = attTerms.value.findIndex((t) => t.id === attTermId.value)
    const next = attTerms.value[idx - 1]
    if (next) attTermId.value = next.id
    return
  }
  attCursor.value = new Date(
    attCursor.value.getFullYear(),
    attCursor.value.getMonth() + 1,
    1,
  )
}

function attSelectDay(key: string, inRange: boolean) {
  if (!inRange) return
  attSelectedDay.value = key
  attCursor.value = parseIsoDate(key)
}

function attToneClass(status: string | null) {
  return `school-att-day--${attendanceStatusTone(status)}`
}


function editStudent() {
  if (!bundle.value) return
  openEditDialog('students', bundle.value.student)
}

function confirmDelete() {
  const student = bundle.value?.student
  if (!student) return
  dialog.danger({
    title: '⚠️ Delete student?',
    message: `Warning: you are about to permanently delete “${student.name}” (${student.id}). Guardians and cases stay in their lists but will no longer link here.\n\nThis cannot be undone.`,
    confirmLabel: 'Yes, delete forever',
    cancelLabel: 'Keep student',
    onConfirm: async () => {
      await deleteRecords('students', [student.id])
      toast.warning(`Student “${student.name}” deleted`)
      await router.push(personListPath('students'))
    },
  })
}

function openRow(moduleKey: string, row: CatalogRow) {
  pushWithReturn(router, `/${moduleKey}/${row.id}`)
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
  <PageHeader class="school-detail-header">
    <AppBackButton fallback="/students" />
  </PageHeader>

  <div class="school-page">
    <div
      v-if="!bundle"
      class="rounded-6 border border-outline-gray-1 px-4 py-16 text-center text-ink-gray-5"
    >
      <p class="text-sm">Student not found.</p>
      <Button class="mt-4" label="Back to students" @click="goBack" />
    </div>

    <template v-else>
      <section class="school-detail-hero">
        <div class="school-detail-hero__main">
          <PersonPhotoUpload
            :person="bundle.student"
            module-key="students"
            folder="Photos/students"
            size="xl"
            :can-edit="canWrite"
            class="school-person-avatar--hero"
          />
          <div class="school-detail-hero__text">
            <p class="school-detail-hero__meta">
              Learner
              {{
                bundle.student.learnerNumber ||
                bundle.student.studentNumber ||
                bundle.student.id
              }}
              · Student
              {{ bundle.student.studentNumber || bundle.student.id }}
              <template v-if="bundle.student.schoolPayAccount">
                · School Pay {{ bundle.student.schoolPayAccount }}
              </template>
            </p>
            <h1
              class="school-detail-hero__title school-detail-hero__title--profile"
              :title="bundle.student.name"
            >
              {{ bundle.student.name }}
            </h1>
            <p class="school-detail-hero__sub">
              {{ bundle.student.subtitle || bundle.student.className }}
            </p>
            <div class="school-detail-hero__badges">
              <Badge
                :label="`LN ${bundle.student.learnerNumber || bundle.student.id}`"
                theme="gray"
                variant="subtle"
              />
              <Badge
                :label="`SN ${bundle.student.studentNumber || bundle.student.id}`"
                theme="blue"
                variant="subtle"
              />
              <Badge
                v-if="bundle.student.schoolPayAccount"
                :label="`Pay ${bundle.student.schoolPayAccount}`"
                theme="green"
                variant="subtle"
              />
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
                v-if="bundle.student.tribe"
                :label="String(bundle.student.tribe)"
                theme="amber"
                variant="subtle"
              />
              <Badge
                v-if="bundle.student.religion"
                :label="String(bundle.student.religion)"
                theme="violet"
                variant="subtle"
              />
              <Badge
                v-if="bundle.stats.average !== null"
                :label="`${bundle.stats.average}% avg`"
                theme="gray"
                variant="subtle"
              />
              <Badge
                v-if="bundle.stats.classPosition"
                :label="`Pos ${bundle.stats.classPosition}`"
                theme="green"
                variant="subtle"
              />
            </div>
          </div>
        </div>
        <div class="school-detail-hero__actions">
          <Button
            v-if="canWrite"
            icon-left="lucide-pencil"
            label="Edit"
            @click="editStudent"
          />
          <Button
            v-if="canDelete"
            icon-left="lucide-trash-2"
            label="Delete"
            theme="red"
            @click="confirmDelete"
          />
        </div>
      </section>

      <div class="school-card-grid sm:grid-cols-2 lg:grid-cols-6">
        <div class="school-card space-y-1">
          <p class="text-xs uppercase tracking-wide text-ink-gray-5">
            Class position
          </p>
          <p class="text-xl-semibold text-ink-gray-9">
            {{ bundle.stats.classPosition || '—' }}
          </p>
          <p class="text-xs text-ink-gray-5">by performance</p>
        </div>
        <div class="school-card space-y-1">
          <p class="text-xs uppercase tracking-wide text-ink-gray-5">Subjects</p>
          <p class="text-xl-semibold text-ink-gray-9">
            {{ bundle.stats.subjectCount }}
          </p>
          <p class="text-xs text-ink-gray-5">
            {{
              bundle.stats.average != null
                ? `${bundle.stats.average}% avg`
                : 'taken'
            }}
          </p>
        </div>
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
            {{
              bundle.stats.attendancePercent != null
                ? `${bundle.stats.attendancePercent}%`
                : '—'
            }}
          </p>
          <p class="text-xs text-ink-gray-5">
            {{ bundle.stats.attendancePresent }}/{{
              bundle.stats.attendanceTotal || '—'
            }}
            days
          </p>
        </div>
        <div class="school-card space-y-1">
          <p class="text-xs uppercase tracking-wide text-ink-gray-5">Fees due</p>
          <p class="text-xl-semibold text-ink-gray-9">{{ bundle.stats.unpaidFees }}</p>
        </div>
      </div>

      <TabButtons v-model="tab" :options="tabs" />

      <!-- In-depth biodata -->
      <section v-if="tab === 'biodata'" class="space-y-4">
        <div class="school-section">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="school-section-title mb-0">Personal biodata</h2>
            <Button
              v-if="canWrite"
              icon-left="lucide-pencil"
              label="Edit biodata"
              @click="editStudent"
            />
          </div>
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
          <h2 class="school-section-title">School placement</h2>
          <dl class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in schoolFields"
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
              <dd class="mt-1 whitespace-pre-wrap text-sm text-ink-gray-9">
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- Overview -->
      <section v-else-if="tab === 'overview'" class="school-section">
        <h2 class="school-section-title">At a glance</h2>
        <div class="school-detail-grid">
          <div
            v-for="field in [
              { label: 'Student number', value: bundle.student.id },
              { label: 'Class', value: String(bundle.student.className || '—') },
              { label: 'Section', value: String(bundle.student.program || '—') },
              { label: 'Average %', value: String(bundle.student.average ?? '—') },
              { label: 'Gender', value: String(bundle.student.gender || '—') },
              {
                label: 'Date of birth',
                value: String(bundle.student.dateOfBirth || '—'),
              },
              {
                label: 'Class teacher',
                value: String(bundle.classInfo?.teacher || '—'),
              },
              { label: 'Status', value: String(bundle.student.status || '—') },
            ]"
            :key="field.label"
            class="school-detail-field"
          >
            <p class="school-detail-field__label">{{ field.label }}</p>
            <p class="school-detail-field__value">{{ field.value }}</p>
          </div>
        </div>

        <div class="grid gap-4 pt-2 lg:grid-cols-2">
          <div class="space-y-3">
            <h3 class="text-sm-semibold text-ink-gray-9">Guardians</h3>
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
            <h3 class="text-sm-semibold text-ink-gray-9">Disciplinary cases</h3>
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
              <PersonAvatar :person="g" size="lg" />
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

      <!-- Academics: term filter → subjects/aggregates → exam → subject -->
      <section v-else-if="tab === 'academics'" class="school-section space-y-5">
        <div class="school-page-toolbar">
          <div class="school-page-toolbar__grow">
            <h2 class="school-section-title mb-0">Subjects & aggregates</h2>
            <p class="mt-1 text-sm text-ink-gray-5">
              Filter by term · open an exam · then a subject ·
              {{ filteredExamReports.length }} exam{{
                filteredExamReports.length === 1 ? '' : 's'
              }}
              shown
            </p>
          </div>
          <Button
            v-if="canPrint"
            icon-left="lucide-printer"
            label="Report card"
            @click="printReportCard"
          />
          <Button
            icon-left="lucide-table-2"
            label="Class gradebook"
            @click="openGradebook"
          />
        </div>

        <!-- Term filter -->
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-6 border px-3.5 py-2 text-sm transition"
            :class="
              selectedTerm === 'all'
                ? 'border-[color:var(--school-blue)] bg-surface-gray-1 font-medium text-ink-gray-9'
                : 'border-outline-gray-1 bg-surface-white text-ink-gray-7 hover:border-outline-gray-3'
            "
            @click="selectedTerm = 'all'"
          >
            All terms
          </button>
          <button
            v-for="term in availableTerms"
            :key="term"
            type="button"
            class="rounded-6 border px-3.5 py-2 text-sm transition"
            :class="
              selectedTerm === term
                ? 'border-[color:var(--school-blue)] bg-surface-gray-1 font-medium text-ink-gray-9'
                : 'border-outline-gray-1 bg-surface-white text-ink-gray-7 hover:border-outline-gray-3'
            "
            @click="selectedTerm = term"
          >
            {{ term }}
          </button>
        </div>

        <!-- Breadcrumb when drilled in -->
        <div
          v-if="academicsLevel !== 'summary'"
          class="flex flex-wrap items-center gap-2 text-sm"
        >
          <button
            type="button"
            class="text-[color:var(--school-blue)] hover:underline"
            @click="backToAcademicsSummary"
          >
            {{ selectedTerm === 'all' ? 'All terms' : selectedTerm }}
          </button>
          <span class="text-ink-gray-4">/</span>
          <button
            v-if="academicsLevel === 'subject'"
            type="button"
            class="text-[color:var(--school-blue)] hover:underline"
            @click="backToExamDetail"
          >
            {{ activeExamReport?.exam || 'Exam' }}
          </button>
          <span v-if="academicsLevel === 'subject'" class="text-ink-gray-4"
            >/</span
          >
          <span class="font-medium text-ink-gray-9">
            {{
              academicsLevel === 'exam'
                ? activeExamReport?.exam
                : selectedSubject
            }}
          </span>
        </div>

        <!-- LEVEL: term summary (aggregates + exam list) -->
        <template v-if="academicsLevel === 'summary'">
          <div
            v-if="academicSummary"
            class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div
              v-if="selectedTerm === 'all'"
              class="rounded-6 border border-[color:var(--school-blue)] bg-surface-white p-4 sm:col-span-2 lg:col-span-1"
            >
              <p class="text-xs uppercase tracking-wide text-ink-gray-5">
                Class position
              </p>
              <p class="mt-1 text-xl font-semibold text-ink-gray-9">
                {{ academicSummary.classPosition?.label || '—' }}
              </p>
              <p class="text-xs text-ink-gray-5">
                {{
                  academicSummary.classPosition
                    ? `in ${academicSummary.classPosition.className} · by performance`
                    : 'needs marks to rank'
                }}
              </p>
            </div>
            <div
              class="rounded-6 border border-outline-gray-1 bg-surface-white p-4"
            >
              <p class="text-xs uppercase tracking-wide text-ink-gray-5">
                Subjects
              </p>
              <p class="mt-1 text-xl font-semibold text-ink-gray-9">
                {{ academicSummary.subjectsMarked }}/{{
                  academicSummary.subjectsTotal
                }}
              </p>
              <p class="text-xs text-ink-gray-5">
                {{
                  selectedTerm === 'all'
                    ? 'with marks'
                    : `marked in ${selectedTerm}`
                }}
              </p>
            </div>
            <div
              class="rounded-6 border border-outline-gray-1 bg-surface-white p-4"
            >
              <p class="text-xs uppercase tracking-wide text-ink-gray-5">
                Overall average
              </p>
              <p class="mt-1 text-xl font-semibold text-ink-gray-9">
                {{
                  academicSummary.overallAverage != null
                    ? `${academicSummary.overallAverage}%`
                    : '—'
                }}
              </p>
              <p class="text-xs text-ink-gray-5">across marked subjects</p>
            </div>
            <div
              class="rounded-6 border border-outline-gray-1 bg-surface-white p-4"
            >
              <p class="text-xs uppercase tracking-wide text-ink-gray-5">
                {{
                  academicSummary.isNursery
                    ? 'Readiness band'
                    : 'Total aggregate'
                }}
              </p>
              <p class="mt-1 text-xl font-semibold text-ink-gray-9">
                {{
                  academicSummary.isNursery
                    ? academicSummary.divisionOrBand
                    : academicSummary.totalAggregate != null
                      ? academicSummary.totalAggregate
                      : '—'
                }}
              </p>
              <p class="text-xs text-ink-gray-5">
                {{
                  academicSummary.isNursery
                    ? 'nursery descriptors'
                    : 'sum of D1–F9 points'
                }}
              </p>
            </div>
            <div
              class="rounded-6 border border-outline-gray-1 bg-surface-white p-4"
            >
              <p class="text-xs uppercase tracking-wide text-ink-gray-5">
                {{ academicSummary.isNursery ? 'Band' : 'Division' }}
              </p>
              <p class="mt-1 text-xl font-semibold text-ink-gray-9">
                {{ academicSummary.divisionOrBand }}
              </p>
              <p class="text-xs text-ink-gray-5">
                {{
                  academicSummary.isNursery
                    ? 'from average %'
                    : 'PLE-style division'
                }}
              </p>
            </div>
          </div>

          <div
            class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
          >
            <div
              class="border-b border-outline-gray-1 bg-surface-gray-1 px-4 py-2.5"
            >
              <h3 class="text-sm font-semibold text-ink-gray-9">
                Subjects
                <span v-if="selectedTerm !== 'all'" class="font-normal text-ink-gray-5">
                  · {{ selectedTerm }}
                </span>
              </h3>
            </div>
            <div
              class="grid gap-2 border-b border-outline-gray-1 bg-surface-gray-1 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-gray-5"
              :class="
                academicSummary?.isNursery
                  ? 'grid-cols-[minmax(0,1.4fr)_minmax(0,0.55fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_auto]'
                  : 'grid-cols-[minmax(0,1.3fr)_minmax(0,0.5fr)_minmax(0,0.55fr)_minmax(0,0.45fr)_minmax(0,0.5fr)_auto]'
              "
            >
              <span>Subject</span>
              <span>Avg %</span>
              <span>{{
                academicSummary?.isNursery ? 'Band' : 'Aggregate'
              }}</span>
              <span v-if="!academicSummary?.isNursery">Points</span>
              <span>Papers</span>
              <span />
            </div>
            <button
              v-for="row in academicSummary?.subjects || []"
              :key="row.subject"
              type="button"
              class="grid w-full items-center gap-2 border-b border-outline-gray-1 px-4 py-2.5 text-left last:border-b-0 hover:bg-surface-gray-1"
              :class="
                academicSummary?.isNursery
                  ? 'grid-cols-[minmax(0,1.4fr)_minmax(0,0.55fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_auto]'
                  : 'grid-cols-[minmax(0,1.3fr)_minmax(0,0.5fr)_minmax(0,0.55fr)_minmax(0,0.45fr)_minmax(0,0.5fr)_auto]'
              "
              @click="openSubjectFromSummary(row.subject)"
            >
              <div class="min-w-0">
                <p class="text-sm text-ink-gray-9">
                  {{ row.subject }}
                  <span v-if="row.code" class="text-xs text-ink-gray-5">
                    · {{ row.code }}
                  </span>
                </p>
                <p class="truncate text-xs text-ink-gray-5">
                  {{ row.teacher }}
                </p>
              </div>
              <span class="text-sm text-ink-gray-8">
                {{ row.average != null ? `${row.average}%` : '—' }}
              </span>
              <Badge
                :label="row.aggregate"
                :theme="aggregateTheme(row.aggregate)"
                variant="subtle"
              />
              <span
                v-if="!academicSummary?.isNursery"
                class="text-sm text-ink-gray-7"
              >
                {{ row.points != null ? row.points : '—' }}
              </span>
              <span class="text-sm text-ink-gray-7">{{ row.papers }}</span>
              <span class="text-xs text-ink-gray-5">Open</span>
            </button>
            <p
              v-if="!academicSummary?.subjects.length"
              class="px-4 py-10 text-center text-sm text-ink-gray-5"
            >
              No subjects linked for this learner’s section yet.
            </p>
          </div>

          <div v-if="filteredExamReports.length" class="space-y-3">
            <h3 class="text-sm font-semibold text-ink-gray-9">
              Exams
              <span v-if="selectedTerm !== 'all'" class="font-normal text-ink-gray-5">
                · {{ selectedTerm }}
              </span>
            </h3>
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                v-for="exam in filteredExamReports"
                :key="exam.examKey"
                type="button"
                class="rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3.5 text-left transition hover:border-[color:var(--school-blue)]"
                @click="openExamDetail(exam.examKey)"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="text-sm font-medium text-ink-gray-9">
                      {{ exam.exam }}
                    </p>
                    <p class="mt-0.5 text-xs text-ink-gray-5">
                      {{ exam.term }}
                      <span v-if="exam.date"> · {{ exam.date }}</span>
                    </p>
                  </div>
                  <Badge
                    :label="examAverageLabel(exam)"
                    :theme="exam.average != null ? 'blue' : 'gray'"
                    variant="subtle"
                  />
                </div>
                <p class="mt-2 text-xs text-ink-gray-5">
                  {{ exam.subjectCount }} subject{{
                    exam.subjectCount === 1 ? '' : 's'
                  }}
                  · open for detail
                </p>
              </button>
            </div>
          </div>
          <p
            v-else
            class="rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-10 text-center text-sm text-ink-gray-5"
          >
            No exams posted
            {{ selectedTerm === 'all' ? 'yet' : `for ${selectedTerm}` }}.
          </p>
        </template>

        <!-- LEVEL: exam detail -->
        <div
          v-else-if="academicsLevel === 'exam' && activeExamReport"
          class="space-y-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Button
                label="Back to subjects"
                icon-left="lucide-arrow-left"
                class="mb-3"
                @click="backToAcademicsSummary"
              />
              <h3 class="text-base font-semibold text-ink-gray-9">
                {{ activeExamReport.exam }}
              </h3>
              <p class="text-sm text-ink-gray-5">
                {{ activeExamReport.term }} · click a subject for detail
                <span v-if="activeExamReport.date">
                  · {{ activeExamReport.date }}
                </span>
              </p>
            </div>
            <Badge
              :label="
                activeExamReport.average != null
                  ? `Exam avg ${activeExamReport.average}%`
                  : 'No average'
              "
              theme="blue"
              variant="subtle"
            />
          </div>

          <div class="overflow-hidden rounded-5 border border-outline-gray-1">
            <div
              class="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.55fr)_minmax(0,0.45fr)_minmax(0,0.5fr)_auto] gap-2 border-b border-outline-gray-1 bg-surface-gray-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-gray-5"
            >
              <span>Subject</span>
              <span>Score</span>
              <span>%</span>
              <span>Grade</span>
              <span />
            </div>
            <button
              v-for="m in activeExamReport.subjects"
              :key="m.id"
              type="button"
              class="grid w-full grid-cols-[minmax(0,1.3fr)_minmax(0,0.55fr)_minmax(0,0.45fr)_minmax(0,0.5fr)_auto] items-center gap-2 border-b border-outline-gray-1 px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-gray-1"
              @click="openSubjectDetail(m.subject)"
            >
              <span class="text-sm text-ink-gray-9">{{ m.subject }}</span>
              <span class="text-sm text-ink-gray-7"
                >{{ m.score }}/{{ m.maxScore }}</span
              >
              <span class="text-sm text-ink-gray-7">{{ m.percent }}%</span>
              <Badge
                :label="m.grade"
                :theme="statusTheme(m.status)"
                variant="subtle"
              />
              <span class="text-xs text-ink-gray-5">Detail</span>
            </button>
          </div>

          <div
            v-if="canEnterMarks"
            class="space-y-3 rounded-5 border border-dashed border-outline-gray-2 bg-surface-gray-1 p-4"
          >
            <p class="text-sm-medium text-ink-gray-8">
              Enter mark for this exam
            </p>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormControl
                v-model="markForm.exam"
                label="Exam"
                type="text"
                :placeholder="activeExamReport.exam"
              />
              <FormControl
                v-model="markForm.subject"
                label="Subject"
                type="select"
                :options="
                  markableSubjects.map((r) => ({
                    label: r.subject,
                    value: r.subject,
                  }))
                "
              />
              <FormControl
                v-model="markForm.maxScore"
                label="Max score"
                type="number"
              />
              <FormControl
                v-model="markForm.score"
                label="Score"
                type="number"
              />
            </div>
            <Button
              variant="solid"
              icon-left="lucide-check"
              label="Save exam subject mark"
              :loading="savingMark"
              @click="submitSubjectMark"
            />
          </div>
        </div>

        <!-- LEVEL: subject detail -->
        <div
          v-else-if="academicsLevel === 'subject'"
          class="space-y-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
        >
          <Button
            label="Back to exam"
            icon-left="lucide-arrow-left"
            @click="backToExamDetail"
          />
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-ink-gray-9">
                {{ selectedSubject }}
              </h3>
              <p class="text-sm text-ink-gray-5">
                <span v-if="activeSubjectReport?.teacher">
                  {{ activeSubjectReport.teacher }} ·
                </span>
                {{ activeExamReport?.exam || 'Subject detail' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Badge
                v-if="activeSubjectMark"
                :label="`${activeSubjectMark.percent}%`"
                theme="blue"
                variant="subtle"
              />
              <Badge
                v-if="activeSubjectMark"
                :label="activeSubjectMark.grade"
                :theme="statusTheme(activeSubjectMark.status)"
                variant="subtle"
              />
            </div>
          </div>

          <div
            v-if="activeSubjectMark"
            class="grid gap-3 sm:grid-cols-3"
          >
            <div class="rounded-5 border border-outline-gray-1 p-3">
              <p class="text-xs uppercase text-ink-gray-5">Score</p>
              <p class="mt-1 text-lg font-semibold text-ink-gray-9">
                {{ activeSubjectMark.score }}/{{ activeSubjectMark.maxScore }}
              </p>
            </div>
            <div class="rounded-5 border border-outline-gray-1 p-3">
              <p class="text-xs uppercase text-ink-gray-5">Percent</p>
              <p class="mt-1 text-lg font-semibold text-ink-gray-9">
                {{ activeSubjectMark.percent }}%
              </p>
            </div>
            <div class="rounded-5 border border-outline-gray-1 p-3">
              <p class="text-xs uppercase text-ink-gray-5">Grade</p>
              <p class="mt-1 text-lg font-semibold text-ink-gray-9">
                {{ activeSubjectMark.grade }}
              </p>
            </div>
          </div>

          <div v-if="canPrintResults && activeSubjectResult">
            <Button
              icon-left="lucide-printer"
              label="Print exam memo"
              @click="
                printDoc('exam-memo', 'exam-results', activeSubjectResult!)
              "
            />
          </div>

          <div v-if="subjectMarksInTerm.length" class="space-y-2">
            <h4 class="text-sm font-semibold text-ink-gray-9">
              All papers in
              {{ selectedTerm === 'all' ? 'all terms' : selectedTerm }}
            </h4>
            <div class="overflow-hidden rounded-5 border border-outline-gray-1">
              <div
                v-for="m in subjectMarksInTerm"
                :key="m.id"
                class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-3 py-2.5 last:border-b-0"
                :class="
                  activeSubjectMark?.id === m.id
                    ? 'bg-surface-gray-1'
                    : 'bg-surface-white'
                "
              >
                <div>
                  <p class="text-sm text-ink-gray-9">{{ m.examKey }}</p>
                  <p class="text-xs text-ink-gray-5">
                    {{ m.score }}/{{ m.maxScore }} · {{ m.percent }}%
                  </p>
                </div>
                <Badge
                  :label="m.grade"
                  :theme="statusTheme(m.status)"
                  variant="subtle"
                />
              </div>
            </div>
          </div>
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

      <!-- Attendance calendar: day / week / month / term -->
      <section v-else-if="tab === 'attendance'" class="school-section space-y-5">
        <div>
          <h2 class="school-section-title mb-0">Attendance</h2>
          <p class="mt-1 text-sm text-ink-gray-5">
            Calendar by day, week, month, or term · Present + Late count as
            attended
          </p>
        </div>

        <div
          v-if="bundle.attendanceSummary"
          class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div
            class="rounded-6 border border-[color:var(--school-blue)] bg-surface-white p-4"
          >
            <p class="text-xs uppercase tracking-wide text-ink-gray-5">
              Overall
            </p>
            <p class="mt-1 text-2xl font-semibold text-ink-gray-9">
              {{
                bundle.attendanceSummary.overall.percent != null
                  ? `${bundle.attendanceSummary.overall.percent}%`
                  : '—'
              }}
            </p>
            <p class="text-xs text-ink-gray-5">
              {{ bundle.attendanceSummary.overall.present }}/{{
                bundle.attendanceSummary.overall.total
              }}
              school days
            </p>
          </div>
          <div
            v-for="t in bundle.attendanceSummary.byTerm.slice(0, 3)"
            :key="t.key"
            class="rounded-6 border border-outline-gray-1 bg-surface-white p-4"
          >
            <p class="text-xs uppercase tracking-wide text-ink-gray-5">
              {{ t.label }}
            </p>
            <p class="mt-1 text-2xl font-semibold text-ink-gray-9">
              {{ t.percent != null ? `${t.percent}%` : '—' }}
            </p>
            <p class="text-xs text-ink-gray-5">
              {{ t.present }}/{{ t.total }} days
            </p>
          </div>
        </div>

        <TabButtons
          v-model="attCalView"
          :options="attCalViews"
          class="school-tabs"
        />

        <div class="school-page-toolbar">
          <Button icon="lucide-chevron-left" @click="attPrev" />
          <p class="school-page-toolbar__meta school-page-toolbar__grow text-sm-medium text-ink-gray-9">
            <template v-if="attCalView === 'day'">{{ attSelectedLabel }}</template>
            <template v-else-if="attCalView === 'week'">{{ attWeekLabel }}</template>
            <template v-else-if="attCalView === 'month'">{{ attMonthLabel }}</template>
            <template v-else>
              {{ attActiveTerm?.name || 'Term' }}
              <span v-if="attActiveTerm?.year"> {{ attActiveTerm.year }}</span>
            </template>
          </p>
          <FormControl
            v-if="attCalView === 'term'"
            v-model="attTermId"
            type="select"
            class="min-w-[10rem]"
            :options="
              attTerms.map((t) => ({
                label: `${t.name} ${t.year || ''}`.trim(),
                value: t.id,
              }))
            "
          />
          <Button icon="lucide-chevron-right" @click="attNext" />
          <Badge
            v-if="attCalView !== 'day' && attVisibleRangeStats.percent != null"
            :label="`${attVisibleRangeStats.percent}%`"
            :theme="attendancePercentTheme(attVisibleRangeStats.percent)"
            variant="subtle"
          />
        </div>

        <!-- Day view -->
        <div
          v-if="attCalView === 'day'"
          class="rounded-6 border border-outline-gray-1 bg-surface-white p-5"
        >
          <p class="text-sm text-ink-gray-5">{{ attSelectedLabel }}</p>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <Badge
              v-if="attSelectedRow"
              :label="String(attSelectedRow.status)"
              :theme="statusTheme(String(attSelectedRow.status))"
              variant="subtle"
            />
            <p v-else class="text-sm text-ink-gray-5">No mark recorded</p>
            <p v-if="attSelectedRow?.className" class="text-sm text-ink-gray-6">
              {{ attSelectedRow.className }}
              <span v-if="attSelectedRow.session">
                · {{ attSelectedRow.session }}
              </span>
            </p>
          </div>
          <p
            v-if="attSelectedRow?.subtitle"
            class="mt-2 text-sm text-ink-gray-6"
          >
            {{ attSelectedRow.subtitle }}
          </p>
        </div>

        <!-- Week strip -->
        <div
          v-else-if="attCalView === 'week'"
          class="grid grid-cols-7 gap-2"
        >
          <button
            v-for="cell in attWeekCells"
            :key="cell.key"
            type="button"
            class="school-att-day"
            :class="[
              attToneClass(cell.status),
              cell.key === attSelectedDay ? 'school-att-day--selected' : '',
              cell.isWeekend ? 'school-att-day--weekend' : '',
            ]"
            @click="attSelectDay(cell.key, true)"
          >
            <span class="school-att-day__dow">{{
              WEEKDAY_LABELS[
                (parseIsoDate(cell.key).getDay() + 6) % 7
              ]
            }}</span>
            <span class="school-att-day__num">{{ cell.day }}</span>
            <span class="school-att-day__status">{{
              cell.status ? String(cell.status).slice(0, 1) : '·'
            }}</span>
          </button>
        </div>

        <!-- Month / Term grid -->
        <div v-else class="space-y-2">
          <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink-gray-5">
            <span v-for="d in WEEKDAY_LABELS" :key="d">{{ d }}</span>
          </div>
          <div class="grid grid-cols-7 gap-1">
            <button
              v-for="cell in attCalView === 'month' ? attMonthCells : attTermCells"
              :key="cell.key"
              type="button"
              class="school-att-day"
              :class="[
                attToneClass(cell.status),
                cell.inRange ? '' : 'school-att-day--muted',
                cell.key === attSelectedDay ? 'school-att-day--selected' : '',
                cell.isWeekend ? 'school-att-day--weekend' : '',
              ]"
              :disabled="!cell.inRange"
              @click="attSelectDay(cell.key, cell.inRange)"
            >
              <span class="school-att-day__num">{{ cell.day }}</span>
              <span v-if="cell.status" class="school-att-day__dot" />
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-3 text-xs text-ink-gray-6">
          <span class="inline-flex items-center gap-1.5">
            <span class="school-att-legend school-att-day--present" /> Present
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="school-att-legend school-att-day--late" /> Late
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="school-att-legend school-att-day--absent" /> Absent
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="school-att-legend school-att-day--excused" /> Excused
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="school-att-legend school-att-day--empty" /> No mark
          </span>
        </div>

        <!-- Weekday % summary -->
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            class="border-b border-outline-gray-1 bg-surface-gray-1 px-4 py-2.5"
          >
            <h3 class="text-sm font-semibold text-ink-gray-9">
              By day of the week
            </h3>
          </div>
          <div class="grid gap-3 p-4 sm:grid-cols-5">
            <div
              v-for="d in bundle.attendanceSummary.byWeekday"
              :key="d.key"
              class="space-y-2"
            >
              <div class="flex items-baseline justify-between gap-1">
                <p class="text-xs font-medium text-ink-gray-7">
                  {{ d.label.slice(0, 3) }}
                </p>
                <p class="text-sm font-semibold text-ink-gray-9">
                  {{ d.percent != null ? `${d.percent}%` : '—' }}
                </p>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-surface-gray-2">
                <div
                  class="h-full rounded-full bg-[color:var(--school-blue)] transition-all"
                  :style="{ width: `${d.percent ?? 0}%` }"
                />
              </div>
              <p class="text-[11px] text-ink-gray-5">
                {{ d.present }}/{{ d.total }}
              </p>
            </div>
          </div>
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
