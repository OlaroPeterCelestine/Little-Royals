<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
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
  ListHeaderCellSort,
  ListRow,
  ListRows,
} from 'frappe-ui/list'
import { getLiveModule } from '../data/store'
import { useListPage } from '../composables/useListPage'
import {
  openCreateDialog,
  openDeleteDialog,
  openEditDialog,
} from '../composables/useModuleForms'
import { printRecordDocument } from '../data/documents'
import type { CatalogRow } from '../data/catalog'
import { useModuleAccess } from '../composables/useModuleAccess'
import ListPagination from '../components/ListPagination.vue'
import ListStatCards from '../components/ListStatCards.vue'
import ListToolbar from '../components/ListToolbar.vue'

const router = useRouter()
const sortDir = ref<'asc' | 'desc'>('asc')
const selection = ref<string[]>([])
const active = ref<string>()
const { canCreate, canWrite, canDelete, canPrint, requirePerm } =
  useModuleAccess('students')

const mod = computed(() => getLiveModule('students')!)
const rows = computed(() => {
  const list = [...mod.value.rows]
  return list.sort((a, b) => {
    const cmp = a.name.localeCompare(b.name)
    return sortDir.value === 'asc' ? cmp : -cmp
  })
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
  searchKeys: ['name', 'id', 'className', 'program', 'subtitle'],
  extraFilterKey: 'program',
  extraFilterLabel: 'Section',
})

const onLeaveCount = computed(
  () => mod.value.rows.filter((r) => r.status === 'On Leave').length,
)

const nurseryCount = computed(
  () => mod.value.rows.filter((r) => r.program === 'Nursery').length,
)

const primaryCount = computed(
  () => mod.value.rows.filter((r) => r.program === 'Primary').length,
)

const studentStats = computed(() => [
  { title: 'Total pupils', value: mod.value.rows.length, caption: 'enrolled' },
  { title: 'Nursery', value: nurseryCount.value, caption: 'Baby–Top' },
  { title: 'Primary', value: primaryCount.value, caption: 'P.1–P.7' },
  {
    title: 'Matching',
    value: filtered.value.length,
    caption: hasActiveFilters.value ? 'after filters' : 'showing all',
  },
])

watch([query, statusFilter, extraFilter, sortDir], () => {
  selection.value = []
  page.value = 1
})

function toggleSort() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}

function openDetail(id: string) {
  router.push(`/students/${id}`)
}

function printReportCard(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!requirePerm('print', 'print report cards')) return
  try {
    printRecordDocument('report-card', 'students', row)
    toast.success(`Report card · ${row.name}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Students" />
    <div class="flex items-center gap-2">
      <Button
        v-if="canDelete"
        icon-left="lucide-trash-2"
        label="Delete"
        theme="red"
        :disabled="!selection.length"
        @click="openDeleteDialog('students', [...selection])"
      />
      <Button
        v-if="canCreate"
        variant="solid"
        icon-left="lucide-plus"
        label="Add student"
        @click="openCreateDialog('students')"
      />
    </div>
  </PageHeader>

  <div class="school-page">
    <Alert
      v-if="onLeaveCount"
      theme="amber"
      :title="`${onLeaveCount} student${onLeaveCount === 1 ? '' : 's'} on leave`"
      description="Review leave status before marking attendance or issuing fees."
      icon="lucide-alert-triangle"
      :primary-action="{
        label: 'Filter on leave',
        onClick: () => {
          statusFilter = 'On Leave'
        },
      }"
    />

    <ListStatCards :stats="studentStats" />

    <ListToolbar>
      <template #search>
        <FormControl
          v-model="query"
          class="w-full"
          type="text"
          label="Search"
          placeholder="Name, ID, or class"
        />
      </template>
      <FormControl
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
        label="Section"
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

    <div class="school-table">
      <List
        v-model:selection="selection"
        v-model:active="active"
        selectable
        :columns="{
          base: ['minmax(0,1.5fr)', '7.5rem', '9rem'],
          md: [
            'minmax(0,1.5fr)',
            '7rem',
            'minmax(0,1fr)',
            '5rem',
            '7.5rem',
            '9rem',
          ],
          lg: [
            'minmax(0,1.5fr)',
            '7rem',
            'minmax(0,1fr)',
            'minmax(0,0.85fr)',
            '5rem',
            '7.5rem',
            '9rem',
          ],
        }"
      >
        <ListHeader>
          <ListHeaderCellSort :direction="sortDir" @click="toggleSort">
            Student
          </ListHeaderCellSort>
          <ListHeaderCell class="hidden md:flex">ID</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">Class</ListHeaderCell>
          <ListHeaderCell class="hidden lg:flex">Section</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">Avg %</ListHeaderCell>
          <ListHeaderCell>Status</ListHeaderCell>
          <ListHeaderCell class="school-list-actions-head">
            Actions
          </ListHeaderCell>
        </ListHeader>

        <ListRows :items="pageRows" v-slot="{ item }">
          <ListRow
            :value="item.id"
            class="cursor-pointer"
            @click="openDetail(item.id)"
          >
            <ListCell>
              <div class="flex min-w-0 items-center gap-4 pe-2">
                <Avatar :label="item.name" size="md" />
                <div class="min-w-0 flex-1 space-y-1">
                  <p class="truncate text-sm-medium text-ink-gray-9">
                    {{ item.name }}
                  </p>
                  <p class="truncate text-xs text-ink-gray-5">
                    {{ item.subtitle }}
                  </p>
                </div>
              </div>
            </ListCell>
            <ListCell class="hidden text-ink-gray-7 md:flex">
              <span class="block truncate">{{ item.id }}</span>
            </ListCell>
            <ListCell class="hidden text-ink-gray-7 md:flex">
              <span
                class="block truncate"
                :title="String(item.className || '')"
                >{{ item.className }}</span
              >
            </ListCell>
            <ListCell class="hidden text-ink-gray-7 lg:flex">
              <span class="block truncate">{{ item.program }}</span>
            </ListCell>
            <ListCell class="hidden tabular-nums text-ink-gray-7 md:flex">
              <span class="block truncate">{{ item.average }}</span>
            </ListCell>
            <ListCell>
              <Badge
                :label="item.status || ''"
                :theme="item.statusTheme || 'gray'"
                variant="subtle"
              />
            </ListCell>
            <ListCell class="school-list-actions">
              <Button
                v-if="canPrint"
                class="relative shrink-0"
                icon="lucide-printer"
                tooltip="Print report card"
                aria-label="Print"
                @click="printReportCard(item, $event)"
              />
              <Button
                class="relative shrink-0"
                icon="lucide-eye"
                tooltip="Open student"
                aria-label="Open"
                @click.stop="openDetail(item.id)"
              />
              <Button
                v-if="canWrite"
                class="relative shrink-0"
                icon="lucide-pencil"
                tooltip="Edit student"
                aria-label="Edit"
                @click.stop="openEditDialog('students', item)"
              />
            </ListCell>
          </ListRow>
        </ListRows>
      </List>

      <p
        v-if="filtered.length === 0"
        class="px-4 py-10 text-center text-sm text-ink-gray-5"
      >
        No students match your filters.
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
  </div>
</template>
