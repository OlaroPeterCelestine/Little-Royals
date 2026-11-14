import type { CatalogRow } from '@/data/catalog/catalog'
import { schoolSetup } from '@/data/school/schoolSetup'
import { addRecord, getLiveModule, updateRecord } from '@/data/catalog/store'
import type { RecordValues } from '@/types/records'

export const TERM_NAMES = ['Term I', 'Term II', 'Term III'] as const

/** Typical Uganda primary calendar offsets within an academic year name (calendar year). */
export function suggestedTermDates(yearName: string): {
  name: (typeof TERM_NAMES)[number]
  start: string
  end: string
}[] {
  const y = Number.parseInt(String(yearName).slice(0, 4), 10)
  const year = Number.isFinite(y) ? y : new Date().getFullYear()
  return [
    { name: 'Term I', start: `${year}-02-03`, end: `${year}-05-08` },
    { name: 'Term II', start: `${year}-05-25`, end: `${year}-08-21` },
    { name: 'Term III', start: `${year}-09-14`, end: `${year}-12-04` },
  ]
}

export function yearLabel(row: CatalogRow | null | undefined): string {
  return String(row?.name || '').trim()
}

export function termsForYear(year: CatalogRow | null | undefined): CatalogRow[] {
  if (!year) return []
  const label = yearLabel(year)
  const rows = getLiveModule('academic-terms')?.rows || []
  return rows
    .filter(
      (t) =>
        String(t.yearId || '') === year.id ||
        String(t.year || '') === label ||
        String(t.year || '') === year.id,
    )
    .slice()
    .sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')))
}

export function academicYearsSorted(): CatalogRow[] {
  const rows = getLiveModule('academic-years')?.rows || []
  return rows
    .slice()
    .sort((a, b) => String(b.name).localeCompare(String(a.name)))
}

export function createAcademicYear(values: {
  name: string
  startDate: string
  endDate: string
  status?: string
  subtitle?: string
  withTerms?: boolean
}): { year: CatalogRow; terms: CatalogRow[] } {
  const name = values.name.trim()
  if (!name) throw new Error('Year name is required')
  if (!values.startDate || !values.endDate) {
    throw new Error('Start and end dates are required')
  }

  const year = addRecord('academic-years', {
    name,
    startDate: values.startDate,
    endDate: values.endDate,
    status: values.status || 'Planned',
    subtitle: values.subtitle || `${name} academic year`,
  })

  const terms: CatalogRow[] = []
  if (values.withTerms !== false) {
    for (const slot of suggestedTermDates(name)) {
      terms.push(
        addRecord('academic-terms', {
          name: slot.name,
          year: name,
          yearId: year.id,
          start: slot.start,
          end: slot.end,
          status: values.status === 'Active' && slot.name === 'Term I' ? 'Open' : 'Planned',
          subtitle: `${slot.name} · ${name}`,
        } as RecordValues),
      )
    }
  }

  return { year, terms }
}

export function addTermToYear(
  year: CatalogRow,
  values: {
    name: string
    start: string
    end: string
    status?: string
  },
): CatalogRow {
  const label = yearLabel(year)
  const existing = termsForYear(year)
  if (existing.some((t) => t.name === values.name)) {
    throw new Error(`${values.name} already exists in ${label}`)
  }
  return addRecord('academic-terms', {
    name: values.name,
    year: label,
    yearId: year.id,
    start: values.start,
    end: values.end,
    status: values.status || 'Planned',
    subtitle: `${values.name} · ${label}`,
  } as RecordValues)
}

export function setCurrentYearAndTerm(year: CatalogRow, term?: CatalogRow | null) {
  schoolSetup.academicYear = yearLabel(year)
  if (term) schoolSetup.currentTerm = String(term.name)

  if (String(year.status) !== 'Active') {
    updateRecord('academic-years', year.id, {
      name: year.name,
      status: 'Active',
      startDate: year.startDate,
      endDate: year.endDate,
      subtitle: year.subtitle,
    })
  }

  if (!term) return

  const terms = termsForYear(year)
  for (const row of terms) {
    const nextStatus = row.id === term.id ? 'Open' : 'Closed'
    if (String(row.status) === nextStatus) continue
    updateRecord('academic-terms', row.id, {
      name: row.name,
      year: yearLabel(year),
      yearId: year.id,
      start: row.start,
      end: row.end,
      status: nextStatus,
      subtitle: row.subtitle,
    })
  }
}
