/** Chart helpers + copy for Little Royals Kindergarten and Primary School (Nursery & Primary · Uganda). */
import { catalog } from './catalog'

export const students = catalog.students.rows
export const teachers = catalog.teachers.rows
export const classes = catalog.classes.rows
export const attendance = catalog.attendance.rows

export const enrollmentByGrade = [
  { grade: 'Baby', students: 24 },
  { grade: 'Middle', students: 22 },
  { grade: 'Top', students: 26 },
  { grade: 'P.1', students: 68 },
  { grade: 'P.2', students: 64 },
  { grade: 'P.3', students: 70 },
  { grade: 'P.4', students: 62 },
  { grade: 'P.5', students: 58 },
  { grade: 'P.6', students: 54 },
  { grade: 'P.7', students: 40 },
]

export const attendanceBreakdown = [
  {
    status: 'Present',
    count:
      catalog.attendance.rows.filter((r) => r.status === 'Present').length *
      140,
  },
  {
    status: 'Late',
    count:
      catalog.attendance.rows.filter((r) => r.status === 'Late').length * 40,
  },
  {
    status: 'Absent',
    count:
      catalog.attendance.rows.filter((r) => r.status === 'Absent').length * 18,
  },
  {
    status: 'Excused',
    count:
      catalog.attendance.rows.filter((r) => r.status === 'Excused').length * 8,
  },
]

export const weeklyAttendance = [
  { day: 'Mon', rate: 94 },
  { day: 'Tue', rate: 96 },
  { day: 'Wed', rate: 95 },
  { day: 'Thu', rate: 97 },
  { day: 'Fri', rate: 93 },
]

export const defaultAnnouncement = `<h2>Weekly assembly</h2>
<p>Little Royals Kindergarten and Primary School will hold assembly on <strong>Friday at 08:00</strong> in the Assembly Hall, Kampala.</p>
<ul>
<li>Parents of P.7 candidates are welcome for the PLE briefing</li>
<li>Nursery parents: please collect term reports from class teachers</li>
<li>School van routes resume Monday — confirm with the office</li>
</ul>`

export const defaultReportSql = `SELECT
  s.name AS student,
  s.class_name,
  ROUND(AVG(a.is_present) * 100, 1) AS attendance_pct
FROM students s
JOIN attendance a ON a.student_id = s.id
WHERE a.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY s.id, s.name, s.class_name
ORDER BY attendance_pct ASC
LIMIT 25;`

export function studentStatusTheme(status: string) {
  if (status === 'Active') return 'green' as const
  if (status === 'On Leave') return 'amber' as const
  return 'gray' as const
}

export function attendanceTheme(status: string) {
  if (status === 'Present') return 'green' as const
  if (status === 'Late') return 'amber' as const
  if (status === 'Excused') return 'blue' as const
  return 'red' as const
}
