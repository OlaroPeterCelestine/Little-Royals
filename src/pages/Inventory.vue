<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Alert,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
  toast,
} from 'frappe-ui'
import type { CatalogRow } from '../data/catalog'
import { getLiveModule, schoolStore } from '../data/store'
import { useListPage } from '../composables/useListPage'
import {
  openDeleteDialog,
  openDiscardSelectionDialog,
} from '../composables/useModuleForms'
import {
  defaultDocumentKind,
  printRecordDocument,
} from '../data/documents'
import { useModuleAccess } from '../composables/useModuleAccess'
import CatalogTable from '../components/CatalogTable.vue'
import ListToolbar from '../components/ListToolbar.vue'
import PageIntro from '../components/PageIntro.vue'
import { buildListColumnTracks } from '../utils/listColumns'

type InventoryTab = 'items' | 'stock' | 'issues' | 'assets'

const route = useRoute()
const router = useRouter()

const TAB_META: Record<
  InventoryTab,
  { module: string; label: string; createLabel: string }
> = {
  items: {
    module: 'inventory-items',
    label: 'Items',
    createLabel: 'New item',
  },
  stock: {
    module: 'inventory-stock',
    label: 'Stock',
    createLabel: 'New stock row',
  },
  issues: {
    module: 'inventory-issues',
    label: 'Issues',
    createLabel: 'New issue',
  },
  assets: {
    module: 'assets',
    label: 'Assets',
    createLabel: 'New asset',
  },
}

function parseTab(raw: unknown): InventoryTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'stock' || v === 'inventory-stock') return 'stock'
  if (v === 'issues' || v === 'inventory-issues' || v === 'issue') return 'issues'
  if (v === 'assets' || v === 'asset') return 'assets'
  if (v === 'items' || v === 'inventory-items' || v === 'item') return 'items'
  return 'items'
}

const tab = ref<InventoryTab>(parseTab(route.query.tab))
const classFilter = ref('All')
const departmentFilter = ref('All')

const tabs = computed(() => [
  {
    label: `Items (${schoolStore['inventory-items']?.rows.length || 0})`,
    value: 'items',
  },
  {
    label: `Stock (${schoolStore['inventory-stock']?.rows.length || 0})`,
    value: 'stock',
  },
  {
    label: `Issues (${schoolStore['inventory-issues']?.rows.length || 0})`,
    value: 'issues',
  },
  {
    label: `Assets (${schoolStore.assets?.rows.length || 0})`,
    value: 'assets',
  },
])

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

const moduleKey = computed(() => TAB_META[tab.value].module)
const mod = computed(() => getLiveModule(moduleKey.value))
const sourceRows = computed(() => mod.value?.rows || [])

function uniqueValues(key: 'className' | 'department') {
  const values = new Set<string>()
  for (const row of sourceRows.value) {
    const raw = String(row[key] || '').trim()
    if (raw) values.add(raw)
  }
  return [...values].sort((a, b) => a.localeCompare(b))
}

const classOptions = computed(() => [
  { label: 'All classes', value: 'All' },
  ...uniqueValues('className').map((v) => ({
    label: `${v} (${sourceRows.value.filter((r) => String(r.className) === v).length})`,
    value: v,
  })),
])

const departmentOptions = computed(() => [
  { label: 'All departments', value: 'All' },
  ...uniqueValues('department').map((v) => ({
    label: `${v} (${sourceRows.value.filter((r) => String(r.department) === v).length})`,
    value: v,
  })),
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
    return true
  }),
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
  stats,
  hasActiveFilters,
  resetFilters,
  goToPage,
} = useListPage(scopedRows, {})

const hasClassOrDeptFilter = computed(
  () => classFilter.value !== 'All' || departmentFilter.value !== 'All',
)

const filtersActive = computed(
  () => hasActiveFilters.value || hasClassOrDeptFilter.value,
)

watch(tab, () => {
  resetFilters()
  classFilter.value = 'All'
  departmentFilter.value = 'All'
  selection.value = []
  active.value = undefined
  showSelectionWarning.value = false
})

watch([query, statusFilter, classFilter, departmentFilter], () => {
  selection.value = []
  page.value = 1
})

const columns = computed(() =>
  buildListColumnTracks(mod.value?.columns || []),
)

const overviewStats = computed(() => [
  {
    title: 'Items',
    value: schoolStore['inventory-items']?.rows.length || 0,
    caption: 'catalogue',
  },
  {
    title: 'Stock rows',
    value: schoolStore['inventory-stock']?.rows.length || 0,
    caption: 'locations',
  },
  {
    title: 'Open issues',
    value:
      schoolStore['inventory-issues']?.rows.filter(
        (r) => String(r.status) === 'Pending',
      ).length || 0,
    caption: 'pending issue',
  },
  {
    title: 'Showing',
    value: filtered.value.length,
    caption: TAB_META[tab.value].label.toLowerCase(),
  },
])

function createRecord() {
  if (!requirePerm('create', 'create records')) return
  router.push(`/${moduleKey.value}/new`)
}

function editRecord(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!requirePerm('write', 'edit records')) return
  router.push(`/${moduleKey.value}/${row.id}/edit`)
}

function openDetail(row: CatalogRow) {
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

function selectPage() {
  selection.value = pageRows.value.map((r) => r.id)
}

function selectAllFiltered() {
  selection.value = filtered.value.map((r) => r.id)
}

function clearAllFilters() {
  resetFilters()
  classFilter.value = 'All'
  departmentFilter.value = 'All'
}

const allPageSelected = computed(
  () =>
    pageRows.value.length > 0 &&
    pageRows.value.every((r) => selection.value.includes(r.id)),
)

const allFilteredSelected = computed(
  () =>
    filtered.value.length > 0 &&
    selection.value.length === filtered.value.length &&
    filtered.value.every((r) => selection.value.includes(r.id)),
)
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Inventory" />
  </PageHeader>

  <div class="school-page">
    <Alert
      v-if="showSelectionWarning && !selection.length"
      theme="amber"
      title="Select rows first"
      description="Use the checkboxes on the left of each row, then click Delete."
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

    <PageIntro
      description="Manage items, stock, issues and assets — filter by class and department."
      :stats="overviewStats"
    />

    <TabButtons v-model="tab" :options="tabs" class="school-tabs" />

    <ListToolbar>
      <template #search>
        <FormControl
          v-model="query"
          class="w-full"
          label="Search"
          :placeholder="`Search ${TAB_META[tab].label.toLowerCase()}`"
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
        v-if="departmentOptions.length > 1"
        v-model="departmentFilter"
        class="school-filter-select"
        type="select"
        label="Department"
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
      <Button
        v-if="filtersActive"
        class="school-filter-clear"
        label="Clear filters"
        icon-left="lucide-filter-x"
        @click="clearAllFilters"
      />
      <Button
        v-if="!allPageSelected"
        icon-left="lucide-list-checks"
        label="Select page"
        :disabled="!pageRows.length"
        @click="selectPage"
      />
      <Button
        v-else-if="!allFilteredSelected && filtered.length > pageRows.length"
        icon-left="lucide-check-check"
        :label="`Select all ${filtered.length}`"
        @click="selectAllFiltered"
      />
      <Button
        v-if="selection.length"
        icon-left="lucide-x"
        label="Clear selection"
        @click="clearSelection"
      />
      <template #actions>
        <Button
          v-if="canDelete && selection.length"
          icon-left="lucide-trash-2"
          :label="`Delete (${selection.length})`"
          theme="red"
          @click="deleteSelected"
        />
        <Button
          v-if="canCreate"
          variant="solid"
          icon-left="lucide-plus"
          :label="TAB_META[tab].createLabel"
          @click="createRecord"
        />
      </template>
    </ListToolbar>

    <CatalogTable
      v-if="mod"
      v-model:selection="selection"
      v-model:active="active"
      :columns="mod.columns"
      :rows="pageRows"
      :grid-columns="columns"
      :can-print="canPrint"
      :can-write="canWrite"
      :empty-text="`No ${TAB_META[tab].label.toLowerCase()} match your filters.`"
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
    />
  </div>
</template>
