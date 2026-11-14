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

/** All frontend desk catalog modules with list/get/create/update/delete API services. */
export const FRONTEND_MODULES = [
  'academic-terms',
  'academic-years',
  'admissions',
  'alumni',
  'applicants',
  'assessment-criteria',
  'assessment-groups',
  'assets',
  'attendance',
  'audit-logs',
  'batches',
  'bursaries',
  'campuses',
  'classes',
  'clinic-visits',
  'clubs',
  'course-enrollments',
  'courses',
  'curriculum',
  'departments',
  'dietary-requirements',
  'disciplinary-cases',
  'discounts',
  'early-departures',
  'exam-results',
  'exam-settings',
  'exams',
  'expenses',
  'fee-categories',
  'fee-offsets',
  'fee-schedules',
  'fee-structures',
  'fees',
  'gradebook',
  'grading-scales',
  'guardians',
  'health-records',
  'homework',
  'hostel',
  'inventory-issues',
  'inventory-items',
  'inventory-stock',
  'invoices',
  'lesson-plans',
  'library-books',
  'library-issues',
  'meal-attendance',
  'meals-menus',
  'message-templates',
  'nursery-activities',
  'nursery-development',
  'nursery-observations',
  'payments',
  'payroll',
  'periods',
  'positive-recognition',
  'program-enrollments',
  'programs',
  'refunds',
  'report-cards',
  'rooms',
  'safeguarding-incidents',
  'schemes-of-work',
  'scholarships',
  'school-events',
  'sms-messages',
  'staff',
  'staff-attendance',
  'staff-leave',
  'student-categories',
  'student-log',
  'students',
  'teachers',
  'timetable',
  'topics',
  'transport-routes',
  'transport-vehicles',
  'visitor-log',
  'waiting-list',
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
