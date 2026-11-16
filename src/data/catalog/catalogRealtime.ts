import { onRealtime } from '@/composables/useRealtime'
import { ensureModule, isServerModule } from '@/data/catalog/catalogSync'
import { isApiEnabled } from '@/lib/apiMode'

/** Map API resource names that differ slightly from desk module keys. */
const RESOURCE_ALIASES: Record<string, string> = {
  guardians: 'guardians',
  parents: 'parents',
  users: 'users',
}

let unsub: (() => void) | null = null
const pending = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * When another desk (or this tab via API) mutates a resource, quietly
 * refresh that module so lists update live — WhatsApp-style.
 */
export function startCatalogRealtime() {
  if (!isApiEnabled()) return
  if (unsub) return
  unsub = onRealtime((evt) => {
    if (!evt.type.startsWith('resource.')) return
    const payload = (evt.payload || {}) as { resource?: string; action?: string }
    const raw = String(payload.resource || '').trim()
    if (!raw) return
    const key = RESOURCE_ALIASES[raw] || raw
    if (!isServerModule(key)) return
    // Debounce bursts (bulk import / multi-field save).
    const existing = pending.get(key)
    if (existing) clearTimeout(existing)
    pending.set(
      key,
      setTimeout(() => {
        pending.delete(key)
        void ensureModule(key, { force: true })
      }, 180),
    )
  })
}

export function stopCatalogRealtime() {
  if (unsub) {
    unsub()
    unsub = null
  }
  for (const t of pending.values()) clearTimeout(t)
  pending.clear()
}
