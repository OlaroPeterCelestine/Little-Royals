import { authToken } from '@/data/auth/auth'
import { apiBaseUrl, isApiEnabled } from '@/lib/apiMode'

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

const GET_CACHE_TTL_MS = 8_000
const getCache = new Map<string, { at: number; value: { data: unknown; meta?: ApiMeta } }>()

function cacheKey(path: string, token: string | null) {
  return `${token || ''}:${path}`
}

/** Drop client GET cache (call after writes). */
export function clearApiGetCache() {
  getCache.clear()
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: ApiMeta }> {
  if (!isApiEnabled() || !API_BASE) {
    throw new ApiError(503, 'School API is disabled — desk is running offline')
  }

  const { method = 'GET', body, auth = true, bustCache = false, signal } = options
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const token: string | null = auth
    ? (options.token ?? authToken() ?? null)
    : null
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  const isGet = method.toUpperCase() === 'GET'
  if (isGet && !bustCache) {
    const key = cacheKey(path, token)
    const hit = getCache.get(key)
    if (hit && Date.now() - hit.at < GET_CACHE_TTL_MS) {
      return hit.value as { data: T; meta?: ApiMeta }
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await res.json()) as ApiEnvelope<T>
  } catch {
    payload = null
  }

  if (!res.ok || payload?.ok === false) {
    throw new ApiError(res.status, payload?.error || res.statusText || 'request failed')
  }

  const result = {
    data: (payload?.data as T) ?? (null as T),
    meta: payload?.meta,
  }

  if (isGet) {
    getCache.set(cacheKey(path, token), { at: Date.now(), value: result })
    // Bound memory — drop oldest when large.
    if (getCache.size > 80) {
      const first = getCache.keys().next().value
      if (first) getCache.delete(first)
    }
  } else {
    clearApiGetCache()
  }

  return result
}
