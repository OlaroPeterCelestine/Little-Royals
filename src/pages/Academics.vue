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
import { isNurseryClass, isPrimaryClass } from '../data/grades'
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

type SectionTab = 'all' | 'nursery' | 'primary'

type ToolKey =
  | 'lesson-plans'
  | 'nursery-activities'
  | 'nursery-observations'
  | 'nursery-development'
  | 'schemes-of-work'
  | 'homework'
  | 'gradebook'

const route = useRoute()
const router = useRouter()

const TOOLS: Record<
  ToolKey,
  {
    label: string
    module?: string
    sections: SectionTab[]
    createLabel: string
  }
> = {
  'lesson-plans': {
    label: 'Lesson plans',
    module: 'lesson-plans',
    sections: ['all', 'nursery', 'primary'],
    createLabel: 'New lesson plan',
  },
  'nursery-activities': {
    label: 'Activities',
    module: 'nursery-activities',
    sections: ['all', 'nursery'],
    createLabel: 'New activity',
  },
  'nursery-observations': {
    label: 'Observations',
    module: 'nursery-observations',
    sections: ['all', 'nursery'],
    createLabel: 'New observation',
  },
  'nursery-development': {
    label: 'Development',
    module: 'nursery-development',
    sections: ['all', 'nursery'],
    createLabel: 'New record',
  },
  'schemes-of-work': {
    label: 'Schemes of work',
    module: 'schemes-of-work',
    sections: ['all', 'primary'],
    createLabel: 'New scheme',
  },
  homework: {
    label: 'Homework',
    module: 'homework',
    sections: ['all', 'nursery', 'primary'],
    createLabel: 'New homework',
  },
  gradebook: {
    label: 'Exams & marks',
    sections: ['all', 'nursery', 'primary'],
    createLabel: 'Set exams & marks',
  },
}

function parseSection(raw: unknown): SectionTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'nursery' || v === 'n') return 'nursery'
  if (v === 'primary' || v === 'p') return 'primary'
  return 'all'
}

function parseTool(raw: unknown, section: SectionTab): ToolKey {
  const v = String(raw || '').toLowerCase()
  const keys = Object.keys(TOOLS) as ToolKey[]
  const match = keys.find(
    (k) =>
      k === v ||
      k.replace(/-/g, '') === v.replace(/-/g, '') ||
      TOOLS[k].label.toLowerCase() === v,
  )
  if (match && TOOLS[match].sections.includes(section)) return match
  return section === 'nursery'
    ? 'nursery-activities'
    : section === 'primary'
      ? 'schemes-of-work'
      : 'lesson-plans'
}

const section = ref<SectionTab>(parseSection(route.query.section || route.query.tab))
const tool = ref<ToolKey>(
  parseTool(route.query.tool, section.value),
)

const sectionTabs = computed(() => {
  const nurseryCount =
    (schoolStore['nursery-activities']?.rows.length || 0) +
    (schoolStore['nursery-observations']?.rows.length || 0) +
    (schoolStore['nursery-development']?.rows.length || 0)
  const lessonPlans = schoolStore['lesson-plans']?.rows || []
  const nurseryLessons = lessonPlans.filter((r) => rowInSection(r, 'nursery')).length
  const primaryLessons = lessonPlans.filter((r) => rowInSection(r, 'primary')).length
  const homework = schoolStore.homework?.rows || []
  const schemes = schoolStore['schemes-of-work']?.rows.length || 0

  return [
    {
      label: `All school`,
      value: 'all',
    },
    {
      label: `Nursery (${nurseryCount + nurseryLessons})`,
      value: 'nursery',
    },
    {
      label: `Primary (${schemes + primaryLessons + homework.filter((r) => rowInSection(r, 'primary')).length})`,
      value: 'primary',
    },
  ]
})

const toolTabs = computed(() =>
  (Object.keys(TOOLS) as ToolKey[])
    .filter((key) => TOOLS[key].sections.includes(section.value))
    .map((key) => ({
      label: TOOLS[key].label,
      value: key,
    })),
)

function syncQuery() {
  router.replace({
    path: '/academics',
    query: {
      ...route.query,
      section: section.value,
      tool: tool.value,
    },
  })
}

watch([section, tool], syncQuery)

watch(
  () => [route.query.section, route.query.tab, route.query.tool],
  () => {
    const nextSection = parseSection(route.query.section || route.query.tab)
    if (section.value !== nextSection) section.value = nextSection
    const nextTool = parseTool(route.query.tool, nextSection)
    if (tool.value !== nextTool) tool.value = nextTool
  },
)

watch(section, (value) => {
  if (!TOOLS[tool.value].sections.includes(value)) {
    tool.value = parseTool(undefined, value)
  }
})

const moduleKey = computed(() => TOOLS[tool.value].module || '')
const mod = computed(() =>
  moduleKey.value ? getLiveModule(moduleKey.value) : undefined,
)

function rowInSection(row: CatalogRow, sec: SectionTab): boolean {
  if (sec === 'all') return true
  const program = String(row.program || '').toLowerCase()
  if (program === 'nursery') return sec === 'nursery'
  if (program === 'primary') return sec === 'primary'
  const className = row.className
  if (sec === 'nursery') return isNurseryClass(className)
  if (sec === 'primary') return isPrimaryClass(className)
  return true
}

const sourceRows = computed(() => mod.value?.rows || [])
const rows = computed(() =>
  sourceRows.value.filter((r) => rowInSection(r, section.value)),
)

const { canCreate, canWrite, canDelete, canPrint, requirePerm } =
  useModuleAccess(moduleKey)

const active = ref<string>()
const selection = ref<string[]>([])
const showSelectionWarning = ref(false)

const extraFilterKey = computed(() => {
  const cols = mod.value?.columns.map((c) => c.key) || []
  if (cols.includes('className')) return 'className'
  if (cols.includes('subject')) return 'subject'
  if (cols.includes('learningArea')) return 'learningArea'
  if (cols.includes('course')) return 'course'
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

watch([section, tool], () => {
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

const overviewStats = computed(() => {
  const lessonPlans = schoolStore['lesson-plans']?.rows || []
  return [
    {
      title: 'Lesson plans',
      value: lessonPlans.filter((r) => rowInSection(r, section.value)).length,
      caption: section.value === 'all' ? 'whole school' : section.value,
    },
    {
      title: 'Nursery tools',
      value:
        (schoolStore['nursery-activities']?.rows.length || 0) +
        (schoolStore['nursery-observations']?.rows.length || 0),
      caption: 'activities & observations',
    },
    {
      title: 'Primary tools',
      value:
        (schoolStore['schemes-of-work']?.rows.length || 0) +
        (schoolStore.homework?.rows.length || 0),
      caption: 'schemes & homework',
    },
    {
      title: 'Showing',
      value: filtered.value.length,
      caption: TOOLS[tool.value].label.toLowerCase(),
    },
  ]
})

function createRecord() {
  if (tool.value === 'gradebook') {
    router.push('/gradebook')
    return
  }
  if (!moduleKey.value || !requirePerm('create', 'create records')) return
  router.push(`/${moduleKey.value}/new`)
}

function editRecord(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!moduleKey.value || !requirePerm('write', 'edit records')) return
  router.push(`/${moduleKey.value}/${row.id}/edit`)
}

function openDetail(row: CatalogRow) {
  if (!moduleKey.value) return
  router.push(`/${moduleKey.value}/${row.id}`)
}

function printRecord(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!moduleKey.value || !requirePerm('print', 'print')) return
  try {
    const kind = defaultDocumentKind(moduleKey.value)
    const title = printRecordDocument(kind, moduleKey.value, row)
    toast.success(`Print preview · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function deleteSelected() {
  if (!moduleKey.value || !requirePerm('delete', 'delete records')) return
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
    <PageHeaderTitle title="School academics" />
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
      description="Bulk actions apply to the current tool only."
      icon="lucide-list-checks"
      :primary-action="
        canDelete && moduleKey
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
      description="Nursery and primary teaching in one place — filter by section, then pick a tool."
      :stats="overviewStats"
    />

    <TabButtons v-model="section" :options="sectionTabs" class="school-tabs" />
    <TabButtons v-model="tool" :options="toolTabs" class="school-tabs" />

    <!-- Gradebook is its own workspace -->
    <template v-if="tool === 'gradebook'">
      <div
        class="rounded-6 border border-outline-gray-1 bg-surface-white px-5 py-10 text-center"
      >
        <p class="text-sm-medium text-ink-gray-9">Class exams & marks</p>
        <p class="mx-auto mt-1 max-w-md text-sm text-ink-gray-6">
          Create class-specific exams and enter marks for that class.
        </p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            variant="solid"
            icon-left="lucide-table-2"
            label="Open gradebook"
            @click="router.push('/gradebook')"
          />
          <Button
            icon-left="lucide-file-badge"
            label="Report cards"
            @click="router.push('/report-cards')"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <ListToolbar>
        <template #search>
          <FormControl
            v-model="query"
            class="w-full"
            label="Search"
            :placeholder="`Search ${TOOLS[tool].label.toLowerCase()}`"
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
            :label="TOOLS[tool].createLabel"
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
        :empty-text="`No ${TOOLS[tool].label.toLowerCase()} for this section.`"
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
      <p v-else class="school-table-empty">Module not found.</p>
    </template>
  </div>
</template>
