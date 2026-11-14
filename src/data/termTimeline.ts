import { computed } from 'vue'
import { schoolStore } from './store'
import { schoolSetup } from './schoolSetup'
import type { CatalogRow } from './catalog'

export type TimelineKind =
  | 'term'
  | 'exam'
  | 'activity'
  | 'parents'
  | 'holiday'
  | 'school'

export interface TimelineBar {
  id: string
  name: string
  kind: TimelineKind
  start: string
  end: string
  status: string
  detail?: string
  source: 'terms' | 'events' | 'exams'
}

function parseDay(value: unknown): number | null {
  const s = String(value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const t = Date.parse(`${s}T12:00:00`)
  return Number.isFinite(t) ? t : null
}

function addDays(iso: string, days: number) {
  const t = parseDay(iso)
  if (t == null) return iso
  const d = new Date(t)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function kindFromEvent(row: CatalogRow): TimelineKind {
  const type = String(row.type || '').toLowerCase()
  if (type.includes('exam')) return 'exam'
  if (type.includes('parent')) return 'parents'
  if (type.includes('holiday') || type.includes('break')) return 'holiday'
  if (type.includes('school')) return 'school'
  return 'activity'
}

function eventEnd(row: CatalogRow) {
  const start = String(row.date || row.start || '')
  if (row.end) return String(row.end)
  if (row.endDate) return String(row.endDate)
  const type = String(row.type || '').toLowerCase()
  if (type.includes('exam') || /mot|eot|week/i.test(String(row.name))) {
    return addDays(start, 4)
  }
  if (type.includes('holiday') || type.includes('break')) {
    return addDays(start, 13)
  }
  return start
}

/** Build unified bars for the term Gantt overview. */
export function buildTimelineBars(): TimelineBar[] {
  const bars: TimelineBar[] = []

  for (const row of schoolStore['academic-terms']?.rows || []) {
    const start = String(row.start || '')
    const end = String(row.end || start)
    if (!start) continue
    bars.push({
      id: row.id,
      name: `${row.name} · ${row.year || schoolSetup.academicYear}`,
      kind: 'term',
      start,
      end,
      status: String(row.status || 'Open'),
      detail: 'Academic term',
      source: 'terms',
    })
  }

  for (const row of schoolStore['school-events']?.rows || []) {
    const start = String(row.date || row.start || '')
    if (!start) continue
    const end = eventEnd(row)
    bars.push({
      id: row.id,
      name: row.name,
      kind: kindFromEvent(row),
      start,
      end: end < start ? start : end,
      status: String(row.status || 'Scheduled'),
      detail: [row.type, row.audience].filter(Boolean).join(' · '),
      source: 'events',
    })
  }

  for (const row of schoolStore.exams?.rows || []) {
    const start = String(row.date || '')
    if (!start) continue
    bars.push({
      id: `exam-${row.id}`,
      name: row.name,
      kind: 'exam',
      start,
      end: addDays(start, 1),
      status: String(row.status || 'Scheduled'),
      detail: [row.className, row.course].filter(Boolean).join(' · '),
      source: 'exams',
    })
  }

  return bars.sort((a, b) => a.start.localeCompare(b.start))
}

export const timelineBars = computed(() => buildTimelineBars())

export function currentTermRow() {
  const terms = schoolStore['academic-terms']?.rows || []
  const open = terms.find((t) => t.status === 'Open')
  if (open) return open
  const named = terms.find((t) =>
    String(t.name).includes(schoolSetup.currentTerm.replace(/Term\s*/i, '').trim()) ||
    String(t.name) === schoolSetup.currentTerm,
  )
  return named || terms[terms.length - 1] || null
}

export function barLeftPct(bar: TimelineBar, rangeStart: number, rangeEnd: number) {
  const s = parseDay(bar.start)
  if (s == null || rangeEnd <= rangeStart) return 0
  return Math.max(0, Math.min(100, ((s - rangeStart) / (rangeEnd - rangeStart)) * 100))
}

export function barWidthPct(bar: TimelineBar, rangeStart: number, rangeEnd: number) {
  const s = parseDay(bar.start)
  const e = parseDay(bar.end) ?? s
  if (s == null || e == null || rangeEnd <= rangeStart) return 2
  const width = ((Math.max(e, s) - s) / (rangeEnd - rangeStart)) * 100
  return Math.max(1.5, Math.min(100, width))
}

export function todayPct(rangeStart: number, rangeEnd: number) {
  const now = Date.parse(
    `${new Date().toISOString().slice(0, 10)}T12:00:00`,
  )
  if (rangeEnd <= rangeStart) return null
  if (now < rangeStart || now > rangeEnd) return null
  return ((now - rangeStart) / (rangeEnd - rangeStart)) * 100
}

export function monthTicks(rangeStart: number, rangeEnd: number) {
  const ticks: { label: string; pct: number }[] = []
  const start = new Date(rangeStart)
  const end = new Date(rangeEnd)
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= end) {
    const t = cursor.getTime()
    if (t >= rangeStart && t <= rangeEnd) {
      ticks.push({
        label: cursor.toLocaleString('en-GB', { month: 'short' }),
        pct: ((t - rangeStart) / (rangeEnd - rangeStart)) * 100,
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return ticks
}

export function parseRange(startIso: string, endIso: string) {
  const start = parseDay(startIso)
  const end = parseDay(endIso)
  if (start == null || end == null) return null
  return { start, end: Math.max(end, start + 86400000) }
}

export const kindThemes: Record<
  TimelineKind,
  { label: string; color: string; soft: string }
> = {
  term: { label: 'Term', color: '#3d3f8c', soft: '#e8e9f8' },
  exam: { label: 'Exams', color: '#b45309', soft: '#fef3c7' },
  activity: { label: 'Activities', color: '#0f766e', soft: '#ccfbf1' },
  parents: { label: 'Parents', color: '#7c3aed', soft: '#ede9fe' },
  holiday: { label: 'Holidays', color: '#be123c', soft: '#ffe4e6' },
  school: { label: 'School day', color: '#475569', soft: '#e2e8f0' },
}
