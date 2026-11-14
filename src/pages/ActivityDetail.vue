<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Button,
  PageHeader,
  PageHeaderTitle,
} from 'frappe-ui'
import {
  activityLog,
  actionTheme,
  formatActivityTime,
  formatChangeLine,
  type ActivityEntry,
} from '../data/activity'
import { schoolStore } from '../data/store'
import type { CatalogRow } from '../data/catalog'
import { pushWithReturn, useAppBack } from '../composables/useAppBack'
import AppBackButton from '../components/AppBackButton.vue'

type DetailKind = 'activity' | 'audit'

const route = useRoute()
const router = useRouter()

const kind = computed<DetailKind>(() => {
  const raw = String(route.params.kind || '').toLowerCase()
  if (raw === 'audit' || route.name === 'audit-entry-detail') return 'audit'
  return 'activity'
})

const entryId = computed(() => String(route.params.id || ''))

const activityEntry = computed(
  () => activityLog.entries.find((e) => e.id === entryId.value) || null,
)

const auditRow = computed(
  () =>
    (schoolStore['audit-logs']?.rows || []).find(
      (r) => r.id === entryId.value,
    ) || null,
)

const found = computed(() =>
  kind.value === 'activity' ? Boolean(activityEntry.value) : Boolean(auditRow.value),
)

const listFallback = computed(() =>
  kind.value === 'audit'
    ? '/activity-log?tab=audit'
    : '/activity-log?tab=activity',
)

const { goBack } = useAppBack(() => listFallback.value)

function auditTheme(status?: string) {
  const s = String(status || '').toLowerCase()
  if (s.includes('success') || s.includes('ok')) return 'green'
  if (s.includes('fail') || s.includes('denied') || s.includes('error'))
    return 'red'
  if (s.includes('warn') || s.includes('pending')) return 'amber'
  return 'gray'
}

const title = computed(() => {
  if (kind.value === 'activity') {
    return activityEntry.value?.summary || 'Activity entry'
  }
  return String(auditRow.value?.name || 'Audit entry')
})

const metaLine = computed(() => {
  if (kind.value === 'activity' && activityEntry.value) {
    return `Activity · ${activityEntry.value.id}`
  }
  if (auditRow.value) return `Audit · ${auditRow.value.id}`
  return kind.value === 'audit' ? 'Audit' : 'Activity'
})

const activityChanges = computed(() => activityEntry.value?.changes || [])

const auditChangeLines = computed(() => {
  const row = auditRow.value
  if (!row) return [] as string[]
  const trail = String(row.changes || '').trim()
  if (trail) return trail.split('\n').filter(Boolean)
  const before = String(row.before || '').trim()
  const after = String(row.after || '').trim()
  if (!before && !after) return []
  if (!before) return [`Added “${after}”`]
  if (!after) return [`Removed “${before}”`]
  return [`“${before}” → “${after}”`]
})

function canOpenRelated(entry: ActivityEntry) {
  return Boolean(
    entry.recordId &&
      entry.module !== 'permissions' &&
      entry.module !== 'system' &&
      entry.module !== 'school-setup',
  )
}

function openRelatedActivity(entry: ActivityEntry) {
  if (entry.module === 'school-setup') {
    pushWithReturn(router, '/school-setup')
    return
  }
  if (canOpenRelated(entry)) {
    pushWithReturn(router, `/${entry.module}/${entry.recordId}`)
  }
}

function openRelatedAudit(row: CatalogRow) {
  const moduleKey = String(row.module || '').trim()
  const recordId = String(row.recordId || '').trim()
  if (!moduleKey || !recordId) return
  if (['permissions', 'system', 'school-setup', 'users'].includes(moduleKey)) {
    if (moduleKey === 'school-setup') pushWithReturn(router, '/school-setup')
    return
  }
  pushWithReturn(router, `/${moduleKey}/${recordId}`)
}

const auditHasRelated = computed(() => {
  const row = auditRow.value
  if (!row) return false
  const moduleKey = String(row.module || '').trim()
  const recordId = String(row.recordId || '').trim()
  return Boolean(moduleKey && recordId && moduleKey !== 'permissions' && moduleKey !== 'system')
})
</script>

<template>
  <PageHeader>
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <AppBackButton :fallback="listFallback" />
      <PageHeaderTitle :title="title" />
    </div>
    <div v-if="found" class="flex flex-wrap items-center gap-2">
      <Button
        v-if="kind === 'activity' && activityEntry && (canOpenRelated(activityEntry) || activityEntry.module === 'school-setup')"
        icon-left="lucide-external-link"
        :label="
          activityEntry.module === 'school-setup'
            ? 'Open School Setup'
            : 'Open record'
        "
        @click="openRelatedActivity(activityEntry)"
      />
      <Button
        v-else-if="kind === 'audit' && auditRow && auditHasRelated"
        icon-left="lucide-external-link"
        label="Open record"
        @click="openRelatedAudit(auditRow)"
      />
    </div>
  </PageHeader>

  <div class="school-page">
    <div
      v-if="!found"
      class="rounded-6 border border-outline-gray-1 px-4 py-16 text-center text-ink-gray-5"
    >
      <p class="text-sm">This log entry was not found.</p>
      <Button class="mt-4" label="Back to Activity & Audit" @click="goBack" />
    </div>

    <template v-else-if="kind === 'activity' && activityEntry">
      <section class="school-detail-hero">
        <div class="school-detail-hero__main">
          <div class="school-detail-hero__text">
            <p class="school-detail-hero__meta">{{ metaLine }}</p>
            <h1 class="school-detail-hero__title" :title="activityEntry.summary">
              {{ activityEntry.summary }}
            </h1>
            <p
              v-if="activityEntry.detail"
              class="school-detail-hero__sub"
              :title="activityEntry.detail"
            >
              {{ activityEntry.detail }}
            </p>
            <div class="school-detail-hero__badges">
              <Badge
                :label="activityEntry.action"
                :theme="actionTheme(activityEntry.action)"
                variant="subtle"
              />
              <Badge
                :label="activityEntry.moduleLabel"
                theme="blue"
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="school-section">
        <h2 class="school-section-title">Who & when</h2>
        <div class="school-detail-grid">
          <div class="school-detail-field">
            <p class="school-detail-field__label">When</p>
            <p class="school-detail-field__value">
              {{ formatActivityTime(activityEntry.at) }}
            </p>
          </div>
          <div class="school-detail-field">
            <p class="school-detail-field__label">User</p>
            <p class="school-detail-field__value">{{ activityEntry.user }}</p>
          </div>
          <div class="school-detail-field">
            <p class="school-detail-field__label">Role</p>
            <p class="school-detail-field__value">{{ activityEntry.role || '—' }}</p>
          </div>
          <div class="school-detail-field">
            <p class="school-detail-field__label">IP address</p>
            <p class="school-detail-field__value font-mono text-sm">
              {{ activityEntry.ip || '—' }}
            </p>
          </div>
          <div class="school-detail-field">
            <p class="school-detail-field__label">Module</p>
            <p class="school-detail-field__value">
              {{ activityEntry.moduleLabel }}
              <span v-if="activityEntry.recordId" class="text-ink-gray-5">
                · {{ activityEntry.recordId }}
              </span>
            </p>
          </div>
          <div v-if="activityEntry.recordName" class="school-detail-field">
            <p class="school-detail-field__label">Record</p>
            <p class="school-detail-field__value">
              {{ activityEntry.recordName }}
            </p>
          </div>
        </div>
      </section>

      <section class="school-section">
        <h2 class="school-section-title">Change trail (was → became)</h2>
        <ul v-if="activityChanges.length" class="space-y-2">
          <li
            v-for="(change, i) in activityChanges"
            :key="`${change.field}-${i}`"
            class="rounded-6 border border-outline-gray-1 bg-surface-white px-3 py-2.5"
          >
            <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
              {{ change.field }}
            </p>
            <p class="mt-1 text-sm text-ink-gray-9">
              <span class="text-ink-gray-5">Was</span>
              {{ ' ' }}
              <span class="font-medium">{{ change.before || '—' }}</span>
              <span class="mx-1.5 text-ink-gray-4">→</span>
              <span class="text-ink-gray-5">Became</span>
              {{ ' ' }}
              <span class="font-medium">{{ change.after || '—' }}</span>
            </p>
            <p class="mt-1 text-xs text-ink-gray-5">
              {{ formatChangeLine(change) }}
            </p>
          </li>
        </ul>
        <p v-else class="text-sm text-ink-gray-5">
          {{ activityEntry.detail || 'No field-level changes recorded for this event.' }}
        </p>
      </section>
    </template>

    <template v-else-if="kind === 'audit' && auditRow">
      <section class="school-detail-hero">
        <div class="school-detail-hero__main">
          <div class="school-detail-hero__text">
            <p class="school-detail-hero__meta">{{ metaLine }}</p>
            <h1 class="school-detail-hero__title" :title="String(auditRow.name)">
              {{ auditRow.name }}
            </h1>
            <p
              v-if="auditRow.recordName || auditRow.recordId"
              class="school-detail-hero__sub"
            >
              {{ auditRow.recordName || auditRow.recordId }}
            </p>
            <div class="school-detail-hero__badges">
              <Badge
                :label="String(auditRow.status || '—')"
                :theme="auditTheme(String(auditRow.status))"
                variant="subtle"
              />
              <Badge
                v-if="auditRow.module"
                :label="String(auditRow.module)"
                theme="blue"
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="school-section">
        <h2 class="school-section-title">Who & when</h2>
        <div class="school-detail-grid">
          <div class="school-detail-field">
            <p class="school-detail-field__label">When</p>
            <p class="school-detail-field__value">
              {{ auditRow.subtitle || auditRow.when || '—' }}
            </p>
          </div>
          <div class="school-detail-field">
            <p class="school-detail-field__label">User</p>
            <p class="school-detail-field__value">{{ auditRow.user || '—' }}</p>
          </div>
          <div class="school-detail-field">
            <p class="school-detail-field__label">IP address</p>
            <p class="school-detail-field__value font-mono text-sm">
              {{ auditRow.ip || '—' }}
            </p>
          </div>
          <div class="school-detail-field">
            <p class="school-detail-field__label">Module</p>
            <p class="school-detail-field__value">{{ auditRow.module || '—' }}</p>
          </div>
          <div v-if="auditRow.recordId" class="school-detail-field">
            <p class="school-detail-field__label">Record ID</p>
            <p class="school-detail-field__value">{{ auditRow.recordId }}</p>
          </div>
          <div class="school-detail-field">
            <p class="school-detail-field__label">Result</p>
            <p class="school-detail-field__value">{{ auditRow.status || '—' }}</p>
          </div>
        </div>
      </section>

      <section class="school-section">
        <h2 class="school-section-title">Change trail (was → became)</h2>
        <ul v-if="auditChangeLines.length" class="space-y-2">
          <li
            v-for="(line, i) in auditChangeLines"
            :key="i"
            class="rounded-6 border border-outline-gray-1 bg-surface-white px-3 py-2.5 text-sm text-ink-gray-9"
          >
            {{ line }}
          </li>
        </ul>
        <div v-else class="school-detail-grid">
          <div class="school-detail-field">
            <p class="school-detail-field__label">Was</p>
            <p class="school-detail-field__value">{{ auditRow.before || '—' }}</p>
          </div>
          <div class="school-detail-field">
            <p class="school-detail-field__label">Became</p>
            <p class="school-detail-field__value">{{ auditRow.after || '—' }}</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
