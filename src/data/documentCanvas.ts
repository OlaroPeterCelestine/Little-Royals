import { reactive, watch } from 'vue'

/** Mirrors DocumentKind without importing documents.ts (avoids cycles). */
export type CanvasDocumentKind = string

export interface DocOverlayAsset {
  /** data: URL or empty for default placeholder */
  src: string
  /** % from left of the sheet */
  x: number
  /** % from top of the sheet */
  y: number
  /** width as % of sheet */
  width: number
  opacity: number
  visible: boolean
}

export interface DocumentCanvasConfig {
  stamp: DocOverlayAsset
  signature: DocOverlayAsset
  leftSigner: string
  rightSigner: string
  note: string
}

const STORAGE_KEY = 'lr_document_canvas_v1'

function defaultOverlay(
  partial: Partial<DocOverlayAsset> & Pick<DocOverlayAsset, 'x' | 'y'>,
): DocOverlayAsset {
  return {
    src: '',
    width: 18,
    opacity: 0.92,
    visible: true,
    ...partial,
  }
}

export function defaultCanvasConfig(): DocumentCanvasConfig {
  return {
    stamp: defaultOverlay({ x: 41, y: 78, width: 16 }),
    signature: defaultOverlay({ x: 68, y: 74, width: 22 }),
    leftSigner: 'Class teacher',
    rightSigner: 'Head teacher',
    note: '',
  }
}

function loadStored(): Partial<Record<CanvasDocumentKind, DocumentCanvasConfig>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<
      Record<CanvasDocumentKind, DocumentCanvasConfig>
    >
  } catch {
    return {}
  }
}

const stored = loadStored()

export const documentCanvasStore = reactive({
  byKind: {
    ...stored,
  } as Partial<Record<CanvasDocumentKind, DocumentCanvasConfig>>,
})

watch(
  () => documentCanvasStore.byKind,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* quota / private mode */
    }
  },
  { deep: true },
)

export function canvasConfigFor(kind: CanvasDocumentKind): DocumentCanvasConfig {
  const existing = documentCanvasStore.byKind[kind]
  if (existing) return existing
  const created = defaultCanvasConfig()
  documentCanvasStore.byKind[kind] = created
  return created
}

export function resetCanvasConfig(kind: CanvasDocumentKind) {
  documentCanvasStore.byKind[kind] = defaultCanvasConfig()
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

/** SVG placeholder stamp when no upload yet. */
export function defaultStampDataUrl(): string {
  const svg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="92" fill="none" stroke="#2e3192" stroke-width="6" stroke-dasharray="8 6"/>
  <circle cx="100" cy="100" r="70" fill="none" stroke="#ed1c24" stroke-width="2"/>
  <text x="100" y="88" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#2e3192">OFFICIAL</text>
  <text x="100" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#2e3192">SCHOOL</text>
  <text x="100" y="128" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#ed1c24">STAMP</text>
</svg>`)
  return `data:image/svg+xml,${svg}`
}

export function defaultSignatureDataUrl(name = 'Head teacher'): string {
  const safe = name.replace(/[<>&]/g, '')
  const svg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100" viewBox="0 0 320 100">
  <path d="M20 70 C60 20, 100 90, 140 50 S220 20, 300 55" fill="none" stroke="#1a1a2e" stroke-width="3" stroke-linecap="round"/>
  <text x="24" y="92" font-family="Georgia,serif" font-size="12" fill="#555">${safe}</text>
</svg>`)
  return `data:image/svg+xml,${svg}`
}
