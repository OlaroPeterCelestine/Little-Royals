import { dialog, toast } from 'frappe-ui'
import type { Router } from 'vue-router'
import {
  pendingApplicantCount,
  schoolStore,
  unpaidFeeCount,
} from '../data/store'
import { shortcuts } from '../data/workspace'
import { logActivity } from '../data/activity'
import { getCurrentSystemUser } from '../data/permissions'
import { logout } from '../data/auth'

const SHORTCUT_KEY = 'pearl-visible-shortcuts'

export function getVisibleShortcutLabels(): string[] {
  try {
    const raw = localStorage.getItem(SHORTCUT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* ignore */
  }
  return shortcuts.map((s) => s.label)
}

export function setVisibleShortcutLabels(labels: string[]) {
  localStorage.setItem(SHORTCUT_KEY, JSON.stringify(labels))
}

export function openCustomizeShortcuts(onSaved?: (labels: string[]) => void) {
  const current = getVisibleShortcutLabels()
  dialog.prompt({
    title: 'Customize shortcuts',
    message: 'Choose which Education shortcuts appear on the workspace home.',
    icon: 'lucide-pencil',
    theme: 'blue',
    confirmLabel: 'Save',
    fields: shortcuts.map((s) => ({
      name: s.label,
      label: `${s.label} — ${s.description || s.route}`,
      type: 'checkbox' as const,
      defaultValue: current.includes(s.label),
    })),
    onConfirm: async ({ values }) => {
      const next = shortcuts
        .filter((s) => Boolean(values[s.label]))
        .map((s) => s.label)
      if (!next.length) {
        toast.error('Keep at least one shortcut visible')
        throw new Error('Keep at least one shortcut')
      }
      setVisibleShortcutLabels(next)
      onSaved?.(next)
      toast.success('Shortcuts updated')
    },
  })
}

export function openNotifications(router: Router) {
  // Bell UI in AppTopBar owns the panel; keep a jump helper for shortcuts.
  void router
  toast.info('Open the bell in the top bar to review alerts')
}

export function openDocumentation() {
  dialog.confirm({
    title: 'Little Royals · Education help',
    message:
      'Little Royals Kindergarten and Primary School desk (NCDC / UNEB).\n\n' +
      '• Create, edit, and delete records from any list\n' +
      '• Mark attendance, collect fees, and track PLE mocks\n' +
      '• Use ⌘G (Ctrl+G) to search modules and tools\n' +
      '• Publish announcements and run attendance SQL reports',
    icon: 'lucide-book-open',
    theme: 'blue',
    confirmLabel: 'Got it',
    onConfirm: async () => {},
  })
}

export function openKeyboardShortcuts() {
  dialog.confirm({
    title: 'Keyboard shortcuts',
    message:
      '⌘G / Ctrl+G — Open search\n' +
      'Esc — Close search or dialog\n' +
      'Click pencil — Edit a row\n' +
      'Select rows + Delete — Remove with confirm',
    icon: 'lucide-keyboard',
    theme: 'blue',
    confirmLabel: 'Got it',
    onConfirm: async () => {},
  })
}

export function exportDashboardCsv() {
  const lines = [
    'Metric,Value',
    `Students,${schoolStore.students.rows.length}`,
    `Active students,${schoolStore.students.rows.filter((r) => r.status === 'Active').length}`,
    `Teachers,${schoolStore.teachers.rows.length}`,
    `Classes,${schoolStore.classes.rows.length}`,
    `Unpaid fees,${unpaidFeeCount.value}`,
    `Pending applicants,${pendingApplicantCount.value}`,
    `Attendance present,${schoolStore.attendance.rows.filter((r) => r.status === 'Present').length}`,
    `Attendance absent,${schoolStore.attendance.rows.filter((r) => r.status === 'Absent').length}`,
  ]

  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `little-royals-dashboard-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  logActivity({
    action: 'Exported',
    module: 'reports',
    moduleLabel: 'Education Reports',
    recordName: 'Dashboard CSV',
    summary: 'Exported dashboard CSV',
    severity: 'info',
  })
  toast.success('Dashboard CSV downloaded')
}

export function openUserMenu(router: Router) {
  dialog.prompt({
    title: 'Account',
    message: 'Little Royals Kindergarten and Primary School · Admin session',
    icon: 'lucide-user',
    theme: 'blue',
    confirmLabel: 'Continue',
    fields: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        defaultValue: 'profile',
        options: [
          { label: 'My profile', value: 'profile' },
          { label: 'Go to Dashboard', value: 'home' },
          { label: 'Open Students', value: 'students' },
          { label: 'School Setup', value: 'school-setup' },
          { label: 'Activity Log', value: 'activity' },
          { label: 'Users & Roles', value: 'users' },
          { label: 'Role Permissions', value: 'permissions' },
          { label: 'View keyboard shortcuts', value: 'keys' },
          { label: 'Log out', value: 'logout' },
        ],
      },
    ],
    onConfirm: async ({ values }) => {
      const action = String(values.action)
      if (action === 'profile') {
        const me = getCurrentSystemUser()
        await router.push(me ? `/users/${me.id}` : '/me')
      } else if (action === 'home') await router.push('/')
      else if (action === 'students') await router.push('/students')
      else if (action === 'school-setup') await router.push('/school-setup')
      else if (action === 'activity') await router.push('/activity-log')
      else if (action === 'permissions')
        await router.push({ path: '/users', query: { tab: 'roles' } })
      else if (action === 'users') await router.push('/users')
      else if (action === 'keys') openKeyboardShortcuts()
      else if (action === 'logout') {
        logout()
        toast.success('Signed out')
        await router.push('/login')
      }
    },
  })
}
