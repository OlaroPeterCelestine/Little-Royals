/** Learner / staff / user photo — file id, data URL, path, or generated portrait. */

import { getApiBase } from '@/services/http'
import { authToken } from '@/data/auth/auth'
import { isApiEnabled } from '@/lib/apiMode'
import {
  compressImageToWebp,
  compressImageToWebpDataUrl,
} from '@/lib/imageWebp'

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

const blobCache = new Map<string, string>()

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
    v.startsWith('/') ||
    v.startsWith('file:')
  )
}

/** Extract stored file id from `file:{uuid}` markers. */
export function photoFileId(value: unknown): string | null {
  const v = String(value || '').trim()
  const m = v.match(/^file:([0-9a-f-]{36})$/i)
  return m ? m[1] : null
}

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
  if (custom.startsWith('file:')) {
    const id = photoFileId(custom)
    if (id && blobCache.has(id)) return blobCache.get(id)!
    // Placeholder until blob resolves; callers should use resolvePersonPhotoSrc.
    return generatedPortrait(String(row.name || '?'), String(row.id || id || ''))
  }
  if (isPhotoValue(custom)) return custom
  const name = String(row.name || 'Learner')
  const seed = String(row.id || name)
  return generatedPortrait(name, seed)
}

/** Load displayable src for a photo field (handles authenticated file ids). */
export async function resolvePersonPhotoSrc(
  photo: unknown,
  fallbackName = '?',
  fallbackId = '',
): Promise<string> {
  const custom = String(photo || '').trim()
  const id = photoFileId(custom)
  if (id) {
    if (blobCache.has(id)) return blobCache.get(id)!
    const token = authToken()
    if (!token || !isApiEnabled()) {
      return generatedPortrait(fallbackName, fallbackId || id)
    }
    try {
      const res = await fetch(`${getApiBase()}/api/v1/files/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('photo fetch failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      blobCache.set(id, url)
      return url
    } catch {
      return generatedPortrait(fallbackName, fallbackId || id)
    }
  }
  if (isPhotoValue(custom)) return custom
  return generatedPortrait(fallbackName, fallbackId || fallbackName)
}

export async function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPG, PNG, WebP)')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Photo must be under 5 MB')
  }
  return compressImageToWebpDataUrl(file, {
    maxEdge: 1280,
    quality: 0.82,
    maxInputBytes: 5 * 1024 * 1024,
    background: 'white',
  })
}

/**
 * Upload an identification photo via `/api/v1/files` (Photos folder).
 * Compresses to WebP client-side before upload (smaller + faster).
 * Blobs land in Cloudflare R2 when configured, otherwise local disk.
 * Returns `file:{uuid}` for storage on the person/user record.
 * Falls back to a data URL when the API is offline.
 */
export async function uploadPersonPhoto(
  file: File,
  folder = 'Photos',
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPG, PNG, WebP)')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Photo must be under 5 MB')
  }

  if (!isApiEnabled()) {
    throw new Error(
      'School API is required — photos are stored on the server, not in this browser',
    )
  }
  if (!authToken()) {
    throw new Error('Sign in again to upload photos')
  }

  const webp = await compressImageToWebp(file, {
    maxEdge: 1280,
    quality: 0.82,
    maxInputBytes: 5 * 1024 * 1024,
    background: 'white',
  })

  const body = new FormData()
  body.append('file', webp)
  body.append('folder', folder)
  const res = await fetch(`${getApiBase()}/api/v1/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken()}` },
    body,
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.error || 'Photo upload failed')
  }
  const id = String(payload?.data?.id || payload?.id || '').trim()
  if (!id) throw new Error('Photo upload returned no id')
  // Warm cache with a local preview of the compressed file.
  const preview = URL.createObjectURL(webp)
  blobCache.set(id, preview)
  return `file:${id}`
}
