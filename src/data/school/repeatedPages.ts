/**
 * Repeated / overlapping desks — keep one nav entry; secondary routes redirect
 * into tabs on the primary page.
 *
 * FLAG: when adding modules, check this list before creating a new sidebar item.
 */
export const repeatedPageClusters = [
  {
    id: 'exams',
    primary: '/gradebook',
    label: 'Exams & marks',
    tabs: ['exams', 'marks', 'results', 'settings'],
    absorb: [
      '/exams',
      '/exam-results',
      '/assessment-groups',
      '/assessment-criteria',
      '/grading-scales',
      '/exam-settings',
    ],
  },
  {
    id: 'attendance',
    primary: '/attendance',
    label: 'Attendance',
    tabs: ['registers', 'take', 'early', 'staff'],
    absorb: [
      '/attendance/take',
      '/early-departures',
      '/staff-attendance',
    ],
  },
  {
    id: 'payments',
    primary: '/payment',
    label: 'Payments',
    tabs: ['desk', 'ledger'],
    absorb: ['/payments'],
  },
  {
    id: 'library',
    primary: '/library',
    label: 'Library',
    tabs: ['books', 'issues'],
    absorb: ['/library-books', '/library-issues'],
  },
  {
    id: 'transport',
    primary: '/transport',
    label: 'Transport',
    tabs: ['routes', 'vehicles'],
    absorb: ['/transport-routes', '/transport-vehicles'],
  },
  {
    id: 'meals',
    primary: '/meals',
    label: 'Meals',
    tabs: ['menus', 'attendance', 'dietary'],
    absorb: ['/meals-menus', '/meal-attendance', '/dietary-requirements'],
  },
  {
    id: 'health',
    primary: '/health',
    label: 'Health & safety',
    tabs: ['records', 'clinic', 'safeguarding', 'visitors'],
    absorb: [
      '/health-records',
      '/clinic-visits',
      '/safeguarding-incidents',
      '/visitor-log',
    ],
  },
  {
    id: 'discipline',
    primary: '/discipline',
    label: 'Discipline',
    tabs: ['cases', 'recognition', 'log'],
    absorb: [
      '/disciplinary-cases',
      '/positive-recognition',
      '/student-log',
    ],
  },
  {
    id: 'admissions',
    primary: '/admissions',
    label: 'Admissions',
    tabs: ['applications', 'admissions'],
    absorb: ['/applicants'],
  },
] as const
