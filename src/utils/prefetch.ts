/** Warm common route chunks after first paint so navigation feels instant. */
export function prefetchCorePages() {
  const loaders = [
    () => import('../pages/Dashboard.vue'),
    () => import('../pages/Students.vue'),
    () => import('../pages/Student360.vue'),
    () => import('../pages/MasterList.vue'),
    () => import('../pages/RecordDetail.vue'),
    () => import('../pages/Users.vue'),
    () => import('../pages/UserProfile.vue'),
    () => import('../pages/ActivityLog.vue'),
    () => import('../pages/Announcements.vue'),
    () => import('../pages/Reports.vue'),
  ]

  for (const load of loaders) {
    void load().catch(() => {
      /* ignore prefetch failures */
    })
  }
}

export function schedulePrefetch() {
  const run = () => prefetchCorePages()
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2500 })
  } else {
    setTimeout(run, 900)
  }
}
