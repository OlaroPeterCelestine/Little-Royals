/** Nursery + primary class ladder (Uganda NCDC / UNEB). */

export const NURSERY_GRADES = [
  'Baby Class',
  'Middle Class',
  'Top Class',
] as const

export const LOWER_PRIMARY_GRADES = ['P.1', 'P.2', 'P.3'] as const

export const UPPER_PRIMARY_GRADES = ['P.4', 'P.5', 'P.6', 'P.7'] as const

export const PRIMARY_GRADES = [
  ...LOWER_PRIMARY_GRADES,
  ...UPPER_PRIMARY_GRADES,
] as const

export const SCHOOL_GRADES = [...NURSERY_GRADES, ...PRIMARY_GRADES] as const

export type SchoolGrade = (typeof SCHOOL_GRADES)[number]

export type ClassSectionBand = 'nursery' | 'lower-primary' | 'upper-primary'

export const SECTIONS = ['Nursery', 'Primary'] as const

export const UNEB_AGGREGATES = [
  'D1',
  'D2',
  'C3',
  'C4',
  'C5',
  'C6',
  'P7',
  'P8',
  'F9',
] as const

export const NURSERY_BANDS = [
  'Emerging',
  'Developing',
  'Secure',
  'Exceeding',
] as const

export const PLE_DIVISIONS = ['Div 1', 'Div 2', 'Div 3', 'Div 4', 'U'] as const

export function isNurseryClass(classOrGrade: unknown) {
  const s = String(classOrGrade || '')
  return /Baby|Middle|Top|Nursery/i.test(s)
}

export function isPrimaryClass(classOrGrade: unknown) {
  return /P\.?\s*[1-7]/i.test(String(classOrGrade || ''))
}

export function isLowerPrimaryClass(classOrGrade: unknown) {
  return /P\.?\s*[1-3]\b/i.test(String(classOrGrade || ''))
}

export function isUpperPrimaryClass(classOrGrade: unknown) {
  return /P\.?\s*[4-7]\b/i.test(String(classOrGrade || ''))
}

export function sectionForGrade(grade: string) {
  if (isNurseryClass(grade)) return 'Nursery'
  if (isPrimaryClass(grade)) return 'Primary'
  return ''
}

/** Nursery · Lower primary (P.1–P.3) · Upper primary (P.4–P.7). */
export function classSectionBand(classOrGrade: unknown): ClassSectionBand | '' {
  if (isNurseryClass(classOrGrade)) return 'nursery'
  if (isLowerPrimaryClass(classOrGrade)) return 'lower-primary'
  if (isUpperPrimaryClass(classOrGrade)) return 'upper-primary'
  return ''
}

/** Map a percentage mark to UNEB PLE-style aggregate (simplified). */
export function percentToAggregate(score: number): string {
  if (score >= 90) return 'D1'
  if (score >= 80) return 'D2'
  if (score >= 70) return 'C3'
  if (score >= 65) return 'C4'
  if (score >= 60) return 'C5'
  if (score >= 55) return 'C6'
  if (score >= 45) return 'P7'
  if (score >= 35) return 'P8'
  return 'F9'
}

/** Points contribution for aggregate sum (D1=1 … F9=9). */
export function aggregatePoints(agg: string): number {
  const map: Record<string, number> = {
    D1: 1,
    D2: 2,
    C3: 3,
    C4: 4,
    C5: 5,
    C6: 6,
    P7: 7,
    P8: 8,
    F9: 9,
  }
  return map[String(agg || '').toUpperCase()] ?? 9
}

/** Map average % to PLE division for primary report cards. */
export function percentToDivision(average: number): string {
  if (average >= 80) return 'Div 1'
  if (average >= 70) return 'Div 2'
  if (average >= 55) return 'Div 3'
  if (average >= 40) return 'Div 4'
  return 'U'
}

/** Map nursery readiness % to descriptor band. */
export function percentToNurseryBand(average: number): string {
  if (average >= 85) return 'Exceeding'
  if (average >= 70) return 'Secure'
  if (average >= 50) return 'Developing'
  return 'Emerging'
}

export const gradeSelectOptions = SCHOOL_GRADES.map((value) => ({
  label: value,
  value,
}))

/** Create Class / selects: Uganda ladder with section labels. */
export const ugandaClassLevelOptions = [
  ...NURSERY_GRADES.map((value) => ({
    label: `Nursery · ${value}`,
    value,
  })),
  ...LOWER_PRIMARY_GRADES.map((value) => ({
    label: `Lower primary · ${value}`,
    value,
  })),
  ...UPPER_PRIMARY_GRADES.map((value) => ({
    label: `Upper primary · ${value}`,
    value,
  })),
]

export const STREAM_OPTIONS = [
  { label: 'None (whole class)', value: '' },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'Yellow', value: 'Yellow' },
  { label: 'Blue', value: 'Blue' },
  { label: 'Red', value: 'Red' },
  { label: 'Green', value: 'Green' },
  { label: 'Gold', value: 'Gold' },
]

export const sectionSelectOptions = SECTIONS.map((value) => ({
  label: value,
  value,
}))

/** Display name for a class stream, e.g. P.1 + Yellow → "P.1 Yellow". */
export function classDisplayName(grade: unknown, stream?: unknown): string {
  const g = String(grade || '').trim()
  const s = String(stream || '').trim()
  if (!g) return s
  if (!s) return g
  return `${g} ${s}`
}

/** Ladder index: Baby → Middle → Top → P.1 … P.7 (unknowns last). */
export function schoolClassRank(value: unknown): number {
  const s = String(value || '').trim()
  if (!s) return 9999

  const lower = s.toLowerCase()
  for (let i = 0; i < NURSERY_GRADES.length; i++) {
    const g = NURSERY_GRADES[i].toLowerCase()
    if (lower === g || lower.startsWith(`${g} `) || lower.includes(g)) {
      return i
    }
  }

  const primary = s.match(/P\.?\s*([1-7])/i)
  if (primary) return NURSERY_GRADES.length + Number(primary[1]) - 1

  return 9000
}

/** Chronological class / grade order for lists and select options. */
export function compareSchoolClasses(a: unknown, b: unknown): number {
  const ra = schoolClassRank(a)
  const rb = schoolClassRank(b)
  if (ra !== rb) return ra - rb
  return String(a || '').localeCompare(String(b || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export function sortSchoolClassNames(names: string[]): string[] {
  return [...names].sort(compareSchoolClasses)
}

export function sortSchoolClassRows<T extends { name?: unknown; grade?: unknown }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const byGrade = compareSchoolClasses(a.grade || a.name, b.grade || b.name)
    if (byGrade !== 0) return byGrade
    return compareSchoolClasses(a.name, b.name)
  })
}
