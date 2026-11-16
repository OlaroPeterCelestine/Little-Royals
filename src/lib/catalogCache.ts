/**
 * Durable catalog snapshots (IndexedDB) so the desk opens instantly like WhatsApp —
 * paint last-known rows, then quietly refresh in the background.
 */

import type { CatalogRow } from '@/data/catalog/catalog'

const DB_NAME = 'little-royals-catalog'
const DB_VERSION = 1
const STORE = 'modules'

type Snapshot = {
  module: string
  rows: CatalogRow[]
  at: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('indexedDB unavailable'))
  }
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'module' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('indexedDB open failed'))
  })
  return dbPromise
}

export async function saveModuleSnapshot(
  module: string,
  rows: CatalogRow[],
): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('snapshot write failed'))
      tx.objectStore(STORE).put({
        module,
        rows,
        at: Date.now(),
      } satisfies Snapshot)
    })
  } catch {
    /* private mode / quota — ignore */
  }
}

export async function loadModuleSnapshot(
  module: string,
): Promise<CatalogRow[] | null> {
  try {
    const db = await openDb()
    return await new Promise<CatalogRow[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(module)
      req.onsuccess = () => {
        const snap = req.result as Snapshot | undefined
        resolve(snap?.rows?.length ? snap.rows : null)
      }
      req.onerror = () => reject(req.error || new Error('snapshot read failed'))
    })
  } catch {
    return null
  }
}

export async function loadAllModuleSnapshots(): Promise<
  Record<string, CatalogRow[]>
> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => {
        const out: Record<string, CatalogRow[]> = {}
        for (const snap of (req.result || []) as Snapshot[]) {
          if (snap?.module && Array.isArray(snap.rows) && snap.rows.length) {
            out[snap.module] = snap.rows
          }
        }
        resolve(out)
      }
      req.onerror = () => reject(req.error || new Error('snapshot list failed'))
    })
  } catch {
    return {}
  }
}

export async function clearCatalogSnapshots(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('snapshot clear failed'))
      tx.objectStore(STORE).clear()
    })
  } catch {
    /* ignore */
  }
}
