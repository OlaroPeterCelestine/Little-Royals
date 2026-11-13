<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import {
  List,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
  ListRows,
} from 'frappe-ui/list'
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
  printRecordDocument,
} from '../data/documents'
import { useModuleAccess } from '../composables/useModuleAccess'
import ListPagination from '../components/ListPagination.vue'
import ListStatCards from '../components/ListStatCards.vue'
import ListToolbar from '../components/ListToolbar.vue'

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
const rows = computed(() => mod.value?.rows || [])
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

const columns = computed(() => {
  const cols = mod.value?.columns || []
  const tracks = cols.map((c, i) => {
    if (i === 0) return 'minmax(0, 1.5fr)'
    if (c.badge) return '7.5rem'
    if (c.key === 'id') return '7rem'
    return 'minmax(0, 1fr)'
  })
  const actions = '9rem'
  const last = tracks[tracks.length - 1] || '7.5rem'
  return {
    // Below md only primary + status + actions are visible
    base: [tracks[0] || 'minmax(0,1fr)', last, actions],
    md: [...tracks, actions],
  }
})

function cellValue(row: CatalogRow, key: string) {
  const value = row[key]
  return value === undefined || value === null ? '—' : String(value)
}

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
</script>

<template>
  <PageHeader>
    <PageHeaderTitle :title="mod?.title || 'Module'" />
    <div class="flex items-center gap-2">
      <Button
        v-if="selection.length"
        icon-left="lucide-x"
        label="Clear"
        @click="clearSelection"
      />
      <Button
        v-if="canDelete"
        icon-left="lucide-trash-2"
        label="Delete"
        theme="red"
        :disabled="!selection.length"
        @click="deleteSelected"
      />
      <Button
        v-if="canCreate"
        variant="solid"
        icon-left="lucide-plus"
        :label="`New ${mod?.singular || 'record'}`"
        @click="createRecord"
      />
    </div>
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
      :description="
        canDelete
          ? 'Edit one row with the pencil, or delete the selection.'
          : 'Your role can view this selection but cannot delete it.'
      "
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

    <div v-if="mod" class="space-y-3">
      <p class="text-p-base text-ink-gray-6">{{ mod.description }}</p>
      <ListStatCards :stats="stats" />
    </div>

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
        label="Clear"
        icon-left="lucide-filter-x"
        @click="resetFilters"
      />
    </ListToolbar>

    <div v-if="mod" class="school-table">
      <List
        v-model:selection="selection"
        v-model:active="active"
        selectable
        :columns="columns"
      >
        <ListHeader>
          <ListHeaderCell
            v-for="(col, index) in mod.columns"
            :key="col.key"
            :class="
              index > 0 && index < mod.columns.length - 1 ? 'hidden md:flex' : ''
            "
          >
            {{ col.label }}
          </ListHeaderCell>
          <ListHeaderCell class="school-list-actions-head">
            Actions
          </ListHeaderCell>
        </ListHeader>

        <ListRows :items="pageRows" v-slot="{ item }">
          <ListRow
            :value="item.id"
            class="cursor-pointer"
            @click="openDetail(item)"
          >
            <ListCell
              v-for="(col, index) in mod.columns"
              :key="col.key"
              :class="[
                index > 0 && index < mod.columns.length - 1
                  ? 'hidden md:flex'
                  : '',
                col.badge ? '' : 'text-ink-gray-7',
              ]"
            >
              <div
                v-if="col.primary"
                class="flex min-w-0 items-center gap-4 pe-2"
              >
                <Avatar :label="item.name" size="md" />
                <div class="min-w-0 flex-1 space-y-1">
                  <p class="truncate text-sm-medium text-ink-gray-9">
                    {{ item.name }}
                  </p>
                  <p
                    v-if="item.subtitle"
                    class="truncate text-xs text-ink-gray-5"
                  >
                    {{ item.subtitle }}
                  </p>
                </div>
              </div>
              <div
                v-else-if="col.badge && item.status"
                class="flex items-center gap-2"
              >
                <Badge
                  :label="item.status"
                  :theme="item.statusTheme || 'gray'"
                  variant="subtle"
                />
              </div>
              <span
                v-else
                class="block truncate"
                :title="cellValue(item, col.key)"
                >{{ cellValue(item, col.key) }}</span
              >
            </ListCell>
            <ListCell class="school-list-actions">
              <Button
                v-if="canPrint"
                class="relative shrink-0"
                icon="lucide-printer"
                :tooltip="`Print ${item.name}`"
                aria-label="Print"
                @click="printRecord(item, $event)"
              />
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
            </ListCell>
          </ListRow>
        </ListRows>
      </List>

      <p
        v-if="filtered.length === 0"
        class="px-4 py-10 text-center text-sm text-ink-gray-5"
      >
        No records match your filters.
      </p>

      <ListPagination
        v-else
        :page="page"
        :total-pages="totalPages"
        :range-label="rangeLabel"
        :total="filtered.length"
        @prev="goToPage(page - 1)"
        @next="goToPage(page + 1)"
        @go="goToPage"
      />
    </div>

    <div
      v-else
      class="rounded-6 border border-outline-gray-1 px-4 py-16 text-center text-ink-gray-5"
    >
      Module not found.
    </div>
  </div>
</template>
