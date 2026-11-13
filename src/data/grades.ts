/** Nursery + primary class ladder (Uganda NCDC / UNEB). */

export const NURSERY_GRADES = [
  'Baby Class',
  'Middle Class',
  'Top Class',
] as const

export const PRIMARY_GRADES = [
  'P.1',
  'P.2',
  'P.3',
  'P.4',
  'P.5',
  'P.6',
  'P.7',
] as const

export const SCHOOL_GRADES = [...NURSERY_GRADES, ...PRIMARY_GRADES] as const

export type SchoolGrade = (typeof SCHOOL_GRADES)[number]

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

export function sectionForGrade(grade: string) {
  if (isNurseryClass(grade)) return 'Nursery'
  if (isPrimaryClass(grade)) return 'Primary'
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

export const sectionSelectOptions = SECTIONS.map((value) => ({
  label: value,
  value,
}))
