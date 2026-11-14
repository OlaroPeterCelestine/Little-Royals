import type { TimelineBar } from './termTimeline'
import { schoolSetup } from './schoolSetup'

/** Approximate Gregorian Easter Sunday for a year (Anonymous Gregorian algorithm). */
function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function iso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysDate(d: Date, days: number) {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

type HolidayDef = {
  name: string
  date: string
  region: 'uganda' | 'world'
}

/**
 * Uganda public holidays + major world calendar days for school planning.
 * Movable Christian dates use Easter; Islamic feast days for 2025–2027 are listed.
 */
export function publicHolidaysForYear(year: number): HolidayDef[] {
  const easter = easterSunday(year)
  const fixed: HolidayDef[] = [
    { name: "New Year's Day", date: `${year}-01-01`, region: 'world' },
    { name: 'NRM Liberation Day', date: `${year}-01-26`, region: 'uganda' },
    {
      name: 'Archbishop Janani Luwum Day',
      date: `${year}-02-16`,
      region: 'uganda',
    },
    {
      name: "International Women's Day",
      date: `${year}-03-08`,
      region: 'world',
    },
    {
      name: 'Good Friday',
      date: iso(addDaysDate(easter, -2)),
      region: 'world',
    },
    {
      name: 'Easter Monday',
      date: iso(addDaysDate(easter, 1)),
      region: 'world',
    },
    { name: 'Labour Day', date: `${year}-05-01`, region: 'uganda' },
    { name: 'Uganda Martyrs’ Day', date: `${year}-06-03`, region: 'uganda' },
    { name: 'National Heroes’ Day', date: `${year}-06-09`, region: 'uganda' },
    {
      name: 'Independence Day (Uganda)',
      date: `${year}-10-09`,
      region: 'uganda',
    },
    {
      name: 'World Children’s Day',
      date: `${year}-11-20`,
      region: 'world',
    },
    { name: 'Christmas Day', date: `${year}-12-25`, region: 'world' },
    { name: 'Boxing Day', date: `${year}-12-26`, region: 'world' },
  ]

  // Approximate Eid dates (Uganda gazetted; adjust yearly)
  const eidByYear: Record<number, HolidayDef[]> = {
    2025: [
      { name: 'Eid al-Fitr', date: '2025-03-31', region: 'uganda' },
      { name: 'Eid al-Adha', date: '2025-06-07', region: 'uganda' },
    ],
    2026: [
      { name: 'Eid al-Fitr', date: '2026-03-20', region: 'uganda' },
      { name: 'Eid al-Adha', date: '2026-05-27', region: 'uganda' },
    ],
    2027: [
      { name: 'Eid al-Fitr', date: '2027-03-10', region: 'uganda' },
      { name: 'Eid al-Adha', date: '2027-05-17', region: 'uganda' },
    ],
  }

  return [...fixed, ...(eidByYear[year] || [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
}

/** Timeline bars for public holidays in a year (or academic year span). */
export function publicHolidayBars(years: number[]): TimelineBar[] {
  const country = schoolSetup.country || 'Uganda'
  const bars: TimelineBar[] = []
  const seen = new Set<string>()

  for (const year of years) {
    for (const h of publicHolidaysForYear(year)) {
      const id = `ph-${h.date}-${h.name}`
      if (seen.has(id)) continue
      seen.add(id)
      const scope =
        h.region === 'uganda' ? `${country} public holiday` : 'World calendar'
      bars.push({
        id,
        name: h.name,
        kind: 'holiday',
        start: h.date,
        end: h.date,
        status: 'Public holiday',
        detail: `${scope} · no classes`,
        source: 'events',
      })
    }
  }
  return bars
}

export function yearsAround(iso: string, span = 1) {
  const y = Number(String(iso).slice(0, 4)) || new Date().getFullYear()
  const years = new Set<number>()
  for (let i = -span; i <= span; i++) years.add(y + i)
  return [...years]
}
