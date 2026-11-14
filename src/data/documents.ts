import type { CatalogRow } from './catalog'
import { brand } from './brand'
import {
  canvasConfigFor,
  defaultSignatureDataUrl,
  defaultStampDataUrl,
  type DocumentCanvasConfig,
} from './documentCanvas'
import { formatSchoolAddress, schoolSetup } from './schoolSetup'
import { schoolStore } from './store'
import { escapeHtml, escapeHtmlMultiline } from '../lib/security'

export { escapeHtml as esc }

/** When set, signatures/overlays use the Documents canvas customization. */
let activeCanvasKind: DocumentKind | null = null

export function withDocumentCanvas<T>(kind: DocumentKind, fn: () => T): T {
  const prev = activeCanvasKind
  activeCanvasKind = kind
  try {
    return fn()
  } finally {
    activeCanvasKind = prev
  }
}

function activeCanvas(): DocumentCanvasConfig | null {
  return activeCanvasKind ? canvasConfigFor(activeCanvasKind) : null
}

function overlayHtmlFromCanvas(cfg: DocumentCanvasConfig): string {
  const parts: string[] = []
  const stampSrc = cfg.stamp.src || defaultStampDataUrl()
  const sigSrc =
    cfg.signature.src ||
    String(defaultSignatureDataUrl(schoolSetup.headTeacher || 'Head teacher'))

  if (cfg.stamp.visible) {
    parts.push(`<div class="doc-overlay-layer" style="left:${cfg.stamp.x}%;top:${cfg.stamp.y}%;width:${cfg.stamp.width}%;opacity:${cfg.stamp.opacity}">
      <img src="${esc(stampSrc)}" alt="Digital stamp" />
    </div>`)
  }
  if (cfg.signature.visible) {
    parts.push(`<div class="doc-overlay-layer" style="left:${cfg.signature.x}%;top:${cfg.signature.y}%;width:${cfg.signature.width}%;opacity:${cfg.signature.opacity}">
      <img src="${esc(sigSrc)}" alt="Digital signature" />
    </div>`)
  }
  return parts.join('')
}

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
  | 'exam-paper'
  | 'exam-marksheet'
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
    description: 'Statutory fee invoice on official school letterhead',
    icon: 'lucide-file-text',
    modules: ['fees'],
    important: true,
  },
  {
    kind: 'receipt',
    label: 'Fee receipt',
    description: 'Statutory payment receipt with stamp and signatures',
    icon: 'lucide-receipt',
    modules: ['fees'],
    important: true,
  },
  {
    kind: 'admission-letter',
    label: 'Letter of admission',
    description: 'Statutory admission offer letter for new pupils',
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
    kind: 'exam-paper',
    label: 'Exam paper',
    description: 'Printable blank exam paper for a class assessment',
    icon: 'lucide-file-pen-line',
    modules: ['exams', 'gradebook'],
    important: true,
  },
  {
    kind: 'exam-marksheet',
    label: 'Exam mark sheet',
    description: 'Class mark sheet with learners and scores for an exam',
    icon: 'lucide-table-2',
    modules: ['exams', 'gradebook', 'exam-results'],
    important: true,
  },
  {
    kind: 'report-card',
    label: 'Term report card',
    description: 'Statutory term report card with results and attendance',
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
    exams: 'exam-paper',
    gradebook: 'exam-marksheet',
    students: 'report-card',
    attendance: 'attendance-report',
    'disciplinary-cases': 'disciplinary-notice',
  }
  return map[moduleKey] || 'generic'
}

const esc = escapeHtml

/** Shared statutory print CSS — all official school documents use this shell. */
export const statutoryDocumentCss = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Times New Roman", Times, Georgia, serif;
    color: #111;
    font-size: 12.5px;
    line-height: 1.5;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  .sheet {
    position: relative;
    max-width: 190mm;
    margin: 0 auto;
    padding: 14px 16px 12px;
    border: 2.5px solid #1f226e;
    outline: 1px solid #1f226e;
    outline-offset: 4px;
    background: #fff;
  }
  .watermark {
    position: absolute;
    inset: 28% 8%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 56px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #2e3192;
    opacity: 0.045;
    transform: rotate(-28deg);
    pointer-events: none;
    z-index: 0;
  }
  .sheet-inner { position: relative; z-index: 1; }
  .ribbon {
    margin: -14px -16px 12px;
    padding: 6px 10px;
    text-align: center;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #fff;
    background: #2e3192;
  }
  .regs {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 6px 12px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #b8bbe0;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #333;
  }
  .head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    padding-bottom: 8px;
  }
  .brand { display: flex; gap: 12px; align-items: center; min-width: 0; }
  .logo-img {
    width: 70px; height: 70px;
    object-fit: contain;
    background: #fff;
    border: 1px solid #d0d2ef;
    padding: 3px;
  }
  h1 {
    margin: 0;
    font-size: 15px;
    line-height: 1.25;
    color: #1f226e;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .motto {
    margin: 4px 0 0;
    font-style: italic;
    color: #ed1c24;
    font-size: 11px;
    font-family: Georgia, "Times New Roman", serif;
  }
  .meta {
    text-align: right;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 10px;
    color: #1f226e;
    min-width: 9rem;
  }
  .meta p { margin: 0 0 3px; }
  .accent {
    height: 3px;
    margin: 0 0 10px;
    background: linear-gradient(90deg, #2e3192 0 62%, #ed1c24 62% 100%);
  }
  .contact {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 14px;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5px;
    color: #333;
  }
  .doc-title {
    text-align: center;
    margin: 6px 0 14px;
    padding: 10px 8px;
    border-top: 1px solid #1f226e;
    border-bottom: 1px solid #1f226e;
  }
  .doc-title .kind {
    margin: 0 0 4px;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #ed1c24;
  }
  .doc-title h2 {
    margin: 0;
    border: 0;
    padding: 0;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #1f226e;
  }
  .ref-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 0 0 16px;
  }
  .ref-grid > div {
    border: 1px solid #b8bbe0;
    padding: 7px 8px;
    background: #f7f8fc;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 11px;
  }
  .ref-grid span {
    display: block;
    margin-bottom: 2px;
    font-size: 8.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #666;
  }
  h2, h3.section {
    font-size: 11px;
    margin: 18px 0 8px;
    color: #1f226e;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1px solid #b8bbe0;
    padding-bottom: 5px;
    font-family: "Helvetica Neue", Arial, sans-serif;
  }
  p { margin: 0 0 10px; }
  table.fields, table.data {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 14px;
  }
  table.fields th, table.fields td,
  table.data th, table.data td {
    border: 1px solid #9ea2d4;
    padding: 7px 9px;
    text-align: left;
    vertical-align: top;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 11.5px;
  }
  table.fields th, table.data th {
    background: #e8e9f6;
    color: #1f226e;
    font-weight: 700;
    width: 34%;
  }
  table.data thead th { width: auto; text-align: left; }
  .muted { color: #555; font-size: 11px; }
  .block { margin: 12px 0; }
  .notice {
    margin: 12px 0;
    padding: 8px 10px;
    border: 1px solid #b8bbe0;
    background: #f7f8fc;
    font-size: 11px;
  }
  .badge {
    display: inline-block;
    border: 1px solid #1f226e;
    color: #1f226e;
    padding: 2px 8px;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .sign-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1.25rem;
    margin-top: 36px;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 11px;
  }
  .sign-block { flex: 1; min-width: 0; }
  .sign-block .line {
    border-top: 1px solid #1f226e;
    margin-top: 44px;
    padding-top: 6px;
  }
  .sign-block .role {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 10px;
    color: #1f226e;
  }
  .sign-block .date-line {
    margin-top: 18px;
    border-top: 1px dotted #999;
    padding-top: 4px;
    color: #555;
    font-size: 10px;
  }
  .stamp {
    flex: 0 0 92px;
    width: 92px;
    height: 92px;
    border: 2px dashed #2e3192;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 8px;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #2e3192;
    line-height: 1.3;
    overflow: hidden;
  }
  .stamp img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .stamp.has-image {
    border-style: solid;
    border-color: transparent;
    background: transparent;
    padding: 0;
  }
  .sign-block .sig-image {
    display: block;
    max-width: 100%;
    height: 44px;
    object-fit: contain;
    object-position: left bottom;
    margin-bottom: 4px;
  }
  .doc-overlay-layer {
    position: absolute;
    z-index: 5;
    pointer-events: none;
  }
  .doc-overlay-layer img {
    width: 100%;
    height: auto;
    display: block;
  }
  .canvas-note {
    margin-top: 10px;
    padding: 8px 10px;
    border-left: 3px solid #2e3192;
    background: #f6f7fc;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5px;
    color: #333;
  }
  .footer {
    margin-top: 22px;
    padding-top: 8px;
    border-top: 1px solid #b8bbe0;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 9px;
    color: #555;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .sheet { outline-offset: 3px; }
  }
`

function issueDate() {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function letterhead(
  docTitle: string,
  refNo: string,
  opts?: { kindLabel?: string },
) {
  const address = escapeHtmlMultiline(formatSchoolAddress())
  const kind = opts?.kindLabel || 'Statutory school document'
  return `
    <div class="ribbon">Official school document · Valid on school letterhead · Keep for your records</div>
    <div class="regs">
      <span>MoES Reg: ${esc(schoolSetup.registrationNo)}</span>
      <span>UNEB Centre: ${esc(schoolSetup.unebCentre)}</span>
      <span>Est. ${esc(schoolSetup.established)}</span>
    </div>
    <header class="head">
      <div class="brand">
        <img class="logo-img" src="${esc(logoSrc())}" alt="${esc(schoolSetup.shortName)}" />
        <div>
          <h1>${esc(schoolSetup.name)}</h1>
          <p class="motto">${esc(schoolSetup.motto)}</p>
        </div>
      </div>
      <div class="meta">
        <p><strong>Republic of Uganda</strong></p>
        <p>Education institution</p>
        <p>${esc(schoolSetup.district)}, ${esc(schoolSetup.country)}</p>
      </div>
    </header>
    <div class="accent"></div>
    <div class="contact">
      <div>${address}</div>
      <div>
        Tel: ${esc(schoolSetup.phone)}
        ${schoolSetup.phoneAlt ? `<br>Alt: ${esc(schoolSetup.phoneAlt)}` : ''}
        <br>Email: ${esc(schoolSetup.email)}
        ${schoolSetup.website ? `<br>${esc(schoolSetup.website)}` : ''}
      </div>
    </div>
    <div class="doc-title">
      <p class="kind">${esc(kind)}</p>
      <h2>${esc(docTitle)}</h2>
    </div>
    <div class="ref-grid">
      <div><span>Document reference</span><strong>${esc(refNo)}</strong></div>
      <div><span>Date of issue</span><strong>${esc(issueDate())}</strong></div>
      <div><span>Academic period</span><strong>${esc(schoolSetup.currentTerm)} ${esc(schoolSetup.academicYear)}</strong></div>
    </div>
  `
}

export function wrap(
  title: string,
  body: string,
  opts?: { overlaysHtml?: string },
) {
  const cfg = activeCanvas()
  const note =
    cfg?.note?.trim()
      ? `<div class="canvas-note">${esc(cfg.note.trim())}</div>`
      : ''
  const overlays =
    opts?.overlaysHtml || (cfg ? overlayHtmlFromCanvas(cfg) : '')
  const bodyWithNote = `${body}${note}`
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>${statutoryDocumentCss}</style>
</head>
<body>
  <div class="sheet">
    <div class="watermark" aria-hidden="true">${esc(schoolSetup.initials || 'LR')}</div>
    ${overlays}
    <div class="sheet-inner">${bodyWithNote}
      <div class="footer">
        <span>Confidential · For parent / school use only · ${esc(schoolSetup.shortName)}</span>
        <span>${esc(schoolSetup.currentTerm)} ${esc(schoolSetup.academicYear)} · ${esc(schoolSetup.currency)}</span>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function fieldTable(rows: Array<[string, string]>) {
  return `<table class="fields">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><th>${esc(k)}</th><td>${esc(v || '—')}</td></tr>`,
      )
      .join('')}
  </table>`
}

export function signatures(
  left = 'Class teacher',
  right = 'Head teacher',
  opts?: {
    stampSrc?: string
    signatureSrc?: string
    showStamp?: boolean
    showSignature?: boolean
  },
) {
  const cfg = activeCanvas()
  const leftLabel = cfg?.leftSigner || left
  const rightLabel = cfg?.rightSigner || right
  // Canvas studio places stamp/signature as freeform overlays — keep sign-row lines only.
  const useCanvasOverlays = Boolean(cfg)
  const stampSrc = useCanvasOverlays
    ? ''
    : opts?.stampSrc || ''
  const signatureSrc = useCanvasOverlays
    ? ''
    : opts?.signatureSrc || ''
  const showStamp = useCanvasOverlays ? false : (opts?.showStamp ?? true)
  const showSignature = useCanvasOverlays
    ? false
    : (opts?.showSignature ?? true)

  const stampInner = stampSrc
    ? `<img src="${esc(stampSrc)}" alt="Official stamp" />`
    : 'School<br/>official<br/>stamp'
  const stampClass = stampSrc ? 'stamp has-image' : 'stamp'
  const stampHtml = showStamp
    ? `<div class="${stampClass}">${stampInner}</div>`
    : '<div style="flex:0 0 92px"></div>'

  const sigImg =
    showSignature && signatureSrc
      ? `<img class="sig-image" src="${esc(signatureSrc)}" alt="Signature" />`
      : ''

  return `<div class="sign-row">
    <div class="sign-block">
      <div class="line">
        <div class="role">${esc(leftLabel)}</div>
        <div>Name &amp; signature</div>
      </div>
      <div class="date-line">Date</div>
    </div>
    ${stampHtml}
    <div class="sign-block">
      ${sigImg}
      <div class="line">
        <div class="role">${esc(rightLabel)}</div>
        <div>${esc(schoolSetup.headTeacher)}</div>
      </div>
      <div class="date-line">Date</div>
    </div>
  </div>`
}

function section(title: string) {
  return `<h3 class="section">${esc(title)}</h3>`
}

function findStudentByName(name: string) {
  return schoolStore.students?.rows.find((r) => r.name === name)
}

function examLearners(exam: CatalogRow) {
  const className = String(exam.className || '')
  const learners = (schoolStore.students?.rows || []).filter(
    (s) => String(s.className) === className && s.status === 'Active',
  )
  return learners.length
    ? learners
    : (schoolStore.students?.rows || []).slice(0, 8)
}

function examQuestions(exam: CatalogRow) {
  let raw: unknown = exam.questions
  if (typeof exam.questionsJson === 'string' && exam.questionsJson.trim()) {
    try {
      raw = JSON.parse(exam.questionsJson)
    } catch {
      raw = []
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((q, i) => {
      if (!q || typeof q !== 'object') return null
      const row = q as Record<string, unknown>
      const text = String(row.text || '').trim()
      if (!text) return null
      return {
        n: i + 1,
        text,
        marks: Math.max(0, Number(row.marks) || 0),
      }
    })
    .filter(Boolean) as { n: number; text: string; marks: number }[]
}

function buildExamPaper(exam: CatalogRow): { title: string; html: string } {
  const max = Number(exam.maxScore || 100)
  const title = `Exam paper · ${exam.name}`
  const questions = examQuestions(exam)
  const questionBlock = questions.length
    ? `<ol style="padding-left:1.25rem;margin:0 0 1rem">
        ${questions
          .map(
            (q) => `<li style="margin:0 0 1rem">
              <div><strong>Question ${q.n}</strong>
              ${q.marks ? ` <span class="muted">(${q.marks} mark${q.marks === 1 ? '' : 's'})</span>` : ''}</div>
              <div style="margin-top:0.35rem">${escapeHtmlMultiline(q.text)}</div>
              <div style="border-bottom:1px solid #c5c7e8;height:22px;margin:8px 0 4px"></div>
              <div style="border-bottom:1px solid #c5c7e8;height:22px;margin:4px 0"></div>
              <div style="border-bottom:1px solid #c5c7e8;height:22px;margin:4px 0"></div>
            </li>`,
          )
          .join('')}
      </ol>`
    : `<p class="muted">No typed questions were saved for this exam. Learners may use the ruled space below.</p>
      ${Array.from({ length: 12 })
        .map(
          () =>
            `<div style="border-bottom:1px solid #c5c7e8;height:28px;margin:6px 0;"></div>`,
        )
        .join('')}`
  const html = wrap(
    title,
    `${letterhead(String(exam.name), String(exam.id), { kindLabel: 'Statutory examination paper' })}
    ${section('Paper particulars')}
    ${fieldTable([
      ['Class', String(exam.className || '—')],
      ['Subject', String(exam.course || '—')],
      ['Type', String(exam.type || 'Assessment')],
      ['Date', String(exam.date || '—')],
      ['Maximum marks', String(max)],
      ['Questions', String(questions.length || '—')],
      ['Duration', String(exam.duration || 'As instructed')],
    ])}
    ${section('Learner details (to be completed)')}
    <table class="fields">
      <tr><th>Learner name</th><td></td></tr>
      <tr><th>Student number</th><td></td></tr>
      <tr><th>Class / stream</th><td>${esc(String(exam.className || ''))}</td></tr>
    </table>
    <div class="notice"><strong>Instructions:</strong> Write clearly. Show working where required. Total marks ${esc(String(max))}. Do not open this paper until told to do so.</div>
    ${exam.subtitle ? `<p class="block">${escapeHtmlMultiline(String(exam.subtitle))}</p>` : ''}
    ${section('Questions')}
    ${questionBlock}
    ${signatures('Invigilator', 'Subject teacher')}`,
  )
  return { title, html }
}

function buildExamMarksheet(exam: CatalogRow): { title: string; html: string } {
  const max = Number(exam.maxScore || 100)
  const examName = String(exam.name)
  const className = String(exam.className || '')
  const learners = examLearners(exam)
  const results = schoolStore['exam-results']?.rows || []
  const rowsHtml = learners
    .map((s, i) => {
      const existing = results.find(
        (r) =>
          String(r.exam) === examName &&
          (String(r.studentId) === s.id || r.name === s.name),
      )
      const score = existing ? String(existing.score ?? '') : ''
      const grade = existing ? String(existing.grade || '') : ''
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(s.id)}</td>
        <td>${esc(s.name)}</td>
        <td>${esc(score)}</td>
        <td>${esc(grade)}</td>
        <td></td>
      </tr>`
    })
    .join('')
  const title = `Mark sheet · ${examName}`
  const html = wrap(
    title,
    `${letterhead(examName, String(exam.id), { kindLabel: 'Statutory mark sheet' })}
    ${section('Assessment particulars')}
    ${fieldTable([
      ['Class', className || '—'],
      ['Subject', String(exam.course || '—')],
      ['Type', String(exam.type || 'Assessment')],
      ['Date', String(exam.date || '—')],
      ['Maximum marks', String(max)],
      ['Learners', String(learners.length)],
    ])}
    ${section('Class mark list')}
    <table class="data">
      <thead>
        <tr>
          <th style="width:8%">#</th>
          <th style="width:14%">Student No.</th>
          <th>Learner</th>
          <th style="width:12%">Score</th>
          <th style="width:12%">Grade</th>
          <th style="width:16%">Remark</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="6">No learners found for this class.</td></tr>`}
      </tbody>
    </table>
    <p class="muted">Scores use a maximum of ${esc(String(max))}. Blank score cells may be completed by hand before office entry.</p>
    ${signatures('Class / subject teacher', 'Head teacher')}`,
  )
  return { title, html }
}

/** Print exam paper and/or class mark sheet in a single print dialog. */
export function printExamPack(
  exam: CatalogRow,
  parts: Array<'paper' | 'marksheet'> = ['paper', 'marksheet'],
) {
  const unique = Array.from(new Set(parts))
  const docs = unique.map((part) => {
    const kind: DocumentKind =
      part === 'paper' ? 'exam-paper' : 'exam-marksheet'
    return buildDocumentHtml(kind, 'exams', exam)
  })
  if (!docs.length) return []
  if (docs.length === 1) {
    openPrintWindow(docs[0].title, docs[0].html)
    return [docs[0].title]
  }
  // One dialog only — stacking print() calls re-opens when the user closes the first.
  const sheets = docs
    .map((doc, index) => {
      const match = doc.html.match(
        /<div class="sheet">([\s\S]*?)<\/div>\s*<\/body>/i,
      )
      const inner = match?.[1] || ''
      const breakStyle = index > 0 ? ' page-break-before: always;' : ''
      return `<div class="sheet" style="${breakStyle}">${inner}</div>`
    })
    .join('\n')
  const shell = docs[0].html.replace(
    /<div class="sheet">[\s\S]*?<\/div>\s*<\/body>/i,
    `${sheets}</body>`,
  )
  const title = docs.map((d) => d.title).join(' + ')
  openPrintWindow(title, shell)
  return docs.map((d) => d.title)
}

function buildDocumentHtmlInner(
  kind: DocumentKind,
  moduleKey: string,
  row: CatalogRow,
): { title: string; html: string } {
  if (kind === 'invoice' || (kind === 'generic' && moduleKey === 'fees')) {
    const title = `Fee Invoice · ${row.invoice || row.id}`
    const html = wrap(
      title,
      `${letterhead('Fee Invoice', String(row.invoice || row.id), { kindLabel: 'Statutory fee invoice' })}
      ${section('Invoice particulars')}
      ${fieldTable([
        ['Student', row.name],
        ['Invoice no.', String(row.invoice || row.id)],
        ['Amount due', String(row.amount || '—')],
        ['Amount paid', String(row.paid || '—')],
        ['Status', String(row.status || '—')],
        ['Currency', schoolSetup.currency],
      ])}
      <div class="notice">Please settle outstanding balances at the school accounts office. This invoice is an official school record — retain for your files.</div>
      ${signatures('Accounts officer', 'Head teacher')}`,
    )
    return { title, html }
  }

  if (kind === 'receipt') {
    const receiptNo = `RCP-${String(row.invoice || row.id).replace(/^INV-/, '')}`
    const title = `Fee Receipt · ${receiptNo}`
    const html = wrap(
      title,
      `${letterhead('Official Fee Receipt', receiptNo, { kindLabel: 'Statutory payment receipt' })}
      <p>Received with thanks from the guardian of <strong>${esc(row.name)}</strong>.</p>
      ${section('Receipt particulars')}
      ${fieldTable([
        ['Receipt no.', receiptNo],
        ['Invoice no.', String(row.invoice || row.id)],
        ['Amount received', String(row.paid || row.amount || '—')],
        ['Invoice total', String(row.amount || '—')],
        ['Payment status', String(row.status || '—')],
        ['Currency', schoolSetup.currency],
      ])}
      <div class="notice">This receipt is computer-generated on school letterhead and is valid with the school stamp and authorised signature.</div>
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
      `${letterhead('Letter of Admission', String(row.id), { kindLabel: 'Statutory admission offer' })}
      <p>Dear Parent / Guardian,</p>
      <p class="block">
        We are pleased to offer <strong>${esc(row.name)}</strong> admission to
        <strong>${esc(schoolSetup.name)}</strong> for the
        <strong>${esc(program)}</strong> section,
        <strong>${esc(term)} ${esc(schoolSetup.academicYear)}</strong>.
      </p>
      ${section('Admission particulars')}
      ${fieldTable([
        ['Admission / Ref', row.id],
        ['Student', row.name],
        ['Section', program],
        ['Term', `${term} ${schoolSetup.academicYear}`],
        ['Admission fee', String(row.fee || 'As per fee schedule')],
        ['Status', String(row.status || '—')],
      ])}
      <div class="notice">
        Complete registration at the school office within 14 days of this letter.
        Bring a birth certificate / passport photo and settle any admission fees.
      </div>
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
      `${letterhead('Student Examination Report', String(row.id), { kindLabel: 'Statutory examination report' })}
      <p>To the Parent / Guardian of <strong>${esc(studentName)}</strong>,</p>
      <p class="block">
        Please find the assessment outcome for
        <strong>${esc(examLabel)}</strong>.
      </p>
      ${section('Result particulars')}
      ${fieldTable([
        ['Student', studentName],
        ['Assessment', examLabel],
        ['Score', String(row.score ?? '—')],
        ['Grade', String(row.grade || '—')],
        ['Result', String(row.status || '—')],
        ['Report ref', row.id],
      ])}
      <p class="muted">
        Please discuss this report with your child. For clarification, contact the
        class teacher or academic office on ${esc(schoolSetup.phone)}.
      </p>
      ${signatures('Subject / Class teacher', 'Head teacher')}`,
    )
    return { title, html }
  }

  if (kind === 'exam-paper') {
    return buildExamPaper(row)
  }

  if (kind === 'exam-marksheet') {
    return buildExamMarksheet(row)
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
      `${letterhead('Term Report Card', String(student.id), { kindLabel: 'Statutory learner report' })}
      ${section('Learner particulars')}
      ${fieldTable([
        ['Student', student.name],
        ['Student number', student.id],
        ['Class', String(student.className || '—')],
        ['Section', String(student.program || '—')],
        ['Average', student.average != null ? String(student.average) : '—'],
        [
          'Attendance',
          attendance.length
            ? `${present} / ${attendance.length} sessions`
            : '—',
        ],
      ])}
      ${section('Term assessment (NCDC / UNEB)')}
      <table class="data">
        <thead><tr><th>Subject / paper</th><th>Mark %</th><th>Agg / band</th><th>Status</th></tr></thead>
        <tbody>${resultRows}</tbody>
      </table>
      <div class="notice">
        Nursery reports use readiness bands (Emerging–Exceeding). Primary uses
        UNEB-style aggregates (D1–F9). Contact the school on
        ${esc(schoolSetup.phone)} for clarification.
      </div>
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
      `${letterhead('Attendance Report', `ATT-${new Date().toISOString().slice(0, 10)}`, { kindLabel: 'Statutory attendance record' })}
      ${section('Attendance listing')}
      <p class="muted">${rows.length} record(s) in this extract.</p>
      <table class="data">
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
      `${letterhead('Disciplinary Notice', String(row.id), { kindLabel: 'Statutory disciplinary notice' })}
      <p>Dear Parent / Guardian of <strong>${esc(row.student || row.name)}</strong>,</p>
      <p class="block">
        This notice concerns a disciplinary matter recorded by the school. Please discuss it with your child and contact the class teacher if needed.
      </p>
      ${section('Case particulars')}
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
      ${row.subtitle ? `<div class="notice"><strong>Notes:</strong> ${esc(row.subtitle)}</div>` : ''}
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
    `${letterhead(String(row.name), String(row.id), { kindLabel: 'Statutory school record' })}
    <p><span class="badge">${esc(row.status || moduleKey)}</span></p>
    ${section('Record particulars')}
    ${fieldTable(entries)}
    ${signatures('Prepared by', 'Authorised by')}`,
  )
  return { title, html }
}

export function buildDocumentHtml(
  kind: DocumentKind,
  moduleKey: string,
  row: CatalogRow,
): { title: string; html: string } {
  return withDocumentCanvas(kind, () =>
    buildDocumentHtmlInner(kind, moduleKey, row),
  )
}

/** Prevents a second system print dialog while one is already open. */
let printDialogOpen = false
let printGeneration = 0

function clearPrintFrame() {
  document.getElementById('lr-print-frame')?.remove()
}

/**
 * Print without `window.open` — browsers block pop-ups on Vercel / production.
 * Uses a same-origin hidden iframe and opens the system print dialog once.
 * Closing the dialog will not spawn another print.
 */
export function openPrintWindow(title: string, html: string) {
  if (printDialogOpen) {
    // Ignore repeat clicks / stacked print calls while the dialog is up
    return null
  }

  clearPrintFrame()
  const generation = ++printGeneration
  printDialogOpen = true

  const iframe = document.createElement('iframe')
  iframe.id = 'lr-print-frame'
  iframe.title = title
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('sandbox', 'allow-modals allow-same-origin')
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
  iframe.srcdoc = html
  document.body.appendChild(iframe)

  let printed = false
  let readyHandled = false
  const timers = new Set<number>()

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id)
      if (generation !== printGeneration) return
      fn()
    }, ms)
    timers.add(id)
    return id
  }

  const clearTimers = () => {
    for (const id of timers) window.clearTimeout(id)
    timers.clear()
  }

  const release = () => {
    if (generation !== printGeneration) return
    clearTimers()
    printDialogOpen = false
    schedule(() => {
      if (generation === printGeneration) clearPrintFrame()
    }, 400)
  }

  const triggerPrint = () => {
    if (printed || generation !== printGeneration) return
    printed = true
    clearTimers()

    const win = iframe.contentWindow
    if (!win) {
      release()
      return
    }

    const onAfterPrint = () => {
      win.removeEventListener('afterprint', onAfterPrint)
      release()
    }
    win.addEventListener('afterprint', onAfterPrint)

    try {
      win.focus()
      win.print()
    } catch {
      release()
      return
    }

    // Browsers that never fire afterprint — release after the dialog can close
    schedule(() => {
      win.removeEventListener('afterprint', onAfterPrint)
      release()
    }, 120_000)
  }

  const waitForImagesThenPrint = (doc: Document) => {
    doc.title = title
    const images = Array.from(doc.images || [])
    if (!images.length) {
      schedule(triggerPrint, 60)
      return
    }
    let pending = images.length
    let settled = false
    const settle = () => {
      if (settled || generation !== printGeneration) return
      settled = true
      schedule(triggerPrint, 60)
    }
    const done = () => {
      pending -= 1
      if (pending <= 0) settle()
    }
    images.forEach((img) => {
      if (img.complete) done()
      else {
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
      }
    })
    // Only if images hang — never a second print after the first
    schedule(settle, 2000)
  }

  const onReady = () => {
    if (readyHandled || printed || generation !== printGeneration) return
    readyHandled = true
    const doc = iframe.contentDocument
    if (!doc) {
      schedule(triggerPrint, 100)
      return
    }
    waitForImagesThenPrint(doc)
  }

  iframe.addEventListener('load', onReady, { once: true })
  schedule(() => {
    if (!readyHandled && iframe.contentDocument?.readyState === 'complete') {
      onReady()
    }
  }, 100)

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
