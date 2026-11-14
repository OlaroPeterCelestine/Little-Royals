import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

const FROM_KEY = 'from'

function isSafeInternalPath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
}

/** Navigate while remembering where to return (Back). */
export function pushWithReturn(
  router: ReturnType<typeof useRouter>,
  to: RouteLocationRaw,
  returnTo?: string,
) {
  const from =
    returnTo ||
    router.currentRoute.value.fullPath ||
    router.currentRoute.value.path
  if (typeof to === 'string') {
    const url = new URL(to, 'http://local')
    if (!url.searchParams.has(FROM_KEY) && isSafeInternalPath(from)) {
      url.searchParams.set(FROM_KEY, from)
    }
    return router.push(`${url.pathname}${url.search}${url.hash}`)
  }
  const query = { ...(to.query || {}) } as Record<string, unknown>
  if (!query[FROM_KEY] && isSafeInternalPath(from)) query[FROM_KEY] = from
  return router.push({ ...to, query: query as Record<string, string> })
}

/**
 * Back navigation for detail / nested pages.
 * Prefers `?from=`, then browser history, then a fallback list path.
 */
export function useAppBack(fallback: string | (() => string) = '/') {
  const route = useRoute()
  const router = useRouter()

  const returnTo = computed(() => {
    const from = route.query[FROM_KEY]
    return isSafeInternalPath(from) ? from : ''
  })

  const canUseHistory = computed(() => {
    if (returnTo.value) return true
    return typeof window !== 'undefined' && window.history.length > 1
  })

  function resolveFallback() {
    return typeof fallback === 'function' ? fallback() : fallback
  }

  function goBack() {
    if (returnTo.value) {
      router.push(returnTo.value)
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(resolveFallback())
  }

  const backLabel = computed(() => {
    const from = returnTo.value || resolveFallback()
    if (from.includes('/term-overview')) return 'Back to term overview'
    if (from.includes('/calendar') || from.includes('/school-events'))
      return 'Back to calendar'
    if (from.startsWith('/students')) return 'Back to students'
    if (from.startsWith('/people')) return 'Back to people'
    if (from.startsWith('/gradebook')) return 'Back to exams'
    if (from.startsWith('/attendance')) return 'Back to attendance'
    if (from.startsWith('/payment')) return 'Back to payments'
    return 'Back'
  })

  return {
    returnTo,
    canUseHistory,
    goBack,
    backLabel,
  }
}
