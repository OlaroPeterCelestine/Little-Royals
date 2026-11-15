/**
 * Canonical desk hubs — list modules open inside related tabbed desks
 * instead of as orphan pages.
 */

export type DeskLink = {
  label: string
  route: string
}

export type DeskHub = {
  label: string
  path: string
  /** Default query tab when opening the hub */
  tab?: string
  modules: string[]
  related: DeskLink[]
}

/** Module key → hub path + tab. */
const MODULE_TO_HUB: Record<string, { path: string; tab?: string }> = {
  applicants: { path: '/admissions', tab: 'applications' },
  admissions: { path: '/admissions', tab: 'admissions' },
  'waiting-list': { path: '/admissions', tab: 'applications' },
  'program-enrollments': { path: '/admissions', tab: 'admissions' },
  'course-enrollments': { path: '/admissions', tab: 'admissions' },

  teachers: { path: '/people', tab: 'teachers' },
  staff: { path: '/people', tab: 'staff' },
  guardians: { path: '/people', tab: 'parents' },
  parents: { path: '/people', tab: 'parents' },

  attendance: { path: '/attendance', tab: 'registers' },
  'early-departures': { path: '/attendance', tab: 'early' },
  'staff-attendance': { path: '/attendance', tab: 'staff' },

  exams: { path: '/gradebook', tab: 'exams' },
  'exam-results': { path: '/gradebook', tab: 'results' },
  gradebook: { path: '/gradebook', tab: 'exams' },
  'assessment-groups': { path: '/gradebook', tab: 'settings' },
  'assessment-criteria': { path: '/gradebook', tab: 'settings' },
  'grading-scales': { path: '/gradebook', tab: 'settings' },
  'exam-settings': { path: '/gradebook', tab: 'settings' },
  'report-cards': { path: '/students' },

  'library-books': { path: '/library', tab: 'books' },
  'library-issues': { path: '/library', tab: 'issues' },

  'transport-routes': { path: '/transport', tab: 'routes' },
  'transport-vehicles': { path: '/transport', tab: 'vehicles' },

  'meals-menus': { path: '/meals', tab: 'menus' },
  'meal-attendance': { path: '/meals', tab: 'attendance' },
  'dietary-requirements': { path: '/meals', tab: 'dietary' },

  'health-records': { path: '/health', tab: 'records' },
  'clinic-visits': { path: '/health', tab: 'clinic' },
  'safeguarding-incidents': { path: '/health', tab: 'safeguarding' },
  'visitor-log': { path: '/health', tab: 'visitors' },

  'disciplinary-cases': { path: '/discipline', tab: 'cases' },
  'positive-recognition': { path: '/discipline', tab: 'recognition' },
  'student-log': { path: '/discipline', tab: 'log' },

  'sms-messages': { path: '/communications', tab: 'messages' },
  'message-templates': { path: '/communications', tab: 'messages' },
  announcements: { path: '/communications', tab: 'announcements' },
  communications: { path: '/communications', tab: 'announcements' },

  'school-events': { path: '/calendar' },

  'inventory-items': { path: '/inventory', tab: 'items' },
  'inventory-stock': { path: '/inventory', tab: 'stock' },
  'inventory-issues': { path: '/inventory', tab: 'issues' },
  'purchase-requests': { path: '/inventory', tab: 'requests' },
  assets: { path: '/inventory', tab: 'assets' },

  'academic-years': { path: '/years-and-terms' },
  'academic-terms': { path: '/years-and-terms' },

  periods: { path: '/timetable', tab: undefined },
  timetable: { path: '/timetable' },

  'lesson-plans': { path: '/academics' },
  homework: { path: '/academics' },
  'schemes-of-work': { path: '/academics' },
  'nursery-activities': { path: '/academics' },
  'nursery-observations': { path: '/academics' },
  'nursery-development': { path: '/academics' },

  topics: { path: '/study-coverage' },
  'study-coverage': { path: '/study-coverage' },

  payments: { path: '/payment', tab: 'ledger' },
  'fee-offsets': { path: '/fees/offset' },

  'audit-logs': { path: '/activity-log', tab: 'audit' },
  users: { path: '/users' },
  permissions: { path: '/users', tab: 'roles' },
}

/** Related links shown on each hub desk. */
export const DESK_RELATED: Record<string, DeskLink[]> = {
  '/admissions': [
    { label: 'Students', route: '/students' },
    { label: 'Classes', route: '/classes' },
    { label: 'Scan to data', route: '/scan' },
    { label: 'Documents', route: '/documents?kind=admission-letter' },
  ],
  '/students': [
    { label: 'Admissions', route: '/admissions' },
    { label: 'Attendance', route: '/attendance' },
    { label: 'Exams & marks', route: '/gradebook?tab=exams' },
    { label: 'Fees', route: '/fees' },
    { label: 'Classes', route: '/classes' },
  ],
  '/people': [
    { label: 'Students', route: '/students' },
    { label: 'Payroll', route: '/payroll' },
    { label: 'Leave', route: '/staff-leave' },
    { label: 'Staff attendance', route: '/attendance?tab=staff' },
  ],
  '/classes': [
    { label: 'Students', route: '/students' },
    { label: 'Timetable', route: '/timetable' },
    { label: 'Study coverage', route: '/study-coverage' },
    { label: 'Academics desk', route: '/academics' },
    { label: 'Years & terms', route: '/years-and-terms' },
  ],
  '/courses': [
    { label: 'Study coverage', route: '/study-coverage' },
    { label: 'Curriculum', route: '/curriculum' },
    { label: 'Timetable', route: '/timetable' },
    { label: 'Academics desk', route: '/academics' },
  ],
  '/curriculum': [
    { label: 'Study coverage', route: '/study-coverage' },
    { label: 'Subjects', route: '/courses' },
    { label: 'Classes', route: '/classes' },
  ],
  '/study-coverage': [
    { label: 'Subjects', route: '/courses' },
    { label: 'Curriculum', route: '/curriculum' },
    { label: 'Classes', route: '/classes' },
    { label: 'Academics desk', route: '/academics' },
    { label: 'Timetable', route: '/timetable' },
  ],
  '/academics': [
    { label: 'Classes', route: '/classes' },
    { label: 'Study coverage', route: '/study-coverage' },
    { label: 'Timetable', route: '/timetable' },
    { label: 'Exams & marks', route: '/gradebook?tab=exams' },
    { label: 'Years & terms', route: '/years-and-terms' },
  ],
  '/timetable': [
    { label: 'Classes', route: '/classes' },
    { label: 'Subjects', route: '/courses' },
    { label: 'Academics desk', route: '/academics' },
    { label: 'Years & terms', route: '/years-and-terms' },
  ],
  '/years-and-terms': [
    { label: 'Term overview', route: '/term-overview' },
    { label: 'Calendar', route: '/calendar' },
    { label: 'School setup', route: '/school-setup' },
    { label: 'Academics desk', route: '/academics' },
  ],
  '/attendance': [
    { label: 'Students', route: '/students' },
    { label: 'Classes', route: '/classes' },
    { label: 'Staff (People)', route: '/people?tab=staff' },
    { label: 'Take register', route: '/attendance?tab=take' },
  ],
  '/gradebook': [
    { label: 'Students', route: '/students' },
    { label: 'Classes', route: '/classes' },
    { label: 'Study coverage', route: '/study-coverage' },
    { label: 'Academics desk', route: '/academics' },
    { label: 'Documents', route: '/documents' },
  ],
  '/library': [
    { label: 'Students', route: '/students' },
    { label: 'Classes', route: '/classes' },
    { label: 'Inventory', route: '/inventory' },
  ],
  '/transport': [
    { label: 'Students', route: '/students' },
    { label: 'Parents', route: '/people?tab=parents' },
    { label: 'Calendar', route: '/calendar' },
  ],
  '/meals': [
    { label: 'Students', route: '/students' },
    { label: 'Health & safety', route: '/health' },
    { label: 'Inventory', route: '/inventory' },
  ],
  '/health': [
    { label: 'Students', route: '/students' },
    { label: 'Meals', route: '/meals' },
    { label: 'Discipline', route: '/discipline' },
    { label: 'Parents', route: '/people?tab=parents' },
  ],
  '/discipline': [
    { label: 'Students', route: '/students' },
    { label: 'Health & safety', route: '/health' },
    { label: 'Parents', route: '/people?tab=parents' },
  ],
  '/communications': [
    { label: 'Calendar', route: '/calendar' },
    { label: 'Students', route: '/students' },
    { label: 'Parents', route: '/people?tab=parents' },
    { label: 'Documents', route: '/documents' },
  ],
  '/calendar': [
    { label: 'Term overview', route: '/term-overview' },
    { label: 'Messages', route: '/communications?tab=messages' },
    { label: 'Years & terms', route: '/years-and-terms' },
    { label: 'Exams', route: '/gradebook?tab=exams' },
  ],
  '/inventory': [
    { label: 'Library', route: '/library' },
    { label: 'Expenses', route: '/expenses' },
    { label: 'Classes', route: '/classes' },
  ],
  '/payment': [
    { label: 'Fees', route: '/fees' },
    { label: 'Invoices', route: '/invoices' },
    { label: 'Fee offsets', route: '/fees/offset' },
    { label: 'Refunds', route: '/refunds' },
  ],
  '/fees': [
    { label: 'Payments', route: '/payment' },
    { label: 'Invoices', route: '/invoices' },
    { label: 'Fee structures', route: '/fee-structures' },
    { label: 'Fee offsets', route: '/fees/offset' },
    { label: 'Students', route: '/students' },
  ],
  '/invoices': [
    { label: 'Fees', route: '/fees' },
    { label: 'Payments', route: '/payment' },
    { label: 'Documents', route: '/documents?kind=invoice' },
  ],
  '/documents': [
    { label: 'Reports', route: '/reports' },
    { label: 'Admissions', route: '/admissions' },
    { label: 'Scan to data', route: '/scan' },
    { label: 'Exams & marks', route: '/gradebook?tab=exams' },
  ],
  '/reports': [
    { label: 'Documents', route: '/documents' },
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Term overview', route: '/term-overview' },
  ],
  '/term-overview': [
    { label: 'Calendar', route: '/calendar' },
    { label: 'Years & terms', route: '/years-and-terms' },
    { label: 'Dashboard', route: '/dashboard' },
  ],
  '/users': [
    { label: 'School setup', route: '/school-setup' },
    { label: 'Activity & audit', route: '/activity-log' },
  ],
  '/school-setup': [
    { label: 'Years & terms', route: '/years-and-terms' },
    { label: 'Users & roles', route: '/users' },
    { label: 'Documents', route: '/documents' },
  ],
  '/activity-log': [
    { label: 'Users & roles', route: '/users' },
    { label: 'School setup', route: '/school-setup' },
  ],
  '/scan': [
    { label: 'Admissions', route: '/admissions?tab=applications' },
    { label: 'Students', route: '/students' },
    { label: 'Documents', route: '/documents' },
  ],
}

function withTab(path: string, tab?: string): string {
  if (!tab) return path
  const join = path.includes('?') ? '&' : '?'
  // timetable uses view= for periods
  if (path === '/timetable' && tab === 'periods') {
    return `${path}?view=periods`
  }
  return `${path}${join}tab=${encodeURIComponent(tab)}`
}

/** Resolve a catalog module key to its desk list URL. */
export function deskRouteForModule(moduleKey: string): string {
  const key = String(moduleKey || '').trim()
  if (!key) return '/dashboard'
  const hub = MODULE_TO_HUB[key]
  if (hub) return withTab(hub.path, hub.tab)
  return `/${key}`
}

/** Related links for a path (ignores query). */
export function relatedLinksFor(pathWithQuery: string): DeskLink[] {
  const path = String(pathWithQuery || '').split('?')[0].replace(/\/$/, '') || '/'
  return DESK_RELATED[path] || []
}

/** Hub modules for access control. */
export function modulesForDeskPath(path: string): string[] | null {
  const root = path.replace(/^\//, '').split('/')[0]
  const hubs: Record<string, string[]> = {
    admissions: ['applicants', 'admissions'],
    library: ['library-books', 'library-issues'],
    transport: ['transport-routes', 'transport-vehicles'],
    meals: ['meals-menus', 'meal-attendance', 'dietary-requirements'],
    health: [
      'health-records',
      'clinic-visits',
      'safeguarding-incidents',
      'visitor-log',
    ],
    discipline: [
      'disciplinary-cases',
      'positive-recognition',
      'student-log',
    ],
    attendance: ['attendance', 'early-departures', 'staff-attendance'],
    'study-coverage': ['study-coverage'],
  }
  return hubs[root] || null
}
