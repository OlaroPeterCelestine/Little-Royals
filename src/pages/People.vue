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

type PeopleTab = 'teachers' | 'staff' | 'parents'

const route = useRoute()
const router = useRouter()

const TAB_META: Record<
  PeopleTab,
  { module: string; label: string; createLabel: string }
> = {
  teachers: {
    module: 'teachers',
    label: 'Teachers',
    createLabel: 'New teacher',
  },
  staff: {
    module: 'staff',
    label: 'Staff',
    createLabel: 'New staff',
  },
  parents: {
    module: 'guardians',
    label: 'Parents',
    createLabel: 'New parent',
  },
}

function parseTab(raw: unknown): PeopleTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'staff' || v === 'employees') return 'staff'
  if (v === 'parents' || v === 'guardians' || v === 'parent') return 'parents'
  if (v === 'teachers' || v === 'teacher') return 'teachers'
  return 'teachers'
}

const tab = ref<PeopleTab>(parseTab(route.query.tab))

const tabs = computed(() => [
  {
    label: `Teachers (${schoolStore.teachers?.rows.length || 0})`,
    value: 'teachers',
  },
  {
    label: `Staff (${schoolStore.staff?.rows.length || 0})`,
    value: 'staff',
  },
  {
    label: `Parents (${schoolStore.guardians?.rows.length || 0})`,
    value: 'parents',
  },
])

watch(tab, (value) => {
  router.replace({ path: '/people', query: { ...route.query, tab: value } })
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
const rows = computed(() => mod.value?.rows || [])
const { canCreate, canWrite, canDelete, canPrint, requirePerm } =
  useModuleAccess(moduleKey)

const active = ref<string>()
const selection = ref<string[]>([])
const showSelectionWarning = ref(false)

const extraFilterKey = computed(() => {
  const cols = mod.value?.columns.map((c) => c.key) || []
  if (cols.includes('department')) return 'department'
  if (cols.includes('relation')) return 'relation'
  if (cols.includes('subject')) return 'subject'
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

watch(tab, () => {
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

const overviewStats = computed(() => [
  {
    title: 'Teachers',
    value: schoolStore.teachers?.rows.length || 0,
    caption: 'teaching staff',
  },
  {
    title: 'Staff',
    value: schoolStore.staff?.rows.length || 0,
    caption: 'directory',
  },
  {
    title: 'Parents',
    value: schoolStore.guardians?.rows.length || 0,
    caption: 'guardians',
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
    <PageHeaderTitle title="People" />
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
      description="Teachers, staff, and parents in one place — switch tabs to filter."
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
