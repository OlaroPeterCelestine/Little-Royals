import { createWorker, type Worker } from 'tesseract.js'

export type ScanTarget =
  | 'applicants'
  | 'students'
  | 'fees'
  | 'guardians'
  | 'payments'

export interface ScanTargetDef {
  id: ScanTarget
  label: string
  description: string
  icon: string
  moduleKey: ScanTarget
  statusDefault: string
}

export const scanTargets: ScanTargetDef[] = [
  {
    id: 'applicants',
    label: 'Admission form',
    description: 'Scan an application or birth-certificate details into applicants',
    icon: 'lucide-user-plus',
    moduleKey: 'applicants',
    statusDefault: 'Pending',
  },
  {
    id: 'students',
    label: 'Student registration',
    description: 'Scan a registration sheet into the student register',
    icon: 'lucide-graduation-cap',
    moduleKey: 'students',
    statusDefault: 'Active',
  },
  {
    id: 'fees',
    label: 'Fee invoice / receipt',
    description: 'Scan a paper invoice or bank slip into fees',
    icon: 'lucide-receipt',
    moduleKey: 'fees',
    statusDefault: 'Unpaid',
  },
  {
    id: 'guardians',
    label: 'Guardian / contact',
    description: 'Scan a parent contact card or ID details',
    icon: 'lucide-heart-handshake',
    moduleKey: 'guardians',
    statusDefault: 'Active',
  },
  {
    id: 'payments',
    label: 'Payment slip',
    description: 'Scan a MoMo or bank payment confirmation',
    icon: 'lucide-wallet',
    moduleKey: 'payments',
    statusDefault: 'Pending',
  },
]

export interface ScannedFields {
  name: string
  program: string
  grade: string
  className: string
  phone: string
  email: string
  student: string
  relation: string
  amount: string
  paid: string
  invoice: string
  channel: string
  applied: string
  status: string
  notes: string
}

export function emptyScannedFields(): ScannedFields {
  return {
    name: '',
    program: '',
    grade: '',
    className: '',
    phone: '',
    email: '',
    student: '',
    relation: '',
    amount: '',
    paid: '',
    invoice: '',
    channel: '',
    applied: '',
    status: '',
    notes: '',
  }
}

const GRADE_RE =
  /\b(Baby\s*Class|Middle\s*Class|Top\s*Class|P\.?\s*[1-7]|Primary\s*[1-7]|Nursery)\b/i
const PROGRAM_RE = /\b(Nursery|Primary|PLE)\b/i
const PHONE_RE =
  /(?:\+?256[\s-]*)?(?:0?7\d{1}[\s-]?\d{3}[\s-]?\d{3,4}|\d{3}[\s-]?\d{3}[\s-]?\d{3,4})/
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const INVOICE_RE = /\b(?:INV|FEE|RCP)[- ]?\d{2,6}\b/i
const AMOUNT_RE =
  /(?:UGX|Ush|Shs\.?)\s*([\d,]{3,})|\b([\d,]{4,})\s*(?:UGX|Ush)?/i
const DATE_RE =
  /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:\d{1,2}\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4})\b/i
const NAME_LABEL_RE =
  /(?:(?:pupil|student|applicant|child|learner|name|full\s*name)\s*[:\-]\s*)([A-Za-z][A-Za-z.'\-\s]{2,40})/i
const GUARDIAN_LABEL_RE =
  /(?:(?:guardian|parent|father|mother|contact)\s*[:\-]\s*)([A-Za-z][A-Za-z.'\-\s]{2,40})/i
const RELATION_RE = /\b(Father|Mother|Guardian|Uncle|Aunt|Brother|Sister)\b/i
const CHANNEL_RE = /\b(MTN\s*MoMo|Airtel\s*Money|Bank(?:\s*transfer)?|Cash)\b/i

function cleanLine(line: string) {
  return line.replace(/\s+/g, ' ').trim()
}

function pickLabeled(text: string, re: RegExp) {
  const m = text.match(re)
  return m?.[1]?.trim() || ''
}

function normalizeGrade(raw: string) {
  const g = raw.replace(/\s+/g, ' ').trim()
  if (/baby/i.test(g)) return 'Baby Class'
  if (/middle/i.test(g)) return 'Middle Class'
  if (/top/i.test(g)) return 'Top Class'
  const p = g.match(/P\.?\s*([1-7])/i)
  if (p) return `P.${p[1]}`
  if (/nursery/i.test(g)) return 'Nursery'
  return g
}

function normalizeProgram(raw: string, grade: string) {
  if (raw) {
    if (/nursery/i.test(raw)) return 'Nursery'
    if (/primary|ple/i.test(raw)) return 'Primary'
  }
  if (/Baby|Middle|Top|Nursery/i.test(grade)) return 'Nursery'
  if (/P\.[1-7]/i.test(grade)) return 'Primary'
  return raw
}

function formatUgx(n: string) {
  const digits = n.replace(/[^\d]/g, '')
  if (!digits) return ''
  return `UGX ${Number(digits).toLocaleString('en-UG')}`
}

function guessPersonName(lines: string[], text: string) {
  const labeled = pickLabeled(text, NAME_LABEL_RE)
  if (labeled && labeled.split(' ').length >= 2) return labeled

  for (const line of lines) {
    if (
      /little royals|application|admission|invoice|receipt|form|school|date|class|fee/i.test(
        line,
      )
    )
      continue
    if (/^\d/.test(line)) continue
    if (line.split(' ').length >= 2 && line.split(' ').length <= 4) {
      if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+)+$/.test(line)) return line
      if (/^[A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+)+$/.test(line))
        return line
    }
  }
  return ''
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

/** Parse OCR text into editable school fields. */
export function parseScannedText(
  rawText: string,
  target: ScanTarget,
): ScannedFields {
  const text = rawText.replace(/\r/g, '\n')
  const lines = text
    .split('\n')
    .map(cleanLine)
    .filter((l) => l.length > 1)

  const fields = emptyScannedFields()
  fields.notes = lines.slice(0, 12).join('\n')

  const gradeMatch = text.match(GRADE_RE)
  fields.grade = gradeMatch ? normalizeGrade(gradeMatch[0]) : ''
  fields.className = fields.grade

  const programMatch = text.match(PROGRAM_RE)
  fields.program = normalizeProgram(programMatch?.[0] || '', fields.grade)

  const phone = text.match(PHONE_RE)
  fields.phone = phone ? phone[0].replace(/\s+/g, ' ').trim() : ''

  const email = text.match(EMAIL_RE)
  fields.email = email ? email[0] : ''

  const invoice = text.match(INVOICE_RE)
  fields.invoice = invoice
    ? invoice[0].toUpperCase().replace(/\s+/g, '-')
    : ''

  const amount = text.match(AMOUNT_RE)
  if (amount) {
    const n = amount[1] || amount[2] || ''
    fields.amount = formatUgx(n)
    if (/paid|received|cleared/i.test(text)) fields.paid = fields.amount
  }

  const date = text.match(DATE_RE)
  fields.applied = date ? cleanLine(date[0]) : todayIso()

  const channel = text.match(CHANNEL_RE)
  fields.channel = channel
    ? channel[0].replace(/\s+/g, ' ').replace(/bank$/i, 'Bank transfer')
    : ''

  const relation = text.match(RELATION_RE)
  fields.relation = relation ? relation[0] : ''

  fields.name = guessPersonName(lines, text)

  if (target === 'guardians') {
    const g = pickLabeled(text, GUARDIAN_LABEL_RE)
    if (g) fields.name = g
    const studentLabeled = pickLabeled(
      text,
      /(?:(?:pupil|student|child|learner)\s*[:\-]\s*)([A-Za-z][A-Za-z.'\-\s]{2,40})/i,
    )
    fields.student = studentLabeled || fields.student
    if (!fields.relation) fields.relation = 'Guardian'
  }

  if (target === 'fees' || target === 'payments') {
    if (!fields.name) fields.name = guessPersonName(lines, text)
    if (target === 'payments' && !fields.channel) {
      fields.channel = /airtel/i.test(text)
        ? 'Airtel Money'
        : /mtn|momo/i.test(text)
          ? 'MTN MoMo'
          : 'Cash'
    }
    if (/paid|cleared|full/i.test(text) && fields.amount) {
      fields.paid = fields.amount
      fields.status = target === 'fees' ? 'Paid' : 'Reconciled'
    }
  }

  if (target === 'students' && fields.grade && !fields.className) {
    fields.className = fields.grade
  }

  const def = scanTargets.find((t) => t.id === target)
  fields.status = fields.status || def?.statusDefault || 'Pending'

  return fields
}

let worker: Worker | null = null
let workerReady: Promise<Worker> | null = null

async function getWorker(onProgress?: (pct: number, status: string) => void) {
  if (worker) return worker
  if (!workerReady) {
    workerReady = (async () => {
      const w = await createWorker('eng', 1, {
        logger: (m) => {
          if (!onProgress) return
          const pct =
            typeof m.progress === 'number'
              ? Math.round(m.progress * 100)
              : 0
          onProgress(pct, String(m.status || 'scanning'))
        },
      })
      worker = w
      return w
    })()
  }
  return workerReady
}

export async function recognizeImage(
  source: File | Blob | string,
  onProgress?: (pct: number, status: string) => void,
): Promise<{ text: string; confidence: number }> {
  const w = await getWorker(onProgress)
  const result = await w.recognize(source)
  return {
    text: result.data.text || '',
    confidence: result.data.confidence || 0,
  }
}

export async function terminateScanWorker() {
  if (worker) {
    await worker.terminate()
    worker = null
    workerReady = null
  }
}

/** Map edited fields into values for addRecord. */
export function fieldsToRecordValues(
  target: ScanTarget,
  fields: ScannedFields,
): Record<string, string> {
  const name = fields.name.trim()
  const base: Record<string, string> = {
    name,
    status: fields.status || 'Pending',
    subtitle: 'Scanned from photo',
  }

  if (target === 'applicants') {
    return {
      ...base,
      program: fields.program || 'Primary',
      grade: fields.grade || fields.className || '',
      applied: fields.applied || todayIso(),
      phone: fields.phone,
      email: fields.email,
      notes: fields.notes,
    }
  }

  if (target === 'students') {
    return {
      ...base,
      program: fields.program || 'Primary',
      className: fields.className || fields.grade || '',
      email: fields.email,
      phone: fields.phone,
      average: '0',
    }
  }

  if (target === 'fees') {
    return {
      ...base,
      invoice: fields.invoice || `INV-${Date.now().toString().slice(-4)}`,
      amount: fields.amount || 'UGX 0',
      paid: fields.paid || 'UGX 0',
      notes: fields.notes,
    }
  }

  if (target === 'guardians') {
    return {
      ...base,
      relation: fields.relation || 'Guardian',
      student: fields.student || '',
      phone: fields.phone,
      email: fields.email,
      primary: 'Yes',
    }
  }

  // payments
  const amountNum = fields.amount.replace(/[^\d]/g, '') || '0'
  return {
    ...base,
    student: fields.student || fields.name,
    amount: amountNum,
    channel: fields.channel || 'Cash',
    phone: fields.phone,
    reference: fields.invoice,
    notes: fields.notes,
  }
}
