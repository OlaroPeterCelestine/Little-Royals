import type { CatalogRow } from './catalog'
import { schoolStore } from './store'

export interface Teacher360Bundle {
  teacher: CatalogRow
  discipline: CatalogRow[]
  classes: CatalogRow[]
  students: CatalogRow[]
  leave: CatalogRow[]
  attendance: CatalogRow[]
  timetable: CatalogRow[]
  stats: {
    openCases: number
    closedCases: number
    classCount: number
    studentCount: number
    leaveCount: number
  }
}

function matchesTeacher(row: CatalogRow, teacher: CatalogRow) {
  const name = String(teacher.name || '')
  const id = String(teacher.id || '')
  const keys = [
    'teacher',
    'teacherId',
    'reportedBy',
    'employee',
    'staff',
    'name',
    'instructor',
  ]
  return keys.some((k) => {
    const v = String(row[k] || '')
    return v === name || v === id
  })
}

export function getTeacher360(teacherId: string): Teacher360Bundle | null {
  const teacher = schoolStore.teachers?.rows.find((r) => r.id === teacherId)
  if (!teacher) return null

  const discipline = (schoolStore['disciplinary-cases']?.rows || []).filter((r) =>
    matchesTeacher(r, teacher),
  )

  const classes = (schoolStore.classes?.rows || []).filter(
    (r) => String(r.teacher || '') === teacher.name,
  )

  const classNames = new Set(classes.map((c) => c.name))
  const students = (schoolStore.students?.rows || []).filter((r) =>
    classNames.has(String(r.className || '')),
  )

  const leave = (schoolStore['staff-leave']?.rows || []).filter((r) =>
    matchesTeacher(r, teacher),
  )

  const attendance = (schoolStore['staff-attendance']?.rows || []).filter((r) =>
    matchesTeacher(r, teacher),
  )

  const timetable = (schoolStore.timetable?.rows || []).filter(
    (r) =>
      String(r.teacher || '') === teacher.name ||
      String(r.instructor || '') === teacher.name,
  )

  const openCases = discipline.filter((r) =>
    ['Open', 'Monitoring'].includes(String(r.status)),
  ).length
  const closedCases = discipline.filter((r) => r.status === 'Closed').length

  return {
    teacher,
    discipline,
    classes,
    students,
    leave,
    attendance,
    timetable,
    stats: {
      openCases,
      closedCases,
      classCount: classes.length || Number(teacher.classes) || 0,
      studentCount: students.length || Number(teacher.students) || 0,
      leaveCount: leave.length,
    },
  }
}

export { personAge as teacherAge } from './biodata'
