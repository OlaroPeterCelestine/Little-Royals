import type { CatalogColumn } from '@/data/catalog/catalog'

const NARROW_KEYS = new Set([
  'qty',
  'quantity',
  'age',
  'score',
  'rank',
  'count',
  'units',
  'stock',
  'balanceQty',
])

const DATE_KEYS = new Set([
  'date',
  'issueDate',
  'dueDate',
  'paidOn',
  'joinedAt',
  'lastLogin',
  'createdAt',
  'updatedAt',
  'startDate',
  'endDate',
])

const COMPACT_KEYS = new Set([
  'id',
  'employeeNumber',
  'sku',
  'code',
  'ref',
  'channel',
  'unit',
  'condition',
  'role',
  'status',
  'program',
  'grade',
  'className',
  'section',
])

/**
 * Fluid grid tracks that always fit the page width (no horizontal scroll).
 * Long values truncate with ellipsis inside each cell.
 */
export function buildListColumnTracks(
  cols: CatalogColumn[],
  options: { actions?: string } = {},
) {
  const actions = options.actions || 'minmax(0, 7.75rem)'
  const tracks = cols.map((c, i) => {
    if (i === 0 || c.primary) return 'minmax(0, 1.5fr)'
    if (c.badge || c.key === 'status') return 'minmax(0, 0.7fr)'
    if (NARROW_KEYS.has(c.key)) return 'minmax(0, 0.35fr)'
    if (DATE_KEYS.has(c.key)) return 'minmax(0, 0.7fr)'
    if (COMPACT_KEYS.has(c.key)) return 'minmax(0, 0.75fr)'
    return 'minmax(0, 1fr)'
  })

  const last = tracks[tracks.length - 1] || 'minmax(0, 0.7fr)'
  const primary = tracks[0] || 'minmax(0, 1.5fr)'

  return {
    base: [primary, last, actions],
    md: [...tracks, actions],
  }
}
