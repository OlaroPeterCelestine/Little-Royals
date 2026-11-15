import type { CatalogRow } from '@/data/catalog/catalog'
import { schoolSetup } from '@/data/school/schoolSetup'
import { schoolStore, unpaidFeeCount, pendingApplicantCount } from '@/data/catalog/store'
import {
  letterhead,
  openPrintWindow,
  signatures,
  statutoryDocumentCss,
  wrap as wrapStatutory,
  type DocumentKind,
} from '@/data/documents/documents'
import { escapeHtml } from '@/lib/security'

const esc = escapeHtml

export type SchoolReportId =
  | 'overview'
  | 'enrollment'
  | 'attendance'
  | 'fees'
  | 'admissions'
  | 'academics'
  | 'staff'

export interface SchoolReportDef {
  id: SchoolReportId
  title: string
  description: string
  icon: string
  /** Live module whose rows appear under this report (like Documents). */
  moduleKey?: string
  /** Official document kind for printing a single row. */
  documentKind?: DocumentKind
  recordLabel: string
}

export const schoolReportCatalog: SchoolReportDef[] = [
  {
    id: 'overview',
    title: 'School overview',
    description: 'Head-office snapshot of learners, staff, fees and attendance',
    icon: 'lucide-layout-dashboard',
    recordLabel: 'Summary KPIs',
  },
  {
    id: 'enrollment',
    title: 'Enrollment report',
    description: 'Learners by class, programme and status',
    icon: 'lucide-graduation-cap',
    moduleKey: 'students',
    documentKind: 'report-card',
    recordLabel: 'Learners',
  },
  {
    id: 'attendance',
    title: 'Attendance report',
    description: 'Present, late and absent sessions across the school',
    icon: 'lucide-clipboard-check',
    moduleKey: 'attendance',
    documentKind: 'attendance-report',
    recordLabel: 'Attendance rows',
  },
  {
    id: 'fees',
    title: 'Fees & collections',
    description: 'Paid, partial, unpaid and overdue fee invoices',
    icon: 'lucide-receipt',
    moduleKey: 'fees',
    documentKind: 'invoice',
    recordLabel: 'Invoices',
  },
  {
    id: 'admissions',
    title: 'Admissions funnel',
    description: 'Applicants pending, approved, waitlisted and rejected',
    icon: 'lucide-user-plus',
    moduleKey: 'applicants',
    documentKind: 'admission-letter',
    recordLabel: 'Applicants',
  },
  {
    id: 'academics',
    title: 'Academic results',
    description: 'Posted assessment outcomes and pass rates',
    icon: 'lucide-award',
    moduleKey: 'exam-results',
    documentKind: 'exam-memo',
    recordLabel: 'Results',
  },
  {
    id: 'staff',
    title: 'Staff roster',
    description: 'Teachers and active staffing summary',
    icon: 'lucide-users',
    moduleKey: 'teachers',
    recordLabel: 'Teachers',
  },
]

export function reportDef(id: SchoolReportId) {
  return schoolReportCatalog.find((r) => r.id === id) || schoolReportCatalog[0]
}

/** Rows that back a report — same idea as Documents record picker. */
export function reportRecords(id: SchoolReportId): CatalogRow[] {
  const def = reportDef(id)
  if (!def.moduleKey) return []
  return [...(schoolStore[def.moduleKey]?.rows || [])]
}

export function reportRecordColumns(id: SchoolReportId): { key: string; label: string }[] {
  switch (id) {
    case 'enrollment':
      return [
        { key: 'name', label: 'Learner' },
        { key: 'id', label: 'ID' },
        { key: 'className', label: 'Class' },
        { key: 'program', label: 'Programme' },
        { key: 'status', label: 'Status' },
      ]
    case 'attendance':
      return [
        { key: 'name', label: 'Learner' },
        { key: 'className', label: 'Class' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status' },
      ]
    case 'fees':
      return [
        { key: 'name', label: 'Learner' },
        { key: 'invoice', label: 'Invoice' },
        { key: 'amount', label: 'Amount' },
        { key: 'paid', label: 'Paid' },
        { key: 'status', label: 'Status' },
      ]
    case 'admissions':
      return [
        { key: 'name', label: 'Applicant' },
        { key: 'program', label: 'Programme' },
        { key: 'grade', label: 'Class' },
        { key: 'applied', label: 'Applied' },
        { key: 'status', label: 'Status' },
      ]
    case 'academics':
      return [
        { key: 'name', label: 'Learner' },
        { key: 'exam', label: 'Exam' },
        { key: 'score', label: 'Score' },
        { key: 'grade', label: 'Grade' },
        { key: 'status', label: 'Status' },
      ]
    case 'staff':
      return [
        { key: 'name', label: 'Teacher' },
        { key: 'id', label: 'ID' },
        { key: 'subject', label: 'Subject' },
        { key: 'status', label: 'Status' },
      ]
    default:
      return []
  }
}

function wrap(title: string, body: string, refNo?: string) {
  const reportCss = `
    ${statutoryDocumentCss}
    .kpi { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:12px 0; }
    .kpi div { border:1px solid #9ea2d4; padding:10px; background:#f7f8fc; }
    .kpi strong { display:block; font-size:18px; color:#1f226e; font-family:"Helvetica Neue",Arial,sans-serif; }
    .kpi span { font-size:11px; color:#555; font-family:"Helvetica Neue",Arial,sans-serif; }
    table { width:100%; border-collapse:collapse; margin:8px 0 14px; }
    th, td { border:1px solid #9ea2d4; padding:6px 8px; text-align:left; vertical-align:top; font-family:"Helvetica Neue",Arial,sans-serif; font-size:11.5px; }
    th { background:#e8e9f6; color:#1f226e; font-size:11px; }
  `
  // Prefer shared statutory shell; inject report-only KPI/table extras via wrapStatutory base.
  const html = wrapStatutory(
    title,
    `${letterhead(title, refNo || `RPT-${new Date().toISOString().slice(0, 10)}`, {
      kindLabel: 'Statutory school report',
    })}
    ${body}
    ${signatures('Prepared by', 'Head teacher')}`,
  )
  return html.replace(
    `<style>${statutoryDocumentCss}</style>`,
    `<style>${reportCss}</style>`,
  )
}

function countBy(rows: { status?: unknown }[], statuses: string[]) {
  return rows.filter((r) => statuses.includes(String(r.status))).length
}

export function schoolReportStats() {
  const students = schoolStore.students?.rows || []
  const teachers = schoolStore.teachers?.rows || []
  const attendance = schoolStore.attendance?.rows || []
  const fees = schoolStore.fees?.rows || []
  const results = schoolStore['exam-results']?.rows || []
  const present = attendance.filter((r) =>
    ['Present', 'Late'].includes(String(r.status)),
  ).length
  return {
    students: students.length,
    activeStudents: students.filter((r) => r.status === 'Active').length,
    teachers: teachers.length,
    attendancePct: Math.round(
      (present / Math.max(attendance.length, 1)) * 100,
    ),
    unpaidFees: unpaidFeeCount.value,
    pendingAdmissions: pendingApplicantCount.value,
    examPass: results.filter((r) =>
      ['Posted', 'Pass'].includes(String(r.status)),
    ).length,
    examTotal: results.length,
  }
}

function buildOverview() {
  const s = schoolReportStats()
  const classes = schoolStore.classes?.rows || []
  const subjects = schoolStore.subjects?.rows || []
  const fees = schoolStore.fees?.rows || []
  const paid = countBy(fees, ['Paid'])
  const title = 'School Overview Report'
  const classRows = classes
    .slice(0, 24)
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.level || r.stream || '—')}</td><td>${esc(r.teacher || '—')}</td><td>${esc(r.status || '—')}</td></tr>`,
    )
    .join('')
  const html = wrap(
    title,
    `<p class="muted">${esc(schoolSetup.name || schoolSetup.shortName)} · ${esc(schoolSetup.currentTerm)} ${esc(schoolSetup.academicYear)} · ${esc(schoolSetup.country || 'Uganda')}</p>
    <h2>Head-office snapshot</h2>
    <div class="kpi">
      <div><strong>${s.students}</strong><span>Learners enrolled</span></div>
      <div><strong>${s.activeStudents}</strong><span>Active learners</span></div>
      <div><strong>${s.teachers}</strong><span>Teachers</span></div>
      <div><strong>${s.attendancePct}%</strong><span>Attendance today</span></div>
    </div>
    <div class="kpi">
      <div><strong>${s.unpaidFees}</strong><span>Fee invoices open</span></div>
      <div><strong>${paid}</strong><span>Invoices paid</span></div>
      <div><strong>${s.pendingAdmissions}</strong><span>Admissions pending</span></div>
      <div><strong>${s.examPass}/${s.examTotal || 0}</strong><span>Results posted</span></div>
    </div>
    <div class="kpi">
      <div><strong>${classes.length}</strong><span>Classes</span></div>
      <div><strong>${subjects.length}</strong><span>Subjects</span></div>
      <div><strong>${fees.length}</strong><span>Fee invoices</span></div>
      <div><strong>${esc(schoolSetup.currency)}</strong><span>Billing currency</span></div>
    </div>
    <h2>Campus profile</h2>
    <table>
      <tbody>
        <tr><th>School</th><td>${esc(schoolSetup.name || schoolSetup.shortName)}</td></tr>
        <tr><th>Location</th><td>${esc([schoolSetup.city, schoolSetup.district, schoolSetup.country].filter(Boolean).join(', ') || '—')}</td></tr>
        <tr><th>Term</th><td>${esc(schoolSetup.currentTerm)} ${esc(schoolSetup.academicYear)}</td></tr>
        <tr><th>Currency</th><td>${esc(schoolSetup.currency)}</td></tr>
      </tbody>
    </table>
    <h2>Classes (${classes.length})</h2>
    <table>
      <thead><tr><th>Class</th><th>Level / stream</th><th>Teacher</th><th>Status</th></tr></thead>
      <tbody>${classRows || '<tr><td colspan="4">No classes on file</td></tr>'}</tbody>
    </table>
    <p class="muted">Generated for desk preview · print or download for the official copy.</p>`,
  )
  return { title, html }
}

function buildEnrollment() {
  const rows = schoolStore.students?.rows || []
  const title = 'Enrollment Report'
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.id)}</td><td>${esc(r.program)}</td><td>${esc(r.className)}</td><td>${esc(r.status)}</td></tr>`,
    )
    .join('')
  const html = wrap(
    title,
    `<h2>Learners (${rows.length})</h2>
    <table>
      <thead><tr><th>Name</th><th>ID</th><th>Programme</th><th>Class</th><th>Status</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="5">No learners</td></tr>'}</tbody>
    </table>`,
  )
  return { title, html }
}

function buildAttendance() {
  const rows = schoolStore.attendance?.rows || []
  const present = countBy(rows, ['Present'])
  const late = countBy(rows, ['Late'])
  const absent = countBy(rows, ['Absent'])
  const title = 'Attendance Report'
  const bodyRows = rows
    .slice(0, 100)
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.className)}</td><td>${esc(r.date)}</td><td>${esc(r.status)}</td></tr>`,
    )
    .join('')
  const html = wrap(
    title,
    `<div class="kpi">
      <div><strong>${present}</strong><span>Present</span></div>
      <div><strong>${late}</strong><span>Late</span></div>
      <div><strong>${absent}</strong><span>Absent</span></div>
      <div><strong>${rows.length}</strong><span>Sessions logged</span></div>
    </div>
    <h2>Session log</h2>
    <table>
      <thead><tr><th>Student</th><th>Class</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="4">No attendance rows</td></tr>'}</tbody>
    </table>`,
  )
  return { title, html }
}

function buildFees() {
  const rows = schoolStore.fees?.rows || []
  const title = 'Fees & Collections Report'
  const unpaid = countBy(rows, ['Unpaid', 'Overdue', 'Partial'])
  const paid = countBy(rows, ['Paid'])
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.invoice || r.id)}</td><td>${esc(r.amount)}</td><td>${esc(r.paid)}</td><td>${esc(r.status)}</td></tr>`,
    )
    .join('')
  const html = wrap(
    title,
    `<div class="kpi">
      <div><strong>${rows.length}</strong><span>Invoices</span></div>
      <div><strong>${paid}</strong><span>Paid</span></div>
      <div><strong>${unpaid}</strong><span>Need attention</span></div>
      <div><strong>${esc(schoolSetup.currency)}</strong><span>Currency</span></div>
    </div>
    <h2>Fee invoices</h2>
    <table>
      <thead><tr><th>Student</th><th>Invoice</th><th>Amount</th><th>Paid</th><th>Status</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="5">No fee rows</td></tr>'}</tbody>
    </table>`,
  )
  return { title, html }
}

function buildAdmissions() {
  const rows = schoolStore.applicants?.rows || []
  const title = 'Admissions Report'
  const pending = countBy(rows, ['Pending', 'Waitlist'])
  const approved = countBy(rows, ['Approved'])
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.program)}</td><td>${esc(r.grade)}</td><td>${esc(r.applied)}</td><td>${esc(r.status)}</td></tr>`,
    )
    .join('')
  const html = wrap(
    title,
    `<div class="kpi">
      <div><strong>${rows.length}</strong><span>Applicants</span></div>
      <div><strong>${pending}</strong><span>Pending / waitlist</span></div>
      <div><strong>${approved}</strong><span>Approved</span></div>
      <div><strong>${countBy(rows, ['Rejected'])}</strong><span>Rejected</span></div>
    </div>
    <h2>Applicant list</h2>
    <table>
      <thead><tr><th>Name</th><th>Programme</th><th>Class</th><th>Applied</th><th>Status</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="5">No applicants</td></tr>'}</tbody>
    </table>`,
  )
  return { title, html }
}

function buildAcademics() {
  const rows = schoolStore['exam-results']?.rows || []
  const title = 'Academic Results Report'
  const pass = countBy(rows, ['Posted', 'Pass'])
  const fail = countBy(rows, ['Remedial', 'Fail'])
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.exam)}</td><td>${esc(r.score)}</td><td>${esc(r.grade)}</td><td>${esc(r.status)}</td></tr>`,
    )
    .join('')
  const html = wrap(
    title,
    `<div class="kpi">
      <div><strong>${rows.length}</strong><span>Results posted</span></div>
      <div><strong>${pass}</strong><span>Pass</span></div>
      <div><strong>${fail}</strong><span>Fail</span></div>
      <div><strong>${rows.length ? Math.round((pass / rows.length) * 100) : 0}%</strong><span>Pass rate</span></div>
    </div>
    <h2>Assessment outcomes</h2>
    <table>
      <thead><tr><th>Student</th><th>Assessment</th><th>Score</th><th>Grade</th><th>Result</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="5">No results</td></tr>'}</tbody>
    </table>`,
  )
  return { title, html }
}

function buildStaff() {
  const rows = schoolStore.teachers?.rows || []
  const title = 'Staff Roster Report'
  const active = rows.filter((r) => r.status === 'Active').length
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.id)}</td><td>${esc(r.subject || r.department || '—')}</td><td>${esc(r.status)}</td></tr>`,
    )
    .join('')
  const html = wrap(
    title,
    `<div class="kpi">
      <div><strong>${rows.length}</strong><span>Teachers</span></div>
      <div><strong>${active}</strong><span>Active</span></div>
      <div><strong>${rows.length - active}</strong><span>Other</span></div>
      <div><strong>${esc(schoolSetup.shortName)}</strong><span>Campus</span></div>
    </div>
    <h2>Teachers</h2>
    <table>
      <thead><tr><th>Name</th><th>ID</th><th>Subject / Dept</th><th>Status</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="4">No staff rows</td></tr>'}</tbody>
    </table>`,
  )
  return { title, html }
}

export function buildSchoolReport(id: SchoolReportId) {
  switch (id) {
    case 'overview':
      return buildOverview()
    case 'enrollment':
      return buildEnrollment()
    case 'attendance':
      return buildAttendance()
    case 'fees':
      return buildFees()
    case 'admissions':
      return buildAdmissions()
    case 'academics':
      return buildAcademics()
    case 'staff':
      return buildStaff()
  }
}

/** HTML for in-app preview (Documents-style), without opening print. */
export function previewSchoolReport(id: SchoolReportId) {
  return buildSchoolReport(id)
}

export function printSchoolReport(id: SchoolReportId) {
  const { title, html } = buildSchoolReport(id)
  openPrintWindow(title, html)
  return title
}

export function downloadSchoolReport(id: SchoolReportId) {
  const { title, html } = buildSchoolReport(id)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^\w\s.-]+/g, '').trim().replace(/\s+/g, '-')}.html`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return title
}

export function exportSchoolReportCsv(id: SchoolReportId) {
  let header = ''
  let lines: string[] = []
  if (id === 'enrollment') {
    header = 'name,id,program,class,status'
    lines = (schoolStore.students?.rows || []).map(
      (r) =>
        `"${r.name}","${r.id}","${r.program || ''}","${r.className || ''}","${r.status || ''}"`,
    )
  } else if (id === 'attendance') {
    header = 'name,class,date,status'
    lines = (schoolStore.attendance?.rows || []).map(
      (r) =>
        `"${r.name}","${r.className || ''}","${r.date || ''}","${r.status || ''}"`,
    )
  } else if (id === 'fees') {
    header = 'name,invoice,amount,paid,status'
    lines = (schoolStore.fees?.rows || []).map(
      (r) =>
        `"${r.name}","${r.invoice || r.id}","${r.amount || ''}","${r.paid || ''}","${r.status || ''}"`,
    )
  } else if (id === 'admissions') {
    header = 'name,program,grade,applied,status'
    lines = (schoolStore.applicants?.rows || []).map(
      (r) =>
        `"${r.name}","${r.program || ''}","${r.grade || ''}","${r.applied || ''}","${r.status || ''}"`,
    )
  } else if (id === 'academics') {
    header = 'name,exam,score,grade,status'
    lines = (schoolStore['exam-results']?.rows || []).map(
      (r) =>
        `"${r.name}","${r.exam || ''}","${r.score || ''}","${r.grade || ''}","${r.status || ''}"`,
    )
  } else if (id === 'staff') {
    header = 'name,id,subject,status'
    lines = (schoolStore.teachers?.rows || []).map(
      (r) =>
        `"${r.name}","${r.id}","${r.subject || r.department || ''}","${r.status || ''}"`,
    )
  } else {
    const s = schoolReportStats()
    header = 'metric,value'
    lines = [
      `"students",${s.students}`,
      `"active_students",${s.activeStudents}`,
      `"teachers",${s.teachers}`,
      `"attendance_pct",${s.attendancePct}`,
      `"unpaid_fees",${s.unpaidFees}`,
      `"pending_admissions",${s.pendingAdmissions}`,
    ]
  }
  const blob = new Blob([[header, ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `little-royals-${id}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
