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
  changeTrailPreview,
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
import { pushWithReturn } from '../composables/useAppBack'

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
const userFilter = ref('All')
const page = ref(1)
const active = ref<string>()

watch(tab, () => {
  query.value = ''
  actionFilter.value = 'All'
  userFilter.value = 'All'
  page.value = 1
  active.value = undefined
})

const activityColumns = {
  base: ['minmax(0, 0.85fr)', 'minmax(0, 0.55fr)', 'minmax(0, 1.6fr)'],
  md: [
    'minmax(0, 0.85fr)',
    'minmax(0, 0.7fr)',
    'minmax(0, 0.55fr)',
    'minmax(0, 1.5fr)',
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

const activityUserOptions = computed(() => {
  const users = Array.from(
    new Set(activityLog.entries.map((e) => e.user).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))
  return [
    { label: 'All users', value: 'All' },
    ...users.map((u) => ({
      label: `${u} (${activityLog.entries.filter((e) => e.user === u).length})`,
      value: u,
    })),
  ]
})

const filteredActivity = computed(() => {
  const q = query.value.trim().toLowerCase()
  return activityLog.entries.filter((e) => {
    if (actionFilter.value !== 'All' && e.action !== actionFilter.value)
      return false
    if (userFilter.value !== 'All' && e.user !== userFilter.value) return false
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
      e.ip,
      ...(e.changes || []).flatMap((c) => [c.field, c.before, c.after]),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const auditRows = computed(() => schoolStore['audit-logs']?.rows || [])

const auditColumns = {
  base: ['minmax(0, 0.7fr)', 'minmax(0, 1.1fr)', 'minmax(0, 1.2fr)'],
  md: [
    'minmax(0, 0.55fr)',
    'minmax(0, 0.7fr)',
    'minmax(0, 0.9fr)',
    'minmax(0, 1.2fr)',
    'minmax(0, 0.65fr)',
    'minmax(0, 0.55fr)',
    'minmax(0, 0.75fr)',
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

const auditUserOptions = computed(() => {
  const users = Array.from(
    new Set(
      auditRows.value.map((r) => String(r.user || '')).filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b))
  return [
    { label: 'All users', value: 'All' },
    ...users.map((u) => ({
      label: `${u} (${auditRows.value.filter((r) => String(r.user) === u).length})`,
      value: u,
    })),
  ]
})

const filteredAudit = computed(() => {
  const q = query.value.trim().toLowerCase()
  return auditRows.value.filter((r) => {
    if (actionFilter.value !== 'All' && String(r.status) !== actionFilter.value)
      return false
    if (userFilter.value !== 'All' && String(r.user) !== userFilter.value)
      return false
    if (!q) return true
    return [
      r.id,
      r.name,
      r.user,
      r.module,
      r.recordId,
      r.recordName,
      r.subtitle,
      r.status,
      r.ip,
      r.before,
      r.after,
      r.changes,
    ]
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

watch([query, actionFilter, userFilter], () => {
  page.value = 1
})

watch(totalPages, (pages) => {
  if (page.value > pages) page.value = pages
})

const activityStatsCards = computed(() => [
  { title: 'Total events', value: activityStats.value.total },
  { title: 'Today', value: activityStats.value.today, caption: 'Since midnight' },
  { title: 'Added', value: activityStats.value.created },
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
  pushWithReturn(router, `/activity-log/activity/${entry.id}`)
}

function openAudit(row: CatalogRow) {
  active.value = row.id
  pushWithReturn(router, `/activity-log/audit/${row.id}`)
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

function auditTrailPreview(row: CatalogRow) {
  const trail = String(row.changes || '').trim()
  if (trail) {
    const lines = trail.split('\n').filter(Boolean)
    if (lines.length <= 2) return lines.join(' · ')
    return `${lines.slice(0, 2).join(' · ')} · +${lines.length - 2} more`
  }
  const before = String(row.before || '')
  const after = String(row.after || '')
  if (!before && !after) return '—'
  if (!before) return `added “${after}”`
  if (!after) return `removed “${before}”`
  return `“${before}” → “${after}”`
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Activity & Audit" />
  </PageHeader>

  <div class="school-page">
    <PageIntro
      description="Trace what each user had first, what they changed it to, or what they added / deleted — with time and IP."
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
              ? 'Search user, change, IP, record…'
              : 'Search audit user, was → became, IP…'
          "
        />
      </template>
      <FormControl
        v-if="tab === 'activity' && activityUserOptions.length > 1"
        v-model="userFilter"
        class="school-filter-select"
        type="select"
        label="User"
        :options="activityUserOptions"
      />
      <FormControl
        v-else-if="tab === 'audit' && auditUserOptions.length > 1"
        v-model="userFilter"
        class="school-filter-select"
        type="select"
        label="User"
        :options="auditUserOptions"
      />
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
          <ListHeaderCell class="hidden md:flex">User</ListHeaderCell>
          <ListHeaderCell>Action</ListHeaderCell>
          <ListHeaderCell>Change (was → became)</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">IP</ListHeaderCell>
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
            <ListCell class="hidden school-list-nowrap md:flex">
              <div class="min-w-0 space-y-0.5">
                <p
                  class="school-cell-text text-sm text-ink-gray-9"
                  :title="item.user"
                >
                  {{ item.user }}
                </p>
                <p
                  class="school-cell-text text-xs text-ink-gray-5"
                  :title="item.role"
                >
                  {{ item.role }}
                </p>
              </div>
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
                <p
                  class="school-cell-text text-sm-medium text-ink-gray-9"
                  :title="item.summary"
                >
                  {{ item.summary }}
                </p>
                <p
                  class="school-cell-text text-xs text-ink-gray-5"
                  :title="
                    changeTrailPreview(item.changes, 4) || item.detail || ''
                  "
                >
                  {{
                    changeTrailPreview(item.changes, 2) ||
                    item.detail ||
                    'No field changes recorded'
                  }}
                </p>
              </div>
            </ListCell>
            <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
              <span class="school-cell-text font-mono text-xs" :title="item.ip">{{
                item.ip || '—'
              }}</span>
            </ListCell>
          </ListRow>
        </ListRows>
      </List>

      <p v-if="filteredActivity.length === 0" class="school-table-empty">
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
          <ListHeaderCell>When</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">User</ListHeaderCell>
          <ListHeaderCell>Action</ListHeaderCell>
          <ListHeaderCell>Change (was → became)</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">IP</ListHeaderCell>
          <ListHeaderCell>Result</ListHeaderCell>
          <ListHeaderCell class="hidden md:flex">Module</ListHeaderCell>
        </ListHeader>

        <ListRows :items="pageRows as CatalogRow[]" v-slot="{ item }">
          <ListRow
            :value="item.id"
            class="cursor-pointer"
            @click="openAudit(item)"
          >
            <ListCell class="school-list-nowrap text-ink-gray-7">
              <span
                class="school-cell-text"
                :title="String(item.subtitle || item.when || '—')"
                >{{ item.subtitle || item.when || '—' }}</span
              >
            </ListCell>
            <ListCell class="hidden school-list-nowrap md:flex">
              <span
                class="school-cell-text"
                :title="cellValue(item, 'user')"
                >{{ cellValue(item, 'user') }}</span
              >
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
                  v-if="item.recordId || item.recordName"
                  class="school-cell-text text-xs text-ink-gray-5"
                  :title="String(item.recordName || item.recordId)"
                >
                  {{ item.recordName || item.recordId }}
                </p>
              </div>
            </ListCell>
            <ListCell class="school-list-nowrap text-ink-gray-7">
              <span
                class="school-cell-text text-xs"
                :title="String(item.changes || auditTrailPreview(item))"
                >{{ auditTrailPreview(item) }}</span
              >
            </ListCell>
            <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
              <span
                class="school-cell-text font-mono text-xs"
                :title="cellValue(item, 'ip')"
                >{{ cellValue(item, 'ip') }}</span
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
              <span
                class="school-cell-text"
                :title="cellValue(item, 'module')"
                >{{ cellValue(item, 'module') }}</span
              >
            </ListCell>
          </ListRow>
        </ListRows>
      </List>

      <p v-if="filteredAudit.length === 0" class="school-table-empty">
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
