<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
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
import { schoolStore, addRecord, updateRecord } from '@/data/catalog/store'
import { schoolSetup } from '@/data/school/schoolSetup'
import { brand } from '@/data/school/brand'
import { canCurrentUser } from '@/data/auth/permissions'
import { currentUser, logActivity } from '@/data/activity/activity'
import {
  isNurseryClass,
  percentToAggregate,
  percentToNurseryBand,
  sectionForGrade,
  sortSchoolClassNames,
} from '@/data/school/grades'
import ListStatCards from '@/components/list/ListStatCards.vue'
import CatalogTabDesk from '@/components/list/CatalogTabDesk.vue'
import AppBackButton from '@/components/layout/AppBackButton.vue'
import type { CatalogRow } from '@/data/catalog/catalog'
import { printExamPack, printRecordDocument } from '@/data/documents/documents'
import {
  downloadCsv,
  marksRowsToCsv,
  parseMarksCsv,
  safeCsvFilename,
} from '@/lib/marksCsv'
import { sanitizeNumber } from '@/lib/sanitize'

const router = useRouter()
const route = useRoute()

type DeskTab = 'exams' | 'marks' | 'results' | 'settings'

function parseTab(raw: unknown): DeskTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'marks' || v === 'mark') return 'marks'
  if (v === 'results' || v === 'exam-results') return 'results'
  if (v === 'settings' || v === 'exam-settings') return 'settings'
  // Legacy ?tab=create opens Class exams with the create form
  return 'exams'
}

const tab = ref<DeskTab>(parseTab(route.query.tab))
const showCreate = ref(
  ['create', 'new'].includes(String(route.query.tab || '').toLowerCase()) ||
    String(route.query.create || '') === '1',
)
const tabs = [
  { label: 'Class exams', value: 'exams' },
  { label: 'Enter marks', value: 'marks' },
  { label: 'Results', value: 'results' },
  { label: 'Settings', value: 'settings' },
]

const resultsTabs = [
  { label: 'Results', value: 'results', module: 'exam-results' },
]

const settingsTabs = [
  {
    label: 'Assessment groups',
    value: 'groups',
    module: 'assessment-groups',
  },
  {
    label: 'Assessment criteria',
    value: 'criteria',
    module: 'assessment-criteria',
  },
  {
    label: 'Grading scales',
    value: 'scales',
    module: 'grading-scales',
  },
  {
    label: 'Exam settings',
    value: 'exam-settings',
    module: 'exam-settings',
  },
]

watch(
  tab,
  (value) => {
    const query = { ...route.query, tab: value } as Record<string, string>
    if (value === 'exams') delete query.exam
    else {
      showCreate.value = false
      delete query.create
    }
    if (value === 'exams' && showCreate.value) query.create = '1'
    else delete query.create
    router.replace({ path: '/gradebook', query })
  },
  { immediate: true },
)

watch(showCreate, (open) => {
  if (tab.value !== 'exams') return
  const query = { ...route.query, tab: 'exams' } as Record<string, string>
  if (open) query.create = '1'
  else delete query.create
  router.replace({ path: '/gradebook', query })
})

watch(
  () => route.query.tab,
  (value) => {
    const raw = String(value || '').toLowerCase()
    if (raw === 'create' || raw === 'new') {
      showCreate.value = true
      if (tab.value !== 'exams') tab.value = 'exams'
      return
    }
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
    ...sortSchoolClassNames([...names]).map((n) => ({ label: n, value: n })),
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
  /** Optional diagram / stimulus image (data URL or path) */
  imageSrc?: string
  imageCaption?: string
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
  duration: '1 hour 30 minutes',
  venue: '',
  invigilator: '',
  term: schoolSetup.currentTerm || 'Term III',
  academicYear: schoolSetup.academicYear || '2026',
  /** Custom paper logo; empty = school brand logo */
  logoSrc: '',
  showLogo: true,
  showCandidateBox: true,
  showAnswerLines: true,
})

const createQuestions = ref<ExamQuestion[]>([
  { id: `q-${Date.now()}`, text: '', marks: 10 },
])

const logoInput = ref<HTMLInputElement | null>(null)
const paperImageInput = ref<HTMLInputElement | null>(null)
const imageTargetQuestionId = ref<string | null>(null)
const examFmtFocus = ref<'title' | 'instructions' | `q-${string}` | null>(null)
/** Bump to remount contenteditable fields after load (avoids cursor jump). */
const studioEpoch = ref(0)

const paperLogoSrc = computed(
  () => createForm.logoSrc || brand.logoUrl || '/little-royals-logo.png',
)

/** null = new paper; set when editing an existing exam */
const editingExamId = ref<string | null>(null)
const examDirty = ref(false)
let suppressExamDirty = false

function withExamStudioQuiet(fn: () => void) {
  suppressExamDirty = true
  fn()
  Promise.resolve().then(() => {
    suppressExamDirty = false
    examDirty.value = false
  })
}

const questionsTotal = computed(() =>
  createQuestions.value.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
)

const examPaperTitle = computed(() => {
  const n = createForm.name.trim()
  if (n) return n
  return editingExamId.value ? 'Untitled exam' : 'New exam paper'
})

const examPaperPath = computed(() => {
  const bits = [
    createForm.className || 'Class',
    createForm.course || 'Subject',
    createForm.type || 'Exam',
  ]
  return `Exams · ${bits.join(' · ')}`
})

function markExamDirty() {
  if (suppressExamDirty || !showCreate.value) return
  examDirty.value = true
}

function addQuestion() {
  createQuestions.value.push({
    id: `q-${Date.now()}-${createQuestions.value.length}`,
    text: '',
    marks: 5,
  })
  markExamDirty()
}

function removeQuestion(id: string) {
  if (createQuestions.value.length <= 1) {
    createQuestions.value[0].text = ''
    createQuestions.value[0].marks = 10
    createQuestions.value[0].imageSrc = undefined
    createQuestions.value[0].imageCaption = undefined
    markExamDirty()
    return
  }
  createQuestions.value = createQuestions.value.filter((q) => q.id !== id)
  markExamDirty()
}

function parseExamQuestions(raw: unknown): ExamQuestion[] {
  if (!raw) return [{ id: `q-${Date.now()}`, text: '', marks: 10 }]
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed) || !parsed.length) {
      return [{ id: `q-${Date.now()}`, text: '', marks: 10 }]
    }
    return parsed.map((q: Record<string, unknown>, i: number) => ({
      id: String(q.id || `q-${i + 1}`),
      text: String(q.text || ''),
      marks: Math.max(0, Number(q.marks) || 0),
      imageSrc: q.imageSrc ? String(q.imageSrc) : undefined,
      imageCaption: q.imageCaption ? String(q.imageCaption) : undefined,
    }))
  } catch {
    return [{ id: `q-${Date.now()}`, text: '', marks: 10 }]
  }
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choose an image file (PNG, JPG, WebP)'))
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error('Image must be under 4 MB'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}

async function onLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    createForm.logoSrc = await readImageFile(file)
    createForm.showLogo = true
    markExamDirty()
    toast.success('School logo updated on this paper')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Upload failed')
  }
}

function clearPaperLogo() {
  createForm.logoSrc = ''
  markExamDirty()
  toast.info('Using the default school logo')
}

function requestQuestionImage(questionId: string) {
  imageTargetQuestionId.value = questionId
  paperImageInput.value?.click()
}

function requestPaperImage() {
  const focus = examFmtFocus.value
  if (focus?.startsWith('q-')) {
    const id = focus.slice(2)
    if (createQuestions.value.some((q) => q.id === id)) {
      requestQuestionImage(id)
      return
    }
  }
  const last = createQuestions.value[createQuestions.value.length - 1]
  if (last) requestQuestionImage(last.id)
  else toast.info('Add a question first, then insert a picture')
}

async function onPaperImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const qid = imageTargetQuestionId.value
  imageTargetQuestionId.value = null
  if (!file || !qid) return
  const q = createQuestions.value.find((row) => row.id === qid)
  if (!q) return
  try {
    q.imageSrc = await readImageFile(file)
    if (!q.imageCaption) q.imageCaption = 'Figure'
    markExamDirty()
    toast.success('Image added to the question')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Upload failed')
  }
}

function removeQuestionImage(questionId: string) {
  const q = createQuestions.value.find((row) => row.id === questionId)
  if (!q) return
  q.imageSrc = undefined
  q.imageCaption = undefined
  markExamDirty()
}

/** Word-like formatting for the focused contenteditable. */
function execExamFormat(command: string, value?: string) {
  try {
    document.execCommand(command, false, value)
    markExamDirty()
  } catch {
    /* ignore */
  }
}

function onEditableInput(
  target: 'instructions' | ExamQuestion,
  event: Event,
) {
  const el = event.target as HTMLElement
  const html = el.innerHTML || ''
  const text = el.innerText || ''
  if (target === 'instructions') {
    createForm.subtitle = text.trim() ? html : ''
  } else {
    target.text = text.trim() ? html : ''
  }
  markExamDirty()
}

function resetExamStudio() {
  createForm.name = ''
  createForm.subtitle = ''
  createForm.type = 'MOT'
  createForm.maxScore = 100
  createForm.date = new Date().toISOString().slice(0, 10)
  createForm.status = 'Draft'
  createForm.duration = '1 hour 30 minutes'
  createForm.venue = ''
  createForm.invigilator = ''
  createForm.term = schoolSetup.currentTerm || 'Term III'
  createForm.academicYear = schoolSetup.academicYear || '2026'
  createForm.logoSrc = ''
  createForm.showLogo = true
  createForm.showCandidateBox = true
  createForm.showAnswerLines = true
  createQuestions.value = [{ id: `q-${Date.now()}`, text: '', marks: 10 }]
  editingExamId.value = null
  examDirty.value = false
  examFmtFocus.value = null
  studioEpoch.value += 1
}

function loadExamIntoStudio(exam: CatalogRow) {
  editingExamId.value = exam.id
  createForm.name = String(exam.name || '')
  createForm.className = String(exam.className || createForm.className)
  createForm.course = String(exam.course || createForm.course)
  createForm.type = String(exam.type || 'MOT')
  createForm.maxScore = Math.max(1, Number(exam.maxScore) || 100)
  createForm.date =
    String(exam.date || '').slice(0, 10) ||
    new Date().toISOString().slice(0, 10)
  createForm.status = String(exam.status || 'Draft')
  createForm.subtitle = String(exam.subtitle || '')
  createForm.duration = String(exam.duration || '1 hour 30 minutes')
  createForm.venue = String(exam.venue || '')
  createForm.invigilator = String(exam.invigilator || '')
  createForm.term = String(exam.term || schoolSetup.currentTerm || 'Term III')
  createForm.academicYear = String(
    exam.academicYear || schoolSetup.academicYear || '2026',
  )
  createForm.logoSrc = String(exam.logoSrc || '')
  createForm.showLogo = String(exam.showLogo ?? 'true') !== 'false'
  createForm.showCandidateBox =
    String(exam.showCandidateBox ?? 'true') !== 'false'
  createForm.showAnswerLines =
    String(exam.showAnswerLines ?? 'true') !== 'false'
  createQuestions.value = parseExamQuestions(exam.questionsJson)
  examDirty.value = false
  studioEpoch.value += 1
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
})

watch(
  () => route.query.exam,
  (examId) => {
    if (examId && typeof examId === 'string') {
      selectedExamId.value = examId
      const creating =
        String(route.query.create || '') === '1' ||
        showCreate.value
      if (creating) {
        const exam = exams.value.find((e) => e.id === examId)
        if (exam && editingExamId.value !== examId) {
          withExamStudioQuiet(() => loadExamIntoStudio(exam))
          showCreate.value = true
          tab.value = 'exams'
        }
        return
      }
      // Only jump to marks when opened with ?exam= (e.g. from an exam detail)
      if (!route.query.tab || String(route.query.tab) === 'marks') {
        tab.value = 'marks'
      }
    }
  },
  { immediate: true },
)

// Prefill marks sheet for when user opens Enter marks — do not switch tabs
if (!selectedExamId.value && exams.value[0]) {
  const open = exams.value.find((e) => e.status === 'Open') || exams.value[0]
  selectedExamId.value = open.id
}

// Default landing: Class exams
if (!route.query.tab && !route.query.exam) {
  tab.value = 'exams'
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

function openCreateForm() {
  if (!canCreate.value) {
    toast.error('Your role cannot create examinations')
    return
  }
  withExamStudioQuiet(() => {
    resetExamStudio()
    if (filterClass.value !== 'All') {
      createForm.className = filterClass.value
    } else if (
      !classSelectOptions.value.some((o) => o.value === createForm.className)
    ) {
      createForm.className = classSelectOptions.value[0]?.value || 'P.5 Blue'
    }
    const opts = createSubjectOptions.value
    if (!opts.some((o) => o.value === createForm.course)) {
      createForm.course = opts[0]?.value || 'Mathematics'
    }
  })
  showCreate.value = true
  tab.value = 'exams'
}

function openEditExam(examId: string) {
  const exam = exams.value.find((e) => e.id === examId)
  if (!exam) {
    toast.error('Exam not found')
    return
  }
  if (!canWrite.value && !canCreate.value) {
    toast.error('Your role cannot edit examinations')
    return
  }
  withExamStudioQuiet(() => loadExamIntoStudio(exam))
  showCreate.value = true
  tab.value = 'exams'
  router.replace({
    path: '/gradebook',
    query: { tab: 'exams', create: '1', exam: examId },
  })
}

function cancelCreate() {
  if (examDirty.value) {
    dialog.confirm({
      title: 'Discard exam paper?',
      message: 'You have unsaved changes. Close without saving?',
      confirmLabel: 'Discard',
      onConfirm: () => {
        resetExamStudio()
        showCreate.value = false
      },
    })
    return
  }
  resetExamStudio()
  showCreate.value = false
}

function plainFromMaybeHtml(raw: string) {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (!/<[a-z][\s\S]*>/i.test(s)) return s
  const tmp = document.createElement('div')
  tmp.innerHTML = s
  return (tmp.innerText || tmp.textContent || '').trim()
}

function collectExamQuestions() {
  return createQuestions.value
    .map((q, i) => ({
      id: q.id || `q-${i + 1}`,
      text: q.text.trim(),
      marks: Math.max(0, Number(q.marks) || 0),
      imageSrc: q.imageSrc || undefined,
      imageCaption: q.imageCaption?.trim() || undefined,
    }))
    .filter((q) => plainFromMaybeHtml(q.text).length > 0 || Boolean(q.imageSrc))
}

function saveExamPaper(asDraft: boolean) {
  const canSaveExisting =
    Boolean(editingExamId.value) && (canWrite.value || canCreate.value)
  const canSaveNew = !editingExamId.value && canCreate.value
  if (!canSaveExisting && !canSaveNew) {
    toast.error('Your role cannot save examinations')
    return
  }

  const name = plainFromMaybeHtml(createForm.name).trim()
  if (name.length < 3) {
    toast.error('Enter an examination name at the top of the paper')
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

  const questions = collectExamQuestions()
  if (!questions.length) {
    toast.error('Add at least one exam question on the paper')
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

  let status = createForm.status || 'Draft'
  if (asDraft) status = 'Draft'
  else if (status === 'Draft') status = 'Open'

  const payload = {
    name,
    className: createForm.className,
    course: createForm.course,
    type: createForm.type,
    maxScore: max,
    date: createForm.date,
    program,
    subtitle: createForm.subtitle.trim() || undefined,
    status,
    duration: createForm.duration.trim() || undefined,
    venue: createForm.venue.trim() || undefined,
    invigilator: createForm.invigilator.trim() || undefined,
    term: createForm.term.trim() || undefined,
    academicYear: createForm.academicYear.trim() || undefined,
    logoSrc: createForm.logoSrc || undefined,
    showLogo: createForm.showLogo ? 'true' : 'false',
    showCandidateBox: createForm.showCandidateBox ? 'true' : 'false',
    showAnswerLines: createForm.showAnswerLines ? 'true' : 'false',
    questionsJson: JSON.stringify(questions),
    questionCount: questions.length,
  }

  let record: CatalogRow
  if (editingExamId.value) {
    updateRecord('exams', editingExamId.value, payload)
    record =
      exams.value.find((e) => e.id === editingExamId.value) ||
      ({ id: editingExamId.value, ...payload } as CatalogRow)
    logActivity({
      action: 'Updated',
      module: 'exams',
      moduleLabel: 'Examination',
      recordId: record.id,
      recordName: name,
      summary: asDraft
        ? `Saved draft exam paper “${name}”`
        : `Saved exam paper “${name}”`,
      detail: `${questions.length} questions · max ${max}`,
      severity: 'success',
    })
    toast.success(
      asDraft
        ? `Draft saved · ${questions.length} question${questions.length === 1 ? '' : 's'}`
        : `Exam paper saved · ${questions.length} question${questions.length === 1 ? '' : 's'}`,
    )
  } else {
    record = addRecord('exams', payload)
    editingExamId.value = record.id
    logActivity({
      action: 'Created',
      module: 'exams',
      moduleLabel: 'Examination',
      recordId: record.id,
      recordName: name,
      summary: asDraft
        ? `Created draft exam “${name}”`
        : `Created exam “${name}”`,
      detail: `${questions.length} questions · max ${max}`,
      severity: 'success',
    })
    toast.success(
      asDraft
        ? `Draft “${name}” saved`
        : `Exam “${name}” saved with ${questions.length} question${questions.length === 1 ? '' : 's'}`,
    )
  }

  createForm.status = status
  examDirty.value = false
  selectedExamId.value = record.id
  filterClass.value = String(record.className || filterClass.value)

  if (!asDraft) {
    loadMarksForExam(record)
    showCreate.value = false
    resetExamStudio()
    tab.value = 'marks'
    router.replace({
      path: '/gradebook',
      query: { tab: 'marks', exam: record.id },
    })
  } else {
    router.replace({
      path: '/gradebook',
      query: { tab: 'exams', create: '1', exam: record.id },
    })
  }
}

function printExamStudioPaper() {
  const questions = collectExamQuestions()
  if (!plainFromMaybeHtml(createForm.name) || !questions.length) {
    toast.error('Save a name and at least one question before printing')
    return
  }
  const preview: CatalogRow = {
    id: editingExamId.value || 'preview',
    name: plainFromMaybeHtml(createForm.name),
    className: createForm.className,
    course: createForm.course,
    type: createForm.type,
    maxScore: questionsTotal.value || createForm.maxScore,
    date: createForm.date,
    status: createForm.status,
    subtitle: createForm.subtitle,
    duration: createForm.duration,
    venue: createForm.venue,
    logoSrc: createForm.logoSrc || paperLogoSrc.value,
    showLogo: createForm.showLogo ? 'true' : 'false',
    questionsJson: JSON.stringify(questions),
    questionCount: questions.length,
  }
  printExamPack(preview, ['paper'])
}

function onExamStudioKeydown(e: KeyboardEvent) {
  if (!showCreate.value) return
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault()
    saveExamPaper(e.shiftKey)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onExamStudioKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onExamStudioKeydown)
})

watch(
  () => [
    createForm.name,
    createForm.className,
    createForm.course,
    createForm.type,
    createForm.maxScore,
    createForm.date,
    createForm.status,
    createForm.subtitle,
    createForm.duration,
    createForm.venue,
    createForm.invigilator,
    createForm.term,
    createForm.academicYear,
    createForm.logoSrc,
    createForm.showLogo,
    createForm.showCandidateBox,
    createForm.showAnswerLines,
  ],
  () => markExamDirty(),
)

watch(
  createQuestions,
  () => markExamDirty(),
  { deep: true },
)

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

const csvInput = ref<HTMLInputElement | null>(null)
const csvImporting = ref(false)
const lastCsvReport = ref('')

function marksCsvPayload(blankScores: boolean) {
  const exam = selectedExam.value
  const max = maxScore.value
  const className = String(exam?.className || '')
  return marks.value.map((m) => {
    const student = (schoolStore.students?.rows || []).find(
      (s) => s.id === m.studentId,
    )
    return {
      studentId: m.studentId,
      learnerNumber: String(
        student?.learnerNumber || student?.studentNumber || m.studentId,
      ),
      name: m.name,
      score: blankScores ? 0 : m.score,
      maxScore: max,
      grade: blankScores ? '' : m.grade,
    }
  }).concat(
    // if no marks loaded yet, still export class roster as blank template
    marks.value.length
      ? []
      : (schoolStore.students?.rows || [])
          .filter(
            (s) =>
              String(s.className) === className && s.status === 'Active',
          )
          .map((s) => ({
            studentId: s.id,
            learnerNumber: String(
              s.learnerNumber || s.studentNumber || s.id,
            ),
            name: s.name,
            score: 0,
            maxScore: max,
            grade: '',
          })),
  )
}

function exportMarksTemplate() {
  const exam = selectedExam.value
  if (!exam) {
    toast.error('Select an examination first')
    return
  }
  const csv = marksRowsToCsv(marksCsvPayload(true), {
    exam: String(exam.name),
    className: String(exam.className || ''),
    subject: String(exam.course || ''),
  })
  const file = safeCsvFilename([
    'marks_template',
    String(exam.className || ''),
    String(exam.course || ''),
    String(exam.name),
  ])
  downloadCsv(file, csv)
  toast.success('CSV template downloaded — fill scores then Import CSV')
}

function exportCurrentMarks() {
  const exam = selectedExam.value
  if (!exam) {
    toast.error('Select an examination first')
    return
  }
  if (!marks.value.length) {
    toast.error('No learners on this mark sheet')
    return
  }
  const csv = marksRowsToCsv(marksCsvPayload(false), {
    exam: String(exam.name),
    className: String(exam.className || ''),
    subject: String(exam.course || ''),
  })
  const file = safeCsvFilename([
    'marks_export',
    String(exam.className || ''),
    String(exam.name),
  ])
  downloadCsv(file, csv)
  toast.success('Current marks exported as CSV')
}

function triggerCsvImport() {
  if (!selectedExam.value) {
    toast.error('Select an examination first')
    return
  }
  if (selectedExam.value.status === 'Closed') {
    toast.error('This exam is closed — reopen or create a new one')
    return
  }
  if (!canWrite.value && !canCreate.value) {
    toast.error('Your role cannot enter marks')
    return
  }
  csvInput.value?.click()
}

function applyCsvRows(
  parsed: ReturnType<typeof parseMarksCsv>,
): { updated: number; unmatched: string[] } {
  const exam = selectedExam.value
  if (!exam) return { updated: 0, unmatched: [] }
  const max = maxScore.value
  const className = String(exam.className || '')
  const byId = new Map(marks.value.map((m) => [m.studentId.toLowerCase(), m]))
  const byName = new Map(
    marks.value.map((m) => [m.name.toLowerCase(), m]),
  )
  const unmatched: string[] = []
  let updated = 0

  for (const row of parsed.rows) {
    const idKey = (row.studentId || row.learnerNumber || '').toLowerCase()
    const target =
      (idKey && byId.get(idKey)) ||
      (row.learnerNumber && byId.get(row.learnerNumber.toLowerCase())) ||
      (row.name && byName.get(row.name.toLowerCase())) ||
      null
    if (!target) {
      unmatched.push(row.name || row.studentId || row.learnerNumber || '?')
      continue
    }
    const score = Math.max(0, Math.min(max, Number(row.score) || 0))
    target.score = score
    target.grade = letterGrade(score, className, max)
    updated++
  }
  if (updated) dirty.value = true
  return { updated, unmatched }
}

async function onCsvFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  csvImporting.value = true
  lastCsvReport.value = ''
  try {
    const text = await file.text()
    const parsed = parseMarksCsv(text, maxScore.value)
    if (parsed.errors.length && !parsed.rows.length) {
      toast.error(parsed.errors[0])
      lastCsvReport.value = parsed.errors.join(' · ')
      return
    }
    const { updated, unmatched } = applyCsvRows(parsed)
    const bits = [
      `Updated ${updated} learner${updated === 1 ? '' : 's'}`,
      unmatched.length ? `${unmatched.length} unmatched` : '',
      parsed.skipped ? `${parsed.skipped} blank rows skipped` : '',
      parsed.errors.length ? parsed.errors[0] : '',
    ].filter(Boolean)
    lastCsvReport.value = bits.join(' · ')
    if (updated) {
      toast.success(
        `Bulk update: ${updated} score${updated === 1 ? '' : 's'} loaded — Save draft or Submit marks`,
      )
    } else {
      toast.error('No matching learners found in this CSV')
    }
    if (unmatched.length) {
      toast.info(
        `Unmatched: ${unmatched.slice(0, 4).join(', ')}${unmatched.length > 4 ? '…' : ''}`,
      )
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not read CSV')
  } finally {
    csvImporting.value = false
  }
}

function onScoreSanitized(row: MarkRow, raw: unknown) {
  const n = sanitizeNumber(raw)
  onScore(row, n === '' ? 0 : n)
}
</script>

<template>
  <PageHeader>
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <AppBackButton only-when-from fallback="/academics" />
      <PageHeaderTitle title="Exams & marks" />
    </div>
  </PageHeader>

  <div class="school-page" :class="{ 'school-page--exam-studio': showCreate && tab === 'exams' }">
    <ListStatCards v-if="!(showCreate && tab === 'exams')" :stats="stats" />

    <TabButtons
      v-if="!(showCreate && tab === 'exams')"
      v-model="tab"
      :options="tabs"
      class="school-tabs"
    />

    <!-- Class exams (+ Word-like paper studio) -->
    <template v-if="tab === 'exams'">
      <template v-if="showCreate">
        <div class="exam-studio">
          <header class="exam-studio__titlebar">
            <div class="exam-studio__titlebar-left">
              <Button
                size="sm"
                icon-left="lucide-arrow-left"
                label="Close"
                @click="cancelCreate"
              />
              <div class="exam-studio__file">
                <p class="exam-studio__name">
                  {{ examPaperTitle
                  }}<span v-if="examDirty" class="exam-studio__dirty"> *</span>
                </p>
                <p class="exam-studio__path">{{ examPaperPath }}</p>
              </div>
            </div>
            <div class="exam-studio__titlebar-right">
              <span v-if="examDirty" class="exam-studio__unsaved">Unsaved</span>
              <Badge
                :label="String(createForm.status || 'Draft')"
                :theme="statusTheme(String(createForm.status))"
                variant="subtle"
              />
              <kbd class="exam-studio__kbd">⌘S save</kbd>
            </div>
          </header>

          <input
            ref="logoInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onLogoUpload"
          />
          <input
            ref="paperImageInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onPaperImageUpload"
          />

          <div class="exam-studio__ribbon" role="toolbar" aria-label="Exam paper">
            <Button
              size="sm"
              icon-left="lucide-save"
              label="Save draft"
              :disabled="!(canCreate || canWrite)"
              @click="saveExamPaper(true)"
            />
            <Button
              size="sm"
              variant="solid"
              icon-left="lucide-check"
              :label="editingExamId ? 'Save & mark' : 'Save exam'"
              :disabled="!(canCreate || canWrite)"
              @click="saveExamPaper(false)"
            />
            <Button
              size="sm"
              icon-left="lucide-printer"
              label="Print preview"
              :disabled="!canPrint"
              @click="printExamStudioPaper"
            />
            <span class="exam-studio__ribbon-sep" aria-hidden="true" />
            <div class="exam-studio__fmt" role="group" aria-label="Text format">
              <button type="button" class="exam-studio__fmt-btn" title="Bold" @click="execExamFormat('bold')">
                <strong>B</strong>
              </button>
              <button type="button" class="exam-studio__fmt-btn" title="Italic" @click="execExamFormat('italic')">
                <em>I</em>
              </button>
              <button type="button" class="exam-studio__fmt-btn" title="Underline" @click="execExamFormat('underline')">
                <span class="underline">U</span>
              </button>
              <button type="button" class="exam-studio__fmt-btn" title="Align left" @click="execExamFormat('justifyLeft')">
                L
              </button>
              <button type="button" class="exam-studio__fmt-btn" title="Centre" @click="execExamFormat('justifyCenter')">
                C
              </button>
              <button type="button" class="exam-studio__fmt-btn" title="Bullet list" @click="execExamFormat('insertUnorderedList')">
                •
              </button>
            </div>
            <span class="exam-studio__ribbon-sep" aria-hidden="true" />
            <Button
              size="sm"
              icon-left="lucide-image"
              label="Insert picture"
              @click="requestPaperImage"
            />
            <Button
              size="sm"
              icon-left="lucide-badge"
              label="Upload logo"
              @click="logoInput?.click()"
            />
            <div class="exam-studio__ribbon-grow" />
            <Button
              size="sm"
              icon-left="lucide-plus"
              label="Add question"
              @click="addQuestion"
            />
          </div>

          <div class="exam-studio__meta">
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
              label="Type"
              :options="typeOptions"
            />
            <FormControl
              v-model="createForm.date"
              type="date"
              label="Date"
            />
            <FormControl
              v-model="createForm.duration"
              type="text"
              label="Duration"
              placeholder="e.g. 1 hour 30 minutes"
            />
            <FormControl
              v-model="createForm.term"
              type="text"
              label="Term"
            />
            <FormControl
              v-model="createForm.academicYear"
              type="text"
              label="Year"
            />
            <FormControl
              v-model="createForm.venue"
              type="text"
              label="Venue / room"
              placeholder="Optional"
            />
            <FormControl
              v-model="createForm.invigilator"
              type="text"
              label="Invigilator"
              placeholder="Optional"
            />
            <FormControl
              v-model="createForm.status"
              type="select"
              label="Status"
              :options="statusOptions"
            />
          </div>

          <div class="exam-studio__toggles">
            <label class="exam-studio__toggle">
              <input v-model="createForm.showLogo" type="checkbox" />
              Show school logo
            </label>
            <label class="exam-studio__toggle">
              <input v-model="createForm.showCandidateBox" type="checkbox" />
              Candidate details box
            </label>
            <label class="exam-studio__toggle">
              <input v-model="createForm.showAnswerLines" type="checkbox" />
              Answer lines
            </label>
            <button
              v-if="createForm.logoSrc"
              type="button"
              class="exam-studio__link-btn"
              @click="clearPaperLogo"
            >
              Reset logo to school default
            </button>
          </div>

          <div class="exam-studio__canvas">
            <article class="exam-studio__paper" aria-label="Exam paper">
              <header class="exam-studio__school">
                <div class="exam-studio__school-row">
                  <button
                    v-if="createForm.showLogo"
                    type="button"
                    class="exam-studio__logo-btn"
                    title="Click to upload school logo"
                    @click="logoInput?.click()"
                  >
                    <img
                      :src="paperLogoSrc"
                      :alt="brand.shortName || 'School logo'"
                      class="exam-studio__logo"
                    />
                    <span class="exam-studio__logo-hint">Change logo</span>
                  </button>
                  <div class="exam-studio__school-text">
                    <p class="exam-studio__school-name">
                      {{ schoolSetup.name || brand.name || 'Little Royals Kindergarten and Primary School' }}
                    </p>
                    <p class="exam-studio__school-motto">
                      {{ schoolSetup.motto || brand.motto || '' }}
                    </p>
                    <p class="exam-studio__school-addr">
                      {{ schoolSetup.addressLine1 }}
                      <template v-if="schoolSetup.city">
                        · {{ schoolSetup.city }}
                      </template>
                      <template v-if="schoolSetup.phone">
                        · {{ schoolSetup.phone }}
                      </template>
                    </p>
                    <p class="exam-studio__school-meta">
                      {{ createForm.term }} · {{ createForm.academicYear }} ·
                      {{ createForm.className }} · {{ createForm.course }} ·
                      {{ createForm.type }} · {{ createForm.date }}
                    </p>
                    <p class="exam-studio__school-marks">
                      Duration:
                      <strong>{{ createForm.duration || '—' }}</strong>
                      · Total marks:
                      <strong>{{ questionsTotal || createForm.maxScore }}</strong>
                      <template v-if="createForm.venue">
                        · Venue: <strong>{{ createForm.venue }}</strong>
                      </template>
                    </p>
                  </div>
                </div>
              </header>

              <input
                v-model="createForm.name"
                class="exam-studio__title-input"
                type="text"
                placeholder="Examination title (e.g. Term III MOT · Mathematics)"
                aria-label="Examination title"
                @focus="examFmtFocus = 'title'"
              />

              <div
                v-if="createForm.showCandidateBox"
                class="exam-studio__candidate"
              >
                <div class="exam-studio__candidate-row">
                  <span>Candidate name</span>
                  <span class="exam-studio__fill" />
                </div>
                <div class="exam-studio__candidate-row">
                  <span>Class</span>
                  <span class="exam-studio__fill exam-studio__fill--short">{{ createForm.className }}</span>
                  <span>Stream / No.</span>
                  <span class="exam-studio__fill exam-studio__fill--short" />
                </div>
                <div class="exam-studio__candidate-row">
                  <span>Invigilator</span>
                  <span class="exam-studio__fill">{{ createForm.invigilator }}</span>
                </div>
              </div>

              <div
                :key="`instr-${studioEpoch}`"
                class="exam-studio__instructions exam-studio__editable"
                contenteditable="true"
                role="textbox"
                aria-label="Exam instructions"
                data-placeholder="Instructions — e.g. Answer all questions. Show working. Calculators not allowed."
                @focus="examFmtFocus = 'instructions'"
                @input="onEditableInput('instructions', $event)"
                v-html="createForm.subtitle"
              />

              <div class="exam-studio__questions">
                <div
                  v-for="(q, index) in createQuestions"
                  :key="`${q.id}-${studioEpoch}`"
                  class="exam-studio__q"
                >
                  <div class="exam-studio__q-head">
                    <span class="exam-studio__q-num">{{ index + 1 }}.</span>
                    <input
                      v-model.number="q.marks"
                      class="exam-studio__q-marks"
                      type="number"
                      min="0"
                      aria-label="Marks for question"
                    />
                    <span class="exam-studio__q-marks-label">marks</span>
                    <button
                      type="button"
                      class="exam-studio__q-img-btn"
                      @click="requestQuestionImage(q.id)"
                    >
                      {{ q.imageSrc ? 'Replace image' : 'Add image' }}
                    </button>
                    <button
                      type="button"
                      class="exam-studio__q-remove"
                      :aria-label="`Remove question ${index + 1}`"
                      @click="removeQuestion(q.id)"
                    >
                      Remove
                    </button>
                  </div>
                  <div
                    class="exam-studio__q-text exam-studio__editable"
                    contenteditable="true"
                    role="textbox"
                    :aria-label="`Question ${index + 1}`"
                    :data-placeholder="`Type question ${index + 1} here…`"
                    @focus="examFmtFocus = `q-${q.id}`"
                    @input="onEditableInput(q, $event)"
                    v-html="q.text"
                  />
                  <figure v-if="q.imageSrc" class="exam-studio__figure">
                    <img :src="q.imageSrc" alt="" />
                    <input
                      v-model="q.imageCaption"
                      class="exam-studio__figure-caption"
                      type="text"
                      placeholder="Figure caption (optional)"
                      @input="markExamDirty"
                    />
                    <button
                      type="button"
                      class="exam-studio__figure-remove"
                      @click="removeQuestionImage(q.id)"
                    >
                      Remove image
                    </button>
                  </figure>
                  <div
                    v-if="createForm.showAnswerLines"
                    class="exam-studio__q-lines"
                    aria-hidden="true"
                  >
                    <span /><span /><span /><span />
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="exam-studio__add-inline"
                @click="addQuestion"
              >
                + Add another question
              </button>

              <footer class="exam-studio__footer">
                End of paper · {{ createQuestions.length }} question{{
                  createQuestions.length === 1 ? '' : 's'
                }}
                · {{ questionsTotal }} marks
                <template v-if="schoolSetup.headTeacher">
                  · Head teacher: {{ schoolSetup.headTeacher }}
                </template>
              </footer>
            </article>
          </div>

          <div class="exam-studio__sticky-save">
            <p class="exam-studio__sticky-hint">
              {{
                examDirty
                  ? 'Changes not saved yet'
                  : editingExamId
                    ? 'All changes saved'
                    : 'New paper — save when ready'
              }}
            </p>
            <div class="exam-studio__sticky-actions">
              <Button size="sm" label="Close" @click="cancelCreate" />
              <Button
                size="sm"
                label="Save draft"
                :disabled="!(canCreate || canWrite)"
                @click="saveExamPaper(true)"
              />
              <Button
                size="sm"
                variant="solid"
                icon-left="lucide-check"
                :label="editingExamId ? 'Save & enter marks' : 'Save exam'"
                :disabled="!(canCreate || canWrite)"
                @click="saveExamPaper(false)"
              />
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="school-page-toolbar">
          <FormControl
            v-model="filterClass"
            class="school-filter-select"
            type="select"
            label="Class"
            :options="classOptions"
          />
          <div class="school-page-toolbar__grow" />
          <Button
            icon-left="lucide-award"
            label="Results"
            @click="tab = 'results'"
          />
          <Button
            v-if="canCreate"
            variant="solid"
            icon-left="lucide-plus"
            label="New exam paper"
            @click="openCreateForm"
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
                v-if="canWrite || canCreate"
                size="sm"
                icon-left="lucide-file-pen"
                label="Edit paper"
                @click.stop="openEditExam(exam.id)"
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
          <div
            v-if="!filteredExams.length"
            class="flex flex-col items-center gap-3 px-4 py-12 text-center"
          >
            <p class="text-sm text-ink-gray-5">
              No exams for this class yet. Open a new exam paper to start.
            </p>
            <Button
              v-if="canCreate"
              variant="solid"
              icon-left="lucide-plus"
              label="New exam paper"
              @click="openCreateForm"
            />
          </div>
        </section>
      </template>
    </template>

    <!-- Enter marks -->
    <template v-else-if="tab === 'marks'">
      <input
        ref="csvInput"
        type="file"
        accept=".csv,text/csv"
        class="hidden"
        @change="onCsvFile"
      />

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
        class="school-page-toolbar rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
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
        <Badge :label="`Max ${maxScore}`" theme="amber" variant="subtle" />
        <Badge
          :label="String(selectedExam.status)"
          :theme="statusTheme(String(selectedExam.status))"
          variant="subtle"
        />
        <Button
          v-if="canWrite || canCreate"
          size="sm"
          icon-left="lucide-file-pen"
          label="Edit paper"
          @click="openEditExam(selectedExam.id)"
        />
        <span v-if="dirty" class="school-page-toolbar__meta">Unsaved</span>
        <div class="school-page-toolbar__grow" />
        <Button
          v-if="canPrint"
          size="sm"
          icon-left="lucide-printer"
          label="Print paper"
          @click="printSelectedPaper"
        />
        <Button
          v-if="canPrint"
          size="sm"
          icon-left="lucide-table-2"
          label="Mark sheet"
          @click="printSelectedMarksheet"
        />
        <Button
          v-if="canWrite && selectedExam.status !== 'Closed'"
          size="sm"
          label="Close exam"
          @click="closeExam"
        />
        <Button
          v-if="canWrite || canCreate"
          size="sm"
          label="Save draft"
          @click="saveMarks(false)"
        />
        <Button
          v-if="canWrite"
          size="sm"
          variant="solid"
          icon-left="lucide-send"
          label="Submit"
          @click="saveMarks(true)"
        />
      </div>

      <!-- Bulk CSV -->
      <section
        v-if="selectedExam"
        class="space-y-3 rounded-6 border border-outline-gray-1 bg-surface-white p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-ink-gray-9">
              Bulk update with CSV
            </h2>
            <p class="mt-1 text-sm text-ink-gray-5">
              Export template → fill scores → import. Match by student number,
              learner number, or name.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              icon-left="lucide-download"
              label="Export template"
              @click="exportMarksTemplate"
            />
            <Button
              icon-left="lucide-file-spreadsheet"
              label="Export CSV"
              @click="exportCurrentMarks"
            />
            <Button
              v-if="canWrite || canCreate"
              variant="solid"
              icon-left="lucide-upload"
              label="Import CSV"
              :loading="csvImporting"
              :disabled="selectedExam.status === 'Closed'"
              @click="triggerCsvImport"
            />
          </div>
        </div>
        <p v-if="lastCsvReport" class="text-xs text-ink-gray-6">
          {{ lastCsvReport }}
        </p>
      </section>

      <section class="school-section">
        <h2 class="school-section-title">Mark sheet</h2>
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
              @update:model-value="onScoreSanitized(row, $event)"
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
          <div
            v-if="!selectedExam"
            class="flex flex-col items-center gap-3 px-4 py-12 text-center"
          >
            <p class="text-sm text-ink-gray-5">
              Select an examination, or create one under Class exams.
            </p>
            <Button
              v-if="canCreate"
              variant="solid"
              icon-left="lucide-plus"
              label="New exam paper"
              @click="openCreateForm"
            />
          </div>
          <p
            v-else-if="!marks.length"
            class="px-4 py-12 text-center text-sm text-ink-gray-5"
          >
            No active learners in {{ selectedExam.className }}.
          </p>
        </div>
      </section>

      <div
        v-if="selectedExam && dirty"
        class="exam-marks-sticky"
        role="status"
      >
        <p class="exam-marks-sticky__hint">Unsaved marks — save before leaving</p>
        <div class="exam-marks-sticky__actions">
          <Button
            size="sm"
            label="Save draft"
            :disabled="!(canWrite || canCreate)"
            @click="saveMarks(false)"
          />
          <Button
            v-if="canWrite"
            size="sm"
            variant="solid"
            icon-left="lucide-send"
            label="Submit marks"
            @click="saveMarks(true)"
          />
        </div>
      </div>
    </template>

    <!-- Results (was separate /exam-results page) -->
    <template v-else-if="tab === 'results'">
      <CatalogTabDesk
        :tabs="resultsTabs"
        :show-stats="false"
       
      />
    </template>

    <!-- Settings (was separate sidebar pages) -->
    <template v-else-if="tab === 'settings'">
      <CatalogTabDesk
        :tabs="settingsTabs"
        query-key="settings"
        :show-stats="false"
       
      />
    </template>
  </div>
</template>
