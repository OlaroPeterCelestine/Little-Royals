import type { CatalogRow } from './catalog'
import { brand } from './brand'
import { formatSchoolAddress, schoolSetup } from './schoolSetup'
import { schoolStore } from './store'

function logoSrc() {
  try {
    return new URL(brand.logoUrl, window.location.origin).href
  } catch {
    return brand.logoUrl
  }
}

export type DocumentKind =
  | 'invoice'
  | 'receipt'
  | 'admission-letter'
  | 'exam-memo'
  | 'report-card'
  | 'attendance-report'
  | 'disciplinary-notice'
  | 'generic'

export interface DocumentDef {
  kind: DocumentKind
  label: string
  description: string
  icon: string
  modules: string[]
  /** Official parent/office docs shown on the Documents desk */
  important?: boolean
}

export const documentCatalog: DocumentDef[] = [
  {
    kind: 'invoice',
    label: 'Fee invoice',
    description: 'Print pupil fee invoices with school letterhead',
    icon: 'lucide-file-text',
    modules: ['fees'],
    important: true,
  },
  {
    kind: 'receipt',
    label: 'Fee receipt',
    description: 'Print payment receipts for paid or partial fees',
    icon: 'lucide-receipt',
    modules: ['fees'],
    important: true,
  },
  {
    kind: 'admission-letter',
    label: 'Letter of admission',
    description: 'Official offer / admission letters for new pupils',
    icon: 'lucide-mail',
    modules: ['admissions', 'applicants', 'program-enrollments'],
    important: true,
  },
  {
    kind: 'exam-memo',
    label: 'Exam report',
    description: 'Assessment / exam result reports for parents',
    icon: 'lucide-scroll-text',
    modules: ['exam-results', 'exams', 'exam-settings'],
    important: true,
  },
  {
    kind: 'report-card',
    label: 'Term report card',
    description: 'Student academic summary with results and attendance',
    icon: 'lucide-clipboard-list',
    modules: ['students', 'report-cards'],
    important: true,
  },
  {
    kind: 'attendance-report',
    label: 'Attendance report',
    description: 'Class or school attendance listing',
    icon: 'lucide-calendar-check',
    modules: ['attendance', 'staff-attendance', 'reports'],
    important: false,
  },
  {
    kind: 'disciplinary-notice',
    label: 'Disciplinary notice',
    description: 'Parent notice for behaviour cases',
    icon: 'lucide-shield-alert',
    modules: ['disciplinary-cases'],
    important: false,
  },
  {
    kind: 'generic',
    label: 'Record printout',
    description:
      'Print any record — inventory issues, library loans, routes, events, and more',
    icon: 'lucide-printer',
    modules: ['*'],
    important: false,
  },
]

/** Documents desk — official prints only (invoice, receipt, admission, exams, report cards). */
export const importantDocuments = documentCatalog.filter((d) => d.important)

export function documentsForModule(moduleKey: string): DocumentDef[] {
  return importantDocuments.filter(
    (d) => d.modules.includes('*') || d.modules.includes(moduleKey),
  )
}

export function defaultDocumentKind(moduleKey: string): DocumentKind {
  const map: Record<string, DocumentKind> = {
    fees: 'invoice',
    admissions: 'admission-letter',
    applicants: 'admission-letter',
    'program-enrollments': 'admission-letter',
    'exam-results': 'exam-memo',
    exams: 'exam-memo',
    students: 'report-card',
    attendance: 'attendance-report',
    'disciplinary-cases': 'disciplinary-notice',
  }
  return map[moduleKey] || 'generic'
}

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function letterhead(docTitle: string, refNo: string) {
  const address = formatSchoolAddress().replace(/\n/g, '<br>')
  return `
    <header class="head">
      <div class="brand">
        <img class="logo-img" src="${esc(logoSrc())}" alt="${esc(schoolSetup.shortName)}" />
        <div>
          <h1>${esc(schoolSetup.name)}</h1>
          <p class="motto">${esc(schoolSetup.motto)}</p>
        </div>
      </div>
      <div class="meta">
        <p><strong>${esc(docTitle)}</strong></p>
        <p>Ref: ${esc(refNo)}</p>
        <p>Date: ${new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}</p>
      </div>
    </header>
    <div class="accent"></div>
    <div class="contact">
      <div>${address}</div>
      <div>
        Tel: ${esc(schoolSetup.phone)}
        ${schoolSetup.phoneAlt ? `<br>Alt: ${esc(schoolSetup.phoneAlt)}` : ''}
        <br>Email: ${esc(schoolSetup.email)}
        <br>UNEB: ${esc(schoolSetup.unebCentre)} · MoES: ${esc(schoolSetup.registrationNo)}
      </div>
    </div>
  `
}

function wrap(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    @page { margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Georgia", "Times New Roman", serif;
      color: #1a1a1a;
      font-size: 12.5px;
      line-height: 1.45;
      margin: 0;
      padding: 0;
    }
    .sheet { max-width: 780px; margin: 0 auto; }
    .head {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      padding-bottom: 12px;
      margin-bottom: 0;
    }
    .brand { display: flex; gap: 12px; align-items: center; }
    .logo-img {
      width: 72px; height: 72px;
      object-fit: contain;
      background: #fff;
    }
    h1 { margin: 0; font-size: 17px; color: #2e3192; font-family: system-ui, sans-serif; }
    .motto { margin: 4px 0 0; font-style: italic; color: #ed1c24; font-size: 11px; }
    .meta { text-align: right; font-family: system-ui, sans-serif; font-size: 11px; color: #2e3192; }
    .meta p { margin: 0 0 2px; }
    .accent {
      height: 4px;
      margin: 0 0 14px;
      background: linear-gradient(90deg, #2e3192 0%, #2e3192 58%, #ed1c24 58%, #ed1c24 100%);
    }
    .contact {
      display: flex; justify-content: space-between; gap: 1rem;
      font-family: system-ui, sans-serif; font-size: 11px; color: #333;
      margin-bottom: 22px;
    }
    h2 {
      font-size: 14px; margin: 0 0 12px; color: #2e3192;
      text-transform: uppercase; letter-spacing: 0.04em;
      border-bottom: 1px solid #c5c7e8; padding-bottom: 6px;
      font-family: system-ui, sans-serif;
    }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; }
    th, td {
      border: 1px solid #c5c7e8; padding: 8px 10px;
      text-align: left; font-family: system-ui, sans-serif; font-size: 12px;
    }
    th { background: #e8e9f6; color: #2e3192; }
    .muted { color: #555; }
    .block { margin: 14px 0; }
    .sign {
      display: flex; justify-content: space-between; gap: 2rem;
      margin-top: 48px; font-family: system-ui, sans-serif; font-size: 12px;
    }
    .sign .line { border-top: 1px solid #2e3192; margin-top: 40px; padding-top: 6px; min-width: 200px; }
    .badge {
      display: inline-block; border: 1px solid #2e3192; color: #2e3192; padding: 2px 8px;
      font-family: system-ui, sans-serif; font-size: 11px; text-transform: uppercase;
    }
    .footer {
      margin-top: 36px; padding-top: 10px; border-top: 1px solid #c5c7e8;
      font-family: system-ui, sans-serif; font-size: 10px; color: #666;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">${body}
    <div class="footer">
      ${esc(schoolSetup.shortName)} · ${esc(schoolSetup.currentTerm)} ${esc(schoolSetup.academicYear)} ·
      Generated from Little Royals Education Desk · ${esc(schoolSetup.currency)}
    </div>
  </div>
</body>
</html>`
}

function fieldTable(rows: Array<[string, string]>) {
  return `<table>
    ${rows
      .map(
        ([k, v]) =>
          `<tr><th style="width:34%">${esc(k)}</th><td>${esc(v || '—')}</td></tr>`,
      )
      .join('')}
  </table>`
}

function signatures(left = 'Class teacher', right = 'Head teacher') {
  return `<div class="sign">
    <div><div class="line">${esc(left)}</div></div>
    <div><div class="line">${esc(right)} · ${esc(schoolSetup.headTeacher)}</div></div>
  </div>`
}

function findStudentByName(name: string) {
  return schoolStore.students?.rows.find((r) => r.name === name)
}

export function buildDocumentHtml(
  kind: DocumentKind,
  moduleKey: string,
  row: CatalogRow,
): { title: string; html: string } {
  if (kind === 'invoice' || (kind === 'generic' && moduleKey === 'fees')) {
    const title = `Fee Invoice · ${row.invoice || row.id}`
    const html = wrap(
      title,
      `${letterhead('Fee Invoice', String(row.invoice || row.id))}
      <h2>Invoice</h2>
      ${fieldTable([
        ['Student', row.name],
        ['Invoice no.', String(row.invoice || row.id)],
        ['Amount due', String(row.amount || '—')],
        ['Amount paid', String(row.paid || '—')],
        ['Status', String(row.status || '—')],
        ['Term', `${schoolSetup.currentTerm} ${schoolSetup.academicYear}`],
        ['Currency', schoolSetup.currency],
      ])}
      <p class="muted">Please settle outstanding balances at the school accounts office. Keep this invoice for your records.</p>
      ${signatures('Accounts officer', 'Head teacher')}`,
    )
    return { title, html }
  }

  if (kind === 'receipt') {
    const receiptNo = `RCP-${String(row.invoice || row.id).replace(/^INV-/, '')}`
    const title = `Fee Receipt · ${receiptNo}`
    const html = wrap(
      title,
      `${letterhead('Official Receipt', receiptNo)}
      <h2>Payment receipt</h2>
      <p>Received with thanks from the guardian of <strong>${esc(row.name)}</strong>.</p>
      ${fieldTable([
        ['Receipt no.', receiptNo],
        ['Invoice no.', String(row.invoice || row.id)],
        ['Amount received', String(row.paid || row.amount || '—')],
        ['Invoice total', String(row.amount || '—')],
        ['Payment status', String(row.status || '—')],
        ['Term', `${schoolSetup.currentTerm} ${schoolSetup.academicYear}`],
      ])}
      <p class="muted">This receipt is computer generated and is valid without a stamp when printed on school letterhead.</p>
      ${signatures('Cashier / Accounts', 'Head teacher')}`,
    )
    return { title, html }
  }

  if (kind === 'admission-letter') {
    const title = `Letter of Admission · ${row.name}`
    const program = String(row.program || 'Primary')
    const term = String(row.term || `${schoolSetup.currentTerm}`)
    const html = wrap(
      title,
      `${letterhead('Letter of Admission', String(row.id))}
      <h2>Offer of admission</h2>
      <p>Dear Parent / Guardian,</p>
      <p class="block">
        We are pleased to offer <strong>${esc(row.name)}</strong> admission to
        <strong>${esc(schoolSetup.name)}</strong> for the
        <strong>${esc(program)}</strong> section,
        <strong>${esc(term)} ${esc(schoolSetup.academicYear)}</strong>.
      </p>
      ${fieldTable([
        ['Admission / Ref', row.id],
        ['Student', row.name],
        ['Section', program],
        ['Term', `${term} ${schoolSetup.academicYear}`],
        ['Admission fee', String(row.fee || 'As per fee schedule')],
        ['Status', String(row.status || '—')],
      ])}
      <p class="block">
        Kindly complete registration at the school office within 14 days of this letter,
        bring a copy of the birth certificate / passport photo, and settle any admission fees.
      </p>
      <p>We look forward to welcoming your child to the Little Royals family.</p>
      ${signatures('Admissions officer', 'Head teacher')}`,
    )
    return { title, html }
  }

  if (kind === 'exam-memo') {
    const studentName = String(row.name || 'Student')
    const examLabel = String(row.exam || 'Assessment')
    const title = `Exam Report · ${studentName}`
    const html = wrap(
      title,
      `${letterhead('Student Examination Report', String(row.id))}
      <h2>Examination report</h2>
      <p>To the Parent / Guardian of <strong>${esc(studentName)}</strong>,</p>
      <p class="block">
        Please find the assessment outcome for
        <strong>${esc(examLabel)}</strong>
        (${esc(schoolSetup.currentTerm)} ${esc(schoolSetup.academicYear)}).
      </p>
      ${fieldTable([
        ['Student', studentName],
        ['Assessment', examLabel],
        ['Score', String(row.score ?? '—')],
        ['Grade', String(row.grade || '—')],
        ['Result', String(row.status || '—')],
        ['Report ref', row.id],
      ])}
      <p class="muted">
        Please discuss this report with your child. If you need clarification,
        contact the class teacher or the academic office on
        ${esc(schoolSetup.phone)}.
      </p>
      ${signatures('Subject / Class teacher', 'Head teacher')}`,
    )
    return { title, html }
  }

  if (kind === 'report-card') {
    const student = moduleKey === 'students' ? row : findStudentByName(row.name) || row
    const results = (schoolStore['exam-results']?.rows || []).filter(
      (r) => r.name === student.name,
    )
    const attendance = (schoolStore.attendance?.rows || []).filter(
      (r) => r.name === student.name,
    )
    const present = attendance.filter((r) =>
      ['Present', 'Late'].includes(String(r.status)),
    ).length
    const title = `Report Card · ${student.name}`
    const resultRows =
      results.length > 0
        ? results
            .map(
              (r) =>
                `<tr><td>${esc(r.exam)}</td><td>${esc(r.score)}</td><td>${esc(r.grade)}</td><td>${esc(r.status)}</td></tr>`,
            )
            .join('')
        : `<tr><td colspan="4">No posted results for this term yet.</td></tr>`
    const html = wrap(
      title,
      `${letterhead('Term Report Card', String(student.id))}
      <h2>Academic report</h2>
      ${fieldTable([
        ['Student', student.name],
        ['Student ID', student.id],
        ['Class', String(student.className || '—')],
        ['Section', String(student.program || '—')],
        ['Term', `${schoolSetup.currentTerm} ${schoolSetup.academicYear}`],
        ['Average', student.average != null ? String(student.average) : '—'],
        [
          'Attendance',
          attendance.length
            ? `${present} / ${attendance.length} sessions`
            : '—',
        ],
      ])}
      <h2>Assessment results</h2>
      <table>
        <thead><tr><th>Assessment</th><th>Score</th><th>Grade</th><th>Result</th></tr></thead>
        <tbody>${resultRows}</tbody>
      </table>
      <p class="muted">
        Class teacher comments: Continue supporting home reading and punctuality.
        For any clarification on this report, please contact the school on
        ${esc(schoolSetup.phone)}.
      </p>
      ${signatures('Class teacher', 'Head teacher')}`,
    )
    return { title, html }
  }

  if (kind === 'attendance-report') {
    const rows =
      moduleKey === 'attendance' && row
        ? [row]
        : schoolStore.attendance?.rows || []
    const title = 'Attendance Report'
    const bodyRows = rows
      .slice(0, 80)
      .map(
        (r) =>
          `<tr><td>${esc(r.name)}</td><td>${esc(r.className)}</td><td>${esc(r.date)}</td><td>${esc(r.status)}</td></tr>`,
      )
      .join('')
    const html = wrap(
      title,
      `${letterhead('Attendance Report', `ATT-${new Date().toISOString().slice(0, 10)}`)}
      <h2>Attendance listing</h2>
      <p class="muted">${esc(schoolSetup.currentTerm)} ${esc(schoolSetup.academicYear)} · ${rows.length} record(s)</p>
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>${bodyRows || '<tr><td colspan="4">No attendance rows.</td></tr>'}</tbody>
      </table>
      ${signatures('Attendance officer', 'Head teacher')}`,
    )
    return { title, html }
  }

  if (kind === 'disciplinary-notice') {
    const title = `Disciplinary Notice · ${row.student || row.name}`
    const html = wrap(
      title,
      `${letterhead('Disciplinary Notice', String(row.id))}
      <h2>Notice to parent / guardian</h2>
      <p>Dear Parent / Guardian of <strong>${esc(row.student || row.name)}</strong>,</p>
      <p class="block">
        This notice concerns a disciplinary matter recorded by the school. Please discuss it with your child and contact the class teacher if needed.
      </p>
      ${fieldTable([
        ['Case', row.name],
        ['Case ref', row.id],
        ['Student', String(row.student || '—')],
        ['Severity', String(row.severity || '—')],
        ['Date opened', String(row.date || '—')],
        ['Reported by (teacher)', String(row.reportedBy || '—')],
        ['Action / sanction', String(row.action || '—')],
        ['Status', String(row.status || '—')],
      ])}
      ${row.subtitle ? `<p class="block"><strong>Notes:</strong> ${esc(row.subtitle)}</p>` : ''}
      ${signatures('Reporting teacher', 'Head teacher')}`,
    )
    return { title, html }
  }

  // generic
  const title = `${moduleKey} · ${row.name}`
  const entries = Object.entries(row)
    .filter(([k]) => !['statusTheme'].includes(k))
    .map(([k, v]) => [k, String(v ?? '—')] as [string, string])
  const html = wrap(
    title,
    `${letterhead('Record printout', String(row.id))}
    <h2>${esc(row.name)}</h2>
    <p><span class="badge">${esc(row.status || moduleKey)}</span></p>
    ${fieldTable(entries)}
    ${signatures('Prepared by', 'Authorised by')}`,
  )
  return { title, html }
}

/**
 * Print without `window.open` — browsers block pop-ups on Vercel / production.
 * Uses a same-origin hidden iframe so the print dialog always opens.
 */
export function openPrintWindow(title: string, html: string) {
  const existing = document.getElementById('lr-print-frame')
  if (existing) existing.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'lr-print-frame'
  iframe.title = title
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  })
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    throw new Error('Could not prepare the print preview')
  }

  doc.open()
  doc.write(html)
  doc.close()
  doc.title = title

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      /* user can print from Download instead */
    }
    window.setTimeout(() => {
      iframe.remove()
    }, 60_000)
  }

  // Wait for letterhead images / layout before printing
  const images = Array.from(doc.images || [])
  if (!images.length) {
    window.setTimeout(triggerPrint, 150)
  } else {
    let pending = images.length
    const done = () => {
      pending -= 1
      if (pending <= 0) window.setTimeout(triggerPrint, 100)
    }
    images.forEach((img) => {
      if (img.complete) done()
      else {
        img.addEventListener('load', done)
        img.addEventListener('error', done)
      }
    })
    window.setTimeout(triggerPrint, 2000)
  }

  return iframe
}

export function printRecordDocument(
  kind: DocumentKind,
  moduleKey: string,
  row: CatalogRow,
) {
  const { title, html } = buildDocumentHtml(kind, moduleKey, row)
  openPrintWindow(title, html)
  return title
}

function safeFileName(title: string) {
  return title
    .replace(/[^\w\s.-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

/** Download the branded document as an HTML file (opens cleanly in Word/browser). */
export function downloadRecordDocument(
  kind: DocumentKind,
  moduleKey: string,
  row: CatalogRow,
) {
  const { title, html } = buildDocumentHtml(kind, moduleKey, row)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeFileName(title) || 'little-royals-document'}.html`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return title
}

/** Share via Web Share API when available, otherwise copy a text summary. */
export async function shareRecordDocument(
  kind: DocumentKind,
  moduleKey: string,
  row: CatalogRow,
): Promise<'shared' | 'copied'> {
  const { title, html } = buildDocumentHtml(kind, moduleKey, row)
  const text = `${title}\n${schoolSetup.name}\nRecord: ${row.name} (${row.id})\nGenerated ${new Date().toLocaleString()}`
  const fileName = `${safeFileName(title) || 'document'}.html`
  const file = new File([html], fileName, { type: 'text/html' })

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const canFiles =
        typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : false
      if (canFiles) {
        await navigator.share({ title, text, files: [file] })
        return 'shared'
      }
      await navigator.share({ title, text })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err
      }
      /* fall through to clipboard */
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return 'copied'
  }
  throw new Error('Sharing is not available in this browser')
}
