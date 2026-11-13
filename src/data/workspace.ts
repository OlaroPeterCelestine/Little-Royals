import { catalog, countByStatus } from './catalog'

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

/** Strict Education sidebar — ERPNext Education doctypes only */
export const educationNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'lucide-layout-dashboard', route: '/' },
    ],
  },
  {
    title: 'Student',
    items: [
      { label: 'Student', icon: 'lucide-graduation-cap', route: '/students' },
      { label: 'Guardian', icon: 'lucide-heart-handshake', route: '/guardians' },
      { label: 'Class', icon: 'lucide-users', route: '/classes' },
      { label: 'Student Log', icon: 'lucide-notebook-pen', route: '/student-log' },
      {
        label: 'Disciplinary Cases',
        icon: 'lucide-shield-alert',
        route: '/disciplinary-cases',
      },
      {
        label: 'Health Records',
        icon: 'lucide-heart-pulse',
        route: '/health-records',
      },
      {
        label: 'Hostel / Boarding',
        icon: 'lucide-bed-double',
        route: '/hostel',
      },
      {
        label: 'Student Category',
        icon: 'lucide-tags',
        route: '/student-categories',
      },
    ],
  },
  {
    title: 'Teachers',
    items: [
      { label: 'Teacher', icon: 'lucide-briefcase', route: '/teachers' },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Program', icon: 'lucide-book-marked', route: '/programs' },
      { label: 'Subject', icon: 'lucide-book-open', route: '/courses' },
      { label: 'Topic', icon: 'lucide-list-tree', route: '/topics' },
      { label: 'Room', icon: 'lucide-door-open', route: '/rooms' },
      {
        label: 'Academic Term',
        icon: 'lucide-calendar-range',
        route: '/academic-terms',
      },
      { label: 'Student Batch', icon: 'lucide-layers', route: '/batches' },
      {
        label: 'Course Schedule',
        icon: 'lucide-calendar-clock',
        route: '/timetable',
      },
      { label: 'Homework', icon: 'lucide-pencil-line', route: '/homework' },
      {
        label: 'Lesson Plans',
        icon: 'lucide-clipboard-pen',
        route: '/lesson-plans',
      },
    ],
  },
  {
    title: 'Attendance',
    items: [
      {
        label: 'Student Attendance',
        icon: 'lucide-clipboard-check',
        route: '/attendance',
      },
      {
        label: 'Staff Attendance',
        icon: 'lucide-user-check',
        route: '/staff-attendance',
      },
    ],
  },
  {
    title: 'Assessment',
    items: [
      {
        label: 'Exam Settings',
        icon: 'lucide-settings-2',
        route: '/exam-settings',
      },
      {
        label: 'Gradebook',
        icon: 'lucide-table-2',
        route: '/gradebook',
      },
      {
        label: 'Report Cards',
        icon: 'lucide-file-badge',
        route: '/report-cards',
      },
      {
        label: 'Assessment Group',
        icon: 'lucide-folders',
        route: '/assessment-groups',
      },
      {
        label: 'Assessment Criteria',
        icon: 'lucide-list-checks',
        route: '/assessment-criteria',
      },
      { label: 'Assessment Plan', icon: 'lucide-file-check-2', route: '/exams' },
      {
        label: 'Assessment Result',
        icon: 'lucide-award',
        route: '/exam-results',
      },
      {
        label: 'Grading Scale',
        icon: 'lucide-sliders-horizontal',
        route: '/grading-scales',
      },
    ],
  },
  {
    title: 'Admissions',
    items: [
      {
        label: 'Student Applicant',
        icon: 'lucide-user-plus',
        route: '/applicants',
      },
      {
        label: 'Student Admission',
        icon: 'lucide-clipboard-list',
        route: '/admissions',
      },
      {
        label: 'Program Enrollment',
        icon: 'lucide-badge-check',
        route: '/program-enrollments',
      },
      {
        label: 'Subject Enrollment',
        icon: 'lucide-list-checks',
        route: '/course-enrollments',
      },
    ],
  },
  {
    title: 'Fees',
    items: [
      {
        label: 'Payment',
        icon: 'lucide-layout-dashboard',
        route: '/payment',
      },
      { label: 'Fees', icon: 'lucide-receipt', route: '/fees' },
      {
        label: 'Mobile Money',
        icon: 'lucide-smartphone-nfc',
        route: '/payments',
      },
      {
        label: 'School Expenses',
        icon: 'lucide-banknote',
        route: '/expenses',
      },
      {
        label: 'Fee Structure',
        icon: 'lucide-table',
        route: '/fee-structures',
      },
      {
        label: 'Fee Category',
        icon: 'lucide-wallet',
        route: '/fee-categories',
      },
      {
        label: 'Fee Schedule',
        icon: 'lucide-calendar',
        route: '/fee-schedules',
      },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        label: 'Inventory Items',
        icon: 'lucide-package',
        route: '/inventory-items',
      },
      {
        label: 'Stock Levels',
        icon: 'lucide-warehouse',
        route: '/inventory-stock',
      },
      {
        label: 'Stock Issues',
        icon: 'lucide-package-open',
        route: '/inventory-issues',
      },
      { label: 'School Assets', icon: 'lucide-monitor', route: '/assets' },
    ],
  },
  {
    title: 'Library',
    items: [
      {
        label: 'Library Books',
        icon: 'lucide-library',
        route: '/library-books',
      },
      {
        label: 'Library Issues',
        icon: 'lucide-book-up',
        route: '/library-issues',
      },
    ],
  },
  {
    title: 'Transport',
    items: [
      {
        label: 'Transport Routes',
        icon: 'lucide-route',
        route: '/transport-routes',
      },
      {
        label: 'Vehicles',
        icon: 'lucide-bus',
        route: '/transport-vehicles',
      },
    ],
  },
  {
    title: 'Communications',
    items: [
      {
        label: 'Communications',
        icon: 'lucide-messages-square',
        route: '/communications',
      },
      {
        label: 'Announcements',
        icon: 'lucide-megaphone',
        route: '/announcements',
      },
      {
        label: 'Message Templates',
        icon: 'lucide-file-text',
        route: '/message-templates',
      },
      {
        label: 'School Calendar',
        icon: 'lucide-calendar-days',
        route: '/calendar',
      },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Education Reports', icon: 'lucide-file-code', route: '/reports' },
      {
        label: 'Print Documents',
        icon: 'lucide-printer',
        route: '/documents',
      },
    ],
  },
  {
    title: 'HR',
    items: [
      {
        label: 'Payroll',
        icon: 'lucide-wallet-cards',
        route: '/payroll',
      },
      {
        label: 'Staff Leave',
        icon: 'lucide-palm-tree',
        route: '/staff-leave',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        label: 'School Setup',
        icon: 'lucide-building-2',
        route: '/school-setup',
      },
      {
        label: 'Visitor Log',
        icon: 'lucide-clipboard-pen-line',
        route: '/visitor-log',
      },
      {
        label: 'Activity Log',
        icon: 'lucide-history',
        route: '/activity-log',
      },
    ],
  },
]

/** Slim nav for Parent role — portal-first */
export const parentNav: NavGroup[] = [
  {
    title: 'My child',
    items: [
      {
        label: 'Parent Portal',
        icon: 'lucide-house',
        route: '/parent-portal',
      },
      {
        label: 'School Calendar',
        icon: 'lucide-calendar-days',
        route: '/calendar',
      },
      {
        label: 'Announcements',
        icon: 'lucide-megaphone',
        route: '/announcements',
      },
      {
        label: 'Report Cards',
        icon: 'lucide-file-badge',
        route: '/report-cards',
      },
    ],
  },
]

/** Flat list kept for search / legacy imports */
export const modules: ModuleItem[] = educationNav.flatMap((g) => g.items)

const activeStudents = countByStatus('students', (s) => s === 'Active')
const activeTeachers = countByStatus('teachers', (s) => s === 'Active')
const openPrograms = countByStatus('programs', (s) => s === 'Open')
const liveCourses = countByStatus('courses', (s) => s === 'Live')
const unpaidFees = countByStatus(
  'fees',
  (s) => s === 'Unpaid' || s === 'Overdue' || s === 'Partial',
)

export const shortcuts: ShortcutItem[] = [
  {
    label: 'Student',
    route: '/students',
    icon: 'lucide-graduation-cap',
    badge: `${activeStudents} Active`,
    badgeTheme: 'green',
    description: 'Enrolled learners',
  },
  {
    label: 'Teacher',
    route: '/teachers',
    icon: 'lucide-briefcase',
    badge: `${activeTeachers} Active`,
    badgeTheme: 'green',
    description: 'Class & subject teachers',
  },
  {
    label: 'Program',
    route: '/programs',
    icon: 'lucide-book-marked',
    badge: `${openPrograms} Open`,
    badgeTheme: 'blue',
    description: 'Nursery & Primary',
  },
  {
    label: 'Subject',
    route: '/courses',
    icon: 'lucide-book-open',
    badge: `${liveCourses} Live`,
    badgeTheme: 'blue',
    description: 'NCDC subjects',
  },
  {
    label: 'Fees',
    route: '/fees',
    icon: 'lucide-wallet',
    badge: `${unpaidFees} Unpaid`,
    badgeTheme: 'amber',
    description: 'Outstanding balances',
  },
]

export const tools: ToolItem[] = [
  {
    label: 'Student Monthly Attendance Sheet',
    route: '/attendance',
    icon: 'lucide-calendar-days',
    description: 'Month-wise presence by class',
  },
  {
    label: 'Course Scheduling Tool',
    route: '/timetable',
    icon: 'lucide-calendar-clock',
    description: 'Plan periods and rooms',
  },
  {
    label: 'Student Attendance Tool',
    route: '/attendance',
    icon: 'lucide-clipboard-check',
    description: "Mark today's roll call",
  },
  {
    label: 'Education Dashboard',
    route: '/',
    icon: 'lucide-layout-dashboard',
    description: 'Charts, KPIs, and tables',
  },
  {
    label: 'Assessment Result Entry',
    route: '/exam-results',
    icon: 'lucide-award',
    description: 'Post and review scores',
  },
  {
    label: 'Fee Collection Report',
    route: '/reports',
    icon: 'lucide-file-code',
    description: 'Education finance exports',
  },
]

const groupIcons: Record<string, string> = {
  Student: 'lucide-graduation-cap',
  Academics: 'lucide-book-marked',
  Assessment: 'lucide-file-check-2',
  Admissions: 'lucide-user-plus',
  Fees: 'lucide-receipt',
}

export const masterGroups: MasterGroup[] = Array.from(
  Object.values(catalog).reduce((map, mod) => {
    const list = map.get(mod.group) || []
    list.push(mod)
    map.set(mod.group, list)
    return map
  }, new Map<string, (typeof catalog)[string][]>()),
).map(([title, mods]) => ({
  title,
  icon: groupIcons[title] || 'lucide-folder',
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
  ...Object.values(catalog).map((m) => ({
    label: m.title,
    route: `/${m.key}`,
    group: m.group,
  })),
  {
    label: 'Communications',
    route: '/communications',
    group: 'Communications',
  },
  {
    label: 'Parent Portal',
    route: '/parent-portal',
    group: 'Communications',
  },
  {
    label: 'Mobile Money Payments',
    route: '/payments',
    group: 'Fees',
  },
  {
    label: 'Teacher Gradebook',
    route: '/gradebook',
    group: 'Assessment',
  },
  {
    label: 'Report Cards',
    route: '/report-cards',
    group: 'Assessment',
  },
  {
    label: 'Announcements',
    route: '/announcements',
    group: 'Communications',
  },
  {
    label: 'School Calendar',
    route: '/calendar',
    group: 'Communications',
  },
  {
    label: 'Message Templates',
    route: '/message-templates',
    group: 'Communications',
  },
  {
    label: 'Print Documents',
    route: '/documents',
    group: 'Reports',
  },
  {
    label: 'Visitor Log',
    route: '/visitor-log',
    group: 'System',
  },
  {
    label: 'School Setup',
    route: '/school-setup',
    group: 'System',
  },
  {
    label: 'Activity Log',
    route: '/activity-log',
    group: 'System',
  },
  {
    label: 'Users & Roles',
    route: '/users',
    group: 'System',
  },
  {
    label: 'Role Permissions',
    route: '/users?tab=roles',
    group: 'System',
  },
  {
    label: 'My profile',
    route: '/me',
    group: 'System',
  },
]
