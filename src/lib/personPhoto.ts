/** Learner / staff photo URL — uploaded data URL, path, or generated portrait. */

const PALETTE = [
  ['#1d4f91', '#7eb6e8'],
  ['#0f6b4c', '#7dcea0'],
  ['#8a4b12', '#e6b980'],
  ['#6b2d5c', '#d4a5c9'],
  ['#8b3a3a', '#e8a0a0'],
  ['#2f4f6f', '#9bb8d4'],
  ['#4a6741', '#b5c99a'],
  ['#5c4a1f', '#d4c48a'],
] as const

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initialsOf(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}

function generatedPortrait(name: string, seed: string): string {
  const h = hashSeed(seed || name)
  const [c1, c2] = PALETTE[h % PALETTE.length]
  const initials = initialsOf(name)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#g)"/>
  <circle cx="128" cy="98" r="52" fill="rgba(255,255,255,0.22)"/>
  <ellipse cx="128" cy="230" rx="88" ry="70" fill="rgba(255,255,255,0.18)"/>
  <text x="128" y="118" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="64" font-weight="700" fill="#fff">${initials}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function isPhotoValue(value: unknown): boolean {
  const v = String(value || '').trim()
  return (
    v.startsWith('data:image/') ||
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('/')
  )
}

/** Resolve a displayable photo for a person row. */
export function personPhotoUrl(
  row?: {
    id?: unknown
    name?: unknown
    photo?: unknown
    gender?: unknown
  } | null,
): string {
  if (!row) return generatedPortrait('?', 'unknown')
  const custom = String(row.photo || '').trim()
  if (isPhotoValue(custom)) return custom
  const name = String(row.name || 'Learner')
  const seed = String(row.id || name)
  return generatedPortrait(name, seed)
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choose an image file (JPG, PNG, WebP)'))
      return
    }
    if (file.size > 2.5 * 1024 * 1024) {
      reject(new Error('Photo must be under 2.5 MB'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read photo'))
    reader.readAsDataURL(file)
  })
}
