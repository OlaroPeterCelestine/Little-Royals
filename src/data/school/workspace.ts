import { catalog, countByStatus } from '@/data/catalog/catalog'
import { catalogExtra } from '@/data/catalog/catalogExtra'
import { deskRouteForModule } from '@/data/school/deskLinks'

export interface ModuleItem {
  label: string
  icon: string
  route?: string
}

export interface NavGroup {
  title: string
  items: ModuleItem[]
}

export interface ShortcutItem {
  label: string
  route: string
  icon: string
  badge?: string
  badgeTheme?: 'green' | 'red' | 'amber' | 'blue' | 'gray'
  description?: string
}

export interface ToolItem {
  label: string
  route: string
  icon: string
  description: string
}

export interface MasterLink {
  label: string
  route: string
}

export interface MasterGroup {
  title: string
  icon: string
  links: MasterLink[]
}

/**
 * Sidebar navigation: Dashboard plus the previous desk pages and newer modules.
 */
export const educationNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'lucide-layout-dashboard', route: '/dashboard' },
      {
        label: 'Term overview',
        icon: 'lucide-calendar-range',
        route: '/term-overview',
      },
    ],
  },
  {
    title: 'Admissions',
    items: [
      {
        label: 'Admissions',
        icon: 'lucide-clipboard-list',
        route: '/admissions',
      },
      { label: 'Scan to data', icon: 'lucide-scan-text', route: '/scan' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Students', icon: 'lucide-graduation-cap', route: '/students' },
      { label: 'Alumni', icon: 'lucide-graduation-cap', route: '/alumni' },
      {
        label: 'People',
        icon: 'lucide-users-round',
        route: '/people',
      },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Academics desk', icon: 'lucide-layout-grid', route: '/academics' },
      { label: 'Years & terms', icon: 'lucide-calendar-range', route: '/years-and-terms' },
      { label: 'Classes', icon: 'lucide-users', route: '/classes' },
      { label: 'Subjects', icon: 'lucide-book-open', route: '/courses' },
      { label: 'Curriculum', icon: 'lucide-book-copy', route: '/curriculum' },
      {
        label: 'Study coverage',
        icon: 'lucide-list-tree',
        route: '/study-coverage',
      },
      { label: 'Timetable', icon: 'lucide-calendar-clock', route: '/timetable' },
      {
        label: 'Exams & marks',
        icon: 'lucide-table-2',
        route: '/gradebook?tab=exams',
      },
    ],
  },
  {
    title: 'Attendance',
    items: [
      {
        label: 'Attendance',
        icon: 'lucide-clipboard-check',
        route: '/attendance',
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Fee structures', icon: 'lucide-table', route: '/fee-structures' },
      { label: 'Fee categories', icon: 'lucide-tags', route: '/fee-categories' },
      { label: 'Fee schedules', icon: 'lucide-calendar-range', route: '/fee-schedules' },
      { label: 'Invoices', icon: 'lucide-file-spreadsheet', route: '/invoices' },
      { label: 'Fees', icon: 'lucide-receipt', route: '/fees' },
      { label: 'Fee offsets', icon: 'lucide-circle-off', route: '/fees/offset' },
      { label: 'Payments', icon: 'lucide-wallet', route: '/payment' },
      { label: 'Refunds', icon: 'lucide-undo-2', route: '/refunds' },
      { label: 'Scholarships', icon: 'lucide-award', route: '/scholarships' },
      { label: 'Discounts', icon: 'lucide-percent', route: '/discounts' },
      { label: 'Bursaries', icon: 'lucide-hand-heart', route: '/bursaries' },
      { label: 'Expenses', icon: 'lucide-banknote', route: '/expenses' },
    ],
  },
  {
    title: 'HR',
    items: [
      { label: 'Departments', icon: 'lucide-building', route: '/departments' },
      { label: 'Payroll', icon: 'lucide-wallet-cards', route: '/payroll' },
      { label: 'Leave', icon: 'lucide-calendar-off', route: '/staff-leave' },
    ],
  },
  {
    title: 'Communication',
    items: [
      {
        label: 'Messages & announcements',
        icon: 'lucide-messages-square',
        route: '/communications?tab=announcements',
      },
      { label: 'Calendar', icon: 'lucide-calendar-days', route: '/calendar' },
      {
        label: 'School mail',
        icon: 'lucide-mail',
        route: '/school-cloud?app=mail',
      },
      {
        label: 'Drive',
        icon: 'lucide-hard-drive',
        route: '/school-cloud?app=files',
      },
      {
        label: 'Video call',
        icon: 'lucide-video',
        route: '/school-cloud?app=talk',
      },
    ],
  },
  {
    title: 'Library',
    items: [
      { label: 'Library', icon: 'lucide-library', route: '/library' },
    ],
  },
  {
    title: 'Transport',
    items: [
      { label: 'Transport', icon: 'lucide-bus', route: '/transport' },
    ],
  },
  {
    title: 'Meals',
    items: [
      { label: 'Meals', icon: 'lucide-utensils', route: '/meals' },
    ],
  },
  {
    title: 'Health & Safety',
    items: [
      { label: 'Health & safety', icon: 'lucide-heart-pulse', route: '/health' },
    ],
  },
  {
    title: 'Discipline',
    items: [
      { label: 'Discipline', icon: 'lucide-shield-alert', route: '/discipline' },
    ],
  },
  {
    title: 'Events',
    items: [
      { label: 'Clubs', icon: 'lucide-trophy', route: '/clubs' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        label: 'School store',
        icon: 'lucide-package',
        route: '/inventory',
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Campuses', icon: 'lucide-map-pin', route: '/campuses' },
      { label: 'Boarding', icon: 'lucide-bed-double', route: '/hostel' },
      { label: 'Student categories', icon: 'lucide-tags', route: '/student-categories' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'School setup', icon: 'lucide-building-2', route: '/school-setup' },
      {
        label: 'School cloud',
        icon: 'lucide-cloud',
        route: '/school-cloud',
      },
      { label: 'Activity & audit', icon: 'lucide-history', route: '/activity-log' },
      { label: 'Documents', icon: 'lucide-printer', route: '/documents' },
      { label: 'Reports', icon: 'lucide-bar-chart-3', route: '/reports' },
      { label: 'Users & roles', icon: 'lucide-shield-check', route: '/users' },
    ],
  },
]

export const parentNav: NavGroup[] = [
  {
    title: 'My child',
    items: [
      { label: 'Parent Portal', icon: 'lucide-house', route: '/parent-portal' },
      { label: 'School Calendar', icon: 'lucide-calendar-days', route: '/calendar' },
      {
        label: 'Announcements',
        icon: 'lucide-megaphone',
        route: '/communications?tab=announcements',
      },
    ],
  },
]

export const modules: ModuleItem[] = educationNav.flatMap((g) => g.items)

const activeStudents = countByStatus('students', (s) => s === 'Active')
const unpaidFees = countByStatus(
  'fees',
  (s) => s === 'Unpaid' || s === 'Overdue' || s === 'Partial',
)

export const shortcuts: ShortcutItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'lucide-layout-dashboard',
    description: 'School overview',
  },
  {
    label: 'Student',
    route: '/students',
    icon: 'lucide-graduation-cap',
    badge: `${activeStudents} Active`,
    badgeTheme: 'green',
    description: 'Enrolled learners',
  },
  {
    label: 'Take attendance',
    route: '/attendance?tab=take',
    icon: 'lucide-clipboard-check',
    description: 'Class register',
  },
  {
    label: 'Applications',
    route: '/admissions?tab=applications',
    icon: 'lucide-user-plus',
    description: 'Admissions pipeline',
  },
  {
    label: 'Invoices',
    route: '/invoices',
    icon: 'lucide-file-spreadsheet',
    badge: `${unpaidFees} open fees`,
    badgeTheme: 'amber',
    description: 'Fee billing',
  },
]

export const tools: ToolItem[] = [
  {
    label: 'Take attendance',
    route: '/attendance?tab=take',
    icon: 'lucide-clipboard-check',
    description: 'Mark a class register',
  },
  {
    label: 'Register student',
    route: '/students/new',
    icon: 'lucide-user-plus',
    description: 'Full registration form',
  },
  {
    label: 'New application',
    route: '/admissions?tab=applications',
    icon: 'lucide-file-plus',
    description: 'Admissions intake',
  },
  {
    label: 'School reports',
    route: '/reports',
    icon: 'lucide-bar-chart-3',
    description: 'Generate from existing records',
  },
]

const allCatalog = { ...catalog, ...catalogExtra }

const hiddenMasterModules = new Set([
  'academic-terms',
  'program-enrollments',
  'course-enrollments',
  'waiting-list',
  'topics',
])

export const masterGroups: MasterGroup[] = Array.from(
  Object.values(allCatalog).reduce((map, mod) => {
    const list = map.get(mod.group) || []
    list.push(mod)
    map.set(mod.group, list)
    return map
  }, new Map<string, (typeof allCatalog)[string][]>()),
).map(([title, mods]) => ({
  title,
  icon: 'lucide-folder',
  links: mods
    .filter((m) => !hiddenMasterModules.has(m.key))
    .map((m) => ({
      label: m.key === 'academic-years' ? 'Years & terms' : m.title,
      route: deskRouteForModule(m.key),
    })),
}))

const hiddenCommandModules = new Set([...hiddenMasterModules])

export const commandItems = [
  ...shortcuts.map((s) => ({
    label: s.label,
    route: s.route,
    group: 'Shortcuts',
  })),
  ...tools.map((t) => ({ label: t.label, route: t.route, group: 'Tools' })),
  ...Object.values(allCatalog)
    .filter((m) => !hiddenCommandModules.has(m.key))
    .map((m) => ({
      label: m.key === 'academic-years' ? 'Years & terms' : m.title,
      route: deskRouteForModule(m.key),
      group: m.group,
    })),
  { label: 'Users & Roles', route: '/users', group: 'Settings' },
  { label: 'Term overview', route: '/term-overview', group: 'Events' },
  { label: 'School setup', route: '/school-setup', group: 'Settings' },
  { label: 'School cloud', route: '/school-cloud', group: 'Settings' },
  { label: 'School mail', route: '/school-cloud?app=mail', group: 'Communication' },
  { label: 'Video call', route: '/school-cloud?app=talk', group: 'Communication' },
  { label: 'Drive', route: '/school-cloud?app=files', group: 'Settings' },
  { label: 'Activity & audit', route: '/activity-log', group: 'Settings' },
  { label: 'Documents', route: '/documents', group: 'Settings' },
  { label: 'Reports', route: '/reports', group: 'Settings' },
  { label: 'Parent Portal', route: '/parent-portal', group: 'Communication' },
  { label: 'My profile', route: '/me', group: 'Settings' },
  { label: 'Library', route: '/library', group: 'Library' },
  { label: 'Transport', route: '/transport', group: 'Transport' },
  { label: 'Meals', route: '/meals', group: 'Meals' },
  { label: 'Health & safety', route: '/health', group: 'Health' },
  { label: 'Discipline', route: '/discipline', group: 'Discipline' },
  {
    label: 'Messages & announcements',
    route: '/communications?tab=announcements',
    group: 'Communication',
  },
  { label: 'Study coverage', route: '/study-coverage', group: 'Academics' },
]
