import type { CatalogRow } from '../data/catalog'

/** Primitive values accepted in create/update forms */
export type FieldValue = string | number | boolean | null | undefined

/** Normalized form payload for catalog CRUD */
export type RecordValues = Record<string, FieldValue>

export type ListColumnTrack = string

export interface ListColumnLayout {
  base: ListColumnTrack[]
  md: ListColumnTrack[]
}

export type StatusFilterValue = 'All' | string

export function asString(value: FieldValue, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  return String(value)
}

export function asOptionalNumber(value: FieldValue): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function rowField(
  row: CatalogRow,
  key: string,
): string | number | undefined {
  const value = row[key]
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' || typeof value === 'number') return value
  return String(value)
}
