import { schoolSetup, formatSchoolAddress } from './schoolSetup'
import { brand } from './brand'
import { schoolStore, unpaidFeeCount, pendingApplicantCount } from './store'
import { openPrintWindow } from './documents'

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
}

export const schoolReportCatalog: SchoolReportDef[] = [
  {
    id: 'overview',
    title: 'School overview',
    description: 'Head-office snapshot of learners, staff, fees and attendance',
    icon: 'lucide-layout-dashboard',
  },
  {
    id: 'enrollment',
    title: 'Enrollment report',
    description: 'Learners by class, programme and status',
    icon: 'lucide-graduation-cap',
  },
  {
    id: 'attendance',
    title: 'Attendance report',
    description: 'Present, late and absent sessions across the school',
    icon: 'lucide-clipboard-check',
  },
  {
    id: 'fees',
    title: 'Fees & collections',
    description: 'Paid, partial, unpaid and overdue fee invoices',
    icon: 'lucide-receipt',
  },
  {
    id: 'admissions',
    title: 'Admissions funnel',
    description: 'Applicants pending, approved, waitlisted and rejected',
    icon: 'lucide-user-plus',
  },
  {
    id: 'academics',
    title: 'Academic results',
    description: 'Posted assessment outcomes and pass rates',
    icon: 'lucide-award',
  },
  {
    id: 'staff',
    title: 'Staff roster',
    description: 'Teachers and active staffing summary',
    icon: 'lucide-users',
  },
]

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function logoSrc() {
  try {
    return new URL(brand.logoUrl, window.location.origin).href
  } catch {
    return brand.logoUrl
  }
}

function wrap(title: string, body: string) {
  const address = formatSchoolAddress().replace(/\n/g, '<br>')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; color: #1a1a1a; font-size: 12px; margin: 0; }
    .sheet { max-width: 900px; margin: 0 auto; }
    .head { display:flex; justify-content:space-between; gap:1rem; padding-bottom:10px; }
    .brand { display:flex; gap:10px; align-items:center; }
    .logo-img { width:64px; height:64px; object-fit:contain; }
    h1 { margin:0; font-size:16px; color:#2e3192; }
    .motto { margin:3px 0 0; font-style:italic; color:#ed1c24; font-size:11px; }
    .meta { text-align:right; font-size:11px; color:#2e3192; }
    .accent { height:4px; margin:0 0 14px; background:linear-gradient(90deg,#2e3192 0%,#2e3192 58%,#ed1c24 58%,#ed1c24 100%); }
    .contact { display:flex; justify-content:space-between; gap:1rem; font-size:11px; color:#333; margin-bottom:18px; }
    h2 { font-size:13px; margin:18px 0 8px; color:#2e3192; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid #c5c7e8; padding-bottom:5px; }
    table { width:100%; border-collapse:collapse; margin:8px 0 14px; }
    th, td { border:1px solid #d7d7e8; padding:6px 8px; text-align:left; vertical-align:top; }
    th { background:#eef0fa; color:#2e3192; font-size:11px; }
    .kpi { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:12px 0; }
    .kpi div { border:1px solid #d7d7e8; border-radius:8px; padding:10px; background:#fafbff; }
    .kpi strong { display:block; font-size:18px; color:#2e3192; }
    .kpi span { font-size:11px; color:#555; }
    .muted { color:#666; font-size:11px; }
    .foot { margin-top:24px; font-size:10px; color:#777; border-top:1px solid #ddd; padding-top:8px; }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="head">
      <div class="brand">
        <img class="logo-img" src="${esc(logoSrc())}" alt="${esc(schoolSetup.shortName)}" />
        <div>
          <h1>${esc(schoolSetup.name)}</h1>
          <p class="motto">${esc(schoolSetup.motto)}</p>
        </div>
      </div>
      <div class="meta">
        <p><strong>${esc(title)}</strong></p>
        <p>${esc(schoolSetup.currentTerm)} ${esc(schoolSetup.academicYear)}</p>
        <p>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </header>
    <div class="accent"></div>
    <div class="contact">
      <div>${address}</div>
      <div>Tel: ${esc(schoolSetup.phone)}<br>Email: ${esc(schoolSetup.email)}</div>
    </div>
    ${body}
    <p class="foot">Generated from Little Royals SchoolOS · Confidential school report</p>
  </div>
</body>
</html>`
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
    examPass: results.filter((r) => r.status === 'Pass').length,
    examTotal: results.length,
  }
}

function buildOverview() {
  const s = schoolReportStats()
  const title = 'School Overview Report'
  const html = wrap(
    title,
    `<div class="kpi">
      <div><strong>${s.students}</strong><span>Learners enrolled</span></div>
      <div><strong>${s.activeStudents}</strong><span>Active learners</span></div>
      <div><strong>${s.teachers}</strong><span>Teachers</span></div>
      <div><strong>${s.attendancePct}%</strong><span>Attendance today</span></div>
    </div>
    <div class="kpi">
      <div><strong>${s.unpaidFees}</strong><span>Fee invoices open</span></div>
      <div><strong>${s.pendingAdmissions}</strong><span>Admissions pending</span></div>
      <div><strong>${s.examPass}/${s.examTotal || 0}</strong><span>Exam passes</span></div>
      <div><strong>${esc(schoolSetup.currency)}</strong><span>Billing currency</span></div>
    </div>
    <p class="muted">Summary for ${esc(schoolSetup.currentTerm)} ${esc(schoolSetup.academicYear)}.</p>`,
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
  const pass = countBy(rows, ['Pass'])
  const fail = countBy(rows, ['Fail'])
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
