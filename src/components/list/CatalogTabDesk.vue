<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Alert,
  Button,
  FormControl,
  TabButtons,
  toast,
} from 'frappe-ui'
import { getLiveModule } from '@/data/catalog/store'
import {
  openCreateDialog,
  openDeleteDialog,
  openDiscardSelectionDialog,
  openEditDialog,
} from '@/composables/useModuleForms'
import { canCurrentUser } from '@/data/auth/permissions'
import { pushWithReturn } from '@/composables/useAppBack'
import type { CatalogRow } from '@/data/catalog/catalog'
import { useListPage } from '@/composables/useListPage'
import { buildListColumnTracks } from '@/lib/listColumns'
import {
  defaultDocumentKind,
  moduleShowsListPrint,
  printRecordDocument,
} from '@/data/documents/documents'
import CatalogTable from '@/components/list/CatalogTable.vue'
import ListToolbar from '@/components/list/ListToolbar.vue'
import ListStatCards from '@/components/list/ListStatCards.vue'
import RelatedLinks from '@/components/list/RelatedLinks.vue'
import type { ListStat } from '@/composables/useListPage'

export type DeskTab = {
  label: string
  value: string
  module: string
}

const props = withDefaults(
  defineProps<{
    tabs: DeskTab[]
    /** query key for tab, default `tab` */
    queryKey?: string
    /** Show auto stats for the active tab module (default true). */
    showStats?: boolean
    /** Related desk links for this hub (default true). */
    showRelated?: boolean
    /** Optional override; when set, replaces auto status stats. */
    stats?: ListStat[]
  }>(),
  {
    showStats: true,
    showRelated: true,
  },
)

const route = useRoute()
const router = useRouter()
const queryKey = computed(() => props.queryKey || 'tab')
const active = ref<string>()
const selection = ref<string[]>([])
const showSelectionWarning = ref(false)

function parseTab(raw: unknown): string {
  const v = String(raw || '')
  if (props.tabs.some((t) => t.value === v)) return v
  return props.tabs[0]?.value || ''
}

const tab = ref(parseTab(route.query[queryKey.value]))
const multi = computed(() => props.tabs.length > 1)

watch(tab, (value) => {
  if (!multi.value) return
  router.replace({
    path: route.path,
    query: { ...route.query, [queryKey.value]: value },
  })
  selection.value = []
  active.value = undefined
  showSelectionWarning.value = false
})

watch(
  () => route.query[queryKey.value],
  (value) => {
    if (!multi.value) return
    const next = parseTab(value)
    if (tab.value !== next) tab.value = next
  },
)

const activeTab = computed(
  () => props.tabs.find((t) => t.value === tab.value) || props.tabs[0],
)

const moduleKey = computed(() => activeTab.value?.module || '')

const mod = computed(() =>
  moduleKey.value ? getLiveModule(moduleKey.value) : undefined,
)

const rows = computed(() => mod.value?.rows || [])

const canCreate = computed(() =>
  moduleKey.value ? canCurrentUser(moduleKey.value, 'create') : false,
)
const canWrite = computed(() =>
  moduleKey.value ? canCurrentUser(moduleKey.value, 'write') : false,
)
const canDelete = computed(() =>
  moduleKey.value ? canCurrentUser(moduleKey.value, 'delete') : false,
)
const allowPrint = computed(
  () =>
    Boolean(moduleKey.value) &&
    moduleShowsListPrint(moduleKey.value) &&
    canCurrentUser(moduleKey.value, 'print'),
)

const extraFilterKey = computed(() => {
  const cols = mod.value?.columns.map((c) => c.key) || []
  if (cols.includes('program')) return 'program'
  if (cols.includes('className')) return 'className'
  if (cols.includes('grade')) return 'grade'
  if (cols.includes('type')) return 'type'
  if (cols.includes('channel')) return 'channel'
  return undefined
})

const extraFilterLabel = computed(() => {
  const key = extraFilterKey.value
  if (!key || !mod.value) return 'filter'
  return mod.value.columns.find((c) => c.key === key)?.label || key
})

const {
  query,
  statusFilter,
  extraFilter,
  page,
  statusOptions,
  extraOptions,
  filtered,
  pageRows,
  totalPages,
  rangeLabel,
  stats: autoStats,
  hasActiveFilters,
  resetFilters,
  goToPage,
} = useListPage(rows, {
  extraFilterKey,
  extraFilterLabel,
})

const displayStats = computed(() => {
  if (!props.showStats) return []
  if (props.stats?.length) return props.stats
  return autoStats.value
})

watch(moduleKey, () => {
  resetFilters()
  selection.value = []
  active.value = undefined
})

watch([query, statusFilter, extraFilter], () => {
  selection.value = []
})

const columns = computed(() =>
  buildListColumnTracks(mod.value?.columns || []),
)

const tabButtons = computed(() =>
  props.tabs.map((t) => ({ label: t.label, value: t.value })),
)

function openRow(row: CatalogRow) {
  if (!moduleKey.value) return
  pushWithReturn(router, `/${moduleKey.value}/${row.id}`)
}

function createRow() {
  if (!moduleKey.value || !canCreate.value) return
  openCreateDialog(moduleKey.value)
}

function editRow(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!moduleKey.value || !canWrite.value) return
  openEditDialog(moduleKey.value, row)
}

function printRow(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!moduleKey.value || !allowPrint.value) {
    toast.error('Your role cannot print this document')
    return
  }
  try {
    let kind = defaultDocumentKind(moduleKey.value)
    if (
      moduleKey.value === 'fees' &&
      ['Paid', 'Partial'].includes(String(row.status || ''))
    ) {
      kind = 'receipt'
    }
    const title = printRecordDocument(kind, moduleKey.value, row)
    toast.success(`Print preview · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function deleteSelected() {
  if (!moduleKey.value || !canDelete.value) return
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
</script>

<template>
  <RelatedLinks v-if="showRelated" />

  <TabButtons
    v-if="tabs.length > 1"
    v-model="tab"
    :options="tabButtons"
    class="school-tabs"
  />

  <ListStatCards v-if="displayStats.length" :stats="displayStats" />

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
    description="Use row checkboxes for bulk actions."
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

  <ListToolbar>
    <template #search>
      <FormControl
        v-model="query"
        class="w-full"
        label="Search"
        :placeholder="`Search ${mod?.title?.toLowerCase() || 'records'}`"
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
      v-if="extraOptions.length > 1"
      v-model="extraFilter"
      class="school-filter-select"
      type="select"
      :label="extraFilterLabel"
      :options="extraOptions"
    />
    <Button
      v-if="hasActiveFilters"
      class="school-filter-clear"
      label="Clear filters"
      icon-left="lucide-filter-x"
      @click="resetFilters"
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
        :label="`New ${mod?.singular || 'record'}`"
        @click="createRow"
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
    :can-print="allowPrint"
    :can-write="canWrite"
    :page="page"
    :total-pages="totalPages"
    :range-label="rangeLabel"
    :total="filtered.length"
    :empty-text="`No ${mod.title?.toLowerCase() || 'records'} yet.`"
    @open="openRow"
    @edit="editRow"
    @print="printRow"
    @prev="goToPage(page - 1)"
    @next="goToPage(page + 1)"
    @go="goToPage"
  >
    <template v-if="$slots['row-actions']" #actions="slotProps">
      <slot
        name="row-actions"
        v-bind="{ ...slotProps, moduleKey, canWrite, canPrint: allowPrint }"
      />
    </template>
  </CatalogTable>
</template>
