import type { CatalogRow } from './catalog'
import { schoolStore, addRecord, updateRecord } from './store'
import { currentUser } from './activity'

export type StockLevelStatus =
  | 'Available'
  | 'Low stock'
  | 'Critical'
  | 'Out of stock'

/** School store categories tailored for KG + primary. */
export const SCHOOL_STORE_CATEGORIES = [
  'Uniform',
  'Stationery',
  'Textbooks',
  'Lab',
  'Medical',
  'Sports',
  'Cleaning',
  'ICT',
  'Furniture',
  'Feeding',
] as const

export const SCHOOL_STORES = [
  'Main store',
  'Nursery store',
  'Staff room',
  'Lab cupboard',
  'Sick bay',
  'Library store',
  'Kitchen store',
] as const

export function numField(row: CatalogRow, key: string, fallback = 0): number {
  const n = Number(row[key])
  return Number.isFinite(n) ? n : fallback
}

/** Derive status from qty vs critical / reorder thresholds. */
export function stockStatusFromLevels(row: CatalogRow): StockLevelStatus {
  const qty = numField(row, 'qty')
  const critical = numField(row, 'critical', 0)
  const reorder = numField(row, 'reorder', 0)
  if (qty <= 0) return 'Out of stock'
  if (critical > 0 && qty <= critical) return 'Critical'
  if (reorder > 0 && qty <= reorder) return 'Low stock'
  return 'Available'
}

export function suggestedOrderQty(row: CatalogRow): number {
  const qty = numField(row, 'qty')
  const reorder = numField(row, 'reorder')
  const maxStock = numField(row, 'maxStock', reorder * 3 || 10)
  const target = Math.max(maxStock, reorder * 2, qty + reorder)
  return Math.max(1, target - qty)
}

export function isBelowThreshold(row: CatalogRow): boolean {
  const status = stockStatusFromLevels(row)
  return (
    status === 'Low stock' ||
    status === 'Critical' ||
    status === 'Out of stock'
  )
}

export function lowStockRows(): CatalogRow[] {
  return (schoolStore['inventory-stock']?.rows || []).filter(isBelowThreshold)
}

export function inventoryHealth() {
  const stock = schoolStore['inventory-stock']?.rows || []
  const issues = schoolStore['inventory-issues']?.rows || []
  const requests = schoolStore['purchase-requests']?.rows || []
  const assets = schoolStore.assets?.rows || []
  const items = schoolStore['inventory-items']?.rows || []

  const critical = stock.filter(
    (r) => stockStatusFromLevels(r) === 'Critical',
  ).length
  const out = stock.filter(
    (r) => stockStatusFromLevels(r) === 'Out of stock',
  ).length
  const low = stock.filter(
    (r) => stockStatusFromLevels(r) === 'Low stock',
  ).length
  const openRequests = requests.filter((r) =>
    ['Draft', 'Submitted', 'Approved', 'Ordered'].includes(String(r.status)),
  ).length
  const pendingIssues = issues.filter(
    (r) => String(r.status) === 'Pending',
  ).length
  const assetsNeedingService = assets.filter((r) =>
    ['Needs service', 'Damaged', 'Maintenance'].includes(
      String(r.condition || r.status || ''),
    ),
  ).length

  return {
    items: items.length,
    stockRows: stock.length,
    critical,
    out,
    low,
    below: critical + out + low,
    openRequests,
    pendingIssues,
    assets: assets.length,
    assetsNeedingService,
  }
}

export function syncStockStatuses() {
  const mod = schoolStore['inventory-stock']
  if (!mod) return
  for (const row of mod.rows) {
    const next = stockStatusFromLevels(row)
    if (String(row.status) !== next) {
      row.status = next
      row.statusTheme =
        next === 'Available'
          ? 'green'
          : next === 'Low stock'
            ? 'amber'
            : 'red'
    }
  }
}

export function createPurchaseRequestFromStock(stock: CatalogRow): CatalogRow {
  const qty = suggestedOrderQty(stock)
  const status = stockStatusFromLevels(stock)
  const reason =
    status === 'Out of stock'
      ? 'Out of stock — needed for classroom / store'
      : status === 'Critical'
        ? `Critical stock (${numField(stock, 'qty')} / critical ${numField(stock, 'critical')})`
        : `Below reorder for school term (${numField(stock, 'qty')} / reorder ${numField(stock, 'reorder')})`

  return addRecord('purchase-requests', {
    name: String(stock.name),
    qty,
    store: String(stock.store || 'Main store'),
    department: String(stock.department || ''),
    className: String(stock.className || ''),
    requestedBy: currentUser.name || 'Store keeper',
    neededBy: new Date(Date.now() + 7 * 24 * 60_000).toISOString().slice(0, 10),
    priority:
      status === 'Out of stock' || status === 'Critical' ? 'Urgent' : 'Normal',
    stockId: stock.id,
    reason,
    status: 'Submitted',
  })
}

/** Receive goods into a stock row (from supplier / donation). */
export function receiveStock(
  stockId: string,
  qtyIn: number,
  note = '',
): CatalogRow {
  const row = schoolStore['inventory-stock']?.rows.find((r) => r.id === stockId)
  if (!row) throw new Error('Stock row not found')
  if (!Number.isFinite(qtyIn) || qtyIn <= 0) {
    throw new Error('Receive quantity must be positive')
  }
  const nextQty = numField(row, 'qty') + qtyIn
  const updated = saveStockLevels(stockId, { qty: nextQty })
  if (note) {
    updateRecord('inventory-stock', stockId, {
      name: updated.name,
      subtitle: note,
    })
  }
  return schoolStore['inventory-stock']!.rows.find((r) => r.id === stockId)!
}

/**
 * Issue items to a class / teacher and deduct from on-hand stock.
 * Creates an inventory-issues row for the audit trail.
 */
export function issueStockToClass(input: {
  stockId: string
  qty: number
  issuedTo: string
  className?: string
  department?: string
  date?: string
}): { stock: CatalogRow; issue: CatalogRow } {
  const row = schoolStore['inventory-stock']?.rows.find(
    (r) => r.id === input.stockId,
  )
  if (!row) throw new Error('Stock row not found')
  const qty = Number(input.qty)
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Issue quantity must be positive')
  }
  const onHand = numField(row, 'qty')
  if (qty > onHand) {
    throw new Error(`Only ${onHand} on hand for ${row.name}`)
  }

  const stock = saveStockLevels(input.stockId, { qty: onHand - qty })
  const issue = addRecord('inventory-issues', {
    name: `Issue · ${row.name}`,
    item: String(row.name),
    qty,
    department: input.department || String(row.department || ''),
    className: input.className || String(row.className || ''),
    issuedTo: input.issuedTo,
    date: input.date || new Date().toISOString().slice(0, 10),
    store: String(row.store || ''),
    stockId: row.id,
    status: 'Issued',
  })
  return { stock, issue }
}

/** Apply qty/threshold edits and refresh derived status. */
export function saveStockLevels(
  id: string,
  values: {
    qty?: number
    critical?: number
    reorder?: number
    maxStock?: number
  },
) {
  const row = schoolStore['inventory-stock']?.rows.find((r) => r.id === id)
  if (!row) throw new Error('Stock row not found')
  const qty = values.qty ?? numField(row, 'qty')
  const critical = values.critical ?? numField(row, 'critical')
  const reorder = values.reorder ?? numField(row, 'reorder')
  const maxStock = values.maxStock ?? numField(row, 'maxStock')
  const probe = {
    id: row.id,
    name: row.name,
    qty,
    critical,
    reorder,
    maxStock,
  } as CatalogRow
  const status = stockStatusFromLevels(probe)
  updateRecord('inventory-stock', id, {
    name: row.name,
    store: String(row.store || ''),
    department: String(row.department || ''),
    className: String(row.className || ''),
    qty,
    critical,
    reorder,
    maxStock,
    status,
  })
  return schoolStore['inventory-stock']!.rows.find((r) => r.id === id)!
}
