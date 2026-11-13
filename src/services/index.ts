import { apiRequest } from './http'
import { createCatalogService, FRONTEND_MODULES, type FrontendModule } from './catalog'

export { API_BASE, ApiError, apiRequest } from './http'
export {
  createCatalogService,
  FRONTEND_MODULES,
  type CatalogRow,
  type CatalogService,
  type FrontendModule,
  type ListResult,
} from './catalog'

/** Typed school entities that use dedicated API models. */
export const studentsService = createCatalogService('students')
export const teachersService = createCatalogService('teachers')
export const guardiansService = createCatalogService('guardians')
export const classesService = createCatalogService('classes')
export const programsService = createCatalogService('programs')
export const coursesService = createCatalogService('courses')
export const topicsService = createCatalogService('topics')
export const roomsService = createCatalogService('rooms')
export const batchesService = createCatalogService('batches')
export const attendanceService = createCatalogService('attendance')
export const timetableService = createCatalogService('timetable')
export const examsService = createCatalogService('exams')
export const applicantsService = createCatalogService('applicants')
export const admissionsService = createCatalogService('admissions')
export const feesService = createCatalogService('fees')
export const assetsService = createCatalogService('assets')
export const homeworkService = createCatalogService('homework')
export const paymentsService = createCatalogService('payments')
export const gradebookService = createCatalogService('gradebook')
export const expensesService = createCatalogService('expenses')
export const hostelService = createCatalogService('hostel')
export const payrollService = createCatalogService('payroll')

/** Extra typed desk resources (not in the 22-row catalog object). */
export const staffService = createCatalogService('staff')
export const parentsService = createCatalogService('parents')
export const subjectsService = createCatalogService('subjects')
export const invoicesService = createCatalogService('invoices')
export const usersService = createCatalogService('users')

export const catalogServices: Record<FrontendModule, ReturnType<typeof createCatalogService>> = {
  students: studentsService,
  teachers: teachersService,
  guardians: guardiansService,
  classes: classesService,
  programs: programsService,
  courses: coursesService,
  topics: topicsService,
  rooms: roomsService,
  batches: batchesService,
  attendance: attendanceService,
  timetable: timetableService,
  exams: examsService,
  applicants: applicantsService,
  admissions: admissionsService,
  fees: feesService,
  assets: assetsService,
  homework: homeworkService,
  payments: paymentsService,
  gradebook: gradebookService,
  expenses: expensesService,
  hostel: hostelService,
  payroll: payrollService,
}

export function serviceFor(module: string) {
  if ((FRONTEND_MODULES as readonly string[]).includes(module)) {
    return catalogServices[module as FrontendModule]
  }
  return createCatalogService(module)
}

export async function listApiModules(): Promise<string[]> {
  const { data } = await apiRequest<string[]>('/api/v1/modules')
  return Array.isArray(data) ? data : []
}

export async function getSchoolProfile<T = Record<string, unknown>>(): Promise<T> {
  const { data } = await apiRequest<T>('/api/v1/school')
  return data
}

export const notificationsService = {
  async list() {
    const { data } = await apiRequest('/api/v1/notifications')
    return data
  },
  async markRead(id: string) {
    await apiRequest(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      body: {},
    })
  },
}
