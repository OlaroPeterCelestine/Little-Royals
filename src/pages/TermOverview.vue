<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
} from 'frappe-ui'
import { schoolSetup } from '../data/schoolSetup'
import { schoolStore } from '../data/store'
import ListStatCards from '../components/ListStatCards.vue'
import {
  barLeftPct,
  barWidthPct,
  buildTimelineBars,
  currentTermRow,
  kindThemes,
  monthTicks,
  parseRange,
  todayPct,
  type TimelineKind,
} from '../data/termTimeline'

const router = useRouter()

const scope = ref<'term' | 'year'>('term')
const kindFilter = ref('All')
const termId = ref('')

const termOptions = computed(() => {
  const rows = schoolStore['academic-terms']?.rows || []
  return rows.map((t) => ({
    label: `${t.name} · ${t.year || ''}`,
    value: t.id,
  }))
})

watch(
  termOptions,
  (opts) => {
    if (!termId.value) {
      const current = currentTermRow()
      termId.value = current?.id || opts[0]?.value || ''
    }
  },
  { immediate: true },
)

const selectedTerm = computed(
  () =>
    (schoolStore['academic-terms']?.rows || []).find(
      (t) => t.id === termId.value,
    ) || currentTermRow(),
)

const kindOptions = computed(() => [
  { label: 'All types', value: 'All' },
  ...Object.entries(kindThemes).map(([value, meta]) => ({
    label: meta.label,
    value,
  })),
])

const allBars = computed(() => buildTimelineBars())

const range = computed(() => {
  if (scope.value === 'term' && selectedTerm.value) {
    const r = parseRange(
      String(selectedTerm.value.start),
      String(selectedTerm.value.end),
    )
    if (r) return r
  }
  const year = schoolSetup.academicYear || '2026'
  return parseRange(`${year}-01-01`, `${year}-12-31`)
})

const visibleBars = computed(() => {
  const r = range.value
  if (!r) return []
  return allBars.value.filter((bar) => {
    if (kindFilter.value !== 'All' && bar.kind !== kindFilter.value) return false
    if (bar.kind === 'term' && scope.value === 'term') return false
    const s = Date.parse(`${bar.start}T12:00:00`)
    const e = Date.parse(`${bar.end}T12:00:00`)
    if (!Number.isFinite(s)) return false
    return e >= r.start && s <= r.end
  })
})

const ticks = computed(() => {
  const r = range.value
  if (!r) return []
  return monthTicks(r.start, r.end)
})

const marker = computed(() => {
  const r = range.value
  if (!r) return null
  return todayPct(r.start, r.end)
})

const stats = computed(() => {
  const bars = visibleBars.value
  return [
    {
      title: 'On chart',
      value: bars.length,
      caption: scope.value === 'term' ? selectedTerm.value?.name : 'Full year',
    },
    {
      title: 'Exams',
      value: bars.filter((b) => b.kind === 'exam').length,
    },
    {
      title: 'Activities',
      value: bars.filter((b) => b.kind === 'activity' || b.kind === 'parents')
        .length,
    },
    {
      title: 'Holidays',
      value: bars.filter((b) => b.kind === 'holiday').length,
    },
  ]
})

function barStyle(bar: (typeof visibleBars.value)[number]) {
  const r = range.value
  if (!r) return {}
  const theme = kindThemes[bar.kind as TimelineKind]
  return {
    left: `${barLeftPct(bar, r.start, r.end)}%`,
    width: `${barWidthPct(bar, r.start, r.end)}%`,
    background: theme.soft,
    borderColor: theme.color,
    color: theme.color,
  }
}

function formatRange(start: string, end: string) {
  if (start === end) return start
  return `${start} → ${end}`
}

function openSource(bar: (typeof visibleBars.value)[number]) {
  if (bar.source === 'exams') router.push('/gradebook')
  else if (bar.source === 'events') router.push('/calendar')
  else router.push('/academic-terms')
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Term overview" />
    <div class="flex flex-wrap gap-2">
      <Button
        icon-left="lucide-calendar-days"
        label="Calendar"
        @click="router.push('/calendar')"
      />
      <Button
        icon-left="lucide-party-popper"
        label="Events"
        @click="router.push('/school-events')"
      />
      <Button
        variant="solid"
        icon-left="lucide-table-2"
        label="Exams & marks"
        @click="router.push('/gradebook')"
      />
    </div>
  </PageHeader>

  <div class="school-page">
    <p class="text-p-base text-ink-gray-6">
      Gantt overview of {{ schoolSetup.shortName }} terms, exams, and school
      activities — {{ schoolSetup.currentTerm }}
      {{ schoolSetup.academicYear }}.
    </p>

    <ListStatCards :stats="stats" />

    <div class="grid gap-3 sm:grid-cols-3">
      <FormControl
        v-model="scope"
        type="select"
        label="View"
        :options="[
          { label: 'Current / selected term', value: 'term' },
          { label: 'Full academic year', value: 'year' },
        ]"
      />
      <FormControl
        v-model="termId"
        type="select"
        label="Term"
        :options="termOptions"
        :disabled="scope === 'year'"
      />
      <FormControl
        v-model="kindFilter"
        type="select"
        label="Activity type"
        :options="kindOptions"
      />
    </div>

    <div class="flex flex-wrap gap-2">
      <Badge
        v-for="(meta, key) in kindThemes"
        :key="key"
        :label="meta.label"
        variant="subtle"
        theme="gray"
      />
    </div>

    <section class="school-section">
      <h2 class="school-section-title">
        Gantt ·
        {{
          scope === 'term'
            ? selectedTerm?.name || 'Term'
            : `Year ${schoolSetup.academicYear}`
        }}
      </h2>

      <div class="school-gantt">
        <div class="school-gantt__axis">
          <div class="school-gantt__label-col" />
          <div class="school-gantt__track-col school-gantt__months">
            <span
              v-for="tick in ticks"
              :key="tick.label + tick.pct"
              class="school-gantt__month"
              :style="{ left: `${tick.pct}%` }"
              >{{ tick.label }}</span
            >
          </div>
        </div>

        <div
          v-for="bar in visibleBars"
          :key="bar.id"
          class="school-gantt__row"
        >
          <button
            type="button"
            class="school-gantt__label-col school-gantt__label"
            :title="bar.detail || bar.name"
            @click="openSource(bar)"
          >
            <span class="school-cell-text text-sm-medium text-ink-gray-9">{{
              bar.name
            }}</span>
            <span class="school-cell-text text-xs text-ink-gray-5">{{
              bar.detail || kindThemes[bar.kind].label
            }}</span>
          </button>
          <div class="school-gantt__track-col">
            <div
              v-if="marker != null"
              class="school-gantt__today"
              :style="{ left: `${marker}%` }"
            />
            <button
              type="button"
              class="school-gantt__bar"
              :style="barStyle(bar)"
              :title="`${bar.name} · ${formatRange(bar.start, bar.end)}`"
              @click="openSource(bar)"
            >
              <span class="school-gantt__bar-text">{{ bar.name }}</span>
            </button>
          </div>
        </div>

        <p
          v-if="!visibleBars.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No activities in this range. Add school events or exams to fill the
          chart.
        </p>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Schedule list</h2>
      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <button
          v-for="bar in visibleBars"
          :key="`list-${bar.id}`"
          type="button"
          class="flex w-full flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 text-left last:border-b-0 hover:bg-surface-gray-1"
          @click="openSource(bar)"
        >
          <div class="min-w-0">
            <p class="school-cell-text text-sm-medium text-ink-gray-9">
              {{ bar.name }}
            </p>
            <p class="school-cell-text text-xs text-ink-gray-5">
              {{ formatRange(bar.start, bar.end) }}
              <span v-if="bar.detail"> · {{ bar.detail }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <Badge
              :label="kindThemes[bar.kind].label"
              theme="blue"
              variant="subtle"
            />
            <Badge :label="bar.status" theme="gray" variant="subtle" />
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.school-gantt {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--outline-gray-1);
  border-radius: 0.75rem;
  background: var(--surface-white);
}

.school-gantt__axis,
.school-gantt__row {
  display: grid;
  grid-template-columns: minmax(0, 11rem) minmax(0, 1fr);
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

@media (min-width: 768px) {
  .school-gantt__axis,
  .school-gantt__row {
    grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
  }
}

.school-gantt__row {
  border-top: 1px solid var(--outline-gray-1);
  min-height: 2.75rem;
}

.school-gantt__label-col {
  min-width: 0;
  padding: 0.55rem 0.75rem;
  border-inline-end: 1px solid var(--outline-gray-1);
  background: var(--surface-gray-1);
}

.school-gantt__label {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  text-align: left;
  width: 100%;
}

.school-gantt__track-col {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 0.45rem 0.5rem;
}

.school-gantt__months {
  min-height: 1.75rem;
  background: var(--surface-gray-1);
}

.school-gantt__month {
  position: absolute;
  top: 0.35rem;
  transform: translateX(-50%);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-gray-5);
  white-space: nowrap;
}

.school-gantt__bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 1.55rem;
  max-width: 100%;
  border: 1px solid;
  border-radius: 0.4rem;
  padding-inline: 0.4rem;
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
}

.school-gantt__bar-text {
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.school-gantt__today {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: color-mix(in srgb, var(--school-blue) 80%, white);
  z-index: 2;
  pointer-events: none;
}
</style>
