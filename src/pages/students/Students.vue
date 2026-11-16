<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ensureModule } from '@/data/catalog/catalogSync'
import { isApiEnabled } from '@/lib/apiMode'
import {
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
import { getLiveModule } from '@/data/catalog/store'
import { useListPage } from '@/composables/useListPage'
import {
  openCreateDialog,
  openDeleteDialog,
  openEditDialog,
} from '@/composables/useModuleForms'
import type { CatalogRow } from '@/data/catalog/catalog'
import { canCurrentUser } from '@/data/auth/permissions'
import PersonAvatar from '@/components/common/PersonAvatar.vue'
import { useModuleAccess } from '@/composables/useModuleAccess'
import ListPagination from '@/components/list/ListPagination.vue'
import ListToolbar from '@/components/list/ListToolbar.vue'
import PageIntro from '@/components/list/PageIntro.vue'
import { pushWithReturn } from '@/composables/useAppBack'

const router = useRouter()
const sortDir = ref<'asc' | 'desc'>('asc')
const selection = ref<string[]>([])
const active = ref<string>()
const { canCreate, canWrite, canDelete, requirePerm } =
  useModuleAccess('students')

onMounted(() => {
  if (isApiEnabled()) void ensureModule('students', { force: true })
})

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
  pushWithReturn(router, `/students/${id}`)
}

</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Pupils" />
  </PageHeader>

  <div class="school-page">
    <PageIntro
      description="Enrolled pupils across nursery and primary — search, filter, and manage from one desk."
      :stats="studentStats"
    />

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
        label="Clear filters"
        icon-left="lucide-filter-x"
        @click="resetFilters"
      />
      <Button
        v-if="selection.length"
        icon-left="lucide-x"
        label="Clear selection"
        @click="selection = []"
      />
      <template #actions>
        <Button
          v-if="canDelete && selection.length"
          icon-left="lucide-trash-2"
          :label="`Delete (${selection.length})`"
          theme="red"
          @click="openDeleteDialog('students', [...selection])"
        />
        <Button
          v-if="canCreate"
          variant="solid"
          icon-left="lucide-plus"
          label="Register student"
          @click="openCreateDialog('students')"
        />
      </template>
    </ListToolbar>

    <div class="school-table">
      <List
        v-model:selection="selection"
        v-model:active="active"
        selectable
        :columns="{
          base: ['minmax(0,1.5fr)', 'minmax(0,0.7fr)', 'minmax(0,7.75rem)'],
          md: [
            'minmax(0,1.5fr)',
            'minmax(0,0.75fr)',
            'minmax(0,0.75fr)',
            'minmax(0,0.45fr)',
            'minmax(0,0.7fr)',
            'minmax(0,7.75rem)',
          ],
          lg: [
            'minmax(0,1.5fr)',
            'minmax(0,0.75fr)',
            'minmax(0,0.75fr)',
            'minmax(0,0.7fr)',
            'minmax(0,0.45fr)',
            'minmax(0,0.7fr)',
            'minmax(0,7.75rem)',
          ],
        }"
      >
        <ListHeader>
          <ListHeaderCellSort :direction="sortDir" @click="toggleSort">
            Pupil
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
            <ListCell class="school-list-primary">
              <div class="school-list-primary flex min-w-0 items-center gap-3 pe-1">
                <PersonAvatar :person="item" size="lg" />
                <div class="school-list-primary-text min-w-0 flex-1 space-y-0.5">
                  <p
                    class="school-cell-text text-sm-medium text-ink-gray-9"
                    :title="item.name"
                  >
                    {{ item.name }}
                  </p>
                  <p
                    class="school-cell-text text-xs text-ink-gray-5"
                    :title="String(item.subtitle || '')"
                  >
                    {{ item.subtitle }}
                  </p>
                </div>
              </div>
            </ListCell>
            <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
              <span class="school-cell-text" :title="item.id">{{ item.id }}</span>
            </ListCell>
            <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
              <span
                class="school-cell-text"
                :title="String(item.className ?? '')"
                >{{ item.className }}</span
              >
            </ListCell>
            <ListCell class="hidden school-list-nowrap text-ink-gray-7 lg:flex">
              <span
                class="school-cell-text"
                :title="String(item.program ?? '')"
                >{{ item.program }}</span
              >
            </ListCell>
            <ListCell
              class="hidden school-list-nowrap tabular-nums text-ink-gray-7 md:flex"
            >
              <span class="school-cell-text">{{ item.average }}</span>
            </ListCell>
            <ListCell class="school-list-nowrap">
              <Badge
                :label="item.status || ''"
                :theme="item.statusTheme || 'gray'"
                variant="subtle"
              />
            </ListCell>
            <ListCell class="school-list-actions">
              <Button
                class="relative shrink-0"
                icon="lucide-eye"
                tooltip="View student"
                aria-label="View"
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
              <Button
                v-if="canDelete"
                class="relative shrink-0"
                icon="lucide-trash-2"
                theme="red"
                tooltip="Delete student"
                aria-label="Delete"
                @click.stop="openDeleteDialog('students', [item.id])"
              />
            </ListCell>
          </ListRow>
        </ListRows>
      </List>

      <p
        v-if="filtered.length === 0"
        class="school-table-empty"
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
