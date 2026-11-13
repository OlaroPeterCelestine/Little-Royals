import { apiRequest, type ApiMeta } from './http'

export type CatalogRow = {
  id: string
  name: string
  status?: string
  [key: string]: string | number | boolean | null | undefined
}

export type ListResult<T> = {
  items: T[]
  meta?: ApiMeta
}

/** Frontend desk catalog modules backed by the school API. */
export const FRONTEND_MODULES = [
  'students',
  'teachers',
  'guardians',
  'classes',
  'programs',
  'courses',
  'topics',
  'rooms',
  'batches',
  'attendance',
  'timetable',
  'exams',
  'applicants',
  'admissions',
  'fees',
  'assets',
  'homework',
  'payments',
  'gradebook',
  'expenses',
  'hostel',
  'payroll',
] as const

export type FrontendModule = (typeof FRONTEND_MODULES)[number]

function normalizeList<T>(data: T[] | { items?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.items)) return data.items
  return []
}

export function createCatalogService(module: string) {
  const base = `/api/v1/${module}`

  return {
    module,

    async list(params?: { page?: number; limit?: number }): Promise<ListResult<CatalogRow>> {
      const q = new URLSearchParams()
      if (params?.page) q.set('page', String(params.page))
      if (params?.limit) q.set('limit', String(params.limit))
      const qs = q.toString()
      const { data, meta } = await apiRequest<CatalogRow[] | { items: CatalogRow[] }>(
        `${base}${qs ? `?${qs}` : ''}`,
      )
      return { items: normalizeList(data), meta }
    },

    async get(id: string): Promise<CatalogRow> {
      const { data } = await apiRequest<CatalogRow>(`${base}/${encodeURIComponent(id)}`)
      return data
    },

    async create(body: Partial<CatalogRow> & { name: string }): Promise<CatalogRow> {
      const { data } = await apiRequest<CatalogRow>(base, { method: 'POST', body })
      return data
    },

    async update(id: string, body: Partial<CatalogRow>): Promise<CatalogRow> {
      const { data } = await apiRequest<CatalogRow>(`${base}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body,
      })
      return data
    },

    async remove(id: string): Promise<void> {
      await apiRequest(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  }
}

export type CatalogService = ReturnType<typeof createCatalogService>
