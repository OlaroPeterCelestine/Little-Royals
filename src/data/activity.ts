import { computed, reactive } from 'vue'

export type ActivityAction =
  | 'Created'
  | 'Updated'
  | 'Deleted'
  | 'Viewed'
  | 'Permission'
  | 'Login'
  | 'Published'
  | 'Exported'

export type ActivitySeverity = 'info' | 'success' | 'warning' | 'danger'

export interface ActivityEntry {
  id: string
  at: string
  action: ActivityAction
  module: string
  moduleLabel: string
  recordId?: string
  recordName?: string
  user: string
  role: string
  summary: string
  detail?: string
  severity: ActivitySeverity
  ip?: string
}

/** Current desk user — filled by auth session (JWT roles match backend). */
export const currentUser = reactive({
  name: '',
  email: '',
  role: '',
})

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function seed(): ActivityEntry[] {
  return [
    {
      id: 'ACT-0012',
      at: ago(8),
      action: 'Updated',
      module: 'students',
      moduleLabel: 'Student',
      recordId: 'STU-1001',
      recordName: 'Amina Namukasa',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Updated student Amina Namukasa',
      detail: 'Class · Average % reviewed on detail page',
      severity: 'info',
      ip: '41.210.15.22',
    },
    {
      id: 'ACT-0011',
      at: ago(22),
      action: 'Created',
      module: 'fees',
      moduleLabel: 'Fees',
      recordId: 'FEE-014',
      recordName: 'Term 3 · P.5 Blue',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Created fee invoice Term 3 · P.5 Blue',
      severity: 'success',
      ip: '41.210.15.22',
    },
    {
      id: 'ACT-0010',
      at: ago(45),
      action: 'Permission',
      module: 'permissions',
      moduleLabel: 'Role Permission',
      recordName: 'Teacher → Student',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Updated Teacher permissions on Student',
      detail: 'Enabled Read, Write · Disabled Delete',
      severity: 'warning',
      ip: '41.210.15.22',
    },
    {
      id: 'ACT-0009',
      at: ago(70),
      action: 'Published',
      module: 'announcements',
      moduleLabel: 'Announcements',
      recordName: 'Weekly assembly notice',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Published announcement Weekly assembly notice',
      severity: 'success',
      ip: '41.210.15.22',
    },
    {
      id: 'ACT-0008',
      at: ago(95),
      action: 'Deleted',
      module: 'applicants',
      moduleLabel: 'Student Applicant',
      recordId: 'APP-009',
      recordName: 'Draft applicant',
      user: 'Joseph Mukasa',
      role: 'Admissions Officer',
      summary: 'Deleted applicant Draft applicant',
      detail: 'Removed incomplete application',
      severity: 'danger',
      ip: '41.210.18.41',
    },
    {
      id: 'ACT-0007',
      at: ago(140),
      action: 'Updated',
      module: 'attendance',
      moduleLabel: 'Student Attendance',
      recordId: 'ATT-004',
      recordName: 'P.4 Yellow roll',
      user: 'Grace Achieng',
      role: 'Teacher',
      summary: 'Updated attendance P.4 Yellow roll',
      detail: 'Marked 2 late, 1 absent',
      severity: 'info',
      ip: '41.210.12.8',
    },
    {
      id: 'ACT-0006',
      at: ago(180),
      action: 'Created',
      module: 'teachers',
      moduleLabel: 'Teacher',
      recordId: 'TCH-012',
      recordName: 'Peter Ssempijja',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Created teacher Peter Ssempijja',
      severity: 'success',
      ip: '41.210.15.22',
    },
    {
      id: 'ACT-0005',
      at: ago(240),
      action: 'Exported',
      module: 'reports',
      moduleLabel: 'Education Reports',
      recordName: 'Dashboard CSV',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Exported dashboard CSV',
      severity: 'info',
      ip: '41.210.15.22',
    },
    {
      id: 'ACT-0004',
      at: ago(320),
      action: 'Updated',
      module: 'permissions',
      moduleLabel: 'Role Permission',
      recordName: 'Accounts → Fees',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Updated Accounts permissions on Fees',
      detail: 'Enabled Read, Create, Write',
      severity: 'warning',
      ip: '41.210.15.22',
    },
    {
      id: 'ACT-0003',
      at: ago(400),
      action: 'Login',
      module: 'system',
      moduleLabel: 'System',
      user: 'Grace Achieng',
      role: 'Teacher',
      summary: 'Grace Achieng signed in',
      detail: 'Desk session started',
      severity: 'info',
      ip: '41.210.12.8',
    },
    {
      id: 'ACT-0002',
      at: ago(520),
      action: 'Created',
      module: 'classes',
      moduleLabel: 'Class',
      recordId: 'CLS-011',
      recordName: 'P.3 Red',
      user: 'Joseph Mukasa',
      role: 'Admissions Officer',
      summary: 'Created class P.3 Red',
      severity: 'success',
      ip: '41.210.18.41',
    },
    {
      id: 'ACT-0001',
      at: ago(600),
      action: 'Login',
      module: 'system',
      moduleLabel: 'System',
      user: 'Sarah Nalwanga',
      role: 'Head Teacher',
      summary: 'Sarah Nalwanga signed in',
      detail: 'Admin desk session',
      severity: 'info',
      ip: '41.210.15.22',
    },
  ]
}

export const activityLog = reactive({
  entries: seed() as ActivityEntry[],
})

function nextActivityId() {
  const n = activityLog.entries.length + 1
  return `ACT-${String(n).padStart(4, '0')}`
}

export function logActivity(
  input: Omit<ActivityEntry, 'id' | 'at' | 'user' | 'role'> & {
    user?: string
    role?: string
    at?: string
  },
) {
  const entry: ActivityEntry = {
    id: nextActivityId(),
    at: input.at || new Date().toISOString(),
    action: input.action,
    module: input.module,
    moduleLabel: input.moduleLabel,
    recordId: input.recordId,
    recordName: input.recordName,
    user: input.user || currentUser.name,
    role: input.role || currentUser.role,
    summary: input.summary,
    detail: input.detail,
    severity: input.severity,
    ip: input.ip || '41.210.15.22',
  }
  activityLog.entries.unshift(entry)
  return entry
}

export const activityStats = computed(() => {
  const entries = activityLog.entries
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const today = entries.filter((e) => new Date(e.at) >= todayStart).length
  return {
    total: entries.length,
    today,
    created: entries.filter((e) => e.action === 'Created').length,
    updated: entries.filter((e) => e.action === 'Updated').length,
    deleted: entries.filter((e) => e.action === 'Deleted').length,
    permissions: entries.filter((e) => e.action === 'Permission').length,
  }
})

export function formatActivityTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function actionTheme(
  action: ActivityAction,
): 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'violet' {
  if (action === 'Created' || action === 'Published') return 'green'
  if (action === 'Deleted') return 'red'
  if (action === 'Permission') return 'amber'
  if (action === 'Updated' || action === 'Exported') return 'blue'
  if (action === 'Login' || action === 'Viewed') return 'violet'
  return 'gray'
}
