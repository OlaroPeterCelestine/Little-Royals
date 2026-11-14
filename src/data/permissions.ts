import { computed, reactive } from 'vue'
import { catalog } from './catalog'
import { catalogExtra } from './catalogExtra'
import { currentUser, logActivity } from './activity'
import {
  API_ROLES,
  ROLE_LABELS,
  isFullAccessRole,
  normalizeRole,
  roleLabel,
  type ApiRole,
} from './roles'

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
  /** API role key (JWT / Casbin) or custom desk role key. */
  key: string
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

const DOC_TYPES = Object.values({ ...catalog, ...catalogExtra }).map((m) => ({
  key: m.key,
  label: m.singular,
}))

/** Map desk catalog keys → backend Casbin resources (when applicable). */
export const DOCTYPE_API_RESOURCE: Record<string, string> = {
  students: 'students',
  staff: 'staff',
  teachers: 'staff',
  guardians: 'parents',
  parents: 'parents',
  classes: 'classes',
  subjects: 'subjects',
  attendance: 'attendance',
  fees: 'fees',
  'fee-structures': 'fees',
  'fee-categories': 'fees',
  'fee-schedules': 'fees',
  'fee-offsets': 'fees',
  payments: 'payments',
  invoices: 'invoices',
  users: 'users',
  announcements: 'notifications',
  'sms-messages': 'notifications',
}

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

function none(): DocPerms {
  return {
    read: false,
    write: false,
    create: false,
    delete: false,
    export: false,
    print: false,
    share: false,
  }
}

function teach(): DocPerms {
  return full({
    delete: false,
    share: false,
  })
}

function inList(doc: string, keys: string[]) {
  return keys.includes(doc)
}

function seedPerms(): RoleDocPermission[] {
  const out: RoleDocPermission[] = []

  for (const doc of DOC_TYPES) {
    // SuperAdmin / Admin — full desk (also short-circuited in canCurrentUser)
    for (const role of ['SuperAdmin', 'Admin'] as ApiRole[]) {
      out.push({
        role,
        doctype: doc.key,
        doctypeLabel: doc.label,
        perms: full(),
      })
    }

    out.push({
      role: 'HeadTeacher',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: full({ share: false }),
    })

    out.push({
      role: 'Teacher',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: inList(doc.key, [
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
        'subjects',
      ])
        ? teach()
        : inList(doc.key, [
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
            ])
          ? readOnly({
              write: doc.key === 'staff-attendance',
              create: false,
            })
          : readOnly({ write: false, create: false, print: false, read: false }),
    })

    out.push({
      role: 'Admissions',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: inList(doc.key, [
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
      ])
        ? full({ delete: false, share: false })
        : readOnly({ read: true, export: false, print: false }),
    })

    out.push({
      role: 'Accountant',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: inList(doc.key, [
        'fees',
        'fee-structures',
        'fee-categories',
        'fee-schedules',
        'fee-offsets',
        'inventory-items',
        'inventory-stock',
        'inventory-issues',
        'assets',
        'sms-messages',
        'message-templates',
        'payments',
        'expenses',
        'payroll',
        'students',
        'guardians',
        'refunds',
        'invoices',
      ])
        ? full({ delete: doc.key.startsWith('fee') || doc.key === 'payments' })
        : readOnly({ export: true, read: inList(doc.key, ['students', 'guardians', 'announcements']) }),
    })

    out.push({
      role: 'Librarian',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: inList(doc.key, ['library-books', 'library-issues', 'students'])
        ? full({ delete: false })
        : readOnly({ read: doc.key === 'announcements', export: false, print: false }),
    })

    out.push({
      role: 'Staff',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: inList(doc.key, ['announcements', 'school-events', 'staff-leave', 'staff-attendance'])
        ? readOnly({ write: doc.key === 'staff-leave' || doc.key === 'staff-attendance', create: false })
        : none(),
    })

    out.push({
      role: 'Student',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: readOnly({
        read: inList(doc.key, [
          'students',
          'homework',
          'timetable',
          'exam-results',
          'announcements',
          'school-events',
        ]),
        export: false,
        print: false,
      }),
    })

    out.push({
      role: 'Parent',
      doctype: doc.key,
      doctypeLabel: doc.label,
      perms: readOnly({
        export: false,
        print: inList(doc.key, [
          'fees',
          'exam-results',
          'attendance',
          'homework',
          'school-events',
          'report-cards',
          'payments',
        ]),
        read: inList(doc.key, [
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
        ]),
      }),
    })
  }

  return out
}

export const roles = reactive<RoleDef[]>([
  {
    id: 'ROLE-01',
    key: 'Admin',
    name: ROLE_LABELS.Admin,
    description: 'Full school desk access — users, finance, academics',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-02',
    key: 'HeadTeacher',
    name: ROLE_LABELS.HeadTeacher,
    description: 'Academic leadership — students, classes, attendance',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-03',
    key: 'Teacher',
    name: ROLE_LABELS.Teacher,
    description: 'Class teachers — attendance, assessment, student notes',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-04',
    key: 'Admissions',
    name: ROLE_LABELS.Admissions,
    description: 'Applicants, admissions and enrollments',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-05',
    key: 'Accountant',
    name: ROLE_LABELS.Accountant,
    description: 'Fee structures, invoices and collections',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-06',
    key: 'Parent',
    name: ROLE_LABELS.Parent,
    description: 'Parent portal — fees, attendance, results and calendar',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-07',
    key: 'Librarian',
    name: ROLE_LABELS.Librarian,
    description: 'Library catalogue and issues',
    deskAccess: true,
    status: 'Active',
  },
  {
    id: 'ROLE-08',
    key: 'Staff',
    name: ROLE_LABELS.Staff,
    description: 'General staff — limited operational access',
    deskAccess: true,
    status: 'Active',
  },
])

export const systemUsers = reactive<SystemUser[]>([
  {
    id: 'USR-01',
    name: 'School Admin',
    email: 'admin@littleroyals.school',
    role: 'Admin',
    status: 'Active',
    lastLogin: new Date().toISOString(),
    department: 'Administration',
    title: 'School Admin',
    phone: '+256 700 112 233',
    bio: 'Leads Little Royals Kindergarten and Primary operations, NCDC programmes and UNEB readiness.',
    location: 'Kampala, Uganda',
    joinedAt: '2022-01-15',
  },
  {
    id: 'USR-02',
    name: 'Ada Teacher',
    email: 'teacher@littleroyals.school',
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
    name: 'Finance Officer',
    email: 'accountant@littleroyals.school',
    role: 'Accountant',
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
    id: 'USR-04',
    name: 'Sam Parent',
    email: 'parent@littleroyals.school',
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

/** Primary CRUD flags used when defining a role. */
export const crudFlags = ['create', 'read', 'write', 'delete'] as const

export type CrudFlag = (typeof crudFlags)[number]

/** Extra flags beyond CRUD. */
export const extraPermFlags = ['export', 'print', 'share'] as const

export type ExtraPermFlag = (typeof extraPermFlags)[number]

export const permFlagLabels: Record<PermFlag, string> = {
  read: 'Read',
  write: 'Update',
  create: 'Create',
  delete: 'Delete',
  export: 'Export',
  print: 'Print',
  share: 'Share',
}

export const crudFlagLabels: Record<CrudFlag, string> = {
  create: 'Create',
  read: 'Read',
  write: 'Update',
  delete: 'Delete',
}

export function getRolePerms(role: string, doctype: string) {
  const key = normalizeRole(role) || role
  return rolePermissions.find((p) => p.role === key && p.doctype === doctype)
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
  options?: { silent?: boolean },
) {
  const key = normalizeRole(role) || role
  const row = getRolePerms(key, doctype)
  const docLabel =
    row?.doctypeLabel ||
    documentTypes.find((d) => d.key === doctype)?.label ||
    doctype
  if (row) {
    Object.assign(row.perms, perms)
  } else {
    rolePermissions.push({
      role: key,
      doctype,
      doctypeLabel: docLabel,
      perms: { ...perms },
    })
  }

  if (options?.silent) return

  const enabled = FLAGS.filter((f) => perms[f]).map((f) => permFlagLabels[f])
  const disabled = FLAGS.filter((f) => !perms[f]).map((f) => permFlagLabels[f])

  logActivity({
    action: 'Permission',
    module: 'permissions',
    moduleLabel: 'Role Permission',
    recordName: `${roleLabel(key)} → ${docLabel}`,
    summary: `Updated ${roleLabel(key)} permissions on ${docLabel}`,
    detail: [
      enabled.length ? `Enabled ${enabled.join(', ')}` : null,
      disabled.length ? `Disabled ${disabled.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    severity: 'warning',
  })
}

function roleKeyFromName(name: string) {
  const base = name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const fallback = base || 'CustomRole'
  let key = fallback
  let n = 2
  while (roles.some((r) => r.key === key)) {
    key = `${fallback}${n}`
    n += 1
  }
  return key
}

function seedRolePerms(
  roleKey: string,
  options?: {
    copyFrom?: string
    matrix?: Record<string, DocPerms>
  },
) {
  for (const doc of documentTypes) {
    const fromMatrix = options?.matrix?.[doc.key]
    const source = fromMatrix
      ? fromMatrix
      : options?.copyFrom
        ? getRolePerms(options.copyFrom, doc.key)?.perms
        : undefined
    saveRolePerms(roleKey, doc.key, source ? { ...source } : none(), {
      silent: true,
    })
  }
}

/** Build a full module → CRUD map for a role (or blank / copy). */
export function buildPermMatrix(options?: {
  roleKey?: string
  copyFrom?: string
}): Record<string, DocPerms> {
  const matrix: Record<string, DocPerms> = {}
  for (const doc of documentTypes) {
    const source = options?.roleKey
      ? getRolePerms(options.roleKey, doc.key)?.perms
      : options?.copyFrom
        ? getRolePerms(options.copyFrom, doc.key)?.perms
        : undefined
    matrix[doc.key] = source ? { ...source } : none()
  }
  return matrix
}

/** Persist a full custom CRUD matrix onto a role. */
export function applyPermMatrix(
  roleKey: string,
  matrix: Record<string, DocPerms>,
) {
  const key = normalizeRole(roleKey) || roleKey
  for (const doc of documentTypes) {
    const perms = matrix[doc.key] || none()
    saveRolePerms(key, doc.key, { ...perms }, { silent: true })
  }
  const enabledDocs = documentTypes.filter((d) => {
    const p = matrix[d.key]
    return p && FLAGS.some((f) => p[f])
  }).length
  logActivity({
    action: 'Permission',
    module: 'permissions',
    moduleLabel: 'Role Permission',
    recordName: roleLabel(key),
    summary: `Updated CRUD permissions for ${roleLabel(key)}`,
    detail: `${enabledDocs} of ${documentTypes.length} modules have access`,
    severity: 'warning',
  })
}

export function createRole(input: {
  name: string
  description?: string
  deskAccess?: boolean
  status?: RoleDef['status']
  copyFrom?: string
  /** Custom CRUD matrix — when set, this defines the role. */
  matrix?: Record<string, DocPerms>
}): RoleDef {
  const name = input.name.trim()
  const key = roleKeyFromName(name)
  const role: RoleDef = {
    id: `ROLE-${String(roles.length + 1).padStart(2, '0')}`,
    key,
    name,
    description: (input.description || '').trim() || `Custom role · ${name}`,
    deskAccess: input.deskAccess !== false,
    status: input.status || 'Active',
  }
  roles.push(role)
  seedRolePerms(key, {
    copyFrom: input.matrix ? undefined : input.copyFrom,
    matrix: input.matrix,
  })
  const granted = input.matrix
    ? documentTypes.filter((d) => {
        const p = input.matrix![d.key]
        return p && FLAGS.some((f) => p[f])
      }).length
    : undefined
  logActivity({
    action: 'Created',
    module: 'roles',
    moduleLabel: 'Role',
    recordId: role.id,
    recordName: role.name,
    summary: `Created role ${role.name}`,
    detail: granted != null
      ? `Custom CRUD · ${granted} modules with access`
      : role.description,
    severity: 'success',
  })
  return role
}

export function updateRole(
  key: string,
  patch: Partial<Pick<RoleDef, 'name' | 'description' | 'deskAccess' | 'status'>>,
) {
  const role = roles.find((r) => r.key === key)
  if (!role) return null
  if (patch.name != null) role.name = patch.name.trim() || role.name
  if (patch.description != null) role.description = patch.description.trim()
  if (patch.deskAccess != null) role.deskAccess = patch.deskAccess
  if (patch.status != null) role.status = patch.status
  logActivity({
    action: 'Updated',
    module: 'roles',
    moduleLabel: 'Role',
    recordId: role.id,
    recordName: role.name,
    summary: `Updated role ${role.name}`,
    detail: `${role.status} · ${role.deskAccess ? 'Desk' : 'Portal'}`,
    severity: 'info',
  })
  return role
}

export function canCurrentUser(
  doctype: string,
  flag: PermFlag = 'read',
): boolean {
  // Support built-in API roles and custom desk roles defined by CRUD matrix.
  const role = normalizeRole(currentUser.role) || currentUser.role
  if (!role) return false
  if (isFullAccessRole(role)) return true
  const row = getRolePerms(role, doctype)
  if (!row) return false
  return Boolean(row.perms[flag])
}

/** Summarize CRUD access for a role (for role cards / invites). */
export function roleCrudSummary(roleKey: string) {
  let create = 0
  let read = 0
  let write = 0
  let del = 0
  for (const doc of documentTypes) {
    const p = getRolePerms(roleKey, doc.key)?.perms
    if (!p) continue
    if (p.create) create += 1
    if (p.read) read += 1
    if (p.write) write += 1
    if (p.delete) del += 1
  }
  return { create, read, write, delete: del, modules: documentTypes.length }
}

export { API_ROLES, ROLE_LABELS, normalizeRole, roleLabel, isFullAccessRole }
export { isParentRole } from './roles'

export const permissionStats = computed(() => ({
  roles: roles.filter((r) => r.status === 'Active').length,
  users: systemUsers.filter((u) => u.status === 'Active').length,
  invited: systemUsers.filter((u) => u.status === 'Invited').length,
  rules: rolePermissions.length,
}))
