import { authToken } from '../data/auth'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(
  /\/$/,
  '',
)

export type ApiMeta = {
  page?: number
  limit?: number
  total?: number
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
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: ApiMeta }> {
  const { method = 'GET', body, auth = true } = options
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (auth) {
    const token = options.token ?? authToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
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

  return {
    data: (payload?.data as T) ?? (null as T),
    meta: payload?.meta,
  }
}
