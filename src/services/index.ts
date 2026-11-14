import { apiRequest } from './http'
import {
  createCatalogService,
  FRONTEND_MODULES,
  type CatalogService,
  type FrontendModule,
} from './catalog'

export { API_BASE, ApiError, apiRequest } from './http'
export {
  createCatalogService,
  FRONTEND_MODULES,
  type CatalogRow,
  type CatalogService,
  type FrontendModule,
  type ListResult,
} from './catalog'

/** CRUD service for every desk module (list / get / create / update / remove). */
export const catalogServices = Object.fromEntries(
  FRONTEND_MODULES.map((module) => [module, createCatalogService(module)]),
) as Record<FrontendModule, CatalogService>

export const academicTermsService = catalogServices['academic-terms']
export const academicYearsService = catalogServices['academic-years']
export const admissionsService = catalogServices['admissions']
export const alumniService = catalogServices['alumni']
export const applicantsService = catalogServices['applicants']
export const assessmentCriteriaService = catalogServices['assessment-criteria']
export const assessmentGroupsService = catalogServices['assessment-groups']
export const assetsService = catalogServices['assets']
export const attendanceService = catalogServices['attendance']
export const auditLogsService = catalogServices['audit-logs']
export const batchesService = catalogServices['batches']
export const bursariesService = catalogServices['bursaries']
export const campusesService = catalogServices['campuses']
export const classesService = catalogServices['classes']
export const clinicVisitsService = catalogServices['clinic-visits']
export const clubsService = catalogServices['clubs']
export const courseEnrollmentsService = catalogServices['course-enrollments']
export const coursesService = catalogServices['courses']
export const curriculumService = catalogServices['curriculum']
export const departmentsService = catalogServices['departments']
export const dietaryRequirementsService = catalogServices['dietary-requirements']
export const disciplinaryCasesService = catalogServices['disciplinary-cases']
export const discountsService = catalogServices['discounts']
export const earlyDeparturesService = catalogServices['early-departures']
export const examResultsService = catalogServices['exam-results']
export const examSettingsService = catalogServices['exam-settings']
export const examsService = catalogServices['exams']
export const expensesService = catalogServices['expenses']
export const feeCategoriesService = catalogServices['fee-categories']
export const feeSchedulesService = catalogServices['fee-schedules']
export const feeStructuresService = catalogServices['fee-structures']
export const feesService = catalogServices['fees']
export const gradebookService = catalogServices['gradebook']
export const gradingScalesService = catalogServices['grading-scales']
export const guardiansService = catalogServices['guardians']
export const healthRecordsService = catalogServices['health-records']
export const homeworkService = catalogServices['homework']
export const hostelService = catalogServices['hostel']
export const inventoryIssuesService = catalogServices['inventory-issues']
export const inventoryItemsService = catalogServices['inventory-items']
export const inventoryStockService = catalogServices['inventory-stock']
export const invoicesService = catalogServices['invoices']
export const lessonPlansService = catalogServices['lesson-plans']
export const libraryBooksService = catalogServices['library-books']
export const libraryIssuesService = catalogServices['library-issues']
export const mealAttendanceService = catalogServices['meal-attendance']
export const mealsMenusService = catalogServices['meals-menus']
export const messageTemplatesService = catalogServices['message-templates']
export const nurseryActivitiesService = catalogServices['nursery-activities']
export const nurseryDevelopmentService = catalogServices['nursery-development']
export const nurseryObservationsService = catalogServices['nursery-observations']
export const paymentsService = catalogServices['payments']
export const payrollService = catalogServices['payroll']
export const periodsService = catalogServices['periods']
export const positiveRecognitionService = catalogServices['positive-recognition']
export const programEnrollmentsService = catalogServices['program-enrollments']
export const programsService = catalogServices['programs']
export const refundsService = catalogServices['refunds']
export const reportCardsService = catalogServices['report-cards']
export const roomsService = catalogServices['rooms']
export const safeguardingIncidentsService = catalogServices['safeguarding-incidents']
export const schemesOfWorkService = catalogServices['schemes-of-work']
export const scholarshipsService = catalogServices['scholarships']
export const schoolEventsService = catalogServices['school-events']
export const smsMessagesService = catalogServices['sms-messages']
export const staffService = catalogServices['staff']
export const staffAttendanceService = catalogServices['staff-attendance']
export const staffLeaveService = catalogServices['staff-leave']
export const studentCategoriesService = catalogServices['student-categories']
export const studentLogService = catalogServices['student-log']
export const studentsService = catalogServices['students']
export const teachersService = catalogServices['teachers']
export const timetableService = catalogServices['timetable']
export const topicsService = catalogServices['topics']
export const transportRoutesService = catalogServices['transport-routes']
export const transportVehiclesService = catalogServices['transport-vehicles']
export const visitorLogService = catalogServices['visitor-log']
export const waitingListService = catalogServices['waiting-list']

/** Typed API aliases that differ from desk catalog keys. */
export const parentsService = createCatalogService('parents')
export const subjectsService = createCatalogService('subjects')
export const usersService = createCatalogService('users')

export function serviceFor(module: string): CatalogService {
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
