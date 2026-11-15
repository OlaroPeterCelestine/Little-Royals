import { ensureModule, moduleFromPath } from '@/data/catalog/catalogSync'

/** Path → lazy page loader. Warm these after paint / on sidebar hover. */
const ROUTE_LOADERS: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/desk/Dashboard.vue'),
  '/students': () => import('@/pages/students/Students.vue'),
  '/people': () => import('@/pages/people/People.vue'),
  '/classes': () => import('@/pages/academics/Classes.vue'),
  '/payment': () => import('@/pages/finance/PaymentAdmin.vue'),
  '/payments': () => import('@/pages/finance/PaymentAdmin.vue'),
  '/gradebook': () => import('@/pages/exams/Gradebook.vue'),
  '/attendance': () => import('@/pages/attendance/Attendance.vue'),
  '/admissions': () => import('@/pages/admissions/Admissions.vue'),
  '/applicants': () => import('@/pages/admissions/Admissions.vue'),
  '/library': () => import('@/pages/campus/Library.vue'),
  '/transport': () => import('@/pages/campus/Transport.vue'),
  '/meals': () => import('@/pages/campus/Meals.vue'),
  '/health': () => import('@/pages/campus/Health.vue'),
  '/discipline': () => import('@/pages/campus/Discipline.vue'),
  '/inventory': () => import('@/pages/inventory/Inventory.vue'),
  '/activity-log': () => import('@/pages/admin/ActivityLog.vue'),
  '/term-overview': () => import('@/pages/desk/TermOverview.vue'),
  '/documents': () => import('@/pages/documents/Documents.vue'),
  '/academics': () => import('@/pages/academics/Academics.vue'),
  '/timetable': () => import('@/pages/academics/Timetable.vue'),
  '/communications': () => import('@/pages/communications/Communications.vue'),
  '/reports': () => import('@/pages/reports/Reports.vue'),
  '/users': () => import('@/pages/admin/Users.vue'),
  '/school-setup': () => import('@/pages/admin/SchoolSetup.vue'),
  '/school-cloud': () => import('@/pages/admin/SchoolCloud.vue'),
}

const warmed = new Set<string>()

function normalizePath(path: string) {
  const base = String(path || '').split('?')[0].replace(/\/$/, '') || '/'
  return base
}

/** Prefetch a desk route chunk + its module data (safe to call often). */
export function prefetchRoute(path?: string) {
  if (!path) return
  const base = normalizePath(path)
  const mod = moduleFromPath(base)
  if (mod) void ensureModule(mod)

  if (warmed.has(base)) return
  const load = ROUTE_LOADERS[base]
  if (!load) {
    // Still warm shared list shells for catalog routes.
    if (base !== '/' && base !== '/login') {
      warmed.add(base)
      void import('@/pages/shared/MasterList.vue').catch(() => {
        warmed.delete(base)
      })
    }
    return
  }
  warmed.add(base)
  void load().catch(() => {
    warmed.delete(base)
  })
}

/** Warm only the most-used route chunks after first paint. */
export function prefetchCorePages() {
  const core = [
    '/dashboard',
    '/students',
    '/people',
    '/payment',
    '/attendance',
    '/gradebook',
    '/reports',
    '/users',
    () => import('@/pages/shared/MasterList.vue'),
    () => import('@/pages/shared/RecordDetail.vue'),
  ] as const

  for (const item of core) {
    if (typeof item === 'string') prefetchRoute(item)
    else
      void item().catch(() => {
        /* ignore prefetch failures */
      })
  }
}

export function schedulePrefetch() {
  const run = () => prefetchCorePages()
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 1800 })
  } else {
    setTimeout(run, 600)
  }
}
