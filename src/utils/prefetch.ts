/** Warm only the most-used route chunks after first paint. */
export function prefetchCorePages() {
  const loaders = [
    () => import('../pages/Students.vue'),
    () => import('../pages/MasterList.vue'),
    () => import('../pages/RecordDetail.vue'),
    () => import('../pages/Payments.vue'),
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
