<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Alert,
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
  dialog,
  toast,
} from 'frappe-ui'
import type { CatalogRow } from '@/data/catalog/catalog'
import { getLiveModule, schoolStore } from '@/data/catalog/store'
import { compareSchoolClasses } from '@/data/school/grades'
import { currentUser } from '@/data/activity/activity'
import { canAccessModule } from '@/lib/accessControl'
import {
  createPurchaseRequestFromStock,
  ensureStockForItem,
  inventoryHealth,
  isBelowThreshold,
  issueStockToClass,
  lowStockRows,
  numField,
  openPurchaseForStock,
  receivePurchaseRequest,
  receiveStock,
  stockStatusFromLevels,
  suggestedOrderQty,
  syncStockStatuses,
} from '@/data/inventory/inventoryStock'
import { gradeSelectOptions } from '@/data/school/grades'
import { useListPage } from '@/composables/useListPage'
import {
  openCreateDialog,
  openDeleteDialog,
  openDiscardSelectionDialog,
  openEditDialog,
} from '@/composables/useModuleForms'
import {
  defaultDocumentKind,
  printRecordDocument,
} from '@/data/documents/documents'
import { useModuleAccess } from '@/composables/useModuleAccess'
import CatalogTable from '@/components/list/CatalogTable.vue'
import ListToolbar from '@/components/list/ListToolbar.vue'
import PageIntro from '@/components/list/PageIntro.vue'
import RelatedLinks from '@/components/list/RelatedLinks.vue'
import { buildListColumnTracks } from '@/lib/listColumns'

type InventoryTab =
  | 'overview'
  | 'items'
  | 'stock'
  | 'requests'
  | 'issues'
  | 'assets'

const route = useRoute()
const router = useRouter()

const TAB_META: Record<
  Exclude<InventoryTab, 'overview'>,
  { module: string; label: string; createLabel: string }
> = {
  items: {
    module: 'inventory-items',
    label: 'Catalogue',
    createLabel: 'Register item',
  },
  stock: {
    module: 'inventory-stock',
    label: 'Stock levels',
    createLabel: 'Add stock row',
  },
  requests: {
    module: 'purchase-requests',
    label: 'Purchase requests',
    createLabel: 'New purchase request',
  },
  issues: {
    module: 'inventory-issues',
    label: 'Issues to class',
    createLabel: 'Issue to class',
  },
  assets: {
    module: 'assets',
    label: 'Fixed assets',
    createLabel: 'Register asset',
  },
}

function allowedInventoryTabs(): InventoryTab[] {
  void currentUser.role
  const out: InventoryTab[] = ['overview']
  if (canAccessModule('inventory-items', 'read')) out.push('items')
  if (canAccessModule('inventory-stock', 'read')) out.push('stock')
  if (canAccessModule('purchase-requests', 'read')) out.push('requests')
  if (canAccessModule('inventory-issues', 'read')) out.push('issues')
  if (canAccessModule('assets', 'read')) out.push('assets')
  return out
}

function parseTab(raw: unknown): InventoryTab {
  const allowed = allowedInventoryTabs()
  const v = String(raw || '').toLowerCase()
  let next: InventoryTab = 'overview'
  if (v === 'overview' || v === 'desk' || v === 'home') next = 'overview'
  else if (v === 'stock' || v === 'inventory-stock' || v === 'thresholds')
    next = 'stock'
  else if (v === 'requests' || v === 'purchase-requests' || v === 'purchases')
    next = 'requests'
  else if (v === 'issues' || v === 'inventory-issues' || v === 'issue')
    next = 'issues'
  else if (v === 'assets' || v === 'asset') next = 'assets'
  else if (
    v === 'items' ||
    v === 'inventory-items' ||
    v === 'item' ||
    v === 'catalogue'
  )
    next = 'items'
  if (allowed.includes(next)) return next
  return allowed[0] || 'overview'
}

const tab = ref<InventoryTab>(parseTab(route.query.tab))
const classFilter = ref('All')
const departmentFilter = ref('All')
const categoryFilter = ref('All')
const storeFilter = ref('All')
const thresholdFilter = ref<'all' | 'below'>('all')

const health = computed(() => {
  void schoolStore['inventory-stock']?.rows.length
  void schoolStore['purchase-requests']?.rows.length
  void schoolStore['inventory-issues']?.rows.length
  syncStockStatuses()
  return inventoryHealth()
})

const tabs = computed(() => {
  const allowed = new Set(allowedInventoryTabs())
  const h = health.value
  return [
    { label: 'Store desk', value: 'overview' as const },
    {
      label: `Catalogue (${h.items})`,
      value: 'items' as const,
    },
    {
      label:
        h.below > 0
          ? `Stock (${h.below} alert)`
          : `Stock (${h.stockRows})`,
      value: 'stock' as const,
    },
    {
      label: `Purchases (${h.openRequests} open)`,
      value: 'requests' as const,
    },
    {
      label: `Issues (${schoolStore['inventory-issues']?.rows.length || 0})`,
      value: 'issues' as const,
    },
    {
      label: `Assets (${h.assets})`,
      value: 'assets' as const,
    },
  ].filter((t) => allowed.has(t.value))
})

onMounted(() => {
  syncStockStatuses()
})

watch(tab, (value) => {
  router.replace({ path: '/inventory', query: { ...route.query, tab: value } })
})

watch(
  () => route.query.tab,
  (value) => {
    const next = parseTab(value)
    if (tab.value !== next) tab.value = next
  },
)

const listTab = computed(() =>
  tab.value === 'overview' ? null : (tab.value as Exclude<InventoryTab, 'overview'>),
)

const moduleKey = computed(() =>
  listTab.value ? TAB_META[listTab.value].module : 'inventory-stock',
)
const mod = computed(() =>
  listTab.value ? getLiveModule(moduleKey.value) : undefined,
)
const sourceRows = computed(() => mod.value?.rows || [])

function uniqueValues(key: 'className' | 'department' | 'category' | 'store') {
  const values = new Set<string>()
  for (const row of sourceRows.value) {
    const raw = String(row[key] || '').trim()
    if (raw) values.add(raw)
  }
  const list = [...values]
  if (key === 'className') return list.sort(compareSchoolClasses)
  return list.sort((a, b) => a.localeCompare(b))
}

const classOptions = computed(() => [
  { label: 'All classes', value: 'All' },
  ...uniqueValues('className').map((v) => ({ label: v, value: v })),
])

const departmentOptions = computed(() => [
  { label: 'All sections', value: 'All' },
  ...uniqueValues('department').map((v) => ({ label: v, value: v })),
])

const categoryOptions = computed(() => [
  { label: 'All categories', value: 'All' },
  ...uniqueValues('category').map((v) => ({ label: v, value: v })),
])

const storeOptions = computed(() => [
  { label: 'All stores', value: 'All' },
  ...uniqueValues('store').map((v) => ({ label: v, value: v })),
])

const scopedRows = computed(() =>
  sourceRows.value.filter((row) => {
    if (
      classFilter.value !== 'All' &&
      String(row.className || '') !== classFilter.value
    ) {
      return false
    }
    if (
      departmentFilter.value !== 'All' &&
      String(row.department || '') !== departmentFilter.value
    ) {
      return false
    }
    if (
      categoryFilter.value !== 'All' &&
      String(row.category || '') !== categoryFilter.value
    ) {
      return false
    }
    if (
      storeFilter.value !== 'All' &&
      String(row.store || '') !== storeFilter.value
    ) {
      return false
    }
    if (
      tab.value === 'stock' &&
      thresholdFilter.value === 'below' &&
      !isBelowThreshold(row)
    ) {
      return false
    }
    return true
  }),
)

const belowThresholdCount = computed(() => health.value.below)
const canRequestPurchase = computed(() =>
  canAccessModule('purchase-requests', 'create'),
)
const canIssue = computed(() => canAccessModule('inventory-issues', 'create'))
const canWriteStock = computed(() =>
  canAccessModule('inventory-stock', 'write'),
)

const { canCreate, canWrite, canDelete, canPrint, requirePerm } =
  useModuleAccess(moduleKey)

const active = ref<string>()
const selection = ref<string[]>([])
const showSelectionWarning = ref(false)

const {
  query,
  statusFilter,
  page,
  statusOptions,
  filtered,
  pageRows,
  totalPages,
  rangeLabel,
  hasActiveFilters,
  resetFilters,
  goToPage,
} = useListPage(scopedRows, {})

const hasScopeFilter = computed(
  () =>
    classFilter.value !== 'All' ||
    departmentFilter.value !== 'All' ||
    categoryFilter.value !== 'All' ||
    storeFilter.value !== 'All',
)

const filtersActive = computed(
  () => hasActiveFilters.value || hasScopeFilter.value,
)

watch(tab, () => {
  resetFilters()
  classFilter.value = 'All'
  departmentFilter.value = 'All'
  categoryFilter.value = 'All'
  storeFilter.value = 'All'
  selection.value = []
  active.value = undefined
  showSelectionWarning.value = false
  if (tab.value !== 'stock') thresholdFilter.value = 'all'
})

watch(
  [query, statusFilter, classFilter, departmentFilter, categoryFilter, storeFilter],
  () => {
    selection.value = []
    page.value = 1
  },
)

const columns = computed(() =>
  buildListColumnTracks(mod.value?.columns || []),
)

const overviewStats = computed(() => {
  const h = health.value
  return [
    { title: 'Catalogue items', value: h.items, caption: 'uniforms → feeding' },
    {
      title: 'Stock alerts',
      value: h.below,
      caption: `${h.critical} critical · ${h.out} out`,
    },
    {
      title: 'Open purchases',
      value: h.openRequests,
      caption: 'awaiting buy / receive',
    },
    {
      title: 'Assets',
      value: h.assets,
      caption:
        h.assetsNeedingService > 0
          ? `${h.assetsNeedingService} need service`
          : 'desks, devices, gear',
    },
  ]
})

const alertRows = computed(() =>
  lowStockRows()
    .slice()
    .sort((a, b) => numField(a, 'qty') - numField(b, 'qty')),
)

const recentIssues = computed(() =>
  (schoolStore['inventory-issues']?.rows || []).slice(0, 5),
)

function createRecord() {
  if (tab.value === 'overview') tab.value = 'items'
  if (!requirePerm('create', 'create records')) return
  const key = moduleKey.value
  openCreateDialog(key, (row) => {
    if (key !== 'inventory-items') return
    try {
      ensureStockForItem(row, 0)
      toast.success(
        `“${row.name}” registered — stock row ready in Main store (qty 0). Receive goods when they arrive.`,
      )
      tab.value = 'stock'
    } catch {
      /* catalogue saved even if stock seed fails */
    }
  })
}

function editRecord(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!requirePerm('write', 'edit records')) return
  openEditDialog(moduleKey.value, row)
}

function openDetail(row: CatalogRow) {
  if (tab.value === 'overview') return
  router.push(`/${moduleKey.value}/${row.id}`)
}

function printRecord(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!requirePerm('print', 'print')) return
  try {
    const kind = defaultDocumentKind(moduleKey.value)
    const title = printRecordDocument(kind, moduleKey.value, row)
    toast.success(`Print preview · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function deleteSelected() {
  if (!requirePerm('delete', 'delete records')) return
  if (!selection.value.length) {
    showSelectionWarning.value = true
    openDeleteDialog(moduleKey.value, [])
    return
  }
  showSelectionWarning.value = false
  openDeleteDialog(moduleKey.value, [...selection.value])
  selection.value = []
}

function clearSelection() {
  openDiscardSelectionDialog(() => {
    selection.value = []
    showSelectionWarning.value = false
  })
}

function clearAllFilters() {
  resetFilters()
  classFilter.value = 'All'
  departmentFilter.value = 'All'
  categoryFilter.value = 'All'
  storeFilter.value = 'All'
  thresholdFilter.value = 'all'
}

function requestPurchaseFor(row: CatalogRow) {
  if (!canRequestPurchase.value) {
    toast.error('Your role cannot create purchase requests')
    return
  }
  try {
    const existing = openPurchaseForStock(row.id)
    const created = createPurchaseRequestFromStock(row)
    toast.success(
      existing
        ? `Already open · ${created.name} (${created.qty}) — review Purchases`
        : `Purchase request · ${created.name} (qty ${created.qty})`,
    )
    tab.value = 'requests'
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not create request')
  }
}

function requestAllBelowThreshold() {
  if (!canRequestPurchase.value) {
    toast.error('Your role cannot create purchase requests')
    return
  }
  const rows = lowStockRows()
  if (!rows.length) {
    toast.info('School store stock is healthy — nothing below threshold')
    return
  }
  let created = 0
  let skipped = 0
  for (const row of rows) {
    if (openPurchaseForStock(row.id)) {
      skipped += 1
      continue
    }
    createPurchaseRequestFromStock(row)
    created += 1
  }
  if (!created && skipped) {
    toast.info(
      `${skipped} alert${skipped === 1 ? '' : 's'} already have open purchase requests`,
    )
  } else {
    toast.success(
      `Raised ${created} purchase request${created === 1 ? '' : 's'}${
        skipped ? ` · ${skipped} already open` : ''
      }`,
    )
  }
  tab.value = 'requests'
}

const issueClassOptions = computed(() => [
  { label: 'All classes', value: 'All classes' },
  ...gradeSelectOptions,
])

function startIssueFlow() {
  if (!canIssue.value || !canWriteStock.value) {
    toast.error('Your role cannot issue store items')
    return
  }
  tab.value = 'stock'
  thresholdFilter.value = 'all'
  toast.info('Pick a stock line, then use Issue on that row')
}

function promptReceivePurchase(row: CatalogRow) {
  if (!canWriteStock.value) {
    toast.error('Your role cannot receive stock')
    return
  }
  if (String(row.status) === 'Received') {
    toast.info('This purchase is already marked received')
    return
  }
  dialog.prompt({
    title: `Receive purchase · ${row.name}`,
    message: `Book goods into ${row.store || 'Main store'} and close this purchase request.`,
    icon: 'lucide-package-check',
    theme: 'green',
    confirmLabel: 'Receive & close request',
    fields: [
      {
        name: 'qty',
        label: 'Quantity received',
        type: 'text',
        required: true,
        defaultValue: String(row.qty || 1),
      },
    ],
    onConfirm: async ({ values }) => {
      try {
        const qty = Number(values.qty)
        const result = receivePurchaseRequest(row.id, qty)
        syncStockStatuses()
        toast.success(
          `Received ${qty} · ${result.stock.name} now ${result.stock.qty} on hand`,
        )
        tab.value = 'stock'
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not receive')
        throw err
      }
    },
  })
}

function promptReceive(row: CatalogRow) {
  if (!canWriteStock.value) {
    toast.error('Your role cannot receive stock')
    return
  }
  dialog.prompt({
    title: `Receive · ${row.name}`,
    message: `Add goods into ${row.store || 'store'} (on hand: ${numField(row, 'qty')}).`,
    icon: 'lucide-package-plus',
    theme: 'green',
    confirmLabel: 'Receive into store',
    fields: [
      {
        name: 'qty',
        label: 'Quantity received',
        type: 'text',
        required: true,
        defaultValue: String(suggestedOrderQty(row)),
      },
      {
        name: 'note',
        label: 'Supplier / GRN note',
        type: 'textarea',
        defaultValue: '',
      },
    ],
    onConfirm: async ({ values }) => {
      try {
        const qty = Number(values.qty)
        const updated = receiveStock(row.id, qty, String(values.note || ''))
        syncStockStatuses()
        toast.success(`Received ${qty} · ${updated.name} now ${updated.qty} on hand`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not receive')
        throw err
      }
    },
  })
}

function promptIssue(row: CatalogRow) {
  if (!canIssue.value || !canWriteStock.value) {
    toast.error('Your role cannot issue store items')
    return
  }
  const teachers = (schoolStore.teachers?.rows || []).map((t) => ({
    label: t.name,
    value: t.name,
  }))
  dialog.prompt({
    title: `Issue to class · ${row.name}`,
    message: `Deduct from ${row.store || 'store'} (on hand: ${numField(row, 'qty')}) and log a classroom issue.`,
    icon: 'lucide-hand-coins',
    theme: 'blue',
    confirmLabel: 'Issue to class',
    fields: [
      {
        name: 'qty',
        label: 'Quantity',
        type: 'text',
        required: true,
        defaultValue: '1',
      },
      {
        name: 'className',
        label: 'Class',
        type: 'select',
        required: true,
        options: issueClassOptions.value,
        defaultValue: String(row.className || 'All classes'),
      },
      {
        name: 'issuedTo',
        label: 'Teacher / staff',
        type: 'select',
        required: true,
        options: teachers.length
          ? teachers
          : [{ label: currentUser.name || 'Teacher', value: currentUser.name || 'Teacher' }],
        defaultValue: teachers[0]?.value || currentUser.name || '',
      },
    ],
    onConfirm: async ({ values }) => {
      try {
        const result = issueStockToClass({
          stockId: row.id,
          qty: Number(values.qty),
          issuedTo: String(values.issuedTo || ''),
          className: String(values.className || ''),
          department: String(row.department || ''),
        })
        syncStockStatuses()
        toast.success(
          `Issued ${values.qty} ${result.stock.name} → ${values.className} (${result.stock.qty} left)`,
        )
        tab.value = 'issues'
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not issue')
        throw err
      }
    },
  })
}

function statusTheme(status: string) {
  const s = status.toLowerCase()
  if (s.includes('available') || s.includes('issued') || s.includes('active'))
    return 'green'
  if (s.includes('low')) return 'amber'
  if (s.includes('critical') || s.includes('out')) return 'red'
  return 'gray'
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="School store" />
    <div class="flex flex-wrap gap-2">
      <Button
        v-if="canIssue && canWriteStock"
        icon-left="lucide-hand-coins"
        label="Issue to class"
        @click="startIssueFlow"
      />
      <Button
        v-if="canRequestPurchase && belowThresholdCount"
        icon-left="lucide-shopping-cart"
        label="Restock alerts"
        @click="requestAllBelowThreshold"
      />
      <Button
        v-if="canCreate || tab === 'overview'"
        variant="solid"
        icon-left="lucide-plus"
        :label="
          tab === 'overview' || tab === 'items'
            ? 'Register item'
            : listTab
              ? TAB_META[listTab].createLabel
              : 'Add'
        "
        @click="createRecord"
      />
    </div>
  </PageHeader>

  <div class="school-page">
    <Alert
      v-if="showSelectionWarning && !selection.length"
      theme="amber"
      title="Select rows first"
      description="Use the checkboxes, then Delete."
      icon="lucide-alert-triangle"
      dismissible
      @dismiss="showSelectionWarning = false"
    />

    <Alert
      v-if="selection.length"
      theme="blue"
      :title="`${selection.length} selected`"
      description="Bulk actions apply to the current tab only."
      icon="lucide-list-checks"
      :primary-action="
        canDelete
          ? {
              label: 'Delete selected',
              theme: 'red',
              onClick: () => {
                deleteSelected()
              },
            }
          : undefined
      "
    />

    <RelatedLinks />

    <PageIntro
      description="Register items → keep stock levels → issue to class or buy when low → receive goods when they arrive."
      :stats="overviewStats"
    />

    <div class="inv-flow mb-4">
      <button type="button" class="inv-flow__step" @click="tab = 'items'">
        <span class="inv-flow__n">1</span>
        <span class="inv-flow__t">Catalogue</span>
      </button>
      <span class="inv-flow__arrow" aria-hidden="true">→</span>
      <button type="button" class="inv-flow__step" @click="tab = 'stock'">
        <span class="inv-flow__n">2</span>
        <span class="inv-flow__t">Stock</span>
      </button>
      <span class="inv-flow__arrow" aria-hidden="true">→</span>
      <button
        type="button"
        class="inv-flow__step"
        @click="tab = 'stock'; thresholdFilter = 'below'"
      >
        <span class="inv-flow__n">3</span>
        <span class="inv-flow__t">Issue or buy</span>
      </button>
      <span class="inv-flow__arrow" aria-hidden="true">→</span>
      <button type="button" class="inv-flow__step" @click="tab = 'requests'">
        <span class="inv-flow__n">4</span>
        <span class="inv-flow__t">Receive</span>
      </button>
    </div>

    <Alert
      v-if="belowThresholdCount"
      theme="amber"
      :title="`${belowThresholdCount} school store item${belowThresholdCount === 1 ? '' : 's'} need attention`"
      description="Critical, low, or out of stock. Raise a purchase request before term exams or open day."
      icon="lucide-triangle-alert"
      :primary-action="
        canRequestPurchase
          ? {
              label: 'Request all for restock',
              onClick: () => requestAllBelowThreshold(),
            }
          : undefined
      "
      :secondary-action="{
        label: 'Open stock alerts',
        onClick: () => {
          tab = 'stock'
          thresholdFilter = 'below'
        },
      }"
    />

    <TabButtons v-model="tab" :options="tabs" class="school-tabs" />

    <!-- Store desk overview -->
    <div v-if="tab === 'overview'" class="space-y-5">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          class="inv-quick"
          @click="tab = 'stock'; thresholdFilter = 'below'"
        >
          <span class="inv-quick__label">Stock alerts</span>
          <span class="inv-quick__value">{{ health.below }}</span>
          <span class="inv-quick__hint">Critical · low · out</span>
        </button>
        <button
          type="button"
          class="inv-quick"
          @click="tab = 'requests'"
        >
          <span class="inv-quick__label">Open purchases</span>
          <span class="inv-quick__value">{{ health.openRequests }}</span>
          <span class="inv-quick__hint">Buy / receive for term</span>
        </button>
        <button
          type="button"
          class="inv-quick"
          @click="tab = 'issues'"
        >
          <span class="inv-quick__label">Pending issues</span>
          <span class="inv-quick__value">{{ health.pendingIssues }}</span>
          <span class="inv-quick__hint">Class / teacher handovers</span>
        </button>
        <button
          type="button"
          class="inv-quick"
          @click="tab = 'assets'"
        >
          <span class="inv-quick__label">Assets to service</span>
          <span class="inv-quick__value">{{ health.assetsNeedingService }}</span>
          <span class="inv-quick__hint">Desks, devices, PE gear</span>
        </button>
      </div>

      <section class="school-section">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Items needing restock</h2>
          <Button
            v-if="canRequestPurchase && alertRows.length"
            size="sm"
            icon-left="lucide-shopping-cart"
            label="Request all"
            @click="requestAllBelowThreshold"
          />
        </div>
        <div v-if="!alertRows.length" class="text-sm text-ink-gray-5">
          Store levels look healthy for the current term.
        </div>
        <ul v-else class="divide-y divide-outline-gray-1">
          <li
            v-for="row in alertRows"
            :key="row.id"
            class="flex flex-wrap items-center justify-between gap-2 py-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-ink-gray-9">{{ row.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ row.store }} · {{ row.className || 'All classes' }} · qty
                {{ row.qty }} (reorder {{ row.reorder }}, critical
                {{ row.critical }})
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <Badge
                :label="stockStatusFromLevels(row)"
                :theme="statusTheme(stockStatusFromLevels(row))"
                variant="subtle"
              />
              <Button
                v-if="canWriteStock"
                size="sm"
                label="Receive"
                @click="promptReceive(row)"
              />
              <Button
                v-if="canIssue && canWriteStock"
                size="sm"
                label="Issue"
                @click="promptIssue(row)"
              />
              <Button
                v-if="canRequestPurchase"
                size="sm"
                variant="solid"
                label="Buy"
                @click="requestPurchaseFor(row)"
              />
            </div>
          </li>
        </ul>
      </section>

      <section class="school-section">
        <h2 class="school-section-title">Recent issues to class</h2>
        <div v-if="!recentIssues.length" class="text-sm text-ink-gray-5">
          No issues logged yet — use Issue to class when handing stationery or kits to teachers.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="row in recentIssues"
            :key="row.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-6 border border-outline-gray-1 px-3 py-2"
          >
            <div>
              <p class="text-sm font-medium text-ink-gray-9">{{ row.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ row.item }} × {{ row.qty }} → {{ row.className }} ·
                {{ row.issuedTo }}
              </p>
            </div>
            <Badge
              :label="String(row.status || '—')"
              :theme="statusTheme(String(row.status || ''))"
              variant="subtle"
            />
          </li>
        </ul>
      </section>
    </div>

    <template v-else>
      <ListToolbar>
        <template #search>
          <FormControl
            v-model="query"
            class="w-full"
            label="Search"
            :placeholder="`Search ${listTab ? TAB_META[listTab].label.toLowerCase() : 'store'}…`"
          />
        </template>
        <FormControl
          v-if="statusOptions.length > 1"
          v-model="statusFilter"
          class="school-filter-select"
          type="select"
          label="Status"
          :options="statusOptions"
        />
        <FormControl
          v-if="tab === 'items' && categoryOptions.length > 1"
          v-model="categoryFilter"
          class="school-filter-select"
          type="select"
          label="Category"
          :options="categoryOptions"
        />
        <FormControl
          v-if="(tab === 'stock' || tab === 'requests') && storeOptions.length > 1"
          v-model="storeFilter"
          class="school-filter-select"
          type="select"
          label="Store"
          :options="storeOptions"
        />
        <FormControl
          v-if="departmentOptions.length > 1"
          v-model="departmentFilter"
          class="school-filter-select"
          type="select"
          label="Section"
          :options="departmentOptions"
        />
        <FormControl
          v-if="classOptions.length > 1"
          v-model="classFilter"
          class="school-filter-select"
          type="select"
          label="Class"
          :options="classOptions"
        />
        <FormControl
          v-if="tab === 'stock'"
          v-model="thresholdFilter"
          class="school-filter-select"
          type="select"
          label="Threshold"
          :options="[
            { label: 'All stock levels', value: 'all' },
            { label: 'Alerts only', value: 'below' },
          ]"
        />
        <Button
          v-if="filtersActive || thresholdFilter === 'below'"
          class="school-filter-clear"
          label="Clear filters"
          icon-left="lucide-filter-x"
          @click="clearAllFilters"
        />
        <Button
          v-if="selection.length"
          icon-left="lucide-x"
          label="Clear selection"
          @click="clearSelection"
        />
        <template #actions>
          <Button
            v-if="tab === 'stock' && canRequestPurchase && belowThresholdCount"
            icon-left="lucide-shopping-cart"
            label="Request all alerts"
            @click="requestAllBelowThreshold"
          />
          <Button
            v-if="canDelete && selection.length"
            icon-left="lucide-trash-2"
            :label="`Delete (${selection.length})`"
            theme="red"
            @click="deleteSelected"
          />
        </template>
      </ListToolbar>

      <p
        v-if="tab === 'stock'"
        class="mb-3 text-sm text-ink-gray-5"
      >
        On each stock line: <strong>Receive</strong> goods,
        <strong>Issue</strong> to a class, or <strong>Buy</strong> when below
        threshold.
      </p>
      <p
        v-else-if="tab === 'requests'"
        class="mb-3 text-sm text-ink-gray-5"
      >
        When supplier goods arrive, use <strong>Receive</strong> on the purchase
        row — stock goes up and the request closes.
      </p>
      <p
        v-else-if="tab === 'issues'"
        class="mb-3 text-sm text-ink-gray-5"
      >
        Issues are logged when you hand items to a class from
        <button type="button" class="inv-inline-link" @click="startIssueFlow">
          Stock
        </button>
        (preferred). Or add a manual issue record.
      </p>

      <CatalogTable
        v-if="mod"
        v-model:selection="selection"
        v-model:active="active"
        :columns="mod.columns"
        :rows="pageRows"
        :grid-columns="columns"
        :can-print="false"
        :can-write="canWrite"
        :empty-text="`No ${listTab ? TAB_META[listTab].label.toLowerCase() : 'rows'} match your filters.`"
        :page="page"
        :total-pages="totalPages"
        :range-label="rangeLabel"
        :total="filtered.length"
        @open="openDetail"
        @edit="editRecord"
        @print="printRecord"
        @prev="goToPage(page - 1)"
        @next="goToPage(page + 1)"
        @go="goToPage"
      >
        <template #actions="{ item }">
          <template v-if="tab === 'stock'">
            <Button
              v-if="canWriteStock"
              class="relative shrink-0"
              icon="lucide-package-plus"
              tooltip="Receive into store"
              aria-label="Receive"
              @click.stop="promptReceive(item)"
            />
            <Button
              v-if="canIssue && canWriteStock && numField(item, 'qty') > 0"
              class="relative shrink-0"
              icon="lucide-hand-coins"
              tooltip="Issue to class"
              aria-label="Issue"
              @click.stop="promptIssue(item)"
            />
            <Button
              v-if="canRequestPurchase && isBelowThreshold(item)"
              class="relative shrink-0"
              icon="lucide-shopping-cart"
              tooltip="Raise purchase request"
              aria-label="Buy"
              @click.stop="requestPurchaseFor(item)"
            />
          </template>
          <template v-else-if="tab === 'requests'">
            <Button
              v-if="
                canWriteStock &&
                !['Received', 'Cancelled'].includes(String(item.status || ''))
              "
              class="relative shrink-0"
              icon="lucide-package-check"
              tooltip="Receive goods & close request"
              aria-label="Receive purchase"
              @click.stop="promptReceivePurchase(item)"
            />
          </template>
          <Button
            class="relative shrink-0"
            icon="lucide-eye"
            :tooltip="`Open ${item.name}`"
            aria-label="Open"
            @click.stop="openDetail(item)"
          />
          <Button
            v-if="canWrite"
            class="relative shrink-0"
            icon="lucide-pencil"
            :tooltip="`Edit ${item.name}`"
            aria-label="Edit"
            @click="editRecord(item, $event)"
          />
        </template>
      </CatalogTable>
    </template>
  </div>
</template>

<style scoped>
.inv-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
}
.inv-flow__step {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--outline-gray-1);
  background: var(--surface-white);
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--ink-gray-7);
}
.inv-flow__step:hover {
  border-color: color-mix(in srgb, var(--school-blue) 40%, white);
  color: var(--ink-gray-9);
}
.inv-flow__n {
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--school-blue) 12%, white);
  color: var(--school-blue);
  font-size: 0.7rem;
  font-weight: 700;
}
.inv-flow__t {
  font-weight: 550;
}
.inv-flow__arrow {
  color: var(--ink-gray-4);
  font-size: 0.85rem;
}
.inv-inline-link {
  color: var(--school-blue);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font: inherit;
}
.inv-quick {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 1rem 1.1rem;
  text-align: left;
  border-radius: 0.75rem;
  border: 1px solid var(--outline-gray-1);
  background: var(--surface-white);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.inv-quick:hover {
  border-color: color-mix(in srgb, var(--school-blue) 35%, white);
  box-shadow: 0 6px 18px rgb(46 49 146 / 0.08);
}
.inv-quick__label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-gray-5);
}
.inv-quick__value {
  font-size: 1.5rem;
  font-weight: 650;
  color: var(--ink-gray-9);
  line-height: 1.1;
}
.inv-quick__hint {
  font-size: 0.75rem;
  color: var(--ink-gray-5);
}
</style>
