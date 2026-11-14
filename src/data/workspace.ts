import { catalog, countByStatus } from './catalog'
import { catalogExtra } from './catalogExtra'

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
    title: 'People',
    items: [
      { label: 'Students', icon: 'lucide-graduation-cap', route: '/students' },
      { label: 'People', icon: 'lucide-users-round', route: '/people' },
      { label: 'Alumni', icon: 'lucide-graduation-cap', route: '/alumni' },
      { label: 'Access', icon: 'lucide-shield-check', route: '/users' },
    ],
  },
  {
    title: 'Admissions',
    items: [
      { label: 'Applications', icon: 'lucide-user-plus', route: '/applicants' },
      { label: 'Admissions', icon: 'lucide-clipboard-list', route: '/admissions' },
      { label: 'Waiting list', icon: 'lucide-list-ordered', route: '/waiting-list' },
      { label: 'Enrollments', icon: 'lucide-badge-check', route: '/program-enrollments' },
      { label: 'Subject enrollment', icon: 'lucide-list-checks', route: '/course-enrollments' },
      { label: 'Scan to data', icon: 'lucide-scan-text', route: '/scan' },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Academic years', icon: 'lucide-calendar-range', route: '/academic-years' },
      { label: 'Terms', icon: 'lucide-calendar-days', route: '/academic-terms' },
      { label: 'Classes', icon: 'lucide-users', route: '/classes' },
      { label: 'Sections', icon: 'lucide-book-marked', route: '/programs' },
      { label: 'Subjects', icon: 'lucide-book-open', route: '/courses' },
      { label: 'Curriculum', icon: 'lucide-book-copy', route: '/curriculum' },
      { label: 'Topics', icon: 'lucide-list-tree', route: '/topics' },
      { label: 'Rooms', icon: 'lucide-door-open', route: '/rooms' },
      { label: 'Batches', icon: 'lucide-layers', route: '/batches' },
    ],
  },
  {
    title: 'School',
    items: [
      { label: 'Academics', icon: 'lucide-book-open', route: '/academics' },
    ],
  },
  {
    title: 'Timetable',
    items: [
      { label: 'Timetable', icon: 'lucide-calendar-clock', route: '/timetable' },
      { label: 'Periods', icon: 'lucide-clock-3', route: '/periods' },
    ],
  },
  {
    title: 'Attendance',
    items: [
      { label: 'Registers', icon: 'lucide-clipboard-check', route: '/attendance' },
      { label: 'Take attendance', icon: 'lucide-user-check', route: '/attendance/take' },
      { label: 'Early departures', icon: 'lucide-log-out', route: '/early-departures' },
      { label: 'Staff attendance', icon: 'lucide-user-round-check', route: '/staff-attendance' },
    ],
  },
  {
    title: 'Exams & Results',
    items: [
      {
        label: 'Set exams & marks',
        icon: 'lucide-table-2',
        route: '/gradebook',
      },
      { label: 'Examinations', icon: 'lucide-file-check-2', route: '/exams' },
      { label: 'Results', icon: 'lucide-award', route: '/exam-results' },
      { label: 'Report cards', icon: 'lucide-file-badge', route: '/report-cards' },
      { label: 'Assessment groups', icon: 'lucide-folders', route: '/assessment-groups' },
      { label: 'Assessment criteria', icon: 'lucide-list-checks', route: '/assessment-criteria' },
      { label: 'Grading scales', icon: 'lucide-sliders-horizontal', route: '/grading-scales' },
      { label: 'Exam settings', icon: 'lucide-settings-2', route: '/exam-settings' },
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
      { label: 'Offset left dues', icon: 'lucide-circle-off', route: '/fees/offset' },
      { label: 'Fee offsets', icon: 'lucide-history', route: '/fee-offsets' },
      { label: 'Payments', icon: 'lucide-smartphone-nfc', route: '/payments' },
      { label: 'Payment desk', icon: 'lucide-wallet', route: '/payment' },
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
      { label: 'Staff directory', icon: 'lucide-id-card', route: '/people?tab=staff' },
      { label: 'Departments', icon: 'lucide-building', route: '/departments' },
      { label: 'Payroll', icon: 'lucide-wallet-cards', route: '/payroll' },
      { label: 'Leave', icon: 'lucide-calendar-off', route: '/staff-leave' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Announcements', icon: 'lucide-megaphone', route: '/announcements' },
      { label: 'Messages', icon: 'lucide-messages-square', route: '/communications' },
      { label: 'SMS', icon: 'lucide-message-square-text', route: '/sms-messages' },
      { label: 'Templates', icon: 'lucide-file-text', route: '/message-templates' },
      { label: 'Calendar', icon: 'lucide-calendar-days', route: '/calendar' },
    ],
  },
  {
    title: 'Library',
    items: [
      { label: 'Books', icon: 'lucide-library', route: '/library-books' },
      { label: 'Issues', icon: 'lucide-book-up', route: '/library-issues' },
    ],
  },
  {
    title: 'Transport',
    items: [
      { label: 'Routes', icon: 'lucide-route', route: '/transport-routes' },
      { label: 'Vehicles', icon: 'lucide-bus', route: '/transport-vehicles' },
    ],
  },
  {
    title: 'Meals',
    items: [
      { label: 'Menus', icon: 'lucide-utensils', route: '/meals-menus' },
      { label: 'Meal attendance', icon: 'lucide-clipboard-list', route: '/meal-attendance' },
      { label: 'Dietary requirements', icon: 'lucide-salad', route: '/dietary-requirements' },
    ],
  },
  {
    title: 'Health & Safety',
    items: [
      { label: 'Health records', icon: 'lucide-heart-pulse', route: '/health-records' },
      { label: 'Clinic visits', icon: 'lucide-stethoscope', route: '/clinic-visits' },
      { label: 'Safeguarding', icon: 'lucide-shield-alert', route: '/safeguarding-incidents' },
      { label: 'Visitor log', icon: 'lucide-clipboard-pen-line', route: '/visitor-log' },
    ],
  },
  {
    title: 'Discipline',
    items: [
      { label: 'Cases', icon: 'lucide-shield-alert', route: '/disciplinary-cases' },
      { label: 'Positive recognition', icon: 'lucide-star', route: '/positive-recognition' },
      { label: 'Pupil log', icon: 'lucide-notebook-pen', route: '/student-log' },
    ],
  },
  {
    title: 'Events',
    items: [
      {
        label: 'Term overview',
        icon: 'lucide-calendar-range',
        route: '/term-overview',
      },
      { label: 'School events', icon: 'lucide-party-popper', route: '/school-events' },
      { label: 'Clubs', icon: 'lucide-trophy', route: '/clubs' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Inventory', icon: 'lucide-package', route: '/inventory' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Campuses', icon: 'lucide-map-pin', route: '/campuses' },
      { label: 'Boarding', icon: 'lucide-bed-double', route: '/hostel' },
      { label: 'Fee categories', icon: 'lucide-tags', route: '/student-categories' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'School setup', icon: 'lucide-building-2', route: '/school-setup' },
      { label: 'Activity & audit', icon: 'lucide-history', route: '/activity-log' },
      { label: 'Documents', icon: 'lucide-printer', route: '/documents' },
      { label: 'Reports', icon: 'lucide-bar-chart-3', route: '/reports' },
    ],
  },
]

export const parentNav: NavGroup[] = [
  {
    title: 'My child',
    items: [
      { label: 'Parent Portal', icon: 'lucide-house', route: '/parent-portal' },
      { label: 'School Calendar', icon: 'lucide-calendar-days', route: '/calendar' },
      { label: 'Announcements', icon: 'lucide-megaphone', route: '/announcements' },
      { label: 'Report Cards', icon: 'lucide-file-badge', route: '/report-cards' },
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
    route: '/attendance/take',
    icon: 'lucide-clipboard-check',
    description: 'Class register',
  },
  {
    label: 'Applications',
    route: '/applicants',
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
    route: '/attendance/take',
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
    route: '/applicants/new',
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
  links: mods.map((m) => ({
    label: m.title,
    route: `/${m.key}`,
  })),
}))

export const commandItems = [
  ...shortcuts.map((s) => ({
    label: s.label,
    route: s.route,
    group: 'Shortcuts',
  })),
  ...tools.map((t) => ({ label: t.label, route: t.route, group: 'Tools' })),
  ...Object.values(allCatalog).map((m) => ({
    label: m.title,
    route: `/${m.key}`,
    group: m.group,
  })),
  { label: 'Users & Roles', route: '/users', group: 'People' },
  { label: 'Term overview', route: '/term-overview', group: 'Events' },
  { label: 'School setup', route: '/school-setup', group: 'Settings' },
  { label: 'Activity & audit', route: '/activity-log', group: 'Settings' },
  { label: 'Documents', route: '/documents', group: 'Settings' },
  { label: 'Reports', route: '/reports', group: 'Settings' },
  { label: 'Parent Portal', route: '/parent-portal', group: 'Communication' },
  { label: 'My profile', route: '/me', group: 'Settings' },
]
