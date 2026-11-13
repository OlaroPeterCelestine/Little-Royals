import type { CatalogRow } from './catalog'
import { schoolStore } from './store'

export interface Teacher360Bundle {
  teacher: CatalogRow
  discipline: CatalogRow[]
  classes: CatalogRow[]
  students: CatalogRow[]
  stats: {
    openCases: number
    closedCases: number
    classCount: number
    studentCount: number
  }
}

export function getTeacher360(teacherId: string): Teacher360Bundle | null {
  const teacher = schoolStore.teachers?.rows.find((r) => r.id === teacherId)
  if (!teacher) return null

  const discipline = (schoolStore['disciplinary-cases']?.rows || []).filter(
    (r) =>
      String(r.teacherId || '') === teacher.id ||
      String(r.reportedBy || '') === teacher.name,
  )

  const classes = (schoolStore.classes?.rows || []).filter(
    (r) => String(r.teacher || '') === teacher.name,
  )

  const classNames = new Set(classes.map((c) => c.name))
  const students = (schoolStore.students?.rows || []).filter((r) =>
    classNames.has(String(r.className || '')),
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
    stats: {
      openCases,
      closedCases,
      classCount: classes.length || Number(teacher.classes) || 0,
      studentCount: students.length || Number(teacher.students) || 0,
    },
  }
}
