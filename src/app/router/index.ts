import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router'
import { catalog } from '@/data/catalog/catalog'
import { catalogExtra } from '@/data/catalog/catalogExtra'
import { isAuthenticated, authSession, refreshAuthSession } from '@/data/auth/auth'
import { isParentRole } from '@/data/auth/permissions'
import {
  isParentAllowedPath,
  isSafeInternalPath,
} from '@/lib/security'
import { canAccessPath } from '@/lib/accessControl'

const allModules = { ...catalog, ...catalogExtra }
type ModuleKey = string

const catalogKeys = Object.keys(allModules)

const specialListPaths = new Set([
  '/students',
  '/teachers',
  '/staff',
  '/guardians',
  '/people',
  '/classes',
  '/attendance',
  '/attendance/take',
  '/early-departures',
  '/staff-attendance',
  '/announcements',
  '/school-events',
  '/sms-messages',
  '/communications',
  '/message-templates',
  '/payments',
  '/payment',
  '/fee-offsets',
  '/fees/offset',
  '/gradebook',
  '/exams',
  '/exam-results',
  '/report-cards',
  '/parent-portal',
  '/audit-logs',
  '/activity-log',
  '/academics',
  '/nursery-activities',
  '/nursery-observations',
  '/nursery-development',
  '/schemes-of-work',
  '/homework',
  '/lesson-plans',
  '/inventory',
  '/inventory-items',
  '/inventory-stock',
  '/inventory-issues',
  '/purchase-requests',
  '/assets',
  '/academic-years',
  '/academic-terms',
  '/years-and-terms',
  '/timetable',
  '/periods',
  '/program-enrollments',
  '/course-enrollments',
  '/programs',
  '/waiting-list',
  '/admissions',
  '/applicants',
  '/rooms',
  '/batches',
  '/library',
  '/library-books',
  '/library-issues',
  '/transport',
  '/transport-routes',
  '/transport-vehicles',
  '/meals',
  '/meals-menus',
  '/meal-attendance',
  '/dietary-requirements',
  '/health',
  '/health-records',
  '/clinic-visits',
  '/safeguarding-incidents',
  '/visitor-log',
  '/discipline',
  '/disciplinary-cases',
  '/positive-recognition',
  '/student-log',
])

const specialDetailPaths = new Set([
  '/students/:id',
  '/teachers/:id',
  '/staff/:id',
  '/classes/:id',
  '/attendance/:id',
  '/programs/:id',
])

function withModuleParam(key: ModuleKey) {
  return (to: RouteLocationNormalized) => {
    to.params.module = key
  }
}

const catalogListRoutes: RouteRecordRaw[] = catalogKeys
  .map((key) => ({
    path: `/${key}`,
    name: key,
    component: () => import('@/pages/shared/MasterList.vue'),
  }))
  .filter((r) => !specialListPaths.has(r.path))

const catalogDetailRoutes: RouteRecordRaw[] = catalogKeys
  .map((key) => ({
    path: `/${key}/:id`,
    name: `${key}-detail`,
    component: () => import('@/pages/shared/RecordDetail.vue'),
    beforeEnter: withModuleParam(key),
  }))
  .filter(
    (r) =>
      !specialDetailPaths.has(r.path) &&
      r.path !== '/attendance/:id' &&
      r.path !== '/audit-logs/:id' &&
      r.path !== '/waiting-list/:id',
  )

const catalogFormRoutes: RouteRecordRaw[] = catalogKeys
  // students create/edit are registered earlier (before /students/:id).
  .filter(
    (key) =>
      key !== 'programs' &&
      key !== 'waiting-list' &&
      key !== 'students' &&
      key !== 'teachers' &&
      key !== 'staff' &&
      key !== 'classes',
  )
  .flatMap((key) => [
    {
      path: `/${key}/new`,
      name: `${key}-create`,
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam(key),
    },
    {
      path: `/${key}/:id/edit`,
      name: `${key}-edit`,
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam(key),
    },
  ])

function detailRoute(key: ModuleKey, path: string, name: string): RouteRecordRaw {
  return {
    path,
    name,
    component: () => import('@/pages/shared/RecordDetail.vue'),
    beforeEnter: withModuleParam(key),
  }
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'home',
      redirect: () => {
        if (!isAuthenticated.value) return { name: 'login' }
        if (isParentRole(authSession.value?.role || '')) return '/parent-portal'
        return '/dashboard'
      },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/desk/Dashboard.vue'),
    },
    // —— People routes (lists vs 360 profiles — do not mix) ——
    // Lists: /students · /people?tab=teachers|staff|parents
    // 360:   /students/:id · /teachers/:id · /staff/:id
    // Forms: /:module/new · /:module/:id/edit (catalogFormRoutes)
    {
      path: '/students',
      name: 'students',
      component: () => import('@/pages/students/Students.vue'),
    },
    // Static /new before /:id so "new" is never treated as a student id.
    {
      path: '/students/new',
      name: 'students-create',
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam('students'),
    },
    {
      path: '/students/:id/edit',
      name: 'students-edit',
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam('students'),
    },
    {
      path: '/students/:id',
      name: 'students-detail',
      component: () => import('@/pages/students/Student360.vue'),
    },
    {
      path: '/people',
      name: 'people',
      component: () => import('@/pages/people/People.vue'),
    },
    {
      path: '/teachers',
      name: 'teachers',
      redirect: { path: '/people', query: { tab: 'teachers' } },
    },
    {
      path: '/staff',
      name: 'staff',
      redirect: { path: '/people', query: { tab: 'staff' } },
    },
    {
      path: '/guardians',
      name: 'guardians',
      redirect: { path: '/people', query: { tab: 'parents' } },
    },
    {
      path: '/teachers/new',
      name: 'teachers-create',
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam('teachers'),
    },
    {
      path: '/teachers/:id/edit',
      name: 'teachers-edit',
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam('teachers'),
    },
    {
      path: '/teachers/:id',
      name: 'teachers-detail',
      component: () => import('@/pages/people/Teacher360.vue'),
    },
    {
      path: '/staff/new',
      name: 'staff-create',
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam('staff'),
    },
    {
      path: '/staff/:id/edit',
      name: 'staff-edit',
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam('staff'),
    },
    {
      path: '/staff/:id',
      name: 'staff-detail',
      component: () => import('@/pages/people/Staff360.vue'),
    },
    {
      path: '/classes',
      name: 'classes',
      component: () => import('@/pages/academics/Classes.vue'),
    },
    {
      path: '/classes/new',
      name: 'classes-create',
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam('classes'),
    },
    {
      path: '/classes/:id/edit',
      name: 'classes-edit',
      component: () => import('@/pages/shared/RecordForm.vue'),
      beforeEnter: withModuleParam('classes'),
    },
    detailRoute('classes', '/classes/:id', 'classes-detail'),
    // Sections (/programs) removed — send leftover links to Classes
    { path: '/programs', redirect: '/classes' },
    { path: '/programs/new', redirect: '/classes' },
    { path: '/programs/:id', redirect: '/classes' },
    { path: '/programs/:id/edit', redirect: '/classes' },
    { path: '/sections', redirect: '/classes' },
    { path: '/subjects', redirect: '/courses' },
    { path: '/subjects/:id', redirect: (to) => `/courses/${to.params.id}` },

    {
      path: '/attendance',
      name: 'attendance',
      component: () => import('@/pages/attendance/Attendance.vue'),
    },
    {
      path: '/attendance/take',
      name: 'attendance-take',
      redirect: { path: '/attendance', query: { tab: 'take' } },
    },
    {
      path: '/early-departures',
      redirect: { path: '/attendance', query: { tab: 'early' } },
    },
    {
      path: '/staff-attendance',
      redirect: { path: '/attendance', query: { tab: 'staff' } },
    },
    detailRoute('attendance', '/attendance/:id', 'attendance-detail'),
    {
      path: '/library',
      name: 'library',
      component: () => import('@/pages/campus/Library.vue'),
    },
    {
      path: '/library-books',
      redirect: { path: '/library', query: { tab: 'books' } },
    },
    {
      path: '/library-issues',
      redirect: { path: '/library', query: { tab: 'issues' } },
    },
    {
      path: '/transport',
      name: 'transport',
      component: () => import('@/pages/campus/Transport.vue'),
    },
    {
      path: '/transport-routes',
      redirect: { path: '/transport', query: { tab: 'routes' } },
    },
    {
      path: '/transport-vehicles',
      redirect: { path: '/transport', query: { tab: 'vehicles' } },
    },
    {
      path: '/meals',
      name: 'meals',
      component: () => import('@/pages/campus/Meals.vue'),
    },
    {
      path: '/meals-menus',
      redirect: { path: '/meals', query: { tab: 'menus' } },
    },
    {
      path: '/meal-attendance',
      redirect: { path: '/meals', query: { tab: 'attendance' } },
    },
    {
      path: '/dietary-requirements',
      redirect: { path: '/meals', query: { tab: 'dietary' } },
    },
    {
      path: '/health',
      name: 'health',
      component: () => import('@/pages/campus/Health.vue'),
    },
    {
      path: '/health-records',
      redirect: { path: '/health', query: { tab: 'records' } },
    },
    {
      path: '/clinic-visits',
      redirect: { path: '/health', query: { tab: 'clinic' } },
    },
    {
      path: '/safeguarding-incidents',
      redirect: { path: '/health', query: { tab: 'safeguarding' } },
    },
    {
      path: '/visitor-log',
      redirect: { path: '/health', query: { tab: 'visitors' } },
    },
    {
      path: '/discipline',
      name: 'discipline',
      component: () => import('@/pages/campus/Discipline.vue'),
    },
    {
      path: '/disciplinary-cases',
      redirect: { path: '/discipline', query: { tab: 'cases' } },
    },
    {
      path: '/positive-recognition',
      redirect: { path: '/discipline', query: { tab: 'recognition' } },
    },
    {
      path: '/student-log',
      redirect: { path: '/discipline', query: { tab: 'log' } },
    },
    {
      path: '/announcements',
      redirect: { path: '/communications', query: { tab: 'announcements' } },
    },
    {
      path: '/communications',
      name: 'communications',
      component: () => import('@/pages/communications/Communications.vue'),
    },
    {
      path: '/sms-messages',
      name: 'sms-messages',
      redirect: {
        path: '/communications',
        query: { tab: 'messages', channel: 'SMS' },
      },
    },
    {
      path: '/message-templates',
      name: 'message-templates',
      redirect: {
        path: '/communications',
        query: { tab: 'messages', channel: 'templates' },
      },
    },
    {
      path: '/parent-portal',
      name: 'parent-portal',
      component: () => import('@/pages/desk/ParentPortal.vue'),
    },
    {
      path: '/payment',
      name: 'payment-admin',
      component: () => import('@/pages/finance/PaymentAdmin.vue'),
    },
    {
      path: '/fees/offset',
      name: 'fees-offset',
      component: () => import('@/pages/finance/FeeOffset.vue'),
    },
    {
      path: '/fee-offsets',
      name: 'fee-offsets',
      redirect: '/fees/offset',
    },
    {
      path: '/payments',
      name: 'payments',
      redirect: { path: '/payment', query: { tab: 'ledger' } },
    },
    {
      path: '/gradebook',
      name: 'gradebook',
      component: () => import('@/pages/exams/Gradebook.vue'),
    },
    {
      path: '/exams',
      redirect: { path: '/gradebook', query: { tab: 'exams' } },
    },
    {
      path: '/exam-results',
      redirect: { path: '/gradebook', query: { tab: 'results' } },
    },
    {
      path: '/assessment-groups',
      redirect: { path: '/gradebook', query: { tab: 'settings' } },
    },
    {
      path: '/assessment-criteria',
      redirect: { path: '/gradebook', query: { tab: 'settings' } },
    },
    {
      path: '/grading-scales',
      redirect: { path: '/gradebook', query: { tab: 'settings' } },
    },
    {
      path: '/exam-settings',
      redirect: { path: '/gradebook', query: { tab: 'settings' } },
    },
    {
      path: '/report-cards',
      redirect: { path: '/documents', query: { kind: 'report-card' } },
    },
    {
      path: '/report-cards/:id',
      redirect: { path: '/documents', query: { kind: 'report-card' } },
    },
    {
      path: '/timetable',
      name: 'timetable',
      component: () => import('@/pages/academics/Timetable.vue'),
    },
    {
      path: '/periods',
      name: 'periods',
      redirect: { path: '/timetable', query: { view: 'periods' } },
    },
    {
      path: '/periods/new',
      redirect: { path: '/timetable', query: { view: 'periods' } },
    },
    {
      path: '/periods/:id/edit',
      redirect: { path: '/timetable', query: { view: 'periods' } },
    },
    {
      path: '/years-and-terms',
      name: 'years-and-terms',
      component: () => import('@/pages/academics/AcademicYearsTerms.vue'),
    },
    {
      path: '/academic-years',
      redirect: '/years-and-terms',
    },
    {
      path: '/academic-terms',
      redirect: '/years-and-terms',
    },
    {
      path: '/rooms',
      redirect: '/academics',
    },
    {
      path: '/batches',
      redirect: '/academics',
    },
    {
      path: '/admissions',
      name: 'admissions',
      component: () => import('@/pages/admissions/Admissions.vue'),
    },
    {
      path: '/applicants',
      name: 'applicants',
      redirect: { path: '/admissions', query: { tab: 'applications' } },
    },
    {
      path: '/applicants/new',
      redirect: { path: '/admissions', query: { tab: 'applications' } },
    },
    {
      path: '/waiting-list',
      redirect: { path: '/admissions', query: { tab: 'applications' } },
    },
    {
      path: '/waiting-list/new',
      redirect: { path: '/admissions', query: { tab: 'applications' } },
    },
    {
      path: '/waiting-list/:id',
      redirect: { path: '/admissions', query: { tab: 'applications' } },
    },
    {
      path: '/waiting-list/:id/edit',
      redirect: { path: '/admissions', query: { tab: 'applications' } },
    },
    {
      path: '/program-enrollments',
      redirect: { path: '/admissions', query: { tab: 'admissions' } },
    },
    {
      path: '/course-enrollments',
      redirect: { path: '/admissions', query: { tab: 'admissions' } },
    },
    {
      path: '/program-enrollments/:id',
      redirect: { path: '/admissions', query: { tab: 'admissions' } },
    },
    {
      path: '/course-enrollments/:id',
      redirect: { path: '/admissions', query: { tab: 'admissions' } },
    },
    {
      path: '/topics',
      redirect: '/study-coverage',
    },
    {
      path: '/topics/:id',
      redirect: (to) => `/study-coverage/${to.params.id}`,
    },
    {
      path: '/term-overview',
      name: 'term-overview',
      component: () => import('@/pages/desk/TermOverview.vue'),
    },
    {
      path: '/gantt',
      redirect: { path: '/term-overview', query: { view: 'gantt' } },
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/pages/campus/SchoolCalendar.vue'),
    },
    {
      path: '/school-events',
      name: 'school-events',
      redirect: '/calendar',
    },
    {
      path: '/school-events/list',
      name: 'school-events-list',
      component: () => import('@/pages/shared/MasterList.vue'),
      beforeEnter: withModuleParam('school-events'),
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/pages/reports/Reports.vue'),
    },
    {
      path: '/documents',
      name: 'documents',
      component: () => import('@/pages/documents/Documents.vue'),
    },
    {
      path: '/scan',
      name: 'document-scan',
      component: () => import('@/pages/documents/DocumentScan.vue'),
    },
    {
      path: '/school-setup',
      name: 'school-setup',
      component: () => import('@/pages/admin/SchoolSetup.vue'),
    },
    {
      path: '/school-cloud',
      redirect: '/communications',
    },
    {
      path: '/mail',
      redirect: '/communications',
    },
    {
      path: '/video',
      redirect: '/communications',
    },
    {
      path: '/drive',
      redirect: '/documents',
    },
    {
      path: '/office',
      redirect: '/documents',
    },
    {
      path: '/tasks',
      redirect: '/dashboard',
    },
    {
      path: '/forms',
      redirect: '/admissions',
    },
    {
      path: '/activity-log',
      name: 'activity-log',
      component: () => import('@/pages/admin/ActivityLog.vue'),
    },
    {
      path: '/activity-log/:kind(activity|audit)/:id',
      name: 'activity-detail',
      component: () => import('@/pages/admin/ActivityDetail.vue'),
    },
    {
      path: '/audit-logs',
      name: 'audit-logs',
      redirect: { path: '/activity-log', query: { tab: 'audit' } },
    },
    {
      path: '/audit-logs/:id',
      name: 'audit-logs-detail',
      redirect: (to) => `/activity-log/audit/${to.params.id}`,
    },
    {
      path: '/academics',
      name: 'academics',
      component: () => import('@/pages/academics/Academics.vue'),
    },
    {
      path: '/nursery-activities',
      redirect: {
        path: '/academics',
        query: { section: 'nursery', tool: 'nursery-activities' },
      },
    },
    {
      path: '/nursery-observations',
      redirect: {
        path: '/academics',
        query: { section: 'nursery', tool: 'nursery-observations' },
      },
    },
    {
      path: '/nursery-development',
      redirect: {
        path: '/academics',
        query: { section: 'nursery', tool: 'nursery-development' },
      },
    },
    {
      path: '/schemes-of-work',
      redirect: {
        path: '/academics',
        query: { section: 'primary', tool: 'schemes-of-work' },
      },
    },
    {
      path: '/homework',
      redirect: {
        path: '/academics',
        query: { section: 'all', tool: 'homework' },
      },
    },
    {
      path: '/lesson-plans',
      redirect: {
        path: '/academics',
        query: { section: 'all', tool: 'lesson-plans' },
      },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('@/pages/inventory/Inventory.vue'),
    },
    {
      path: '/inventory-items',
      redirect: { path: '/inventory', query: { tab: 'items' } },
    },
    {
      path: '/inventory-stock',
      redirect: { path: '/inventory', query: { tab: 'stock' } },
    },
    {
      path: '/inventory-issues',
      redirect: { path: '/inventory', query: { tab: 'issues' } },
    },
    {
      path: '/purchase-requests',
      redirect: { path: '/inventory', query: { tab: 'requests' } },
    },
    {
      path: '/assets',
      name: 'assets-list',
      redirect: { path: '/inventory', query: { tab: 'assets' } },
    },
    {
      path: '/permissions',
      redirect: { path: '/users', query: { tab: 'roles' } },
    },
    {
      path: '/roles',
      redirect: { path: '/users', query: { tab: 'roles' } },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/pages/admin/Users.vue'),
    },
    {
      path: '/users/:id',
      name: 'user-detail',
      component: () => import('@/pages/admin/UserProfile.vue'),
    },
    {
      path: '/me',
      name: 'me',
      component: () => import('@/pages/admin/UserProfile.vue'),
    },
    { path: '/profile', redirect: '/me' },
    ...catalogFormRoutes,
    ...catalogDetailRoutes,
    ...catalogListRoutes,
    {
      path: '/:path(.*)*',
      name: 'not-found',
      component: () => import('@/pages/shared/NotFound.vue'),
    },
  ],
})

router.beforeEach((to) => {
  refreshAuthSession()

  const publicRoute = to.meta.public === true || to.name === 'login'
  if (!isAuthenticated.value && !publicRoute) {
    const redirect =
      to.fullPath !== '/' &&
      to.name !== 'home' &&
      isSafeInternalPath(to.fullPath)
        ? to.fullPath
        : undefined
    return {
      name: 'login',
      query: redirect ? { redirect } : undefined,
    }
  }

  const isParent = isParentRole(authSession.value?.role || '')
  if (isAuthenticated.value && to.name === 'login') {
    const fallback = isParent ? '/parent-portal' : '/dashboard'
    const redirect = isSafeInternalPath(to.query.redirect)
      ? String(to.query.redirect)
      : fallback
    return { path: redirect }
  }

  if (isParent && !isParentAllowedPath(to.path)) {
    return { path: '/parent-portal' }
  }

  // Desk RBAC — hide / block modules the role cannot read
  if (
    isAuthenticated.value &&
    !isParent &&
    to.name !== 'login' &&
    to.name !== 'not-found' &&
    to.meta.public !== true &&
    to.path !== '/dashboard' &&
    to.path !== '/me' &&
    !canAccessPath(to.fullPath, 'read')
  ) {
    return { path: '/dashboard', query: { denied: '1' } }
  }

  return true
})
