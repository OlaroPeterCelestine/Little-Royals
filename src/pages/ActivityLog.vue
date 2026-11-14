<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
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
import type { CatalogRow } from '../data/catalog'
import { schoolStore } from '../data/store'
import ListPagination from '../components/ListPagination.vue'
import ListToolbar from '../components/ListToolbar.vue'
import PageIntro from '../components/PageIntro.vue'
import { PAGE_SIZE } from '../composables/useListPage'

type LogTab = 'activity' | 'audit'

const router = useRouter()
const route = useRoute()

function parseTab(raw: unknown): LogTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'audit' || v === 'audits' || v === 'audit-logs') return 'audit'
  return 'activity'
}

const tab = ref<LogTab>(parseTab(route.query.tab))

const tabs = computed(() => [
  {
    label: `Activity (${activityLog.entries.length})`,
    value: 'activity',
  },
  {
    label: `Audit (${schoolStore['audit-logs']?.rows.length || 0})`,
    value: 'audit',
  },
])

watch(tab, (value) => {
  router.replace({
    path: '/activity-log',
    query: { ...route.query, tab: value },
  })
})

watch(
  () => route.query.tab,
  (value) => {
    const next = parseTab(value)
    if (tab.value !== next) tab.value = next
  },
)

const query = ref('')
const actionFilter = ref('All')
const page = ref(1)
const active = ref<string>()

watch(tab, () => {
  query.value = ''
  actionFilter.value = 'All'
  page.value = 1
  active.value = undefined
})

/* ——— Activity ——— */
const activityColumns = {
  base: ['minmax(0, 0.9fr)', 'minmax(0, 0.7fr)', 'minmax(0, 1.4fr)'],
  md: [
    'minmax(0, 0.9fr)',
    'minmax(0, 0.65fr)',
    'minmax(0, 1.5fr)',
    'minmax(0, 0.8fr)',
    'minmax(0, 0.7fr)',
  ],
}

const activityActionOptions = computed(() => {
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

const filteredActivity = computed(() => {
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

/* ——— Audit ——— */
const auditRows = computed(() => schoolStore['audit-logs']?.rows || [])

const auditColumns = {
  base: ['minmax(0, 0.7fr)', 'minmax(0, 1.3fr)', 'minmax(0, 1fr)'],
  md: [
    'minmax(0, 0.7fr)',
    'minmax(0, 1.3fr)',
    'minmax(0, 1fr)',
    'minmax(0, 0.8fr)',
    'minmax(0, 0.65fr)',
    'minmax(0, 0.9fr)',
  ],
}

const auditStatusOptions = computed(() => {
  const statuses = Array.from(
    new Set(auditRows.value.map((r) => String(r.status || '')).filter(Boolean)),
  )
  return [
    { label: 'All results', value: 'All' },
    ...statuses.map((s) => ({
      label: `${s} (${auditRows.value.filter((r) => r.status === s).length})`,
      value: s,
    })),
  ]
})

const filteredAudit = computed(() => {
  const q = query.value.trim().toLowerCase()
  return auditRows.value.filter((r) => {
    if (actionFilter.value !== 'All' && String(r.status) !== actionFilter.value)
      return false
    if (!q) return true
    return [r.id, r.name, r.user, r.module, r.recordId, r.subtitle, r.status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const filtered = computed(() =>
  tab.value === 'activity' ? filteredActivity.value : filteredAudit.value,
)

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

watch(totalPages, (pages) => {
  if (page.value > pages) page.value = pages
})

const activityStatsCards = computed(() => [
  { title: 'Total events', value: activityStats.value.total },
  { title: 'Today', value: activityStats.value.today, caption: 'Since midnight' },
  { title: 'Created', value: activityStats.value.created },
  { title: 'Deleted', value: activityStats.value.deleted },
])

const auditStatsCards = computed(() => {
  const rows = auditRows.value
  const success = rows.filter((r) => String(r.status) === 'Success').length
  const failed = rows.filter((r) =>
    ['Failed', 'Denied', 'Error'].includes(String(r.status)),
  ).length
  return [
    { title: 'Audit entries', value: rows.length },
    { title: 'Success', value: success, caption: 'Allowed changes' },
    { title: 'Failed / denied', value: failed, caption: 'Security results' },
    {
      title: 'Matching',
      value: filteredAudit.value.length,
      caption: 'after filters',
    },
  ]
})

const stats = computed(() =>
  tab.value === 'activity' ? activityStatsCards.value : auditStatsCards.value,
)

function auditTheme(status?: string) {
  const s = String(status || '').toLowerCase()
  if (s.includes('success') || s.includes('ok')) return 'green'
  if (s.includes('fail') || s.includes('denied') || s.includes('error'))
    return 'red'
  if (s.includes('warn') || s.includes('pending')) return 'amber'
  return 'gray'
}

function openActivity(entry: ActivityEntry) {
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

function openAudit(row: CatalogRow) {
  active.value = row.id
  dialog.confirm({
    title: String(row.name),
    message:
      `ID: ${row.id}\n` +
      `User: ${row.user || '—'}\n` +
      `Module: ${row.module || '—'}` +
      (row.recordId ? `\nRecord: ${row.recordId}` : '') +
      `\nResult: ${row.status || '—'}` +
      (row.subtitle ? `\nWhen: ${row.subtitle}` : ''),
    icon: 'lucide-shield',
    theme: auditTheme(String(row.status)) === 'red' ? 'red' : 'blue',
    confirmLabel: 'Close',
  })
}

function clearActivity() {
  dialog.danger({
    title: 'Clear activity log?',
    message:
      'This removes desk activity entries from this session. Audit entries are kept. New changes will still be logged.',
    confirmLabel: 'Yes, clear activity',
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

function cellValue(row: CatalogRow, key: string) {
  const value = row[key]
  return value === undefined || value === null || value === ''
    ? '—'
    : String(value)
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Activity & Audit" />
  </PageHeader>

  <div class="school-page">
    <PageIntro
      description="Desk activity and security audit history in one place — switch tabs to filter."
      :stats="stats"
    />

    <TabButtons v-model="tab" :options="tabs" class="school-tabs" />

    <ListToolbar>
      <template #search>
        <FormControl
          v-model="query"
          class="w-full"
          label="Search"
          :placeholder="
            tab === 'activity'
              ? 'Search user, record, module…'
              : 'Search audit user, module, action…'
          "
        />
      </template>
      <FormControl
        v-if="tab === 'activity' && activityActionOptions.length > 1"
        v-model="actionFilter"
        class="school-filter-select"
        type="select"
        label="Action"
        :options="activityActionOptions"
      />
      <FormControl
        v-else-if="tab === 'audit' && auditStatusOptions.length > 1"
        v-model="actionFilter"
        class="school-filter-select"
        type="select"
        label="Result"
        :options="auditStatusOptions"
      />
      <template #actions>
        <Button
          icon-left="lucide-shield-check"
          label="Access"
          @click="router.push('/users')"
        />
        <Button
          v-if="tab === 'activity'"
          icon-left="lucide-trash-2"
          label="Clear activity"
          theme="red"
          @click="clearActivity"
        />
      </template>
    </ListToolbar>

    <!-- Activity -->
    <div v-if="tab === 'activity'" class="school-table">
      <List v-model:active="active" :columns="activityColumns">
        <ListHeader>
          <ListHeaderCell>When</ListHeaderCell>
          <ListHeaderCell>Action</ListHeaderCell>
          <ListHeaderCell>Summary</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">User</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">Module</ListHeaderCell>
        </ListHeader>

        <ListRows :items="pageRows as ActivityEntry[]" v-slot="{ item }">
          <ListRow
            :value="item.id"
            class="cursor-pointer"
            @click="openActivity(item)"
          >
            <ListCell class="school-list-nowrap text-ink-gray-7">
              <span class="school-cell-text">{{
                formatActivityTime(item.at)
              }}</span>
            </ListCell>
            <ListCell class="school-list-nowrap">
              <Badge
                :label="item.action"
                :theme="actionTheme(item.action)"
                variant="subtle"
              />
            </ListCell>
            <ListCell class="school-list-primary">
              <div class="school-list-primary-text min-w-0 space-y-0.5 pe-1">
                <p class="school-cell-text text-sm-medium text-ink-gray-9" :title="item.summary">
                  {{ item.summary }}
                </p>
                <p
                  v-if="item.detail"
                  class="school-cell-text text-xs text-ink-gray-5"
                  :title="item.detail"
                >
                  {{ item.detail }}
                </p>
              </div>
            </ListCell>
            <ListCell class="hidden school-list-nowrap md:flex">
              <div class="min-w-0 space-y-0.5">
                <p class="school-cell-text text-sm text-ink-gray-9" :title="item.user">
                  {{ item.user }}
                </p>
                <p class="school-cell-text text-xs text-ink-gray-5" :title="item.role">
                  {{ item.role }}
                </p>
              </div>
            </ListCell>
            <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
              <span class="school-cell-text" :title="item.moduleLabel">{{
                item.moduleLabel
              }}</span>
            </ListCell>
          </ListRow>
        </ListRows>
      </List>

      <p
        v-if="filteredActivity.length === 0"
        class="school-table-empty"
      >
        No activity matches your filters.
      </p>

      <ListPagination
        v-else
        :page="page"
        :total-pages="totalPages"
        :range-label="rangeLabel"
        :total="filteredActivity.length"
        @prev="goToPage(page - 1)"
        @next="goToPage(page + 1)"
        @go="goToPage"
      />
    </div>

    <!-- Audit -->
    <div v-else class="school-table">
      <List v-model:active="active" :columns="auditColumns">
        <ListHeader>
          <ListHeaderCell>ID</ListHeaderCell>
          <ListHeaderCell>Action</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">User</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">Module</ListHeaderCell>
          <ListHeaderCell>Result</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">When</ListHeaderCell>
        </ListHeader>

        <ListRows :items="pageRows as CatalogRow[]" v-slot="{ item }">
          <ListRow
            :value="item.id"
            class="cursor-pointer"
            @click="openAudit(item)"
          >
            <ListCell class="school-list-nowrap text-ink-gray-7">
              <span class="school-cell-text" :title="String(item.id)">{{
                item.id
              }}</span>
            </ListCell>
            <ListCell class="school-list-primary">
              <div class="school-list-primary-text min-w-0 space-y-0.5 pe-1">
                <p
                  class="school-cell-text text-sm-medium text-ink-gray-9"
                  :title="String(item.name)"
                >
                  {{ item.name }}
                </p>
                <p
                  v-if="item.recordId"
                  class="school-cell-text text-xs text-ink-gray-5"
                  :title="String(item.recordId)"
                >
                  {{ item.recordId }}
                </p>
              </div>
            </ListCell>
            <ListCell class="hidden school-list-nowrap md:flex">
              <span
                class="school-cell-text"
                :title="cellValue(item, 'user')"
                >{{ cellValue(item, 'user') }}</span
              >
            </ListCell>
            <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
              <span
                class="school-cell-text"
                :title="cellValue(item, 'module')"
                >{{ cellValue(item, 'module') }}</span
              >
            </ListCell>
            <ListCell class="school-list-nowrap">
              <Badge
                :label="String(item.status || '—')"
                :theme="auditTheme(String(item.status))"
                variant="subtle"
              />
            </ListCell>
            <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
              <span class="school-cell-text" :title="String(item.subtitle || '—')">{{
                item.subtitle || '—'
              }}</span>
            </ListCell>
          </ListRow>
        </ListRows>
      </List>

      <p
        v-if="filteredAudit.length === 0"
        class="school-table-empty"
      >
        No audit entries match your filters.
      </p>

      <ListPagination
        v-else
        :page="page"
        :total-pages="totalPages"
        :range-label="rangeLabel"
        :total="filteredAudit.length"
        @prev="goToPage(page - 1)"
        @next="goToPage(page + 1)"
        @go="goToPage"
      />
    </div>
  </div>
</template>
