/** Canonical roles — must match backend `usermodel.Role` / JWT `role`. */

export const API_ROLES = [
  'SuperAdmin',
  'Admin',
  'HeadTeacher',
  'Teacher',
  'Accountant',
  'Admissions',
  'Librarian',
  'Staff',
  'Student',
  'Parent',
] as const

export type ApiRole = (typeof API_ROLES)[number]

export const ROLE_LABELS: Record<ApiRole, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Admin',
  HeadTeacher: 'Head Teacher',
  Teacher: 'Teacher',
  Accountant: 'Accounts',
  Admissions: 'Admissions Officer',
  Librarian: 'Librarian',
  Staff: 'Staff',
  Student: 'Student',
  Parent: 'Parent',
}

const ALIASES: Record<string, ApiRole> = {
  superadmin: 'SuperAdmin',
  'super admin': 'SuperAdmin',
  admin: 'Admin',
  headteacher: 'HeadTeacher',
  'head teacher': 'HeadTeacher',
  teacher: 'Teacher',
  accountant: 'Accountant',
  accounts: 'Accountant',
  admissions: 'Admissions',
  'admissions officer': 'Admissions',
  librarian: 'Librarian',
  staff: 'Staff',
  student: 'Student',
  parent: 'Parent',
}

export function isApiRole(value: string): value is ApiRole {
  return (API_ROLES as readonly string[]).includes(value)
}

/** Normalize legacy desk labels / JWT roles to API keys. */
export function normalizeRole(role: string | undefined | null): ApiRole | '' {
  if (!role) return ''
  const trimmed = role.trim()
  if (isApiRole(trimmed)) return trimmed
  return ALIASES[trimmed.toLowerCase()] || ''
}

export function roleLabel(role: string): string {
  const key = normalizeRole(role)
  if (key) return ROLE_LABELS[key]
  return role || 'Unknown'
}

export function isFullAccessRole(role: string): boolean {
  const key = normalizeRole(role)
  return key === 'SuperAdmin' || key === 'Admin'
}

export function isParentRole(role: string): boolean {
  return normalizeRole(role) === 'Parent'
}
