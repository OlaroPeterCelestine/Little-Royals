import type { CatalogRow } from '@/data/catalog/catalog'
import { schoolStore } from '@/data/catalog/store'

export type AttendanceBucket = {
  key: string
  label: string
  present: number
  total: number
  percent: number | null
}

export type StudentAttendanceSummary = {
  overall: AttendanceBucket
  byWeekday: AttendanceBucket[]
  byMonth: AttendanceBucket[]
  byTerm: AttendanceBucket[]
  recent: CatalogRow[]
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const SCHOOL_WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
] as const

function isPresentStatus(status: unknown): boolean {
  return ['Present', 'Late'].includes(String(status || ''))
}

function percentOf(present: number, total: number): number | null {
  if (!total) return null
  return Math.round((present / total) * 100)
}

function bucket(
  key: string,
  label: string,
  present: number,
  total: number,
): AttendanceBucket {
  return {
    key,
    label,
    present,
    total,
    percent: percentOf(present, total),
  }
}

function parseDate(raw: unknown): Date | null {
  const s = String(raw || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null
  const d = new Date(`${s.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function termForDate(date: Date): string {
  const terms = schoolStore['academic-terms']?.rows || []
  const iso = date.toISOString().slice(0, 10)
  for (const t of terms) {
    const start = String(t.start || '')
    const end = String(t.end || '')
    if (start && end && iso >= start && iso <= end) {
      const year = String(t.year || '')
      return year ? `${t.name} ${year}` : String(t.name)
    }
  }
  return 'Outside term'
}

export function attendanceRowsForStudent(student: CatalogRow): CatalogRow[] {
  return (schoolStore.attendance?.rows || [])
    .filter(
      (r) =>
        String(r.studentId || '') === student.id || r.name === student.name,
    )
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}

/** Day-of-week, month, and term attendance % for a learner. */
export function buildAttendanceSummary(
  student: CatalogRow,
): StudentAttendanceSummary {
  const rows = attendanceRowsForStudent(student)
  let presentAll = 0
  const weekday = new Map<string, { present: number; total: number }>()
  const month = new Map<
    string,
    { present: number; total: number; label: string }
  >()
  const term = new Map<string, { present: number; total: number }>()

  for (const day of SCHOOL_WEEKDAYS) {
    weekday.set(day, { present: 0, total: 0 })
  }

  for (const row of rows) {
    const d = parseDate(row.date)
    if (!d) continue
    const ok = isPresentStatus(row.status)
    if (ok) presentAll += 1

    const dayName = WEEKDAYS[d.getDay()]
    if ((SCHOOL_WEEKDAYS as readonly string[]).includes(dayName)) {
      const w = weekday.get(dayName) || { present: 0, total: 0 }
      w.total += 1
      if (ok) w.present += 1
      weekday.set(dayName, w)
    }

    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = d.toLocaleString('en-GB', {
      month: 'long',
      year: 'numeric',
    })
    const m = month.get(monthKey) || {
      present: 0,
      total: 0,
      label: monthLabel,
    }
    m.total += 1
    if (ok) m.present += 1
    month.set(monthKey, m)

    const termLabel = termForDate(d)
    const t = term.get(termLabel) || { present: 0, total: 0 }
    t.total += 1
    if (ok) t.present += 1
    term.set(termLabel, t)
  }

  const byWeekday = SCHOOL_WEEKDAYS.map((day) => {
    const w = weekday.get(day) || { present: 0, total: 0 }
    return bucket(day, day, w.present, w.total)
  })

  const byMonth = [...month.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, v]) => bucket(key, v.label, v.present, v.total))

  const byTerm = [...term.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, v]) => bucket(key, key, v.present, v.total))

  return {
    overall: bucket('overall', 'Overall', presentAll, rows.length),
    byWeekday,
    byMonth,
    byTerm,
    recent: rows.slice(0, 30),
  }
}

export type AttendanceDayCell = {
  key: string
  day: number | null
  inRange: boolean
  isWeekend: boolean
  status: string | null
  row?: CatalogRow
}

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12)
}

/** Latest attendance mark per calendar day for a learner. */
export function attendanceStatusByDate(
  student: CatalogRow,
): Map<string, CatalogRow> {
  const map = new Map<string, CatalogRow>()
  for (const row of attendanceRowsForStudent(student)) {
    const key = String(row.date || '').slice(0, 10)
    if (!key || map.has(key)) continue
    map.set(key, row)
  }
  return map
}

export function academicTermsList(): CatalogRow[] {
  return (schoolStore['academic-terms']?.rows || [])
    .slice()
    .sort((a, b) => String(b.start || '').localeCompare(String(a.start || '')))
}

function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d
}

function buildCells(
  start: Date,
  dayCount: number,
  byDate: Map<string, CatalogRow>,
  inRange: (iso: string) => boolean,
): AttendanceDayCell[] {
  const cells: AttendanceDayCell[] = []
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i,
      12,
    )
    const key = isoDate(d)
    const row = byDate.get(key)
    const dow = d.getDay()
    cells.push({
      key,
      day: d.getDate(),
      inRange: inRange(key),
      isWeekend: dow === 0 || dow === 6,
      status: row ? String(row.status || '') : null,
      row,
    })
  }
  return cells
}

/** Month grid (Mon–Sun), padded to full weeks. */
export function monthAttendanceCells(
  year: number,
  monthIndex: number,
  byDate: Map<string, CatalogRow>,
): AttendanceDayCell[] {
  const first = new Date(year, monthIndex, 1, 12)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const gridStart = new Date(year, monthIndex, 1 - startPad, 12)
  const total = Math.ceil((startPad + daysInMonth) / 7) * 7
  return buildCells(gridStart, total, byDate, (iso) =>
    iso.startsWith(
      `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    ),
  )
}

/** One school week starting Monday of the given date. */
export function weekAttendanceCells(
  anchor: Date,
  byDate: Map<string, CatalogRow>,
): AttendanceDayCell[] {
  const start = mondayOf(anchor)
  return buildCells(start, 7, byDate, () => true)
}

/** Every day in a term range (Mon-first padded weeks). */
export function termAttendanceCells(
  startIso: string,
  endIso: string,
  byDate: Map<string, CatalogRow>,
): AttendanceDayCell[] {
  const start = parseIsoDate(startIso)
  const end = parseIsoDate(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []
  const gridStart = mondayOf(start)
  const lastMonday = mondayOf(end)
  const days =
    Math.round((lastMonday.getTime() - gridStart.getTime()) / 86400000) + 7
  return buildCells(gridStart, Math.max(days, 7), byDate, (iso) =>
    iso >= startIso && iso <= endIso,
  )
}

export function attendanceStatusTone(
  status: string | null,
): 'present' | 'absent' | 'late' | 'excused' | 'empty' {
  const s = String(status || '').toLowerCase()
  if (s.includes('present')) return 'present'
  if (s.includes('absent')) return 'absent'
  if (s.includes('late')) return 'late'
  if (s.includes('excused')) return 'excused'
  return 'empty'
}
