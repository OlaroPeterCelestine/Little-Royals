import { computed, reactive } from 'vue'
import { catalog } from './catalog'
import { currentUser, logActivity } from './activity'

export type PermFlag =
  | 'read'
  | 'write'
  | 'create'
  | 'delete'
  | 'export'
  | 'print'
  | 'share'

export interface RoleDef {
  id: string
  name: string
  description: string
  deskAccess: boolean
  status: 'Active' | 'Disabled'
}

export interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  status: 'Active' | 'Disabled' | 'Invited'
  lastLogin?: string
  department?: string
  title?: string
  phone?: string
  bio?: string
  location?: string
  joinedAt?: string
}

export type DocPerms = Record<PermFlag, boolean>

export interface RoleDocPermission {
  role: string
  doctype: string
  doctypeLabel: string
  perms: DocPerms
}

const FLAGS: PermFlag[] = [
  'read',
  'write',
  'create',
  'delete',
  'export',
  'print',
  'share',
]

const DOC_TYPES = Object.values(catalog).map((m) => ({
  key: m.key,
  label: m.singular,
}))

function full(overrides: Partial<DocPerms> = {}): DocPerms {
  return {
    read: true,
    write: true,
    create: true,
    delete: true,
    export: true,
    print: true,
    share: true,
    ...overrides,
  }
}

function readOnly(overrides: Partial<DocPerms> = {}): DocPerms {
  return {
    read: true,
    write: false,
    create: false,
    delete: false,
    export: true,
    print: true,
    share: false,
    ...overrides,
  }
}

function teach(): DocPerms {
  return full({
    delete: false,
    share: false,
  })
}

function seedPerms(): RoleDocPermission[] {
  const out: RoleDocPermission[] = []

  for (const doc of DOC_TYPES) {
    out.push({
      role: 'Education Manager',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: full(),
    })
    out.push({
      role: 'Teacher',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: [
        'students',
        'attendance',
        'classes',
        'exams',
        'exam-results',
        'timetable',
        'homework',
        'lesson-plans',
        'disciplinary-cases',
        'student-log',
        'assessment-criteria',
        'assessment-groups',
        'gradebook',
        'report-cards',
      ].includes(doc.key)
        ? teach()
        : [
              'exam-settings',
              'grading-scales',
              'staff-attendance',
              'health-records',
              'library-books',
              'library-issues',
              'school-events',
              'announcements',
              'sms-messages',
              'staff-leave',
            ].includes(doc.key)
          ? readOnly({
              write: doc.key === 'staff-attendance',
              create: false,
            })
          : readOnly({ write: false, create: false, print: false }),
    })
    out.push({
      role: 'Admissions Officer',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: [
        'applicants',
        'admissions',
        'students',
        'guardians',
        'program-enrollments',
        'course-enrollments',
        'health-records',
        'school-events',
        'sms-messages',
        'message-templates',
        'announcements',
      ].includes(doc.key)
        ? full({ delete: false, share: false })
        : readOnly(),
    })
    out.push({
      role: 'Accounts',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: [
        'fees',
        'fee-structures',
        'fee-categories',
        'fee-schedules',
        'inventory-items',
        'inventory-stock',
        'inventory-issues',
        'assets',
        'sms-messages',
        'message-templates',
        'payments',
        'expenses',
        'payroll',
      ].includes(doc.key)
        ? full({ delete: false })
        : readOnly({ export: true }),
    })
    out.push({
      role: 'Parent',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: readOnly({
        export: false,
        print: [
          'fees',
          'exam-results',
          'attendance',
          'homework',
          'school-events',
          'report-cards',
          'payments',
        ].includes(doc.key),
        read: [
          'students',
          'fees',
          'attendance',
          'exam-results',
          'announcements',
          'homework',
          'school-events',
          'sms-messages',
          'transport-routes',
          'report-cards',
          'payments',
        ].includes(doc.key),
      }),
    })
  }

  return out
}

export const roles = reactive<RoleDef[]>([
  {
    id: 'ROLE-01',
    name: 'Education Manager',
    description: 'Full desk access for Little Royals school operations',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-02',
    name: 'Teacher',
    description: 'Class teachers — attendance, assessment, student notes',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-03',
    name: 'Admissions Officer',
    description: 'Applicants, admissions and enrollments',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-04',
    name: 'Accounts',
    description: 'Fee structures, invoices and collections',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-05',
    name: 'Parent',
    description: 'Parent portal — fees, attendance, results and calendar',
    deskAccess: true,
    status: 'Active',
  },
])

export const systemUsers = reactive<SystemUser[]>([
  {
    id: 'USR-01',
    name: 'Sarah Nalwanga',
    email: 'admin@littleroyals.ug',
    role: 'Education Manager',
    status: 'Active',
    lastLogin: new Date().toISOString(),
    department: 'Administration',
    title: 'Head of Education Desk',
    phone: '+256 700 112 233',
    bio: 'Leads Little Royals Kindergarten and Primary operations, NCDC programmes and UNEB readiness.',
    location: 'Kampala, Uganda',
    joinedAt: '2022-01-15',
  },
  {
    id: 'USR-02',
    name: 'Grace Achieng',
    email: 'grace.achieng@littleroyals.ug',
    role: 'Teacher',
    status: 'Active',
    lastLogin: new Date(Date.now() - 95 * 60_000).toISOString(),
    department: 'Primary',
    title: 'Class teacher · P.4 Yellow',
    phone: '+256 772 445 566',
    bio: 'Primary class teacher focusing on literacy, numeracy and attendance.',
    location: 'Kampala, Uganda',
    joinedAt: '2023-03-01',
  },
  {
    id: 'USR-03',
    name: 'Joseph Mukasa',
    email: 'joseph.mukasa@littleroyals.ug',
    role: 'Admissions Officer',
    status: 'Active',
    lastLogin: new Date(Date.now() - 180 * 60_000).toISOString(),
    department: 'Admissions',
    title: 'Admissions lead',
    phone: '+256 701 998 877',
    bio: 'Handles applicants, interviews and program enrollments.',
    location: 'Kampala, Uganda',
    joinedAt: '2023-08-20',
  },
  {
    id: 'USR-04',
    name: 'Rebecca Namuli',
    email: 'rebecca.namuli@littleroyals.ug',
    role: 'Accounts',
    status: 'Active',
    lastLogin: new Date(Date.now() - 2 * 24 * 60_000).toISOString(),
    department: 'Finance',
    title: 'Fees & collections',
    phone: '+256 755 221 100',
    bio: 'Manages fee structures, invoices and term collections in UGX.',
    location: 'Kampala, Uganda',
    joinedAt: '2022-09-05',
  },
  {
    id: 'USR-05',
    name: 'Daniel Okello',
    email: 'daniel.parent@gmail.com',
    role: 'Parent',
    status: 'Active',
    lastLogin: new Date(Date.now() - 5 * 24 * 60_000).toISOString(),
    department: 'Parents',
    title: 'Parent portal',
    phone: '+256 780 334 455',
    bio: 'Guardian account for viewing fees, attendance and results.',
    location: 'Ntinda, Kampala',
    joinedAt: '2024-02-12',
  },
  {
    id: 'USR-06',
    name: 'Mary Nabirye',
    email: 'mary.nabirye@littleroyals.ug',
    role: 'Teacher',
    status: 'Invited',
    department: 'Nursery',
    title: 'Nursery teacher',
    phone: '+256 704 667 788',
    bio: 'Invited to join the Nursery section teaching team.',
    location: 'Kampala, Uganda',
    joinedAt: '2026-11-01',
  },
])

export function getUserById(id: string) {
  return systemUsers.find((u) => u.id === id)
}

export function getUserByEmail(email: string) {
  return systemUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  )
}

export function getCurrentSystemUser() {
  if (!currentUser.email) return undefined
  return getUserByEmail(currentUser.email)
}

export const rolePermissions = reactive<RoleDocPermission[]>(seedPerms())

export const documentTypes = DOC_TYPES
export const permissionFlags = FLAGS

export const permFlagLabels: Record<PermFlag, string> = {
  read: 'Read',
  write: 'Write',
  create: 'Create',
  delete: 'Delete',
  export: 'Export',
  print: 'Print',
  share: 'Share',
}

export function getRolePerms(role: string, doctype: string) {
  return rolePermissions.find((p) => p.role === role && p.doctype === doctype)
}

export function setPermFlag(
  role: string,
  doctype: string,
  flag: PermFlag,
  value: boolean,
) {
  const row = getRolePerms(role, doctype)
  if (!row) return
  row.perms[flag] = value
}

export function saveRolePerms(
  role: string,
  doctype: string,
  perms: DocPerms,
) {
  const row = getRolePerms(role, doctype)
  const docLabel =
    row?.doctypeLabel ||
    documentTypes.find((d) => d.key === doctype)?.label ||
    doctype
  if (row) {
    Object.assign(row.perms, perms)
  } else {
    rolePermissions.push({
      role,
      doctype,
      doctypeLabel: docLabel,
      perms: { ...perms },
    })
  }

  const enabled = FLAGS.filter((f) => perms[f]).map((f) => permFlagLabels[f])
  const disabled = FLAGS.filter((f) => !perms[f]).map((f) => permFlagLabels[f])

  logActivity({
    action: 'Permission',
    module: 'permissions',
    moduleLabel: 'Role Permission',
    recordName: `${role} → ${docLabel}`,
    summary: `Updated ${role} permissions on ${docLabel}`,
    detail: [
      enabled.length ? `Enabled ${enabled.join(', ')}` : null,
      disabled.length ? `Disabled ${disabled.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    severity: 'warning',
  })
}

export function canCurrentUser(
  doctype: string,
  flag: PermFlag = 'read',
): boolean {
  const row = getRolePerms(currentUser.role, doctype)
  if (!row) return currentUser.role === 'Education Manager'
  return Boolean(row.perms[flag])
}

export const permissionStats = computed(() => ({
  roles: roles.filter((r) => r.status === 'Active').length,
  users: systemUsers.filter((u) => u.status === 'Active').length,
  invited: systemUsers.filter((u) => u.status === 'Invited').length,
  rules: rolePermissions.length,
}))
