import { authToken } from '@/data/auth/auth'
import { apiBaseUrl, isApiEnabled } from '@/lib/apiMode'

/** Live base URL (re-read so HMR / env changes apply). */
export function getApiBase() {
  return apiBaseUrl()
}

/** @deprecated use getApiBase() — kept for older imports */
export const API_BASE = apiBaseUrl()

export type ApiMeta = {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  hasNext?: boolean
  hasPrev?: boolean
}

export type ApiEnvelope<T> = {
  ok: boolean
  data?: T
  meta?: ApiMeta
  error?: string
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
  auth?: boolean
  /** Skip short client GET cache. */
  bustCache?: boolean
  signal?: AbortSignal
}

/** Fresh window — return without network (WhatsApp-snappy lists). */
const GET_FRESH_MS = 12_000
/** Stale-while-revalidate window — return instantly, refresh in background. */
const GET_STALE_MS = 10 * 60_000

type CacheEntry = {
  at: number
  etag?: string
  value: { data: unknown; meta?: ApiMeta }
}

const getCache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<{ data: unknown; meta?: ApiMeta }>>()
const cacheListeners = new Set<(path: string, value: { data: unknown; meta?: ApiMeta }) => void>()

function cacheKey(path: string, token: string | null) {
  return `${token || ''}:${path}`
}

/** Subscribe to GET cache writes (SWR background refresh → live store). */
export function onApiGetCacheUpdate(
  fn: (path: string, value: { data: unknown; meta?: ApiMeta }) => void,
) {
  cacheListeners.add(fn)
  return () => cacheListeners.delete(fn)
}

function notifyCacheUpdate(path: string, value: { data: unknown; meta?: ApiMeta }) {
  cacheListeners.forEach((fn) => {
    try {
      fn(path, value)
    } catch {
      /* ignore listener errors */
    }
  })
}

/** Drop all client GET cache (call after writes). */
export function clearApiGetCache() {
  getCache.clear()
}

/** Drop GET cache entries whose path contains the given fragment. */
export function clearApiGetCacheFor(pathFragment: string) {
  const needle = pathFragment.toLowerCase()
  for (const key of [...getCache.keys()]) {
    if (key.toLowerCase().includes(needle)) getCache.delete(key)
  }
}

function storeGet(
  key: string,
  value: { data: unknown; meta?: ApiMeta },
  etag: string | undefined,
  path: string,
  notify: boolean,
) {
  getCache.set(key, { at: Date.now(), etag, value })
  if (getCache.size > 120) {
    const first = getCache.keys().next().value
    if (first) getCache.delete(first)
  }
  if (notify) notifyCacheUpdate(path, value)
}

async function fetchOnce<T>(
  path: string,
  options: RequestOptions,
  token: string | null,
  etag?: string,
): Promise<{ data: T; meta?: ApiMeta; etag?: string; notModified?: boolean }> {
  const base = getApiBase()
  const { method = 'GET', body, signal } = options
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (etag) {
    headers['If-None-Match'] = etag
  }

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    // Prefer reused connections; small CRUD feels closer to local.
    keepalive: method.toUpperCase() !== 'GET',
  })

  if (res.status === 304) {
    return { data: null as T, meta: undefined, etag, notModified: true }
  }

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await res.json()) as ApiEnvelope<T>
  } catch {
    payload = null
  }

  if (!res.ok || payload?.ok === false) {
    throw new ApiError(res.status, payload?.error || res.statusText || 'request failed')
  }

  return {
    data: (payload?.data as T) ?? (null as T),
    meta: payload?.meta,
    etag: res.headers.get('ETag') || undefined,
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: ApiMeta }> {
  // Empty base = same-origin (VPS nginx proxies /api → Go). Only disable when the flag is off.
  if (!isApiEnabled()) {
    throw new ApiError(503, 'School API is disabled — desk is running offline')
  }
  const base = getApiBase()

  const { method = 'GET', auth = true, bustCache = false } = options
  const token: string | null = auth
    ? (options.token ?? authToken() ?? null)
    : null

  const isGet = method.toUpperCase() === 'GET'
  const key = cacheKey(path, token)

  if (isGet && !bustCache) {
    const hit = getCache.get(key)
    const age = hit ? Date.now() - hit.at : Number.POSITIVE_INFINITY
    if (hit && age < GET_FRESH_MS) {
      return hit.value as { data: T; meta?: ApiMeta }
    }
    if (hit && age < GET_STALE_MS) {
      // Stale-while-revalidate: paint instantly, refresh quietly.
      if (!inflight.has(key)) {
        const p = fetchOnce<T>(path, options, token, hit.etag)
          .then((fresh) => {
            if (fresh.notModified) {
              storeGet(key, hit.value, hit.etag, path, false)
              return hit.value
            }
            const next = { data: fresh.data, meta: fresh.meta }
            storeGet(key, next, fresh.etag, path, true)
            return next
          })
          .catch(() => hit.value)
          .finally(() => {
            inflight.delete(key)
          })
        inflight.set(key, p)
      }
      return hit.value as { data: T; meta?: ApiMeta }
    }
  }

  if (isGet && inflight.has(key) && !bustCache) {
    return (await inflight.get(key)!) as { data: T; meta?: ApiMeta }
  }

  const hit = isGet ? getCache.get(key) : undefined
  const run = fetchOnce<T>(path, options, token, bustCache ? undefined : hit?.etag)
    .then((fresh) => {
      if (fresh.notModified && hit) {
        storeGet(key, hit.value, hit.etag, path, false)
        return hit.value as { data: T; meta?: ApiMeta }
      }
      const next = { data: fresh.data as T, meta: fresh.meta }
      if (isGet) storeGet(key, next, fresh.etag, path, true)
      else {
        // Only drop related GETs — wiping the whole cache made every CRUD feel slow.
        const basePath = path.split('?')[0].replace(/\/[0-9a-f-]{36}$/i, '')
        clearApiGetCacheFor(basePath)
      }
      return next
    })
    .finally(() => {
      if (isGet) inflight.delete(key)
    })

  if (isGet) inflight.set(key, run as Promise<{ data: unknown; meta?: ApiMeta }>)
  return run
}

