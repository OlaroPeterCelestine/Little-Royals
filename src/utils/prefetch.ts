/** Path → lazy page loader. Warm these after paint / on sidebar hover. */
const ROUTE_LOADERS: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('../pages/Dashboard.vue'),
  '/students': () => import('../pages/Students.vue'),
  '/people': () => import('../pages/People.vue'),
  '/classes': () => import('../pages/Classes.vue'),
  '/payment': () => import('../pages/PaymentAdmin.vue'),
  '/payments': () => import('../pages/PaymentAdmin.vue'),
  '/gradebook': () => import('../pages/Gradebook.vue'),
  '/attendance': () => import('../pages/Attendance.vue'),
  '/library': () => import('../pages/Library.vue'),
  '/transport': () => import('../pages/Transport.vue'),
  '/meals': () => import('../pages/Meals.vue'),
  '/health': () => import('../pages/Health.vue'),
  '/discipline': () => import('../pages/Discipline.vue'),
  '/inventory': () => import('../pages/Inventory.vue'),
  '/activity-log': () => import('../pages/ActivityLog.vue'),
  '/term-overview': () => import('../pages/TermOverview.vue'),
  '/documents': () => import('../pages/Documents.vue'),
  '/academics': () => import('../pages/Academics.vue'),
  '/timetable': () => import('../pages/Timetable.vue'),
  '/communications': () => import('../pages/Communications.vue'),
}

const warmed = new Set<string>()

function normalizePath(path: string) {
  const base = String(path || '').split('?')[0].replace(/\/$/, '') || '/'
  return base
}

/** Prefetch a desk route chunk (safe to call often). */
export function prefetchRoute(path?: string) {
  if (!path) return
  const base = normalizePath(path)
  if (warmed.has(base)) return
  const load = ROUTE_LOADERS[base]
  if (!load) return
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
    () => import('../pages/MasterList.vue'),
    () => import('../pages/RecordDetail.vue'),
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
