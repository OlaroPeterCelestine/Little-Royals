import {
  canCurrentUser,
  documentTypes,
  isFullAccessRole,
  type PermFlag,
} from '@/data/auth/permissions'
import { currentUser } from '@/data/activity/activity'
import { normalizeRole } from '@/data/auth/roles'
import type { NavGroup } from '@/data/school/workspace'
import { modulesForDeskPath } from '@/data/school/deskLinks'

/**
 * Map a desk path (and optional query) to catalog modules that gate visibility.
 * Empty array = allowed for any signed-in desk user.
 */
export function modulesForPath(pathWithQuery: string): string[] {
  const [rawPath, qs] = String(pathWithQuery || '').split('?')
  const path = rawPath.replace(/\/$/, '') || '/'
  const segments = path.split('/').filter(Boolean)
  const root = segments[0] || ''
  const params = new URLSearchParams(qs || '')
  const tab = params.get('tab')

  if (!root || root === 'me' || root === 'profile' || root === 'dashboard') {
    return []
  }

  if (root === 'people') {
    if (tab === 'staff' || tab === 'employees') return ['staff']
    if (tab === 'parents' || tab === 'guardians' || tab === 'parent')
      return ['guardians']
    if (tab === 'teachers' || tab === 'teacher') return ['teachers']
    return ['teachers', 'staff', 'guardians']
  }

  if (root === 'fees' && segments[1] === 'offset') return ['fees']

  const deskModules = modulesForDeskPath(path)
  if (deskModules) return deskModules

  const special: Record<string, string[]> = {
    'term-overview': ['academic-terms', 'school-events', 'exams', 'gradebook'],
    'years-and-terms': ['academic-years', 'academic-terms'],
    'academic-years': ['academic-years'],
    'academic-terms': ['academic-terms'],
    gradebook: ['gradebook', 'exams'],
    academics: [
      'lesson-plans',
      'homework',
      'schemes-of-work',
      'nursery-activities',
      'nursery-observations',
      'nursery-development',
    ],
    inventory: [
      'inventory-items',
      'inventory-stock',
      'inventory-issues',
      'purchase-requests',
      'assets',
    ],
    'inventory-items': ['inventory-items'],
    'inventory-stock': ['inventory-stock'],
    'inventory-issues': ['inventory-issues'],
    'purchase-requests': ['purchase-requests'],
    assets: ['assets'],
    communications: ['sms-messages'],
    calendar: ['school-events'],
    'school-events': ['school-events'],
    scan: ['applicants'],
    payment: ['payments'],
    payments: ['payments'],
    alumni: ['students'],
    courses: ['courses'],
    subjects: ['courses'],
    timetable: ['timetable', 'periods'],
    periods: ['periods', 'timetable'],
    users: ['users'],
    permissions: ['users'],
    roles: ['users'],
    'school-setup': ['users'],
    'school-cloud': ['users'],
    'activity-log': ['audit-logs'],
    'audit-logs': ['audit-logs'],
    documents: ['__any_print__'],
    reports: ['students', 'fees', 'exam-results', 'attendance'],
    'parent-portal': ['fees', 'exam-results', 'attendance', 'sms-messages'],
    'report-cards': ['students', 'exam-results'],
    'staff-directory': ['staff'],
  }

  if (root in special) return special[root]

  // /students/:id → students, /teachers/:id → teachers, etc.
  return [root]
}

export function canAccessPath(
  pathWithQuery: string,
  flag: PermFlag = 'read',
): boolean {
  const role = normalizeRole(currentUser.role) || currentUser.role
  if (!role) return false
  if (isFullAccessRole(role)) return true

  const modules = modulesForPath(pathWithQuery)
  if (!modules.length) return true

  if (modules.includes('__any_print__')) {
    return documentTypes.some((d) => canCurrentUser(d.key, 'print'))
  }

  return modules.some((m) => canCurrentUser(m, flag))
}

export function canAccessModule(
  moduleKey: string | string[],
  flag: PermFlag = 'read',
): boolean {
  const role = normalizeRole(currentUser.role) || currentUser.role
  if (!role) return false
  if (isFullAccessRole(role)) return true
  const keys = Array.isArray(moduleKey) ? moduleKey : [moduleKey]
  return keys.some((k) => canCurrentUser(k, flag))
}

/** Sidebar / command palette — drop links the role cannot read. */
export function filterNavByPermissions(groups: NavGroup[]): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.route) return true
        return canAccessPath(item.route, 'read')
      }),
    }))
    .filter((group) => group.items.length > 0)
}

export function filterRoutesByPermissions<T extends { route: string }>(
  items: T[],
): T[] {
  return items.filter((item) => canAccessPath(item.route, 'read'))
}
