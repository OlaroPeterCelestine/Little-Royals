import { schoolSetup } from './schoolSetup'

/** School abbreviation + 2-digit year of joining + school number, e.g. LR26001 */
export function joiningYearFrom(
  admissionDate?: string | null,
  fallbackYear?: string | null,
): string {
  const fromDate = String(admissionDate || '').trim()
  if (/^\d{4}/.test(fromDate)) return fromDate.slice(0, 4)
  const fromSetup = String(fallbackYear || schoolSetup.academicYear || '').trim()
  if (/^\d{4}/.test(fromSetup)) return fromSetup.slice(0, 4)
  return String(new Date().getFullYear())
}

export function joiningYearShort(
  admissionDate?: string | null,
  fallbackYear?: string | null,
): string {
  return joiningYearFrom(admissionDate, fallbackYear).slice(-2)
}

export function schoolAbbreviation(initials?: string | null): string {
  const raw = String(initials || schoolSetup.initials || 'LR')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
  return raw.slice(0, 4) || 'LR'
}

export function nextStudentNumber(
  existingIds: string[],
  admissionDate?: string | null,
): string {
  const abbr = schoolAbbreviation()
  const yy = joiningYearShort(admissionDate)
  const prefix = `${abbr}${yy}`
  let max = 0
  for (const id of existingIds) {
    if (!id.startsWith(prefix)) continue
    const n = Number.parseInt(id.slice(prefix.length), 10)
    if (!Number.isNaN(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

/** National / EMIS-style learner number derived from school student number. */
export function learnerNumberFromStudentNumber(studentNumber: string): string {
  const raw = String(studentNumber || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
  if (!raw) return ''
  return `LN-${raw}`
}

/** School Pay account / payment code for fees (mobile money). */
export function schoolPayAccountFromStudentNumber(studentNumber: string): string {
  const abbr = schoolAbbreviation()
  const digits = String(studentNumber || '').replace(/\D/g, '')
  const serial = digits.slice(-4) || '0001'
  return `${abbr}-${serial}`
}
