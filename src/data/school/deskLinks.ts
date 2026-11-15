/**
 * Canonical desk hubs — list modules open inside tabbed desks
 * instead of as orphan pages.
 */

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
