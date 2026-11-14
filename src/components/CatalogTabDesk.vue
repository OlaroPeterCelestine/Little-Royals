<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  TabButtons,
  dialog,
  toast,
} from 'frappe-ui'
import { getLiveModule, deleteRecords } from '../data/store'
import { openCreateDialog, openEditDialog } from '../composables/useModuleForms'
import { canCurrentUser } from '../data/permissions'
import { pushWithReturn } from '../composables/useAppBack'
import type { CatalogRow } from '../data/catalog'

export type DeskTab = {
  label: string
  value: string
  module: string
}

const props = defineProps<{
  tabs: DeskTab[]
  /** query key for tab, default `tab` */
  queryKey?: string
}>()

const route = useRoute()
const router = useRouter()
const queryKey = computed(() => props.queryKey || 'tab')
const q = ref('')

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
})

watch(
  () => route.query[queryKey.value],
  (value) => {
    if (!multi.value) return
    const next = parseTab(value)
    if (tab.value !== next) tab.value = next
  },
)

const active = computed(
  () => props.tabs.find((t) => t.value === tab.value) || props.tabs[0],
)

const mod = computed(() =>
  active.value ? getLiveModule(active.value.module) : undefined,
)

const canCreate = computed(() =>
  active.value ? canCurrentUser(active.value.module, 'create') : false,
)
const canWrite = computed(() =>
  active.value ? canCurrentUser(active.value.module, 'write') : false,
)
const canDelete = computed(() =>
  active.value ? canCurrentUser(active.value.module, 'delete') : false,
)

const rows = computed(() => {
  const list = mod.value?.rows || []
  const query = q.value.trim().toLowerCase()
  if (!query) return list
  return list.filter((r) =>
    [r.name, r.id, r.subtitle, r.status, r.className]
      .map((x) => String(x || '').toLowerCase())
      .some((s) => s.includes(query)),
  )
})

const tabButtons = computed(() =>
  props.tabs.map((t) => ({ label: t.label, value: t.value })),
)

function statusTheme(status?: string) {
  const s = String(status || '').toLowerCase()
  if (['active', 'present', 'paid', 'open', 'posted'].some((x) => s.includes(x)))
    return 'green'
  if (['absent', 'failed', 'overdue', 'closed'].some((x) => s.includes(x)))
    return 'red'
  if (['late', 'pending', 'draft', 'partial'].some((x) => s.includes(x)))
    return 'amber'
  return 'gray'
}

function openRow(row: CatalogRow) {
  if (!active.value) return
  pushWithReturn(router, `/${active.value.module}/${row.id}`)
}

function createRow() {
  if (!active.value || !canCreate.value) return
  openCreateDialog(active.value.module)
}

function editRow(row: CatalogRow) {
  if (!active.value || !canWrite.value) return
  openEditDialog(active.value.module, row)
}

function removeRow(row: CatalogRow) {
  if (!active.value || !canDelete.value) return
  dialog.danger({
    title: `Delete ${mod.value?.singular || 'record'}?`,
    message: `Permanently delete “${row.name}”.`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      deleteRecords(active.value!.module, [row.id])
      toast.warning(`Deleted “${row.name}”`)
    },
  })
}
</script>

<template>
  <TabButtons
    v-if="tabs.length > 1"
    v-model="tab"
    :options="tabButtons"
    class="school-tabs"
  />

  <div class="school-page-toolbar">
    <FormControl
      v-model="q"
      class="min-w-[12rem] flex-1"
      type="text"
      placeholder="Search…"
    />
    <Button
      v-if="canCreate"
      variant="solid"
      icon-left="lucide-plus"
      :label="`New ${mod?.singular || 'record'}`"
      @click="createRow"
    />
  </div>

  <div
    class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
  >
    <button
      v-for="row in rows"
      :key="row.id"
      type="button"
      class="flex w-full flex-wrap items-center justify-between gap-3 border-b border-outline-gray-1 px-4 py-3 text-left last:border-b-0 hover:bg-surface-gray-1"
      @click="openRow(row)"
    >
      <div class="min-w-0">
        <p class="text-sm-medium text-ink-gray-9">{{ row.name }}</p>
        <p class="text-xs text-ink-gray-5">
          {{ row.id }}
          <span v-if="row.subtitle"> · {{ row.subtitle }}</span>
          <span v-if="row.className"> · {{ row.className }}</span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2" @click.stop>
        <Badge
          v-if="row.status"
          :label="String(row.status)"
          :theme="statusTheme(String(row.status))"
          variant="subtle"
        />
        <Button
          v-if="canWrite"
          size="sm"
          icon="lucide-pencil"
          @click="editRow(row)"
        />
        <Button
          v-if="canDelete"
          size="sm"
          icon="lucide-trash-2"
          theme="red"
          @click="removeRow(row)"
        />
      </div>
    </button>
    <p
      v-if="!rows.length"
      class="px-4 py-12 text-center text-sm text-ink-gray-5"
    >
      No {{ mod?.title?.toLowerCase() || 'records' }} yet.
    </p>
  </div>
</template>
