import type { CatalogRow } from './catalog'

export function personAge(dateOfBirth?: string | number): string {
  const raw = String(dateOfBirth || '')
  if (!raw) return '—'
  const dob = new Date(raw)
  if (Number.isNaN(dob.getTime())) return '—'
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1
  return String(age)
}

export function fieldOf(row: CatalogRow | null | undefined, key: string, fallback = '—') {
  const v = row?.[key]
  if (v === undefined || v === null || v === '') return fallback
  return String(v)
}

export type BiodataField = { label: string; value: string }

export function studentPersonalFields(student: CatalogRow): BiodataField[] {
  return [
    {
      label: 'Learner number',
      value: fieldOf(student, 'learnerNumber', fieldOf(student, 'id')),
    },
    {
      label: 'Student number',
      value: fieldOf(student, 'studentNumber', fieldOf(student, 'id')),
    },
    {
      label: 'School Pay account',
      value: fieldOf(student, 'schoolPayAccount'),
    },
    { label: 'First name', value: fieldOf(student, 'firstName') },
    { label: 'Last name', value: fieldOf(student, 'lastName') },
    { label: 'Other names', value: fieldOf(student, 'otherNames') },
    { label: 'Gender', value: fieldOf(student, 'gender') },
    { label: 'Date of birth', value: fieldOf(student, 'dateOfBirth') },
    { label: 'Age', value: personAge(student.dateOfBirth) },
    { label: 'Place of birth', value: fieldOf(student, 'placeOfBirth') },
    { label: 'Nationality', value: fieldOf(student, 'nationality', 'Ugandan') },
    { label: 'Tribe', value: fieldOf(student, 'tribe') },
    { label: 'Religion', value: fieldOf(student, 'religion') },
    { label: 'Home language', value: fieldOf(student, 'homeLanguage') },
    { label: 'Residential address', value: fieldOf(student, 'address') },
  ]
}

export function studentSchoolFields(student: CatalogRow, classInfo?: CatalogRow): BiodataField[] {
  return [
    {
      label: 'Learner number',
      value: fieldOf(student, 'learnerNumber', fieldOf(student, 'id')),
    },
    {
      label: 'Student number',
      value: fieldOf(student, 'studentNumber', fieldOf(student, 'id')),
    },
    {
      label: 'School Pay account',
      value: fieldOf(student, 'schoolPayAccount'),
    },
    { label: 'Section', value: fieldOf(student, 'program') },
    { label: 'Class', value: fieldOf(student, 'className') },
    { label: 'Stream', value: fieldOf(student, 'stream') },
    { label: 'Admission date', value: fieldOf(student, 'admissionDate') },
    { label: 'Previous school', value: fieldOf(student, 'previousSchool') },
    { label: 'Class teacher', value: fieldOf(classInfo, 'teacher') },
    { label: 'Classroom', value: fieldOf(classInfo, 'room') },
    { label: 'Status', value: fieldOf(student, 'status') },
  ]
}

export function studentHealthFields(student: CatalogRow): BiodataField[] {
  return [
    { label: 'Blood group', value: fieldOf(student, 'bloodGroup') },
    { label: 'Medical alerts', value: fieldOf(student, 'medicalAlerts') },
    { label: 'Special needs', value: fieldOf(student, 'specialNeeds') },
    { label: 'Dietary notes', value: fieldOf(student, 'dietaryNotes') },
  ]
}

export function studentContactFields(student: CatalogRow): BiodataField[] {
  return [
    { label: 'Learner email', value: fieldOf(student, 'email') },
    { label: 'Home phone', value: fieldOf(student, 'phone') },
    { label: 'Emergency contact', value: fieldOf(student, 'emergencyContact') },
  ]
}

export function employeePersonalFields(row: CatalogRow): BiodataField[] {
  return [
    { label: 'Employee number', value: fieldOf(row, 'employeeNumber', fieldOf(row, 'id')) },
    { label: 'First name', value: fieldOf(row, 'firstName') },
    { label: 'Last name', value: fieldOf(row, 'lastName') },
    { label: 'Other names', value: fieldOf(row, 'otherNames') },
    { label: 'Gender', value: fieldOf(row, 'gender') },
    { label: 'Date of birth', value: fieldOf(row, 'dateOfBirth') },
    { label: 'Age', value: personAge(row.dateOfBirth) },
    { label: 'Nationality', value: fieldOf(row, 'nationality', 'Ugandan') },
    { label: 'National ID / NIN', value: fieldOf(row, 'nationalId') },
    { label: 'Marital status', value: fieldOf(row, 'maritalStatus') },
    { label: 'Languages', value: fieldOf(row, 'languages') },
    { label: 'Residential address', value: fieldOf(row, 'address') },
  ]
}

export function employeeContactFields(row: CatalogRow): BiodataField[] {
  return [
    { label: 'Phone', value: fieldOf(row, 'phone') },
    { label: 'Alternative phone', value: fieldOf(row, 'altPhone') },
    { label: 'Email', value: fieldOf(row, 'email') },
    { label: 'Emergency contact', value: fieldOf(row, 'emergencyContact') },
  ]
}

export function employeeEmploymentFields(row: CatalogRow): BiodataField[] {
  return [
    { label: 'Job title', value: fieldOf(row, 'jobTitle') },
    { label: 'Department', value: fieldOf(row, 'department') },
    { label: 'Employment type', value: fieldOf(row, 'employmentType') },
    { label: 'Start date', value: fieldOf(row, 'startDate') },
    { label: 'Years of experience', value: fieldOf(row, 'yearsExperience') },
    { label: 'Highest qualification', value: fieldOf(row, 'qualification') },
    {
      label: 'Additional qualifications',
      value: fieldOf(row, 'additionalQualifications'),
    },
    { label: 'Status', value: fieldOf(row, 'status') },
  ]
}

export function employeeHealthFields(row: CatalogRow): BiodataField[] {
  return [
    { label: 'Blood group', value: fieldOf(row, 'bloodGroup') },
    { label: 'Medical alerts', value: fieldOf(row, 'medicalAlerts') },
  ]
}
