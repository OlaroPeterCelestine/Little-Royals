/**
 * Harden user-facing text before it enters forms / the store.
 * Strips HTML/script risk, control chars, and normalizes whitespace.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const HTML_TAGS = /<\/?[^>]+>/g
const SCRIPTISH =
  /javascript\s*:|data\s*:|vbscript\s*:|on\w+\s*=/gi

export type SanitizeKind =
  | 'text'
  | 'textarea'
  | 'name'
  | 'email'
  | 'phone'
  | 'number'
  | 'currency'
  | 'date'
  | 'time'
  | 'url'
  | 'id'
  | 'select'
  | 'search'
  | 'file'
  | 'readonly'
  | 'checkbox'
  | 'toggle'
  | 'radio'
  | 'multiselect'

function stripDangerous(raw: string): string {
  return raw
    .replace(HTML_TAGS, '')
    .replace(SCRIPTISH, '')
    .replace(CONTROL_CHARS, '')
}

function collapseSpaces(raw: string): string {
  return raw.replace(/[ \t\f\v]+/g, ' ').trim()
}

function collapseMultiline(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function sanitizeText(
  value: unknown,
  kind: SanitizeKind = 'text',
  maxLen = 2000,
): string {
  if (value == null) return ''
  let s = String(value)
  s = stripDangerous(s)

  switch (kind) {
    case 'textarea':
      s = collapseMultiline(s)
      maxLen = Math.max(maxLen, 8000)
      break
    case 'email':
      s = collapseSpaces(s).toLowerCase().slice(0, 254)
      s = s.replace(/[^a-z0-9.@_+-]/g, '')
      break
    case 'phone':
      s = s.replace(/[^\d+()\-\s]/g, '')
      s = collapseSpaces(s).slice(0, 32)
      break
    case 'number':
    case 'currency':
      s = s.replace(/[^\d.\-]/g, '').slice(0, 24)
      break
    case 'date':
      s = s.replace(/[^\d\-]/g, '').slice(0, 10)
      break
    case 'time':
      s = s.replace(/[^\d:]/g, '').slice(0, 8)
      break
    case 'url':
      s = collapseSpaces(s).slice(0, 2048)
      if (s && !/^https?:\/\//i.test(s) && !s.startsWith('/')) {
        s = s.replace(/^\/+/, '')
      }
      if (/^(javascript|data|vbscript):/i.test(s)) s = ''
      break
    case 'id':
      s = collapseSpaces(s)
        .replace(/[^A-Za-z0-9._\-]/g, '')
        .slice(0, 64)
      break
    case 'name':
      s = collapseSpaces(s).slice(0, 120)
      break
    case 'select':
    case 'search':
    case 'radio':
    case 'file':
    case 'readonly':
      s = collapseSpaces(s).slice(0, maxLen)
      break
    case 'checkbox':
    case 'toggle':
      return s
    default:
      s = collapseSpaces(s)
      break
  }

  if (s.length > maxLen) s = s.slice(0, maxLen)
  return s
}

export function sanitizeNumber(value: unknown): number | '' {
  if (value === '' || value == null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const cleaned = sanitizeText(value, 'number')
  if (!cleaned || cleaned === '-' || cleaned === '.') return ''
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : ''
}

/** Sanitize a free-form field value for store persistence. */
export function sanitizeFieldValue(
  key: string,
  value: unknown,
  kind?: SanitizeKind,
): string | number | boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => sanitizeText(v, 'text', 200))
      .filter(Boolean)
      .join(', ')
  }

  const inferred: SanitizeKind =
    kind ||
    (key === 'email'
      ? 'email'
      : key === 'phone' || key === 'altPhone'
        ? 'phone'
        : key === 'id' || key.endsWith('Id') || key.endsWith('Number')
          ? 'id'
          : key === 'name' ||
              key === 'firstName' ||
              key === 'lastName' ||
              key === 'otherNames'
            ? 'name'
            : key.toLowerCase().includes('date')
              ? 'date'
              : key === 'score' ||
                  key === 'maxScore' ||
                  key === 'percent' ||
                  key === 'average' ||
                  key === 'amount' ||
                  key === 'paid'
                ? 'number'
                : key === 'address' ||
                    key === 'subtitle' ||
                    key === 'medicalAlerts' ||
                    key === 'specialNeeds' ||
                    key === 'dietaryNotes' ||
                    key === 'notes' ||
                    key === 'bio'
                  ? 'textarea'
                  : 'text')

  if (inferred === 'number' || inferred === 'currency') {
    const n = sanitizeNumber(value)
    return n === '' ? '' : n
  }

  return sanitizeText(value, inferred)
}

/** Deep-sanitize a form payload object before create/update. */
export function sanitizeRecordValues(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(values)) {
    if (raw === undefined) continue
    if (raw === null) {
      out[key] = null
      continue
    }
    if (typeof raw === 'boolean') {
      out[key] = raw
      continue
    }
    out[key] = sanitizeFieldValue(key, raw)
  }
  return out
}
