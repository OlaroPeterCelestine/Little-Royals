<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Alert,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import type { CatalogRow } from '../data/catalog'
import { getLiveModule } from '../data/store'
import { useListPage } from '../composables/useListPage'
import {
  openCreateDialog,
  openDeleteDialog,
  openDiscardSelectionDialog,
  openEditDialog,
} from '../composables/useModuleForms'
import {
  defaultDocumentKind,
  documentsForModule,
  printRecordDocument,
} from '../data/documents'
import { canCurrentUser } from '../data/permissions'
import { useModuleAccess } from '../composables/useModuleAccess'
import CatalogTable from '../components/CatalogTable.vue'
import ListToolbar from '../components/ListToolbar.vue'
import PageIntro from '../components/PageIntro.vue'
import { buildListColumnTracks } from '../utils/listColumns'
import { sortSchoolClassRows } from '../data/grades'
import AppBackButton from '../components/AppBackButton.vue'
import { pushWithReturn } from '../composables/useAppBack'

const route = useRoute()
const router = useRouter()
const active = ref<string>()
const selection = ref<string[]>([])
const showSelectionWarning = ref(false)

const moduleKey = computed(() => {
  if (route.params.module) return String(route.params.module)
  const name = String(route.name || '')
  if (name && name !== 'school-events-list') return name
  const path = String(route.path).replace(/^\//, '').split('/')[0]
  return path || name
})

const mod = computed(() => getLiveModule(moduleKey.value))
const rows = computed(() => {
  const list = mod.value?.rows || []
  if (moduleKey.value === 'classes') return sortSchoolClassRows(list)
  return list
})
const { canCreate, canWrite, canDelete, canPrint, requirePerm } =
  useModuleAccess(moduleKey)

const extraFilterKey = computed(() => {
  const cols = mod.value?.columns.map((c) => c.key) || []
  if (cols.includes('program')) return 'program'
  if (cols.includes('className')) return 'className'
  if (cols.includes('category')) return 'category'
  if (cols.includes('store')) return 'store'
  if (cols.includes('type')) return 'type'
  if (cols.includes('department')) return 'department'
  if (cols.includes('area')) return 'area'
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
  stats,
  hasActiveFilters,
  resetFilters,
  goToPage,
} = useListPage(rows, {
  extraFilterKey,
  extraFilterLabel,
})

watch(moduleKey, () => {
  resetFilters()
  selection.value = []
  active.value = undefined
  showSelectionWarning.value = false
})

watch([query, statusFilter, extraFilter], () => {
  selection.value = []
})

const columns = computed(() =>
  buildListColumnTracks(mod.value?.columns || []),
)

function createRecord() {
  if (!requirePerm('create', 'create records')) return
  openCreateDialog(moduleKey.value)
}

function editRecord(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!requirePerm('write', 'edit records')) return
  openEditDialog(moduleKey.value, row)
}

function openDetail(row: CatalogRow) {
  pushWithReturn(router, `/${moduleKey.value}/${row.id}`)
}

const showPrint = computed(
  () =>
    documentsForModule(moduleKey.value).length > 0 ||
    defaultDocumentKind(moduleKey.value) !== 'generic',
)

const allowPrint = computed(
  () =>
    showPrint.value &&
    (canPrint.value ||
      canCurrentUser(moduleKey.value, 'export') ||
      canCurrentUser(moduleKey.value, 'read')),
)

function printRecord(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!allowPrint.value) {
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

</script>

<template>
  <PageHeader>
    <PageHeaderTitle :title="mod?.title || 'Module'" />
    <AppBackButton only-when-from fallback="/term-overview" />
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

    <PageIntro
      v-if="mod"
      :description="mod.description"
      :stats="stats"
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
          v-if="moduleKey === 'fees'"
          icon-left="lucide-circle-off"
          label="Offset left dues"
          @click="router.push('/fees/offset')"
        />
        <Button
          v-if="moduleKey === 'attendance' && canCreate"
          variant="solid"
          icon-left="lucide-user-check"
          label="Take attendance"
          @click="router.push('/attendance/take')"
        />
        <Button
          v-else-if="canCreate"
          variant="solid"
          icon-left="lucide-plus"
          :label="`New ${mod?.singular || 'record'}`"
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
      :can-print="allowPrint"
      :can-write="canWrite"
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

    <div
      v-else
      class="school-table-empty rounded-6 border border-outline-gray-1"
    >
      Module not found.
    </div>
  </div>
</template>
