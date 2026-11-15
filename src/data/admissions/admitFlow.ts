import type { CatalogRow } from '@/data/catalog/catalog'
import { addRecord, schoolStore, updateRecord } from '@/data/catalog/store'
import { schoolSetup } from '@/data/school/schoolSetup'
import { printRecordDocument } from '@/data/documents/documents'
import { asString, type RecordValues } from '@/types/records'
import { formatRequirementsList } from '@/data/admissions/requirements'

function field(row: CatalogRow, key: string, fallback = ''): string {
  const raw = row[key]
  if (raw === undefined || raw === null) return fallback
  return asString(raw).trim() || fallback
}

function nextAdmissionId(): string {
  const rows = schoolStore.admissions?.rows || []
  let max = 0
  for (const r of rows) {
    const m = String(r.id).match(/ADM-(\d+)/i)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `ADM-${String(max + 1).padStart(2, '0')}`
}

function findAdmissionForApplicant(applicant: CatalogRow): CatalogRow | null {
  const rows = schoolStore.admissions?.rows || []
  return (
    rows.find(
      (r) =>
        field(r, 'application') === applicant.id ||
        (r.name === applicant.name &&
          field(r, 'program') === field(applicant, 'program')),
    ) || null
  )
}

export type AdmitResult = {
  admission: CatalogRow
  applicant: CatalogRow
  created: boolean
}

/**
 * Application → Admission: mark applicant admitted and create/update the
 * admissions record with full particulars for the letter.
 */
export async function admitApplicant(
  applicant: CatalogRow,
): Promise<AdmitResult> {
  const program =
    field(applicant, 'program') || field(applicant, 'section') || 'Primary'
  const className =
    field(applicant, 'className') ||
    field(applicant, 'grade') ||
    field(applicant, 'class') ||
    ''
  const term = field(applicant, 'term') || schoolSetup.currentTerm
  const fee = field(applicant, 'fee') || 'Unpaid'

  const payload: RecordValues = {
    name: applicant.name,
    program,
    className,
    grade: className,
    term,
    fee,
    status: 'Admitted',
    application: applicant.id,
    dateOfBirth: field(applicant, 'dateOfBirth'),
    gender: field(applicant, 'gender'),
    parentName: field(applicant, 'parentName'),
    parentPhone: field(applicant, 'parentPhone'),
    parentEmail: field(applicant, 'parentEmail'),
    previousSchool: field(applicant, 'previousSchool'),
    reportingDate: field(applicant, 'reportingDate') || '',
    admissionDate: new Date().toISOString().slice(0, 10),
    academicYear: schoolSetup.academicYear,
    requirements: formatRequirementsList(program),
    subtitle: `Admitted from application ${applicant.id}`,
  }

  let created = false
  let admission = findAdmissionForApplicant(applicant)
  if (admission) {
    admission = await updateRecord('admissions', admission.id, {
      ...payload,
      id: admission.id,
      name: applicant.name,
    })
  } else {
    created = true
    admission = await addRecord('admissions', {
      ...payload,
      id: nextAdmissionId(),
      status: 'Admitted',
    })
  }

  const applicantStatus = String(applicant.status || '')
  if (!/admitted/i.test(applicantStatus)) {
    await updateRecord('applicants', applicant.id, {
      name: applicant.name,
      status: 'Admitted',
      program: field(applicant, 'program') || program,
      grade: field(applicant, 'grade') || className,
      className: field(applicant, 'className') || className,
      applied: field(applicant, 'applied'),
      dateOfBirth: field(applicant, 'dateOfBirth'),
      gender: field(applicant, 'gender'),
      parentName: field(applicant, 'parentName'),
      parentPhone: field(applicant, 'parentPhone'),
      parentEmail: field(applicant, 'parentEmail'),
      previousSchool: field(applicant, 'previousSchool'),
      subtitle: field(applicant, 'subtitle') || `Admitted · ${admission.id}`,
    })
  }

  const refreshed =
    schoolStore.applicants?.rows.find((r) => r.id === applicant.id) || applicant

  return { admission, applicant: refreshed, created }
}

/** Prefer the admissions record (with particulars) when printing a letter. */
export function resolveAdmissionLetterRow(row: CatalogRow): CatalogRow {
  const byApp = (schoolStore.admissions?.rows || []).find(
    (r) => field(r, 'application') === row.id,
  )
  if (byApp) return mergeLetterFields(byApp, row)

  const byId = (schoolStore.admissions?.rows || []).find((r) => r.id === row.id)
  if (byId) {
    const app = (schoolStore.applicants?.rows || []).find(
      (a) => a.id === field(byId, 'application') || a.name === byId.name,
    )
    return app ? mergeLetterFields(byId, app) : byId
  }

  const byName = (schoolStore.admissions?.rows || []).find(
    (r) => r.name === row.name,
  )
  if (byName) return mergeLetterFields(byName, row)

  return row
}

function mergeLetterFields(primary: CatalogRow, secondary: CatalogRow): CatalogRow {
  const keys = [
    'dateOfBirth',
    'gender',
    'parentName',
    'parentPhone',
    'parentEmail',
    'previousSchool',
    'className',
    'grade',
    'program',
    'reportingDate',
    'admissionDate',
    'fee',
    'application',
    'academicYear',
    'term',
  ]
  const merged: CatalogRow = { ...primary }
  for (const key of keys) {
    if (!field(merged, key) && field(secondary, key)) {
      merged[key] = field(secondary, key)
    }
  }
  if (!field(merged, 'application') && secondary.id.startsWith('APP')) {
    merged.application = secondary.id
  }
  return merged
}

/** Print the branded admission letter (requirements + particulars). */
export function printAdmissionLetter(row: CatalogRow, moduleKey = 'admissions') {
  const letterRow = resolveAdmissionLetterRow(row)
  return printRecordDocument('admission-letter', moduleKey, letterRow)
}

/** Admit from application, then open the admission letter print preview. */
export async function admitAndPrintLetter(
  applicant: CatalogRow,
): Promise<AdmitResult & { letterTitle: string }> {
  const result = await admitApplicant(applicant)
  const letterTitle = printAdmissionLetter(result.admission, 'admissions')
  return { ...result, letterTitle }
}
