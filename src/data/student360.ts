import type { CatalogRow } from './catalog'
import { schoolStore } from './store'

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
  fees: CatalogRow[]
  results: CatalogRow[]
  classInfo: CatalogRow | undefined
  stats: {
    guardianCount: number
    openCases: number
    closedCases: number
    attendancePresent: number
    attendanceTotal: number
    unpaidFees: number
    average: number | null
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
  const attendance = (schoolStore.attendance?.rows || []).filter(
    (r) => r.name === student.name,
  )
  const fees = (schoolStore.fees?.rows || []).filter(
    (r) => r.name === student.name,
  )
  const results = (schoolStore['exam-results']?.rows || []).filter(
    (r) => r.name === student.name,
  )
  const classInfo = (schoolStore.classes?.rows || []).find(
    (r) => r.name === String(student.className || ''),
  )

  const openCases = discipline.filter((r) =>
    ['Open', 'Monitoring'].includes(String(r.status)),
  ).length
  const closedCases = discipline.filter((r) => r.status === 'Closed').length
  const attendancePresent = attendance.filter((r) =>
    ['Present', 'Late'].includes(String(r.status)),
  ).length
  const unpaidFees = fees.filter((r) =>
    ['Unpaid', 'Overdue', 'Partial'].includes(String(r.status)),
  ).length
  const average =
    typeof student.average === 'number' ? student.average : null

  return {
    student,
    guardians,
    discipline,
    logs,
    attendance,
    fees,
    results,
    classInfo,
    stats: {
      guardianCount: guardians.length,
      openCases,
      closedCases,
      attendancePresent,
      attendanceTotal: attendance.length,
      unpaidFees,
      average,
    },
  }
}
