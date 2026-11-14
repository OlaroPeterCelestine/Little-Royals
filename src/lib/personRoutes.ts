/**
 * Canonical routes for people — keep lists, 360 profiles, and forms from mixing up.
 *
 * Lists:
 *   Students → /students
 *   Teachers / Staff / Parents → /people?tab=…
 *
 * 360 profiles:
 *   /students/:id  → Student360
 *   /teachers/:id  → Teacher360
 *   /staff/:id     → Staff360
 *   /guardians/:id → RecordDetail (parent/guardian)
 */

export type PersonModule = 'students' | 'teachers' | 'staff' | 'guardians'

const LIST: Record<PersonModule, string> = {
  students: '/students',
  teachers: '/people?tab=teachers',
  staff: '/people?tab=staff',
  guardians: '/people?tab=parents',
}

export function personListPath(module: string): string {
  if (module in LIST) return LIST[module as PersonModule]
  // Calendar desk owns school-events (/school-events redirects to /calendar)
  if (module === 'school-events') return '/calendar'
  return `/${module}`
}

export function personDetailPath(module: string, id: string): string {
  if (module === 'students') return `/students/${id}`
  if (module === 'teachers') return `/teachers/${id}`
  if (module === 'staff') return `/staff/${id}`
  if (module === 'guardians') return `/guardians/${id}`
  return `/${module}/${id}`
}

export function personEditPath(module: string, id: string): string {
  return `/${module}/${id}/edit`
}

export function personCreatePath(module: string): string {
  return `/${module}/new`
}

/**
 * Single HR → People nav item covers teachers, staff, parents and their 360s.
 */
export function isPeopleNavActive(
  routePath: string,
  _routeTab: unknown,
  linkPath: string,
): boolean {
  const base = linkPath.split('?')[0]
  if (base !== '/people') return false

  return (
    routePath === '/people' ||
    routePath.startsWith('/teachers/') ||
    routePath.startsWith('/staff/') ||
    routePath.startsWith('/guardians/')
  )
}

export function isStudentsNavActive(routePath: string): boolean {
  return routePath === '/students' || routePath.startsWith('/students/')
}
