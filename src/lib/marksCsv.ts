import { sanitizeNumber, sanitizeText } from './sanitize'

export type MarksCsvRow = {
  studentId: string
  learnerNumber: string
  name: string
  score: number
  maxScore: number
  grade?: string
}

const HEADERS = [
  'student_number',
  'learner_number',
  'student_name',
  'score',
  'max_score',
  'grade',
] as const

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function marksRowsToCsv(
  rows: MarksCsvRow[],
  meta?: { exam?: string; className?: string; subject?: string },
): string {
  const lines: string[] = []
  if (meta?.exam || meta?.className) {
    lines.push(
      `# exam,${escapeCsvCell(meta.exam || '')}`,
      `# class,${escapeCsvCell(meta.className || '')}`,
      `# subject,${escapeCsvCell(meta.subject || '')}`,
      `# Fill score column then import. grade is optional (auto-calculated).`,
    )
  }
  lines.push(HEADERS.join(','))
  for (const r of rows) {
    lines.push(
      [
        escapeCsvCell(r.studentId),
        escapeCsvCell(r.learnerNumber || r.studentId),
        escapeCsvCell(r.name),
        escapeCsvCell(r.score),
        escapeCsvCell(r.maxScore),
        escapeCsvCell(r.grade || ''),
      ].join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

function normHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/^\ufeff/, '')
    .replace(/[\s-]+/g, '_')
    .trim()
}

export type ParsedMarksCsv = {
  rows: MarksCsvRow[]
  errors: string[]
  skipped: number
}

/** Parse a marks CSV (template or export). Comment lines starting with # are ignored. */
export function parseMarksCsv(
  text: string,
  defaultMaxScore = 100,
): ParsedMarksCsv {
  const errors: string[] = []
  const rows: MarksCsvRow[] = []
  let skipped = 0
  const lines = String(text || '')
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

  if (!lines.length) {
    return { rows, errors: ['CSV is empty'], skipped: 0 }
  }

  const headerCells = splitCsvLine(lines[0]).map(normHeader)
  const idx = {
    studentId: headerCells.findIndex((h) =>
      ['student_number', 'student_id', 'studentno', 'id', 'sn'].includes(h),
    ),
    learnerNumber: headerCells.findIndex((h) =>
      ['learner_number', 'learner_no', 'learner_id', 'ln'].includes(h),
    ),
    name: headerCells.findIndex((h) =>
      ['student_name', 'name', 'learner', 'student'].includes(h),
    ),
    score: headerCells.findIndex((h) =>
      ['score', 'marks', 'mark'].includes(h),
    ),
    maxScore: headerCells.findIndex((h) =>
      ['max_score', 'max', 'maximum', 'out_of'].includes(h),
    ),
    grade: headerCells.findIndex((h) => ['grade', 'aggregate'].includes(h)),
  }

  if (idx.score < 0) {
    errors.push('Missing required column: score')
    return { rows, errors, skipped: 0 }
  }
  if (idx.studentId < 0 && idx.learnerNumber < 0 && idx.name < 0) {
    errors.push(
      'Need at least one of: student_number, learner_number, or student_name',
    )
    return { rows, errors, skipped: 0 }
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    if (!cells.some((c) => c)) {
      skipped++
      continue
    }
    const studentId = sanitizeText(
      idx.studentId >= 0 ? cells[idx.studentId] : '',
      'id',
      64,
    )
    const learnerNumber = sanitizeText(
      idx.learnerNumber >= 0 ? cells[idx.learnerNumber] : studentId,
      'id',
      64,
    )
    const name = sanitizeText(
      idx.name >= 0 ? cells[idx.name] : '',
      'name',
      120,
    )
    const scoreRaw = sanitizeNumber(
      idx.score >= 0 ? cells[idx.score] : '',
    )
    const maxRaw = sanitizeNumber(
      idx.maxScore >= 0 ? cells[idx.maxScore] : defaultMaxScore,
    )
    if (scoreRaw === '' && !name && !studentId) {
      skipped++
      continue
    }
    if (!studentId && !learnerNumber && !name) {
      errors.push(`Row ${i + 1}: missing student identity`)
      skipped++
      continue
    }
    const maxScore =
      typeof maxRaw === 'number' && maxRaw > 0 ? maxRaw : defaultMaxScore
    const score =
      typeof scoreRaw === 'number'
        ? Math.max(0, Math.min(maxScore, scoreRaw))
        : 0
    rows.push({
      studentId: studentId || learnerNumber,
      learnerNumber: learnerNumber || studentId,
      name,
      score,
      maxScore,
      grade:
        idx.grade >= 0
          ? sanitizeText(cells[idx.grade], 'text', 16)
          : undefined,
    })
  }

  return { rows, errors, skipped }
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function safeCsvFilename(parts: string[]): string {
  return parts
    .map((p) =>
      String(p || '')
        .replace(/[^\w.\-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 40),
    )
    .filter(Boolean)
    .join('_')
}
