import type { CatalogRow } from '@/data/catalog/catalog'
import { schoolStore } from '@/data/catalog/store'
import {
  attendanceRowsForStudent,
  buildAttendanceSummary,
  type StudentAttendanceSummary,
} from '@/data/students/studentAttendance'
import {
  buildExamReports,
  buildSubjectAggregates,
  buildSubjectReports,
  subjectsForStudent,
  type ExamReport,
  type StudentAcademicSummary,
  type SubjectReport,
} from '@/data/students/studentSubjects'

function byStudentNameOrId(row: CatalogRow, student: CatalogRow) {
  const studentId = String(row.studentId || '')
  const studentName = String(row.student || row.name || '')
  if (studentId && studentId === student.id) return true
  return studentName === student.name
}

export interface Student360Bundle {
  student: CatalogRow
  guardians: CatalogRow[]
  discipline: CatalogRow[]
  logs: CatalogRow[]
  attendance: CatalogRow[]
  attendanceSummary: StudentAttendanceSummary
  fees: CatalogRow[]
  results: CatalogRow[]
  subjects: CatalogRow[]
  subjectReports: SubjectReport[]
  examReports: ExamReport[]
  academicSummary: StudentAcademicSummary
  classInfo: CatalogRow | undefined
  stats: {
    guardianCount: number
    openCases: number
    closedCases: number
    attendancePresent: number
    attendanceTotal: number
    attendancePercent: number | null
    unpaidFees: number
    average: number | null
    subjectCount: number
    examCount: number
    totalAggregate: number | null
    divisionOrBand: string
    classPosition: string | null
    classPositionOutOf: number | null
  }
}

export function getStudent360(studentId: string): Student360Bundle | null {
  const student = schoolStore.students?.rows.find((r) => r.id === studentId)
  if (!student) return null

  const guardians = (schoolStore.guardians?.rows || []).filter((r) =>
    byStudentNameOrId(r, student),
  )
  const discipline = (schoolStore['disciplinary-cases']?.rows || []).filter(
    (r) => byStudentNameOrId(r, student),
  )
  const logs = (schoolStore['student-log']?.rows || []).filter((r) =>
    byStudentNameOrId(r, student),
  )
  const attendance = attendanceRowsForStudent(student)
  const attendanceSummary = buildAttendanceSummary(student)
  const fees = (schoolStore.fees?.rows || []).filter((r) =>
    byStudentNameOrId(r, student),
  )
  const results = (schoolStore['exam-results']?.rows || []).filter((r) =>
    byStudentNameOrId(r, student),
  )
  const classInfo = (schoolStore.classes?.rows || []).find(
    (r) =>
      r.id === String(student.classId || '') ||
      r.name === String(student.className || student.class || ''),
  )
  const subjects = subjectsForStudent(student)
  const subjectReports = buildSubjectReports(student)
  const examReports = buildExamReports(student)
  const academicSummary = buildSubjectAggregates(student)

  const openCases = discipline.filter((r) =>
    ['Open', 'Monitoring'].includes(String(r.status)),
  ).length
  const closedCases = discipline.filter((r) => r.status === 'Closed').length
  const attendancePresent = attendanceSummary.overall.present
  const unpaidFees = fees.filter((r) =>
    ['Unpaid', 'Overdue', 'Partial'].includes(String(r.status)),
  ).length
  const average =
    academicSummary.overallAverage ??
    (typeof student.average === 'number' ? student.average : null)

  return {
    student,
    guardians,
    discipline,
    logs,
    attendance,
    attendanceSummary,
    fees,
    results,
    subjects,
    subjectReports,
    examReports,
    academicSummary,
    classInfo,
    stats: {
      guardianCount: guardians.length,
      openCases,
      closedCases,
      attendancePresent,
      attendanceTotal: attendanceSummary.overall.total,
      attendancePercent: attendanceSummary.overall.percent,
      unpaidFees,
      average,
      subjectCount: subjects.length,
      examCount: examReports.length,
      totalAggregate: academicSummary.totalAggregate,
      divisionOrBand: academicSummary.divisionOrBand,
      classPosition: academicSummary.classPosition?.label || null,
      classPositionOutOf: academicSummary.classPosition?.outOf ?? null,
    },
  }
}
