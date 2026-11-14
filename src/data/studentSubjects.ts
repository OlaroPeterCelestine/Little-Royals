import type { CatalogRow } from './catalog'
import { schoolStore, addRecord, updateRecord } from './store'
import { currentUser } from './activity'
import {
  aggregatePoints,
  isNurseryClass,
  percentToAggregate,
  percentToDivision,
  percentToNurseryBand,
  sectionForGrade,
} from './grades'
import { canCurrentUser, isFullAccessRole } from './permissions'
import { normalizeRole } from './roles'

export interface SubjectMarkRow {
  id: string
  exam: string
  /** Exam series title without subject (e.g. Term II EOT). */
  examKey: string
  score: number
  maxScore: number
  percent: number
  grade: string
  status: string
  subject: string
  date?: string
}

export interface SubjectReport {
  subject: string
  code: string
  teacher: string
  program: string
  periods: number | string
  marks: SubjectMarkRow[]
  average: number | null
  latestGrade: string
  assessmentCount: number
  canTeacherMark: boolean
}

/** One exam sitting for a learner, with subject rows underneath. */
export interface ExamReport {
  exam: string
  examKey: string
  /** Parsed term label e.g. Term II, PLE / Mock, Other. */
  term: string
  date: string
  subjects: SubjectMarkRow[]
  average: number | null
  subjectCount: number
  scoredCount: number
}

/** Resolve academic term from an exam title (Term I–III, PLE, etc.). */
export function termFromExamKey(examKey: string): string {
  const t = String(examKey || '').toLowerCase()
  if (/term\s*iii|\bterm\s*3\b/.test(t)) return 'Term III'
  if (/term\s*ii|\bterm\s*2\b/.test(t)) return 'Term II'
  if (/term\s*i\b|\bterm\s*1\b/.test(t)) return 'Term I'
  if (/\bple\b|\bmock\b/.test(t)) return 'PLE / Mock'
  return 'Other'
}

const TERM_ORDER = ['Term I', 'Term II', 'Term III', 'PLE / Mock', 'Other']

export function compareTerms(a: string, b: string): number {
  const ia = TERM_ORDER.indexOf(a)
  const ib = TERM_ORDER.indexOf(b)
  const ra = ia < 0 ? 99 : ia
  const rb = ib < 0 ? 99 : ib
  if (ra !== rb) return ra - rb
  return a.localeCompare(b)
}

/** Distinct terms present in a learner’s exam marks. */
export function termsForStudent(student: CatalogRow): string[] {
  const set = new Set<string>()
  for (const m of marksForStudent(student)) {
    set.add(termFromExamKey(m.examKey || m.exam))
  }
  return [...set].sort(compareTerms)
}

function parseSubjectFromExam(exam: unknown, explicit?: unknown): string {
  const fromField = String(explicit || '').trim()
  if (fromField) return fromField
  const name = String(exam || '')
  const parts = name.split(/·|—/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return parts[parts.length - 1]
  return name || 'General'
}

/** Strip trailing subject from “Term II EOT · Science” → “Term II EOT”. */
export function examKeyFromName(exam: unknown, subject?: string): string {
  const name = String(exam || '').trim()
  if (!name) return 'Assessment'
  const parts = name.split(/·|—/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const maybeSubject = parts[parts.length - 1]
    if (
      !subject ||
      maybeSubject.toLowerCase() === subject.toLowerCase() ||
      subject.toLowerCase().includes(maybeSubject.toLowerCase()) ||
      maybeSubject.toLowerCase().includes(subject.toLowerCase())
    ) {
      return parts.slice(0, -1).join(' · ')
    }
  }
  return name
}

/** Sort exams: newest / term-like titles first, then alpha. */
function compareExamKeys(a: string, b: string): number {
  const rank = (s: string) => {
    const t = s.toLowerCase()
    if (t.includes('eot')) return 0
    if (t.includes('mot')) return 1
    if (t.includes('bot')) return 2
    if (t.includes('mock')) return 3
    if (t.includes('ca') || t.includes('weekly')) return 4
    return 5
  }
  const ra = rank(a)
  const rb = rank(b)
  if (ra !== rb) return ra - rb
  return b.localeCompare(a)
}

export function subjectsForStudent(student: CatalogRow): CatalogRow[] {
  const program =
    String(student.program || '') ||
    sectionForGrade(String(student.className || student.grade || ''))
  const courses = schoolStore.courses?.rows || []
  const live = courses.filter((c) => String(c.status || '') !== 'Draft')
  const matched = live.filter((c) => {
    const p = String(c.program || '')
    if (!program) return true
    return p === program || p === 'All'
  })
  return matched.length ? matched : live
}

export function marksForStudent(student: CatalogRow): SubjectMarkRow[] {
  return (schoolStore['exam-results']?.rows || [])
    .filter(
      (r) =>
        String(r.studentId || '') === student.id || r.name === student.name,
    )
    .map((r) => {
      const score = Number(r.score || 0)
      const maxScore = Math.max(1, Number(r.maxScore || 100))
      const percent =
        r.percent != null
          ? Number(r.percent)
          : Math.round((score / maxScore) * 100)
      const exam = String(r.exam || r.subtitle || 'Assessment')
      const subject = parseSubjectFromExam(exam, r.subject)
      return {
        id: r.id,
        exam,
        examKey: examKeyFromName(exam, subject),
        score,
        maxScore,
        percent,
        grade: String(r.grade || '—'),
        status: String(r.status || 'Posted'),
        subject,
        date: String(r.date || r.subtitle || ''),
      }
    })
}

export interface SubjectAggregateRow {
  subject: string
  code: string
  teacher: string
  average: number | null
  aggregate: string
  points: number | null
  papers: number
  latestGrade: string
}

export interface ClassPosition {
  /** 1-based rank in class (1 = best). */
  position: number
  /** Learners in the same class with a scorable average. */
  outOf: number
  /** Display e.g. 3 / 42 */
  label: string
  /** This learner’s average used for ranking. */
  average: number | null
  className: string
}

export interface StudentAcademicSummary {
  subjects: SubjectAggregateRow[]
  overallAverage: number | null
  totalAggregate: number | null
  divisionOrBand: string
  subjectsMarked: number
  subjectsTotal: number
  isNursery: boolean
  classPosition: ClassPosition | null
}

/**
 * All subjects with averages + UNEB aggregates (or nursery bands).
 * Pass `term` to limit marks to that term (e.g. "Term II").
 */
export function buildSubjectAggregates(
  student: CatalogRow,
  options?: { term?: string | null },
): StudentAcademicSummary {
  const term = options?.term?.trim() || null
  const reports = buildSubjectReports(student)
  const className = String(student.className || '')
  const nursery = isNurseryClass(className)
  const subjects: SubjectAggregateRow[] = reports.map((r) => {
    const marks = term
      ? r.marks.filter(
          (m) => termFromExamKey(m.examKey || m.exam) === term,
        )
      : r.marks
    const scored = marks.filter((m) => m.percent > 0 || m.score > 0)
    const average = scored.length
      ? Math.round(
          scored.reduce((n, m) => n + m.percent, 0) / scored.length,
        )
      : null
    const latestGrade = scored.length
      ? scored[scored.length - 1].grade
      : '—'
    const aggregate =
      average == null
        ? '—'
        : nursery
          ? percentToNurseryBand(average)
          : percentToAggregate(average)
    return {
      subject: r.subject,
      code: r.code,
      teacher: r.teacher,
      average,
      aggregate,
      points:
        !nursery && average != null ? aggregatePoints(aggregate) : null,
      papers: marks.length,
      latestGrade,
    }
  })

  const marked = subjects.filter((s) => s.average != null)
  const overallAverage = marked.length
    ? Math.round(
        marked.reduce((n, s) => n + (s.average || 0), 0) / marked.length,
      )
    : null
  const totalAggregate =
    !nursery && marked.length
      ? marked.reduce((n, s) => n + (s.points || 0), 0)
      : null
  const divisionOrBand =
    overallAverage == null
      ? '—'
      : nursery
        ? percentToNurseryBand(overallAverage)
        : percentToDivision(overallAverage)

  return {
    subjects,
    overallAverage,
    totalAggregate,
    divisionOrBand,
    subjectsMarked: marked.length,
    subjectsTotal: subjects.length,
    isNursery: nursery,
    classPosition: term
      ? null
      : classPositionForStudent(student, {
          overallAverage,
          totalAggregate,
          isNursery: nursery,
        }),
  }
}

type PerformanceSnap = {
  overallAverage: number | null
  totalAggregate: number | null
  isNursery: boolean
}

function performanceScore(snap: PerformanceSnap): number {
  // Higher is better for ranking. Prefer average %; for primary, break ties
  // with lower aggregate (invert points so fewer points = higher score).
  const avg = snap.overallAverage
  if (avg == null) return Number.NEGATIVE_INFINITY
  if (snap.isNursery || snap.totalAggregate == null) return avg
  return avg * 1000 - snap.totalAggregate
}

/**
 * Class position from performance vs classmates (same className).
 * Ranked by overall average (desc); primary ties broken by lower aggregate.
 */
export function classPositionForStudent(
  student: CatalogRow,
  selfSnap?: PerformanceSnap,
): ClassPosition | null {
  const className = String(student.className || '').trim()
  if (!className) return null

  const classmates = (schoolStore.students?.rows || []).filter(
    (s) =>
      String(s.className || '').trim() === className &&
      String(s.status || '') !== 'Alumni',
  )
  if (!classmates.length) return null

  const rows = classmates.map((s) => {
    const snap =
      s.id === student.id && selfSnap
        ? selfSnap
        : (() => {
            const summary = buildSubjectAggregatesLite(s)
            return {
              overallAverage: summary.overallAverage,
              totalAggregate: summary.totalAggregate,
              isNursery: summary.isNursery,
            }
          })()
    return {
      id: s.id,
      name: s.name,
      score: performanceScore(snap),
      average: snap.overallAverage,
    }
  })

  const ranked = rows
    .filter((r) => Number.isFinite(r.score) && r.average != null)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

  if (!ranked.length) return null

  const index = ranked.findIndex((r) => r.id === student.id)
  if (index < 0) return null

  const position = index + 1
  const outOf = ranked.length
  return {
    position,
    outOf,
    label: `${position} / ${outOf}`,
    average: ranked[index].average,
    className,
  }
}

/** Lighter aggregate calc used when ranking a whole class (avoids recursion). */
function buildSubjectAggregatesLite(student: CatalogRow): PerformanceSnap {
  const reports = buildSubjectReports(student)
  const className = String(student.className || '')
  const nursery = isNurseryClass(className)
  const marked = reports.filter((r) => r.average != null)
  const overallAverage = marked.length
    ? Math.round(
        marked.reduce((n, r) => n + (r.average || 0), 0) / marked.length,
      )
    : typeof student.average === 'number'
      ? student.average
      : null
  let totalAggregate: number | null = null
  if (!nursery && marked.length) {
    totalAggregate = marked.reduce((n, r) => {
      const agg = percentToAggregate(r.average!)
      return n + aggregatePoints(agg)
    }, 0)
  }
  return { overallAverage, totalAggregate, isNursery: nursery }
}

/** Academics view: exams first, subjects detailed under each exam. */
export function buildExamReports(student: CatalogRow): ExamReport[] {
  const marks = marksForStudent(student)
  const byExam = new Map<string, SubjectMarkRow[]>()
  for (const m of marks) {
    const key = m.examKey || m.exam
    const list = byExam.get(key) || []
    list.push(m)
    byExam.set(key, list)
  }

  const reports: ExamReport[] = []
  for (const [examKey, list] of byExam) {
    const subjects = list
      .slice()
      .sort((a, b) => a.subject.localeCompare(b.subject))
    const scored = subjects.filter((m) => m.score > 0 || m.percent > 0)
    const average = scored.length
      ? Math.round(
          scored.reduce((n, m) => n + m.percent, 0) / scored.length,
        )
      : null
    const date =
      subjects.map((s) => s.date).find((d) => d && /^\d{4}/.test(d)) ||
      subjects[0]?.date ||
      ''
    reports.push({
      exam: examKey,
      examKey,
      term: termFromExamKey(examKey),
      date,
      subjects,
      average,
      subjectCount: subjects.length,
      scoredCount: scored.length,
    })
  }

  return reports.sort((a, b) => {
    const t = compareTerms(a.term, b.term)
    if (t !== 0) return t
    return compareExamKeys(a.examKey, b.examKey)
  })
}

export function teacherCanMarkSubject(subjectName: string): boolean {
  const role = normalizeRole(currentUser.role) || currentUser.role
  if (!role) return false
  const canWrite =
    canCurrentUser('exam-results', 'write') ||
    canCurrentUser('gradebook', 'write') ||
    canCurrentUser('exams', 'write')
  if (!canWrite) return false
  if (isFullAccessRole(role)) return true
  if (role === 'Teacher' || role === 'HeadTeacher') {
    const course = (schoolStore.courses?.rows || []).find(
      (c) => c.name === subjectName,
    )
    if (!course) return true
    const instructor = String(course.instructor || '')
    if (!instructor) return true
    return (
      instructor === currentUser.name ||
      instructor.toLowerCase().includes(currentUser.name.toLowerCase())
    )
  }
  return canWrite
}

export function buildSubjectReports(student: CatalogRow): SubjectReport[] {
  const subjects = subjectsForStudent(student)
  const marks = marksForStudent(student)
  const bySubject = new Map<string, SubjectMarkRow[]>()
  for (const m of marks) {
    const list = bySubject.get(m.subject) || []
    list.push(m)
    bySubject.set(m.subject, list)
  }

  const reports: SubjectReport[] = subjects.map((course) => {
    const subject = String(course.name)
    const subjectMarks = bySubject.get(subject) || []
    // Also match marks whose subject partially matches course name
    const loose = marks.filter(
      (m) =>
        m.subject === subject ||
        m.subject.toLowerCase().includes(subject.toLowerCase()) ||
        subject.toLowerCase().includes(m.subject.toLowerCase()),
    )
    const merged = subjectMarks.length ? subjectMarks : loose
    const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values())
    const scored = unique.filter((m) => m.score > 0)
    const average = scored.length
      ? Math.round(
          scored.reduce((n, m) => n + m.percent, 0) / scored.length,
        )
      : null
    return {
      subject,
      code: String(course.code || ''),
      teacher: String(course.instructor || '—'),
      program: String(course.program || ''),
      periods: course.periods ?? '—',
      marks: unique.sort((a, b) => a.exam.localeCompare(b.exam)),
      average,
      latestGrade: unique[unique.length - 1]?.grade || '—',
      assessmentCount: unique.length,
      canTeacherMark: teacherCanMarkSubject(subject),
    }
  })

  // Include orphan subjects from marks not in course list
  for (const [subject, list] of bySubject) {
    if (reports.some((r) => r.subject === subject)) continue
    const scored = list.filter((m) => m.score > 0)
    reports.push({
      subject,
      code: '',
      teacher: '—',
      program: String(student.program || ''),
      periods: '—',
      marks: list,
      average: scored.length
        ? Math.round(scored.reduce((n, m) => n + m.percent, 0) / scored.length)
        : null,
      latestGrade: list[list.length - 1]?.grade || '—',
      assessmentCount: list.length,
      canTeacherMark: teacherCanMarkSubject(subject),
    })
  }

  return reports.sort((a, b) => a.subject.localeCompare(b.subject))
}

export function gradeForScore(
  score: number,
  className: string,
  maxScore = 100,
): string {
  const pct = Math.round((score / Math.max(maxScore, 1)) * 100)
  if (isNurseryClass(className)) return percentToNurseryBand(pct)
  return percentToAggregate(pct)
}

/** Teacher / exams officer posts or updates one subject assessment for a learner. */
export function saveStudentSubjectMark(input: {
  student: CatalogRow
  subject: string
  exam: string
  score: number
  maxScore?: number
}): CatalogRow {
  if (!teacherCanMarkSubject(input.subject)) {
    throw new Error('You cannot enter marks for this subject')
  }
  const maxScore = Math.max(1, Number(input.maxScore || 100))
  const score = Math.max(0, Math.min(maxScore, Number(input.score) || 0))
  const percent = Math.round((score / maxScore) * 100)
  const className = String(input.student.className || '')
  const grade = gradeForScore(score, className, maxScore)
  const examName = input.exam.trim() || `${input.subject} · Class assessment`
  const existing = (schoolStore['exam-results']?.rows || []).find(
    (r) =>
      (String(r.studentId) === input.student.id || r.name === input.student.name) &&
      String(r.exam) === examName &&
      parseSubjectFromExam(r.exam, r.subject) === input.subject,
  )
  const payload = {
    name: input.student.name,
    studentId: input.student.id,
    exam: examName,
    subject: input.subject,
    className,
    score,
    maxScore,
    percent,
    grade,
    teacher: currentUser.name,
    status:
      score <= 0
        ? 'Pending'
        : percent >= 40 || isNurseryClass(className)
          ? 'Posted'
          : 'Remedial',
  }
  if (existing) return updateRecord('exam-results', existing.id, payload)
  return addRecord('exam-results', payload)
}
