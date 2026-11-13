<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  dialog,
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
import {
  activityLog,
  activityStats,
  actionTheme,
  formatActivityTime,
  type ActivityAction,
  type ActivityEntry,
} from '../data/activity'
import ListPagination from '../components/ListPagination.vue'
import ListStatCards from '../components/ListStatCards.vue'
import ListToolbar from '../components/ListToolbar.vue'
import { PAGE_SIZE } from '../composables/useListPage'

const router = useRouter()
const query = ref('')
const actionFilter = ref('All')
const page = ref(1)
const active = ref<string>()

const columns = {
  base: ['8.5rem', '7rem', 'minmax(0, 1fr)'],
  md: [
    '9rem',
    '7.5rem',
    'minmax(0, 1.6fr)',
    'minmax(0, 1fr)',
    'minmax(0, 8rem)',
  ],
}

const actionOptions = computed(() => {
  const actions = Array.from(
    new Set(activityLog.entries.map((e) => e.action)),
  ) as ActivityAction[]
  return [
    { label: 'All actions', value: 'All' },
    ...actions.map((a) => ({
      label: `${a} (${activityLog.entries.filter((e) => e.action === a).length})`,
      value: a,
    })),
  ]
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return activityLog.entries.filter((e) => {
    if (actionFilter.value !== 'All' && e.action !== actionFilter.value)
      return false
    if (!q) return true
    return [
      e.summary,
      e.user,
      e.role,
      e.moduleLabel,
      e.recordName,
      e.recordId,
      e.detail,
      e.action,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)),
)

const pageRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const rangeLabel = computed(() => {
  if (!filtered.value.length) return '0 of 0'
  const start = (page.value - 1) * PAGE_SIZE + 1
  const end = Math.min(page.value * PAGE_SIZE, filtered.value.length)
  return `${start}–${end}`
})

watch([query, actionFilter], () => {
  page.value = 1
})

const stats = computed(() => [
  { title: 'Total events', value: activityStats.value.total },
  { title: 'Today', value: activityStats.value.today, caption: 'Since midnight' },
  { title: 'Created', value: activityStats.value.created },
  { title: 'Deleted', value: activityStats.value.deleted },
])

function openEntry(entry: ActivityEntry) {
  active.value = entry.id
  dialog.confirm({
    title: entry.summary,
    message:
      `${formatActivityTime(entry.at)}\n` +
      `User: ${entry.user} (${entry.role})\n` +
      `Module: ${entry.moduleLabel}` +
      (entry.recordId ? ` · ${entry.recordId}` : '') +
      `\nAction: ${entry.action}` +
      (entry.detail ? `\n\n${entry.detail}` : '') +
      (entry.ip ? `\nIP: ${entry.ip}` : ''),
    icon: 'lucide-history',
    theme:
      entry.severity === 'danger'
        ? 'red'
        : entry.severity === 'warning'
          ? 'amber'
          : 'blue',
    confirmLabel:
      entry.recordId &&
      entry.module !== 'permissions' &&
      entry.module !== 'system' &&
      entry.module !== 'school-setup'
        ? 'Open record'
        : entry.module === 'school-setup'
          ? 'Open School Setup'
          : 'Close',
    onConfirm: async () => {
      if (entry.module === 'school-setup') {
        await router.push('/school-setup')
        return
      }
      if (
        entry.recordId &&
        entry.module !== 'permissions' &&
        entry.module !== 'system'
      ) {
        await router.push(`/${entry.module}/${entry.recordId}`)
      }
    },
  })
}

function clearLog() {
  dialog.danger({
    title: 'Clear activity log?',
    message:
      'This removes all activity entries from this desk session. New create, update, delete and permission changes will still be logged.',
    confirmLabel: 'Yes, clear log',
    cancelLabel: 'Keep log',
    onConfirm: async () => {
      activityLog.entries.splice(0, activityLog.entries.length)
      toast.warning('Activity log cleared')
    },
  })
}

function goToPage(p: number) {
  page.value = Math.min(Math.max(1, p), totalPages.value)
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Activity Log" />
    <div class="flex flex-wrap items-center gap-2">
      <Button
        icon-left="lucide-building-2"
        label="School Setup"
        @click="router.push('/school-setup')"
      />
      <Button
        icon-left="lucide-users"
        label="Users & Roles"
        @click="router.push('/users')"
      />
      <Button
        icon-left="lucide-trash-2"
        label="Clear log"
        theme="red"
        @click="clearLog"
      />
    </div>
  </PageHeader>

  <div class="school-page">
    <div class="space-y-3">
      <p class="text-p-base text-ink-gray-6">
        System audit trail for Little Royals — creates, updates, deletes,
        sign-ins and permission changes.
      </p>
      <ListStatCards :stats="stats" />
    </div>

    <ListToolbar>
      <template #search>
        <FormControl
          v-model="query"
          class="w-full"
          label="Search"
          placeholder="Search user, record, module…"
        />
      </template>
      <FormControl
        v-if="actionOptions.length > 1"
        v-model="actionFilter"
        class="school-filter-select"
        type="select"
        label="Action"
        :options="actionOptions"
      />
    </ListToolbar>

    <div class="school-table">
      <List v-model:active="active" :columns="columns">
        <ListHeader>
          <ListHeaderCell>When</ListHeaderCell>
          <ListHeaderCell>Action</ListHeaderCell>
          <ListHeaderCell>Summary</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">User</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">Module</ListHeaderCell>
        </ListHeader>

        <ListRows :items="pageRows" v-slot="{ item }">
          <ListRow
            :value="item.id"
            class="cursor-pointer"
            @click="openEntry(item)"
          >
            <ListCell class="text-ink-gray-7">
              <span class="block truncate">{{
                formatActivityTime(item.at)
              }}</span>
            </ListCell>
            <ListCell>
              <Badge
                :label="item.action"
                :theme="actionTheme(item.action)"
                variant="subtle"
              />
            </ListCell>
            <ListCell>
              <div class="min-w-0 space-y-0.5 pe-2">
                <p class="truncate text-sm-medium text-ink-gray-9">
                  {{ item.summary }}
                </p>
                <p
                  v-if="item.detail"
                  class="truncate text-xs text-ink-gray-5"
                >
                  {{ item.detail }}
                </p>
              </div>
            </ListCell>
            <ListCell class="hidden md:flex">
              <div class="min-w-0 space-y-0.5">
                <p class="truncate text-sm text-ink-gray-9">{{ item.user }}</p>
                <p class="truncate text-xs text-ink-gray-5">{{ item.role }}</p>
              </div>
            </ListCell>
            <ListCell class="hidden text-ink-gray-7 md:flex">
              <span class="block truncate" :title="item.moduleLabel">{{
                item.moduleLabel
              }}</span>
            </ListCell>
          </ListRow>
        </ListRows>
      </List>

      <p
        v-if="filtered.length === 0"
        class="px-4 py-10 text-center text-sm text-ink-gray-5"
      >
        No activity matches your filters.
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
