import type { CatalogRow } from './catalog'
import { schoolStore } from './store'

export interface Staff360Bundle {
  staff: CatalogRow
  leave: CatalogRow[]
  attendance: CatalogRow[]
  payroll: CatalogRow[]
  linkedTeacher: CatalogRow | undefined
  stats: {
    leaveCount: number
    attendancePresent: number
    attendanceTotal: number
    payrollRows: number
  }
}

function matchesStaff(row: CatalogRow, staff: CatalogRow) {
  const name = String(staff.name || '')
  const id = String(staff.id || '')
  const keys = ['staff', 'staffId', 'employee', 'employeeId', 'name', 'teacher']
  return keys.some((k) => {
    const v = String(row[k] || '')
    return v === name || v === id
  })
}

export function getStaff360(staffId: string): Staff360Bundle | null {
  const staff = schoolStore.staff?.rows.find((r) => r.id === staffId)
  if (!staff) return null

  const leave = (schoolStore['staff-leave']?.rows || []).filter((r) =>
    matchesStaff(r, staff),
  )
  const attendance = (schoolStore['staff-attendance']?.rows || []).filter((r) =>
    matchesStaff(r, staff),
  )
  const payroll = (schoolStore.payroll?.rows || []).filter((r) =>
    matchesStaff(r, staff),
  )
  const linkedTeacher = (schoolStore.teachers?.rows || []).find(
    (t) =>
      t.name === staff.name ||
      String(t.employeeNumber || '') === String(staff.id) ||
      String(t.employeeNumber || '') === String(staff.employeeNumber || ''),
  )

  const attendancePresent = attendance.filter((r) =>
    ['Present', 'Late'].includes(String(r.status)),
  ).length

  return {
    staff,
    leave,
    attendance,
    payroll,
    linkedTeacher,
    stats: {
      leaveCount: leave.length,
      attendancePresent,
      attendanceTotal: attendance.length,
      payrollRows: payroll.length,
    },
  }
}
