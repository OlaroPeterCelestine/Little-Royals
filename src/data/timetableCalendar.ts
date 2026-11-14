import type { CatalogRow } from './catalog'
import { sortSchoolClassNames } from './grades'
import { getLiveModule } from './store'

export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
] as const

export type WeekDay = (typeof WEEK_DAYS)[number]

const DAY_ALIASES: Record<string, WeekDay> = {
  mon: 'Monday',
  monday: 'Monday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  tuesday: 'Tuesday',
  wed: 'Wednesday',
  wednesday: 'Wednesday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  thursday: 'Thursday',
  fri: 'Friday',
  friday: 'Friday',
}

export function normalizeDay(raw: unknown): WeekDay | '' {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
  return DAY_ALIASES[key] || ''
}

export function dayShort(day: string) {
  return day.slice(0, 3)
}

export function periodsSorted(): CatalogRow[] {
  const rows = getLiveModule('periods')?.rows || []
  return rows
    .slice()
    .sort(
      (a, b) =>
        Number(a.sequence || 0) - Number(b.sequence || 0) ||
        String(a.startTime || '').localeCompare(String(b.startTime || '')),
    )
}

export function classOptionsFromTimetable(): { label: string; value: string }[] {
  const fromClasses = (getLiveModule('classes')?.rows || []).map((c) =>
    String(c.name),
  )
  const fromSlots = (getLiveModule('timetable')?.rows || []).map((r) =>
    String(r.group || ''),
  )
  const names = sortSchoolClassNames(
    Array.from(new Set([...fromClasses, ...fromSlots].filter(Boolean))),
  )
  return [
    { label: 'All classes', value: 'all' },
    ...names.map((n) => ({ label: n, value: n })),
  ]
}

export function timetableSlots(): CatalogRow[] {
  return getLiveModule('timetable')?.rows || []
}

export function slotsForClass(className: string): CatalogRow[] {
  const rows = timetableSlots()
  if (!className || className === 'all') return rows
  return rows.filter((r) => String(r.group || '') === className)
}

export function matchPeriod(slot: CatalogRow, period: CatalogRow): boolean {
  const slotPeriod = String(slot.name || '').trim()
  const periodName = String(period.name || '').trim()
  if (slotPeriod === periodName) return true
  if (slotPeriod.startsWith(periodName)) return true
  const slotStart = String(slot.startTime || '')
  if (slotStart && slotStart === String(period.startTime || '')) return true
  // Legacy "Period 1 · 07:45" labels
  const n = periodName.match(/(\d+)/)?.[1]
  if (n && new RegExp(`period\\s*${n}\\b`, 'i').test(slotPeriod)) return true
  return false
}

export function slotsAt(
  day: WeekDay,
  period: CatalogRow,
  className: string,
): CatalogRow[] {
  return slotsForClass(className).filter(
    (slot) => normalizeDay(slot.day) === day && matchPeriod(slot, period),
  )
}

export function isBreakPeriod(period: CatalogRow) {
  const t = String(period.periodType || '').toLowerCase()
  return t === 'break' || t === 'lunch' || t === 'assembly'
}

export function subjectTheme(course: string): string {
  const c = course.toLowerCase()
  if (c.includes('math') || c.includes('numeracy')) return 'blue'
  if (c.includes('english') || c.includes('literacy') || c.includes('story'))
    return 'violet'
  if (c.includes('science')) return 'green'
  if (c.includes('social')) return 'amber'
  if (c.includes('pe') || c.includes('play') || c.includes('sport')) return 'red'
  if (c.includes('art') || c.includes('music') || c.includes('cre')) return 'pink'
  return 'gray'
}
