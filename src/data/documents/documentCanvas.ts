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

/** Word-like page design controls applied to print + studio. */
export interface DocumentDesign {
  /** Body typeface family */
  fontFamily: 'serif' | 'sans' | 'georgia' | 'times' | 'calibri'
  /** Base body size in pt */
  fontSize: number
  /** Line height multiplier */
  lineHeight: number
  /** Brand accent (ribbon / headings / rules) */
  accentColor: string
  /** Page margins preset */
  margin: 'narrow' | 'normal' | 'wide'
  /** Show MoES / UNEB top ribbon */
  showRibbon: boolean
  /** Show diagonal watermark initials */
  showWatermark: boolean
  watermarkOpacity: number
  /** Title block alignment */
  headingAlign: 'left' | 'center'
  /** Paper background tint */
  paperTint: 'white' | 'cream' | 'blue'
  /** Slightly stronger letterhead titles */
  boldTitles: boolean
}

export interface DocumentCanvasConfig {
  stamp: DocOverlayAsset
  signature: DocOverlayAsset
  leftSigner: string
  rightSigner: string
  note: string
  /** Free-text edits from the studio (field labels → value). */
  textOverrides: Record<string, string>
  design: DocumentDesign
}

const STORAGE_KEY = 'lr_document_canvas_v2'

export const FONT_OPTIONS = [
  { label: 'Calibri (Word-like)', value: 'calibri' },
  { label: 'Georgia (serif)', value: 'georgia' },
  { label: 'Times New Roman', value: 'times' },
  { label: 'Classic serif', value: 'serif' },
  { label: 'Helvetica / Arial', value: 'sans' },
] as const

export const MARGIN_OPTIONS = [
  { label: 'Narrow (1.2 cm)', value: 'narrow' },
  { label: 'Normal (1.8 cm)', value: 'normal' },
  { label: 'Wide (2.5 cm)', value: 'wide' },
] as const

export const PAPER_TINT_OPTIONS = [
  { label: 'White', value: 'white' },
  { label: 'Cream', value: 'cream' },
  { label: 'Cool blue', value: 'blue' },
] as const

export const ACCENT_PRESETS = [
  { label: 'Royal blue', value: '#2e3192' },
  { label: 'Navy', value: '#1e3a5f' },
  { label: 'Forest', value: '#166534' },
  { label: 'Burgundy', value: '#9f1239' },
  { label: 'Charcoal', value: '#1f2937' },
  { label: 'Teal', value: '#0f766e' },
] as const

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

export function defaultDesign(): DocumentDesign {
  return {
    fontFamily: 'calibri',
    fontSize: 11,
    lineHeight: 1.45,
    accentColor: '#2e3192',
    margin: 'normal',
    showRibbon: true,
    showWatermark: true,
    watermarkOpacity: 0.06,
    headingAlign: 'center',
    paperTint: 'white',
    boldTitles: true,
  }
}

/** Long multi-page letters use inline stamp/signature so print does not float mid-page. */
const LONG_DOC_KINDS = new Set([
  'admission-letter',
  'report-card',
  'exam-paper',
])

export function defaultCanvasConfig(
  kind?: CanvasDocumentKind,
): DocumentCanvasConfig {
  const long = kind ? LONG_DOC_KINDS.has(kind) : false
  return {
    stamp: defaultOverlay({
      x: 41,
      y: 78,
      width: 16,
      visible: !long,
    }),
    signature: defaultOverlay({
      x: 68,
      y: 74,
      width: 22,
      visible: !long,
    }),
    leftSigner: 'Class teacher',
    rightSigner: 'Head teacher',
    note: '',
    textOverrides: {},
    design: defaultDesign(),
  }
}

function migrateConfig(
  raw: Partial<DocumentCanvasConfig> | undefined,
): DocumentCanvasConfig {
  const base = defaultCanvasConfig()
  if (!raw) return base
  return {
    ...base,
    ...raw,
    stamp: { ...base.stamp, ...(raw.stamp || {}) },
    signature: { ...base.signature, ...(raw.signature || {}) },
    textOverrides: { ...(raw.textOverrides || {}) },
    design: { ...base.design, ...(raw.design || {}) },
  }
}

function loadStored(): Partial<Record<CanvasDocumentKind, DocumentCanvasConfig>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<
        Record<CanvasDocumentKind, Partial<DocumentCanvasConfig>>
      >
      const out: Partial<Record<CanvasDocumentKind, DocumentCanvasConfig>> = {}
      for (const [k, v] of Object.entries(parsed)) {
        out[k] = migrateConfig(v)
      }
      return out
    }
    // Migrate from v1 if present
    const legacy = localStorage.getItem('lr_document_canvas_v1')
    if (!legacy) return {}
    const parsed = JSON.parse(legacy) as Partial<
      Record<CanvasDocumentKind, Partial<DocumentCanvasConfig>>
    >
    const out: Partial<Record<CanvasDocumentKind, DocumentCanvasConfig>> = {}
    for (const [k, v] of Object.entries(parsed)) {
      out[k] = migrateConfig(v)
    }
    return out
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
  if (existing) {
    if (!existing.textOverrides) existing.textOverrides = {}
    if (!existing.design) existing.design = defaultDesign()
    else existing.design = { ...defaultDesign(), ...existing.design }
    return existing
  }
  const created = defaultCanvasConfig(kind)
  documentCanvasStore.byKind[kind] = created
  return created
}

export function setTextOverride(
  kind: CanvasDocumentKind,
  key: string,
  value: string,
) {
  const cfg = canvasConfigFor(kind)
  cfg.textOverrides[key] = value
}

export function clearTextOverrides(kind: CanvasDocumentKind) {
  canvasConfigFor(kind).textOverrides = {}
}

export function resetCanvasConfig(kind: CanvasDocumentKind) {
  documentCanvasStore.byKind[kind] = defaultCanvasConfig(kind)
}

export function resetDesignOnly(kind: CanvasDocumentKind) {
  canvasConfigFor(kind).design = defaultDesign()
}

export function applyDesignPreset(
  kind: CanvasDocumentKind,
  preset: 'formal' | 'modern' | 'classic',
) {
  const d = canvasConfigFor(kind).design
  if (preset === 'formal') {
    Object.assign(d, {
      fontFamily: 'times',
      fontSize: 11,
      lineHeight: 1.5,
      accentColor: '#1e3a5f',
      margin: 'wide',
      headingAlign: 'center',
      paperTint: 'cream',
      boldTitles: true,
      showRibbon: true,
      showWatermark: true,
    } satisfies Partial<DocumentDesign>)
  } else if (preset === 'modern') {
    Object.assign(d, {
      fontFamily: 'calibri',
      fontSize: 11,
      lineHeight: 1.4,
      accentColor: '#0f766e',
      margin: 'normal',
      headingAlign: 'left',
      paperTint: 'white',
      boldTitles: true,
      showRibbon: true,
      showWatermark: false,
    } satisfies Partial<DocumentDesign>)
  } else {
    Object.assign(d, {
      fontFamily: 'georgia',
      fontSize: 12,
      lineHeight: 1.55,
      accentColor: '#2e3192',
      margin: 'normal',
      headingAlign: 'center',
      paperTint: 'white',
      boldTitles: true,
      showRibbon: true,
      showWatermark: true,
    } satisfies Partial<DocumentDesign>)
  }
}

/** CSS overrides injected into the printed / preview document. */
export function designCssFromConfig(cfg: DocumentCanvasConfig): string {
  const d = cfg.design || defaultDesign()
  const fonts: Record<DocumentDesign['fontFamily'], string> = {
    calibri:
      'Calibri, "Segoe UI", Candara, "Helvetica Neue", Arial, sans-serif',
    georgia: 'Georgia, "Times New Roman", Times, serif',
    times: '"Times New Roman", Times, Georgia, serif',
    serif: 'Georgia, "Palatino Linotype", "Book Antiqua", Palatino, serif',
    sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  }
  const margins: Record<DocumentDesign['margin'], string> = {
    narrow: '1.2cm 1.2cm 1.4cm',
    normal: '1.6cm 1.8cm 1.8cm',
    wide: '2.2cm 2.5cm 2.4cm',
  }
  const tints: Record<DocumentDesign['paperTint'], string> = {
    white: '#ffffff',
    cream: '#fbf8f1',
    blue: '#f7f9fc',
  }
  const accent = d.accentColor || '#2e3192'
  const bodyFont = fonts[d.fontFamily] || fonts.calibri
  const size = Math.min(14, Math.max(9, Number(d.fontSize) || 11))
  const lh = Math.min(2, Math.max(1.15, Number(d.lineHeight) || 1.45))
  const wm = Math.min(0.2, Math.max(0, Number(d.watermarkOpacity) || 0.06))

  return `
  :root {
    --doc-accent: ${accent};
    --doc-accent-soft: color-mix(in srgb, ${accent} 14%, white);
    --doc-rule: color-mix(in srgb, ${accent} 45%, #b8bbe0);
  }
  body {
    font-family: ${bodyFont};
    font-size: ${size}pt;
    line-height: ${lh};
  }
  .sheet {
    background: ${tints[d.paperTint] || '#fff'};
    padding: ${margins[d.margin] || margins.normal} !important;
  }
  .ribbon {
    display: ${d.showRibbon ? 'block' : 'none'};
    background: ${accent};
    margin-left: -${d.margin === 'narrow' ? '1.2cm' : d.margin === 'wide' ? '2.5cm' : '1.8cm'};
    margin-right: -${d.margin === 'narrow' ? '1.2cm' : d.margin === 'wide' ? '2.5cm' : '1.8cm'};
    margin-top: -${d.margin === 'narrow' ? '1.2cm' : d.margin === 'wide' ? '2.2cm' : '1.6cm'};
  }
  .watermark {
    display: ${d.showWatermark ? 'block' : 'none'};
    opacity: ${wm};
    color: ${accent};
  }
  .accent, .doc-title .kind, .letter-re, .badge,
  table.fields th, table.data th, .sign-block .role {
    color: ${accent} !important;
  }
  .accent {
    background: ${accent} !important;
    color: transparent !important;
  }
  .head h1, .doc-title h2 {
    font-weight: ${d.boldTitles ? 700 : 600};
    font-family: ${bodyFont};
  }
  .doc-title {
    text-align: ${d.headingAlign};
  }
  .doc-title h2 { text-align: ${d.headingAlign}; }
  .regs span { color: ${accent}; }
  .letter-re, .badge {
    border-color: ${accent} !important;
  }
  table.fields th, table.data th {
    background: var(--doc-accent-soft) !important;
  }
  .footer { border-top-color: var(--doc-rule); }
  .canvas-note { border-left-color: ${accent}; }
  .letter-body p, p, td, th, li {
    font-family: ${bodyFont};
    line-height: ${lh};
  }
`
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
  const safe = name.replace(/[<>&']/g, '')
  const svg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100" viewBox="0 0 320 100">
  <path d="M20 70 C60 20, 100 90, 140 50 S220 20, 300 55" fill="none" stroke="#1a1a2e" stroke-width="3" stroke-linecap="round"/>
  <text x="24" y="92" font-family="Georgia,serif" font-size="12" fill="#555">${safe}</text>
</svg>`)
  return `data:image/svg+xml,${svg}`
}
