import { computed } from 'vue'
import { schoolStore } from './store'
import { schoolSetup } from './schoolSetup'
import type { CatalogRow } from './catalog'
import { publicHolidayBars, yearsAround } from './publicHolidays'

export type TimelineKind =
  | 'term'
  | 'exam'
  | 'activity'
  | 'parents'
  | 'holiday'
  | 'school'

export type TimelineScale = 'day' | 'week' | 'month' | 'term' | 'year'

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

export interface AxisTick {
  label: string
  sub?: string
  pct: number
  iso?: string
}

export interface CalendarDayCell {
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
  weekday: string
  bars: TimelineBar[]
}

const DAY_MS = 86400000

function parseDay(value: unknown): number | null {
  const s = String(value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const t = Date.parse(`${s}T12:00:00`)
  return Number.isFinite(t) ? t : null
}

export function toIso(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function startOfDay(ms: number) {
  const d = new Date(ms)
  return Date.parse(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T12:00:00`,
  )
}

function startOfWeek(ms: number) {
  const d = new Date(startOfDay(ms))
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  return startOfDay(d.getTime())
}

function startOfMonth(ms: number) {
  const d = new Date(ms)
  return Date.parse(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01T12:00:00`,
  )
}

function endOfMonth(ms: number) {
  const d = new Date(ms)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return Date.parse(
    `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}T12:00:00`,
  )
}

export function addDays(iso: string, days: number) {
  const t = parseDay(iso)
  if (t == null) return iso
  return toIso(t + days * DAY_MS)
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

  const yearHint =
    String(schoolSetup.academicYear || '').slice(0, 4) || todayIso()
  bars.push(...publicHolidayBars(yearsAround(yearHint, 1)))

  return bars.sort((a, b) => a.start.localeCompare(b.start))
}

export const timelineBars = computed(() => buildTimelineBars())

export function currentTermRow() {
  const terms = schoolStore['academic-terms']?.rows || []
  const open = terms.find((t) => t.status === 'Open')
  if (open) return open
  const named = terms.find(
    (t) =>
      String(t.name).includes(
        schoolSetup.currentTerm.replace(/Term\s*/i, '').trim(),
      ) || String(t.name) === schoolSetup.currentTerm,
  )
  return named || terms[terms.length - 1] || null
}

export function parseRange(startIso: string, endIso: string) {
  const start = parseDay(startIso)
  const end = parseDay(endIso)
  if (start == null || end == null) return null
  return { start, end: Math.max(end, start + DAY_MS) }
}

export function resolveScaleRange(
  scale: TimelineScale,
  anchorIso: string,
  term?: CatalogRow | null,
) {
  const anchor = parseDay(anchorIso) ?? parseDay(todayIso())!
  if (scale === 'day') {
    const s = startOfDay(anchor)
    return { start: s, end: s + DAY_MS }
  }
  if (scale === 'week') {
    const s = startOfWeek(anchor)
    return { start: s, end: s + 7 * DAY_MS }
  }
  if (scale === 'month') {
    return { start: startOfMonth(anchor), end: endOfMonth(anchor) + DAY_MS }
  }
  if (scale === 'term' && term) {
    const r = parseRange(String(term.start), String(term.end))
    if (r) return r
  }
  if (scale === 'term') {
    const s = startOfMonth(anchor)
    return { start: s, end: s + 90 * DAY_MS }
  }
  const year = Number(schoolSetup.academicYear) || new Date(anchor).getFullYear()
  return parseRange(`${year}-01-01`, `${year}-12-31`)!
}

export function shiftAnchor(
  scale: TimelineScale,
  anchorIso: string,
  direction: -1 | 1,
) {
  const t = parseDay(anchorIso) ?? parseDay(todayIso())!
  const d = new Date(t)
  if (scale === 'day') d.setDate(d.getDate() + direction)
  else if (scale === 'week') d.setDate(d.getDate() + 7 * direction)
  else if (scale === 'month') d.setMonth(d.getMonth() + direction)
  else if (scale === 'term') d.setMonth(d.getMonth() + 3 * direction)
  else d.setFullYear(d.getFullYear() + direction)
  return toIso(d.getTime())
}

export function scaleTitle(
  scale: TimelineScale,
  anchorIso: string,
  termName?: string,
) {
  const t = parseDay(anchorIso) ?? parseDay(todayIso())!
  const d = new Date(t)
  if (scale === 'day') {
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  if (scale === 'week') {
    const start = new Date(startOfWeek(t))
    const end = new Date(startOfWeek(t) + 6 * DAY_MS)
    return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  if (scale === 'month') {
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  if (scale === 'term') return termName || 'Term'
  return `Year ${schoolSetup.academicYear || d.getFullYear()}`
}

export function axisTicks(
  scale: TimelineScale,
  rangeStart: number,
  rangeEnd: number,
): AxisTick[] {
  const ticks: AxisTick[] = []
  const span = rangeEnd - rangeStart
  if (span <= 0) return ticks

  if (scale === 'day') {
    for (let h = 0; h < 24; h += 3) {
      ticks.push({
        label: `${String(h).padStart(2, '0')}:00`,
        pct: (h / 24) * 100,
      })
    }
    return ticks
  }

  if (scale === 'week' || scale === 'month') {
    let cursor = startOfDay(rangeStart)
    while (cursor < rangeEnd) {
      const d = new Date(cursor)
      ticks.push({
        label: String(d.getDate()),
        sub: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        pct: ((cursor - rangeStart) / span) * 100,
        iso: toIso(cursor),
      })
      cursor += DAY_MS
    }
    return ticks
  }

  if (scale === 'term') {
    let cursor = startOfWeek(rangeStart)
    while (cursor < rangeEnd) {
      if (cursor >= rangeStart) {
        const d = new Date(cursor)
        ticks.push({
          label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          sub: 'Wk',
          pct: ((cursor - rangeStart) / span) * 100,
          iso: toIso(cursor),
        })
      }
      cursor += 7 * DAY_MS
    }
    return ticks
  }

  let cursor = startOfMonth(rangeStart)
  while (cursor < rangeEnd) {
    if (cursor >= rangeStart) {
      const d = new Date(cursor)
      ticks.push({
        label: d.toLocaleDateString('en-GB', { month: 'short' }),
        pct: ((cursor - rangeStart) / span) * 100,
        iso: toIso(cursor),
      })
    }
    const next = new Date(cursor)
    next.setMonth(next.getMonth() + 1)
    cursor = startOfMonth(next.getTime())
  }
  return ticks
}

export function calendarCells(
  scale: TimelineScale,
  rangeStart: number,
  rangeEnd: number,
  bars: TimelineBar[],
  anchorIso: string,
): CalendarDayCell[] {
  const today = todayIso()
  const cells: CalendarDayCell[] = []

  if (scale === 'day') {
    const iso = toIso(rangeStart)
    cells.push({
      iso,
      day: new Date(rangeStart).getDate(),
      inMonth: true,
      isToday: iso === today,
      weekday: new Date(rangeStart).toLocaleDateString('en-GB', {
        weekday: 'long',
      }),
      bars: barsOnDay(bars, iso),
    })
    return cells
  }

  if (scale === 'week') {
    for (let i = 0; i < 7; i++) {
      const ms = rangeStart + i * DAY_MS
      const iso = toIso(ms)
      const d = new Date(ms)
      cells.push({
        iso,
        day: d.getDate(),
        inMonth: true,
        isToday: iso === today,
        weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        bars: barsOnDay(bars, iso),
      })
    }
    return cells
  }

  // Month / term / year → month grid for the anchor month
  const anchor = parseDay(anchorIso) ?? rangeStart
  const monthStart = startOfMonth(
    scale === 'month' ? rangeStart : anchor,
  )
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = startOfWeek(monthEnd) + 7 * DAY_MS
  const month = new Date(monthStart).getMonth()

  for (let ms = gridStart; ms < gridEnd; ms += DAY_MS) {
    const d = new Date(ms)
    const iso = toIso(ms)
    cells.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === today,
      weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      bars: barsOnDay(bars, iso),
    })
  }
  return cells
}

export function barsOnDay(bars: TimelineBar[], iso: string) {
  const t = parseDay(iso)
  if (t == null) return []
  return bars.filter((bar) => {
    const s = parseDay(bar.start)
    const e = parseDay(bar.end) ?? s
    if (s == null || e == null) return false
    return t >= s && t <= e
  })
}

export function barLeftPct(
  bar: TimelineBar,
  rangeStart: number,
  rangeEnd: number,
) {
  const s = parseDay(bar.start)
  if (s == null || rangeEnd <= rangeStart) return 0
  return Math.max(
    0,
    Math.min(100, ((s - rangeStart) / (rangeEnd - rangeStart)) * 100),
  )
}

export function barWidthPct(
  bar: TimelineBar,
  rangeStart: number,
  rangeEnd: number,
) {
  const s = parseDay(bar.start)
  const e = parseDay(bar.end) ?? s
  if (s == null || e == null || rangeEnd <= rangeStart) return 2
  const left = Math.max(s, rangeStart)
  const right = Math.min(Math.max(e, s) + DAY_MS * 0.85, rangeEnd)
  const width = ((right - left) / (rangeEnd - rangeStart)) * 100
  // Keep short (single-day) bars visible without overlapping neighbours too hard
  return Math.max(2.6, Math.min(100, width))
}

export function todayPct(rangeStart: number, rangeEnd: number) {
  const now = parseDay(todayIso())
  if (now == null || rangeEnd <= rangeStart) return null
  if (now < rangeStart || now > rangeEnd) return null
  return ((now - rangeStart) / (rangeEnd - rangeStart)) * 100
}

/** @deprecated use axisTicks */
export function monthTicks(rangeStart: number, rangeEnd: number) {
  return axisTicks('year', rangeStart, rangeEnd)
}

export const kindThemes: Record<
  TimelineKind,
  { label: string; color: string; soft: string }
> = {
  term: { label: 'Term', color: '#2e3192', soft: '#e8e9f6' },
  exam: { label: 'Exams', color: '#c2410c', soft: '#ffedd5' },
  activity: { label: 'Activities', color: '#0f766e', soft: '#ccfbf1' },
  parents: { label: 'Parents', color: '#6d28d9', soft: '#ede9fe' },
  holiday: { label: 'Public holidays', color: '#be123c', soft: '#ffe4e6' },
  school: { label: 'School days', color: '#334155', soft: '#e2e8f0' },
}

export interface GanttLane {
  id: string
  label: string
  kind: TimelineKind
  bars: TimelineBar[]
}

const KIND_ORDER: TimelineKind[] = [
  'term',
  'exam',
  'school',
  'activity',
  'parents',
  'holiday',
]

/** Pack bars into kind lanes so the chart is dense instead of one row per event. */
export function packGanttLanes(bars: TimelineBar[]): GanttLane[] {
  const byKind = new Map<TimelineKind, TimelineBar[]>()
  for (const bar of bars) {
    const list = byKind.get(bar.kind) || []
    list.push(bar)
    byKind.set(bar.kind, list)
  }

  const lanes: GanttLane[] = []
  for (const kind of KIND_ORDER) {
    const group = (byKind.get(kind) || [])
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
    if (!group.length) continue

    const laneEnds: number[] = []
    const laneBars: TimelineBar[][] = []

    for (const bar of group) {
      const start = parseDay(bar.start) ?? 0
      const end = (parseDay(bar.end) ?? start) + DAY_MS
      let placed = false
      for (let i = 0; i < laneEnds.length; i++) {
        if (start >= laneEnds[i]) {
          laneBars[i].push(bar)
          laneEnds[i] = end
          placed = true
          break
        }
      }
      if (!placed) {
        laneBars.push([bar])
        laneEnds.push(end)
      }
    }

    laneBars.forEach((items, idx) => {
      const base = kindThemes[kind].label
      lanes.push({
        id: `${kind}-${idx}`,
        label: idx === 0 ? base : `${base} · ${idx + 1}`,
        kind,
        bars: items,
      })
    })
  }
  return lanes
}

export function formatBarDate(iso: string) {
  const t = parseDay(iso)
  if (t == null) return iso
  return new Date(t).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatBarRange(start: string, end: string) {
  if (start === end) return formatBarDate(start)
  return `${formatBarDate(start)} – ${formatBarDate(end)}`
}

export const scaleOptions: { label: string; value: TimelineScale }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Term', value: 'term' },
  { label: 'Year', value: 'year' },
]
