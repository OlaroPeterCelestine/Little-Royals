<script setup lang="ts">
import { Badge, Button } from 'frappe-ui'
import PersonAvatar from '@/components/common/PersonAvatar.vue'
import {
  List,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
  ListRows,
} from 'frappe-ui/list'
import type { CatalogColumn, CatalogRow } from '@/data/catalog/catalog'
import ListPagination from '@/components/list/ListPagination.vue'

const props = withDefaults(
  defineProps<{
    columns: CatalogColumn[]
    rows: CatalogRow[]
    gridColumns: { base: string[]; md: string[]; lg?: string[] }
    selectable?: boolean
    selection?: string[]
    active?: string
    canPrint?: boolean
    canWrite?: boolean
    canDelete?: boolean
    emptyText?: string
    page?: number
    totalPages?: number
    rangeLabel?: string
    total?: number
    showPagination?: boolean
  }>(),
  {
    selectable: true,
    selection: () => [],
    canPrint: false,
    canWrite: false,
    canDelete: false,
    emptyText: 'No records match your filters.',
    page: 1,
    totalPages: 1,
    rangeLabel: '0 of 0',
    total: 0,
    showPagination: true,
  },
)

const emit = defineEmits<{
  'update:selection': [string[]]
  'update:active': [string | undefined]
  open: [row: CatalogRow]
  edit: [row: CatalogRow, event?: Event]
  delete: [row: CatalogRow, event?: Event]
  print: [row: CatalogRow, event?: Event]
  prev: []
  next: []
  go: [page: number]
}>()

function cellValue(row: CatalogRow, key: string) {
  const value = row[key]
  return value === undefined || value === null || value === ''
    ? '—'
    : String(value)
}

function hideOnMobile(index: number) {
  return index > 0 && index < props.columns.length - 1
}
</script>

<template>
  <div class="school-table">
    <List
      :selection="selection"
      :active="active"
      :selectable="selectable"
      :columns="gridColumns"
      @update:selection="emit('update:selection', $event)"
      @update:active="emit('update:active', $event)"
    >
      <ListHeader>
        <ListHeaderCell
          v-for="(col, index) in columns"
          :key="col.key"
          :class="hideOnMobile(index) ? 'hidden md:flex' : ''"
        >
          {{ col.label }}
        </ListHeaderCell>
        <ListHeaderCell class="school-list-actions-head">
          Actions
        </ListHeaderCell>
      </ListHeader>

      <ListRows :items="rows" v-slot="{ item }">
        <ListRow
          :value="item.id"
          class="cursor-pointer"
          @click="emit('open', item)"
        >
          <ListCell
            v-for="(col, index) in columns"
            :key="col.key"
            :class="[
              hideOnMobile(index) ? 'hidden md:flex' : '',
              col.badge ? 'school-list-nowrap' : 'text-ink-gray-7',
              col.primary ? 'school-list-primary' : '',
            ]"
          >
            <div
              v-if="col.primary"
              class="school-list-primary flex min-w-0 items-center gap-3 pe-1"
            >
              <PersonAvatar :person="item" size="lg" />
              <div class="school-list-primary-text min-w-0 flex-1 space-y-0.5">
                <p
                  class="school-cell-text text-sm-medium text-ink-gray-9"
                  :title="item.name"
                >
                  {{ item.name }}
                </p>
                <p
                  v-if="item.subtitle"
                  class="school-cell-text text-xs text-ink-gray-5"
                  :title="String(item.subtitle)"
                >
                  {{ item.subtitle }}
                </p>
              </div>
            </div>
            <div
              v-else-if="col.badge && item.status"
              class="school-list-nowrap flex min-w-0 items-center gap-2"
            >
              <Badge
                :label="item.status"
                :theme="item.statusTheme || 'gray'"
                variant="subtle"
              />
            </div>
            <span
              v-else
              class="school-cell-text"
              :title="cellValue(item, col.key)"
              >{{ cellValue(item, col.key) }}</span
            >
          </ListCell>
          <ListCell class="school-list-actions">
            <slot name="actions" :item="item">
              <Button
                v-if="canPrint"
                class="relative shrink-0"
                icon="lucide-printer"
                :tooltip="`Print ${item.name}`"
                aria-label="Print"
                @click.stop="emit('print', item, $event)"
              />
              <Button
                class="relative shrink-0"
                icon="lucide-eye"
                :tooltip="`View ${item.name}`"
                aria-label="View"
                @click.stop="emit('open', item)"
              />
              <Button
                v-if="canWrite"
                class="relative shrink-0"
                icon="lucide-pencil"
                :tooltip="`Edit ${item.name}`"
                aria-label="Edit"
                @click.stop="emit('edit', item, $event)"
              />
              <Button
                v-if="canDelete"
                class="relative shrink-0"
                icon="lucide-trash-2"
                theme="red"
                :tooltip="`Delete ${item.name}`"
                aria-label="Delete"
                @click.stop="emit('delete', item, $event)"
              />
            </slot>
          </ListCell>
        </ListRow>
      </ListRows>
    </List>

    <p
      v-if="!rows.length"
      class="school-table-empty"
    >
      {{ emptyText }}
    </p>

    <ListPagination
      v-else-if="showPagination"
      :page="page"
      :total-pages="totalPages"
      :range-label="rangeLabel"
      :total="total"
      @prev="emit('prev')"
      @next="emit('next')"
      @go="(p) => emit('go', p)"
    />
  </div>
</template>
