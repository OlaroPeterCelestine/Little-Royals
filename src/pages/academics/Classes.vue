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
import type { CatalogRow } from '@/data/catalog/catalog'
import { getLiveModule } from '@/data/catalog/store'
import {
  classSectionBand,
  sortSchoolClassRows,
  type ClassSectionBand,
} from '@/data/school/grades'
import { useListPage } from '@/composables/useListPage'
import {
  openCreateDialog,
  openDeleteDialog,
  openDiscardSelectionDialog,
  openEditDialog,
} from '@/composables/useModuleForms'
import {
  defaultDocumentKind,
  documentsForModule,
  printRecordDocument,
} from '@/data/documents/documents'
import { canCurrentUser } from '@/data/auth/permissions'
import { useModuleAccess } from '@/composables/useModuleAccess'
import CatalogTable from '@/components/list/CatalogTable.vue'
import ListToolbar from '@/components/list/ListToolbar.vue'
import PageIntro from '@/components/list/PageIntro.vue'
import { buildListColumnTracks } from '@/lib/listColumns'
import { pushWithReturn } from '@/composables/useAppBack'

type SectionTab = 'nursery' | 'primary'
type PrimaryBand = 'lower-primary' | 'upper-primary'

const route = useRoute()
const router = useRouter()
const moduleKey = 'classes'

function parseSection(raw: unknown): SectionTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'primary') return 'primary'
  return 'nursery'
}

function parsePrimaryBand(raw: unknown): PrimaryBand {
  const v = String(raw || '').toLowerCase()
  if (v === 'upper' || v === 'upper-primary') return 'upper-primary'
  return 'lower-primary'
}

const section = ref<SectionTab>(parseSection(route.query.section))
const primaryBand = ref<PrimaryBand>(parsePrimaryBand(route.query.band))

const mod = computed(() => getLiveModule(moduleKey))
const allRows = computed(() => sortSchoolClassRows(mod.value?.rows || []))

function rowBand(row: CatalogRow): ClassSectionBand | '' {
  return classSectionBand(row.grade || row.name)
}

const nurseryCount = computed(
  () => allRows.value.filter((r) => rowBand(r) === 'nursery').length,
)
const lowerCount = computed(
  () => allRows.value.filter((r) => rowBand(r) === 'lower-primary').length,
)
const upperCount = computed(
  () => allRows.value.filter((r) => rowBand(r) === 'upper-primary').length,
)
const primaryCount = computed(() => lowerCount.value + upperCount.value)

const sectionTabs = computed(() => [
  { label: `Nursery (${nurseryCount.value})`, value: 'nursery' },
  { label: `Primary (${primaryCount.value})`, value: 'primary' },
])

const primaryTabs = computed(() => [
  {
    label: `Lower primary · P.1–P.3 (${lowerCount.value})`,
    value: 'lower-primary',
  },
  {
    label: `Upper primary · P.4–P.7 (${upperCount.value})`,
    value: 'upper-primary',
  },
])

const activeBand = computed<ClassSectionBand>(() =>
  section.value === 'nursery' ? 'nursery' : primaryBand.value,
)

const rows = computed(() =>
  allRows.value.filter((r) => rowBand(r) === activeBand.value),
)

const sectionBlurb = computed(() => {
  if (section.value === 'nursery') {
    return 'Baby Class · Middle Class · Top Class'
  }
  if (primaryBand.value === 'lower-primary') {
    return 'Lower primary streams · P.1 to P.3'
  }
  return 'Upper primary streams · P.4 to P.7'
})

watch(section, (value) => {
  router.replace({
    path: '/classes',
    query: {
      ...route.query,
      section: value,
      ...(value === 'primary' ? { band: primaryBand.value } : { band: undefined }),
    },
  })
})

watch(primaryBand, (value) => {
  if (section.value !== 'primary') return
  router.replace({
    path: '/classes',
    query: { ...route.query, section: 'primary', band: value },
  })
})

watch(
  () => [route.query.section, route.query.band] as const,
  ([sec, band]) => {
    const nextSec = parseSection(sec)
    const nextBand = parsePrimaryBand(band)
    if (section.value !== nextSec) section.value = nextSec
    if (primaryBand.value !== nextBand) primaryBand.value = nextBand
  },
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
} = useListPage(rows, {
  searchKeys: ['name', 'grade', 'teacher', 'room'],
})

watch([section, primaryBand], () => {
  resetFilters()
  selection.value = []
  active.value = undefined
  showSelectionWarning.value = false
})

watch([query, statusFilter], () => {
  selection.value = []
})

const columns = computed(() =>
  buildListColumnTracks(mod.value?.columns || []),
)

function createRecord() {
  if (!requirePerm('create', 'create records')) return
  openCreateDialog('classes')
}

function editRecord(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!requirePerm('write', 'edit records')) return
  openEditDialog('classes', row)
}

function openDetail(row: CatalogRow) {
  pushWithReturn(router, `/classes/${row.id}`)
}

const allowPrint = computed(() => false)

function printRecord(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!allowPrint.value) {
    toast.error('Your role cannot print this document')
    return
  }
  try {
    const title = printRecordDocument(
      defaultDocumentKind(moduleKey),
      moduleKey,
      row,
    )
    toast.success(`Print preview · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function deleteSelected() {
  if (!requirePerm('delete', 'delete records')) return
  if (!selection.value.length) {
    showSelectionWarning.value = true
    openDeleteDialog(moduleKey, [])
    return
  }
  showSelectionWarning.value = false
  openDeleteDialog(moduleKey, [...selection.value])
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
    <PageHeaderTitle title="Classes" />
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
      :description="`${mod.description}. ${sectionBlurb}.`"
      :stats="stats"
    />

    <TabButtons v-model="section" :options="sectionTabs" class="school-tabs" />
    <TabButtons
      v-if="section === 'primary'"
      v-model="primaryBand"
      :options="primaryTabs"
      class="school-tabs"
    />

    <ListToolbar>
      <template #search>
        <FormControl
          v-model="query"
          class="w-full"
          label="Search"
          placeholder="Search classes"
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
          label="New class"
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
  </div>
</template>
