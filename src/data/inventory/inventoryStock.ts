import type { CatalogRow } from '@/data/catalog/catalog'
import { schoolStore, addRecord, updateRecord } from '@/data/catalog/store'
import { currentUser } from '@/data/activity/activity'

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

const OPEN_PURCHASE_STATUSES = new Set([
  'Draft',
  'Submitted',
  'Approved',
  'Ordered',
])

/** Existing open purchase request for this stock line (avoid duplicates). */
export function openPurchaseForStock(stockId: string): CatalogRow | null {
  return (
    (schoolStore['purchase-requests']?.rows || []).find(
      (r) =>
        String(r.stockId || '') === stockId &&
        OPEN_PURCHASE_STATUSES.has(String(r.status || '')),
    ) || null
  )
}

export async function createPurchaseRequestFromStock(
  stock: CatalogRow,
): Promise<CatalogRow> {
  const existing = openPurchaseForStock(stock.id)
  if (existing) return existing

  const qty = suggestedOrderQty(stock)
  const status = stockStatusFromLevels(stock)
  const reason =
    status === 'Out of stock'
      ? 'Out of stock — needed for classroom / store'
      : status === 'Critical'
        ? `Critical stock (${numField(stock, 'qty')} / critical ${numField(stock, 'critical')})`
        : `Below reorder for school term (${numField(stock, 'qty')} / reorder ${numField(stock, 'reorder')})`

  return await addRecord('purchase-requests', {
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

/** Ensure a catalogue item has a stock row in Main store (opening balance). */
export async function ensureStockForItem(
  item: CatalogRow,
  openingQty = 0,
): Promise<CatalogRow> {
  const existing = (schoolStore['inventory-stock']?.rows || []).find(
    (r) =>
      r.name === item.name ||
      String(r.itemId || '') === item.id ||
      String(r.sku || '') === String(item.sku || ''),
  )
  if (existing) return existing
  return await addRecord('inventory-stock', {
    name: item.name,
    itemId: item.id,
    sku: String(item.sku || ''),
    store: 'Main store',
    department: String(item.department || ''),
    className: String(item.className || 'All classes'),
    qty: openingQty,
    critical: 2,
    reorder: 5,
    maxStock: Math.max(20, openingQty || 20),
    status: openingQty > 0 ? 'Available' : 'Out of stock',
  })
}

/**
 * Receive goods for a purchase request: bump stock and mark request Received.
 */
export async function receivePurchaseRequest(
  requestId: string,
  qtyIn?: number,
): Promise<{ stock: CatalogRow; request: CatalogRow }> {
  const request = schoolStore['purchase-requests']?.rows.find(
    (r) => r.id === requestId,
  )
  if (!request) throw new Error('Purchase request not found')
  const qty = qtyIn ?? numField(request, 'qty')
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Receive quantity must be positive')
  }

  let stock =
    (schoolStore['inventory-stock']?.rows || []).find(
      (r) => r.id === String(request.stockId || ''),
    ) ||
    (schoolStore['inventory-stock']?.rows || []).find(
      (r) => r.name === request.name,
    )

  if (!stock) {
    stock = await addRecord('inventory-stock', {
      name: String(request.name),
      store: String(request.store || 'Main store'),
      department: String(request.department || ''),
      className: String(request.className || 'All classes'),
      qty: 0,
      critical: 2,
      reorder: 5,
      maxStock: Math.max(20, qty * 2),
      status: 'Out of stock',
    })
  }

  const updatedStock = await receiveStock(stock.id, qty, `GRN · ${request.id}`)
  const updatedRequest = await updateRecord('purchase-requests', request.id, {
    name: request.name,
    qty: numField(request, 'qty'),
    store: String(request.store || ''),
    department: String(request.department || ''),
    className: String(request.className || ''),
    requestedBy: String(request.requestedBy || ''),
    neededBy: String(request.neededBy || ''),
    priority: String(request.priority || 'Normal'),
    stockId: updatedStock.id,
    reason: String(request.reason || ''),
    status: 'Received',
    subtitle: `Received ${qty} into ${updatedStock.store || 'store'}`,
  })
  return { stock: updatedStock, request: updatedRequest }
}

/** Receive goods into a stock row (from supplier / donation). */
export async function receiveStock(
  stockId: string,
  qtyIn: number,
  note = '',
): Promise<CatalogRow> {
  const row = schoolStore['inventory-stock']?.rows.find((r) => r.id === stockId)
  if (!row) throw new Error('Stock row not found')
  if (!Number.isFinite(qtyIn) || qtyIn <= 0) {
    throw new Error('Receive quantity must be positive')
  }
  const nextQty = numField(row, 'qty') + qtyIn
  const updated = await saveStockLevels(stockId, { qty: nextQty })
  if (note) {
    await updateRecord('inventory-stock', stockId, {
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
export async function issueStockToClass(input: {
  stockId: string
  qty: number
  issuedTo: string
  className?: string
  department?: string
  date?: string
}): Promise<{ stock: CatalogRow; issue: CatalogRow }> {
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

  const stock = await saveStockLevels(input.stockId, { qty: onHand - qty })
  const issue = await addRecord('inventory-issues', {
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
export async function saveStockLevels(
  id: string,
  values: {
    qty?: number
    critical?: number
    reorder?: number
    maxStock?: number
  },
): Promise<CatalogRow> {
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
  await updateRecord('inventory-stock', id, {
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
