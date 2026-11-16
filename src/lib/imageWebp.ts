/**
 * Compress raster images to WebP in the browser before upload / storage.
 * Shrinks long edge, drops EXIF, and keeps SVG/GIF passthrough when conversion
 * would lose meaning (vector / animation).
 */

export type WebpCompressOptions = {
  /** Longest side in px (default 1600). */
  maxEdge?: number
  /** WebP quality 0–1 (default 0.82). */
  quality?: number
  /** Reject source files larger than this many bytes (default 8MB). */
  maxInputBytes?: number
  /** ID photos: white. Stamps/signatures: transparent. */
  background?: 'white' | 'transparent'
}

const DEFAULTS: Required<WebpCompressOptions> = {
  maxEdge: 1600,
  quality: 0.82,
  maxInputBytes: 8 * 1024 * 1024,
  background: 'white',
}

function baseName(name: string): string {
  const bare = name.replace(/\.[^.]+$/, '') || 'image'
  return bare.replace(/[^\w.-]+/g, '_').slice(0, 80)
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode image'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function scaledSize(
  width: number,
  height: number,
  maxEdge: number,
): { w: number; h: number } {
  const long = Math.max(width, height)
  if (long <= maxEdge) return { w: width, h: height }
  const scale = maxEdge / long
  return {
    w: Math.max(1, Math.round(width * scale)),
    h: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Convert a raster image File to a compressed WebP File.
 * SVG is returned unchanged. If WebP encoding fails, falls back to JPEG.
 */
export async function compressImageToWebp(
  file: File,
  opts: WebpCompressOptions = {},
): Promise<File> {
  const { maxEdge, quality, maxInputBytes, background } = {
    ...DEFAULTS,
    ...opts,
  }
  const type = (file.type || '').toLowerCase()

  if (!type.startsWith('image/')) {
    throw new Error('Choose an image file (JPG, PNG, WebP)')
  }
  if (file.size > maxInputBytes) {
    throw new Error(
      `Image must be under ${Math.round(maxInputBytes / (1024 * 1024))} MB`,
    )
  }
  // Keep vectors as-is (Documents stamps may be SVG).
  if (type === 'image/svg+xml') return file

  const img = await loadImage(file)
  const { w, h } = scaledSize(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    maxEdge,
  )
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare image canvas')
  if (background === 'white') {
    // Opaque backdrop so transparent PNGs don’t become black in lossy WebP.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }
  ctx.drawImage(img, 0, 0, w, h)

  let blob = await canvasToBlob(canvas, 'image/webp', quality)
  let outType = 'image/webp'
  let ext = 'webp'
  if (!blob || blob.size === 0) {
    blob = await canvasToBlob(canvas, 'image/jpeg', Math.min(0.9, quality + 0.05))
    outType = 'image/jpeg'
    ext = 'jpg'
  }
  if (!blob) throw new Error('Could not compress image')

  // If compression somehow grew the file a lot and source was already webp, keep source.
  if (type === 'image/webp' && blob.size > file.size * 0.95 && file.size < 400_000) {
    return file
  }

  return new File([blob], `${baseName(file.name)}.${ext}`, {
    type: outType,
    lastModified: Date.now(),
  })
}

/** Compress then return a data URL (for offline / inline desk assets). */
export async function compressImageToWebpDataUrl(
  file: File,
  opts: WebpCompressOptions = {},
): Promise<string> {
  const compressed = await compressImageToWebp(file, opts)
  if (compressed.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Could not read image'))
      reader.readAsDataURL(compressed)
    })
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read compressed image'))
    reader.readAsDataURL(compressed)
  })
}
