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
} from 'frappe-ui'
import { schoolSetup } from '@/data/school/schoolSetup'
import { schoolStore } from '@/data/catalog/store'
import ListPagination from '@/components/list/ListPagination.vue'
import ListStatCards from '@/components/list/ListStatCards.vue'
import { PAGE_SIZE } from '@/composables/useListPage'
import {
  axisTicks,
  barLeftPct,
  barWidthPct,
  buildTimelineBars,
  calendarCells,
  currentTermRow,
  formatBarRange,
  kindThemes,
  packGanttLanes,
  scaleOptions,
  scaleTitle,
  shiftAnchor,
  todayIso,
  todayPct,
  resolveScaleRange,
  type TimelineBar,
  type TimelineKind,
  type TimelineScale,
} from '@/data/school/termTimeline'
import { pushWithReturn } from '@/composables/useAppBack'
import CanAccess from '@/components/common/CanAccess.vue'

const router = useRouter()
const route = useRoute()

function openLinked(path: string) {
  pushWithReturn(router, path)
}

type ViewTab = 'calendar' | 'gantt' | 'schedule' | 'events' | 'exams'

const viewTabs = [
  { label: 'Calendar', value: 'calendar' },
  { label: 'Gantt', value: 'gantt' },
  { label: 'Schedule', value: 'schedule' },
  { label: 'Events', value: 'events' },
  { label: 'Exams & marks', value: 'exams' },
]

function parseView(raw: unknown): ViewTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'gantt' || v === 'chart') return 'gantt'
  if (v === 'schedule' || v === 'list') return 'schedule'
  if (v === 'events' || v === 'event') return 'events'
  if (v === 'exams' || v === 'exam' || v === 'marks' || v === 'gradebook')
    return 'exams'
  return 'calendar'
}

const view = ref<ViewTab>(parseView(route.query.view))

watch(view, (value) => {
  router.replace({
    path: '/term-overview',
    query: { ...route.query, view: value },
  })
})

watch(
  () => route.query.view,
  (value) => {
    const next = parseView(value)
    if (view.value !== next) view.value = next
  },
)

const isTimelineView = computed(
  () =>
    view.value === 'calendar' ||
    view.value === 'gantt' ||
    view.value === 'schedule',
)

const scale = ref<TimelineScale>('month')
const kindFilter = ref('All')
const termId = ref('')
const anchor = ref(todayIso())

const termOptions = computed(() => {
  const rows = schoolStore['academic-terms']?.rows || []
  return rows.map((t) => ({
    label: `${t.name} · ${t.year || ''}`,
    value: t.id,
  }))
})

const selectedTerm = computed(
  () =>
    (schoolStore['academic-terms']?.rows || []).find(
      (t) => t.id === termId.value,
    ) || currentTermRow(),
)

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

watch(scale, (next) => {
  if (next === 'term' && selectedTerm.value?.start) {
    anchor.value = String(selectedTerm.value.start).slice(0, 10)
  }
})

const kindOptions = computed(() => [
  { label: 'All types', value: 'All' },
  ...Object.entries(kindThemes).map(([value, meta]) => ({
    label: meta.label,
    value,
  })),
])

const allBars = computed(() => buildTimelineBars())

const range = computed(() => {
  const scaleForView = isTimelineView.value
    ? scale.value
    : ('term' as TimelineScale)
  return resolveScaleRange(scaleForView, anchor.value, selectedTerm.value)
})

const periodLabel = computed(() =>
  scaleTitle(
    isTimelineView.value ? scale.value : 'term',
    anchor.value,
    selectedTerm.value?.name,
  ),
)

const visibleBars = computed(() => {
  const r = range.value
  if (!r) return []
  return allBars.value.filter((bar) => {
    if (kindFilter.value !== 'All' && bar.kind !== kindFilter.value) return false
    if (
      bar.kind === 'term' &&
      isTimelineView.value &&
      (scale.value === 'day' || scale.value === 'week')
    ) {
      return false
    }
    const s = Date.parse(`${bar.start}T12:00:00`)
    const e = Date.parse(`${bar.end}T12:00:00`)
    if (!Number.isFinite(s)) return false
    return e >= r.start && s <= r.end
  })
})

const days = computed(() => {
  const r = range.value
  if (!r) return []
  return calendarCells(
    scale.value,
    r.start,
    r.end,
    visibleBars.value,
    anchor.value,
  )
})

const ticks = computed(() => {
  const r = range.value
  if (!r) return []
  return axisTicks(scale.value, r.start, r.end)
})

const marker = computed(() => {
  const r = range.value
  if (!r) return null
  return todayPct(r.start, r.end)
})

const ganttLanes = computed(() => packGanttLanes(visibleBars.value))

const eventBars = computed(() =>
  visibleBars.value.filter(
    (b) =>
      b.kind === 'activity' ||
      b.kind === 'parents' ||
      b.kind === 'holiday' ||
      b.kind === 'school' ||
      b.source === 'events',
  ),
)

const examBars = computed(() =>
  visibleBars.value.filter((b) => b.kind === 'exam' || b.source === 'exams'),
)

const listPage = ref(1)
const listRows = computed(() => {
  if (view.value === 'exams') return examBars.value
  if (view.value === 'events') return eventBars.value
  return visibleBars.value
})
const listTotalPages = computed(() =>
  Math.max(1, Math.ceil(listRows.value.length / PAGE_SIZE)),
)
const listPageRows = computed(() => {
  const start = (listPage.value - 1) * PAGE_SIZE
  return listRows.value.slice(start, start + PAGE_SIZE)
})
const listRangeLabel = computed(() => {
  const total = listRows.value.length
  if (!total) return '0 of 0'
  const start = (listPage.value - 1) * PAGE_SIZE + 1
  const end = Math.min(listPage.value * PAGE_SIZE, total)
  return `${start}–${end} of ${total}`
})

watch(
  () => [periodLabel.value, listRows.value.length, view.value] as const,
  () => {
    listPage.value = 1
  },
)

watch(listTotalPages, (pages) => {
  if (listPage.value > pages) listPage.value = pages
})

function goListPage(next: number) {
  listPage.value = Math.min(Math.max(1, next), listTotalPages.value)
}

const stats = computed(() => [
  {
    title: 'This period',
    value: visibleBars.value.length,
    caption: periodLabel.value,
  },
  {
    title: 'Events',
    value: eventBars.value.length,
  },
  {
    title: 'Exams',
    value: examBars.value.length,
  },
  {
    title: 'Holidays',
    value: visibleBars.value.filter((b) => b.kind === 'holiday').length,
  },
])

const weekdayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatRange(start: string, end: string) {
  return formatBarRange(start, end)
}

function openSource(bar: TimelineBar) {
  if (bar.source === 'exams' || bar.kind === 'exam') openLinked('/gradebook')
  else if (bar.source === 'events') openLinked('/school-events')
  else openLinked('/years-and-terms')
}

function barStyle(bar: TimelineBar) {
  const r = range.value
  if (!r) return {}
  const theme = kindThemes[bar.kind as TimelineKind]
  return {
    left: `${barLeftPct(bar, r.start, r.end)}%`,
    width: `${barWidthPct(bar, r.start, r.end)}%`,
    background: theme.soft,
    borderColor: theme.color,
    color: theme.color,
    ['--gantt-ink' as string]: theme.color,
  }
}

function barCompact(bar: TimelineBar) {
  const r = range.value
  if (!r) return true
  return barWidthPct(bar, r.start, r.end) < 10
}

function go(direction: -1 | 1) {
  if (scale.value === 'term') {
    const rows = schoolStore['academic-terms']?.rows || []
    const idx = rows.findIndex((t) => t.id === termId.value)
    const next = rows[idx + direction]
    if (next) {
      termId.value = next.id
      if (next.start) anchor.value = String(next.start).slice(0, 10)
    }
    return
  }
  anchor.value = shiftAnchor(scale.value, anchor.value, direction)
}

function jumpToday() {
  anchor.value = todayIso()
  const current = currentTermRow()
  if (current) termId.value = current.id
}

function selectDay(iso: string) {
  anchor.value = iso
  view.value = 'calendar'
  if (scale.value === 'month' || scale.value === 'term' || scale.value === 'year') {
    scale.value = 'day'
  }
}

function chipColor(kind: TimelineKind) {
  return kindThemes[kind]?.color || '#64748b'
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Term overview" />
  </PageHeader>

  <div class="school-page">
    <p class="text-p-base text-ink-gray-6">
      {{ schoolSetup.currentTerm }} {{ schoolSetup.academicYear }} ·
      {{ schoolSetup.shortName }}
    </p>

    <ListStatCards :stats="stats" />

    <TabButtons v-model="view" :options="viewTabs" class="school-tabs" />

    <!-- Shared period controls for Calendar / Gantt / Schedule -->
    <div v-if="isTimelineView" class="school-term-toolbar">
      <TabButtons
        v-model="scale"
        :options="scaleOptions"
        class="school-tabs"
      />

      <div class="school-scale-nav">
        <Button
          icon="lucide-chevron-left"
          variant="subtle"
          aria-label="Previous"
          @click="go(-1)"
        />
        <button type="button" class="school-scale-period" @click="jumpToday">
          {{ periodLabel }}
        </button>
        <Button
          icon="lucide-chevron-right"
          variant="subtle"
          aria-label="Next"
          @click="go(1)"
        />
        <Button label="Today" variant="subtle" @click="jumpToday" />
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <FormControl
          v-model="termId"
          type="select"
          label="Term"
          :options="termOptions"
          :disabled="scale === 'year'"
        />
        <FormControl
          v-model="kindFilter"
          type="select"
          label="Show"
          :options="kindOptions"
        />
      </div>
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <FormControl
        v-model="termId"
        type="select"
        label="Term"
        :options="termOptions"
      />
      <FormControl
        v-model="kindFilter"
        type="select"
        label="Type"
        :options="kindOptions"
      />
    </div>

    <!-- Calendar -->
    <section v-if="view === 'calendar'" class="school-section">
      <h2 class="school-section-title">Calendar · {{ periodLabel }}</h2>
      <div class="school-gantt-legend mb-3">
        <span
          v-for="(meta, key) in kindThemes"
          :key="key"
          class="school-gantt-legend__item"
        >
          <span
            class="school-gantt-legend__swatch"
            :style="{ background: meta.color }"
          />
          {{ meta.label }}
        </span>
      </div>

      <div v-if="scale === 'day'" class="school-cal school-cal--day">
        <div
          v-for="cell in days"
          :key="cell.iso"
          class="school-cal__day-card"
          :data-today="cell.isToday ? '' : undefined"
        >
          <div class="school-cal__day-head">
            <span class="text-base-medium text-ink-gray-9">{{
              cell.weekday
            }}</span>
            <span class="text-sm text-ink-gray-5">{{ cell.iso }}</span>
          </div>
          <div v-if="cell.bars.length" class="school-cal__day-list">
            <button
              v-for="bar in cell.bars"
              :key="bar.id"
              type="button"
              class="school-cal__pill"
              :style="{
                background: kindThemes[bar.kind].soft,
                color: kindThemes[bar.kind].color,
                borderColor: kindThemes[bar.kind].color,
              }"
              @click="openSource(bar)"
            >
              {{ bar.name }}
            </button>
          </div>
          <p v-else class="py-6 text-center text-sm text-ink-gray-5">
            No activities on this day.
          </p>
        </div>
      </div>

      <div v-else-if="scale === 'week'" class="school-cal school-cal--week">
        <button
          v-for="cell in days"
          :key="cell.iso"
          type="button"
          class="school-cal__cell"
          :data-today="cell.isToday ? '' : undefined"
          @click="selectDay(cell.iso)"
        >
          <div class="school-cal__cell-head">
            <span>{{ cell.weekday }}</span>
            <strong>{{ cell.day }}</strong>
          </div>
          <div class="school-cal__dots">
            <span
              v-for="bar in cell.bars.slice(0, 4)"
              :key="bar.id"
              class="school-cal__dot-label"
              :style="{ color: chipColor(bar.kind) }"
              >{{ bar.name }}</span
            >
            <span
              v-if="cell.bars.length > 4"
              class="text-xs text-ink-gray-5"
              >+{{ cell.bars.length - 4 }}</span
            >
          </div>
        </button>
      </div>

      <div v-else class="school-cal school-cal--month">
        <div
          v-for="wd in weekdayHeaders"
          :key="wd"
          class="school-cal__weekday"
        >
          {{ wd }}
        </div>
        <button
          v-for="cell in days"
          :key="cell.iso"
          type="button"
          class="school-cal__cell"
          :data-muted="cell.inMonth ? undefined : ''"
          :data-today="cell.isToday ? '' : undefined"
          :data-holiday="
            cell.bars.some((b) => b.kind === 'holiday') ? '' : undefined
          "
          @click="selectDay(cell.iso)"
        >
          <span class="school-cal__num">{{ cell.day }}</span>
          <div class="school-cal__event-list">
            <span
              v-for="bar in cell.bars.slice(0, 3)"
              :key="bar.id"
              class="school-cal__event-chip"
              :style="{
                background: kindThemes[bar.kind].soft,
                color: kindThemes[bar.kind].color,
              }"
              :title="`${bar.name} · ${bar.detail || kindThemes[bar.kind].label}`"
              >{{ bar.name }}</span
            >
            <span
              v-if="cell.bars.length > 3"
              class="text-[0.6rem] text-ink-gray-5"
              >+{{ cell.bars.length - 3 }} more</span
            >
          </div>
        </button>
      </div>
    </section>

    <!-- Gantt -->
    <section v-else-if="view === 'gantt'" class="school-section">
      <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
        <h2 class="school-section-title mb-0">Gantt · {{ periodLabel }}</h2>
        <p class="text-xs text-ink-gray-5">
          {{ ganttLanes.length }} lane{{ ganttLanes.length === 1 ? '' : 's' }}
        </p>
      </div>

      <div class="school-gantt-legend">
        <span
          v-for="(meta, key) in kindThemes"
          :key="key"
          class="school-gantt-legend__item"
        >
          <span
            class="school-gantt-legend__swatch"
            :style="{ background: meta.color }"
          />
          {{ meta.label }}
        </span>
      </div>

      <div class="school-gantt">
        <div class="school-gantt__axis">
          <div class="school-gantt__label-col school-gantt__axis-label">
            Lane
          </div>
          <div class="school-gantt__track-col school-gantt__months">
            <span
              v-for="tick in ticks"
              :key="(tick.iso || tick.label) + tick.pct"
              class="school-gantt__month"
              :class="{
                'is-weekend':
                  tick.sub === 'Sat' ||
                  tick.sub === 'Sun' ||
                  tick.sub === 'SAT' ||
                  tick.sub === 'SUN',
              }"
              :style="{ left: `${tick.pct}%` }"
            >
              <span>{{ tick.label }}</span>
              <span v-if="tick.sub" class="school-gantt__month-sub">{{
                tick.sub
              }}</span>
            </span>
            <div
              v-if="marker != null"
              class="school-gantt__today school-gantt__today--axis"
              :style="{ left: `${marker}%` }"
            />
          </div>
        </div>

        <div
          v-for="lane in ganttLanes"
          :key="lane.id"
          class="school-gantt__row"
          :data-kind="lane.kind"
        >
          <div
            class="school-gantt__label-col school-gantt__label"
            :style="{ borderLeftColor: kindThemes[lane.kind].color }"
          >
            <span class="school-gantt__lane-name">{{ lane.label }}</span>
            <span class="school-gantt__lane-count">
              {{ lane.bars.length }} item{{ lane.bars.length === 1 ? '' : 's' }}
            </span>
          </div>
          <div class="school-gantt__track-col">
            <div
              v-for="tick in ticks"
              :key="`grid-${lane.id}-${tick.iso || tick.label}-${tick.pct}`"
              class="school-gantt__gridline"
              :class="{
                'is-weekend':
                  tick.sub === 'Sat' ||
                  tick.sub === 'Sun' ||
                  tick.sub === 'SAT' ||
                  tick.sub === 'SUN',
              }"
              :style="{ left: `${tick.pct}%` }"
            />
            <div
              v-if="marker != null"
              class="school-gantt__today"
              :style="{ left: `${marker}%` }"
            />
            <button
              v-for="bar in lane.bars"
              :key="bar.id"
              type="button"
              class="school-gantt__bar-wrap"
              :class="{ 'is-compact': barCompact(bar) }"
              :style="barStyle(bar)"
              :title="`${bar.name} · ${formatRange(bar.start, bar.end)}${bar.detail ? ` · ${bar.detail}` : ''}`"
              @click="openSource(bar)"
            >
              <span class="school-gantt__bar-caption">{{ bar.name }}</span>
              <span v-if="!barCompact(bar)" class="school-gantt__bar-meta">{{
                formatRange(bar.start, bar.end)
              }}</span>
            </button>
          </div>
        </div>

        <p
          v-if="!ganttLanes.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No activities in this range.
        </p>
      </div>
    </section>

    <!-- Schedule -->
    <section v-else-if="view === 'schedule'" class="school-section">
      <h2 class="school-section-title">Schedule · {{ periodLabel }}</h2>
      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <button
          v-for="bar in listPageRows"
          :key="`sched-${bar.id}`"
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
        <p
          v-if="!visibleBars.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No items on the schedule for this range.
        </p>
        <ListPagination
          v-if="visibleBars.length"
          :page="listPage"
          :total-pages="listTotalPages"
          :range-label="listRangeLabel"
          :total="visibleBars.length"
          @prev="goListPage(listPage - 1)"
          @next="goListPage(listPage + 1)"
          @go="goListPage"
        />
      </div>
    </section>

    <!-- Events -->
    <section v-else-if="view === 'events'" class="school-section">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 class="school-section-title mb-0">Events · {{ periodLabel }}</h2>
        <CanAccess path="/school-events">
          <Button
            variant="subtle"
            icon-left="lucide-plus"
            label="Manage events"
            @click="openLinked('/school-events')"
          />
        </CanAccess>
      </div>
      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <button
          v-for="bar in listPageRows"
          :key="`event-${bar.id}`"
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
        <p
          v-if="!eventBars.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No events in this term range yet.
        </p>
        <ListPagination
          v-if="eventBars.length"
          :page="listPage"
          :total-pages="listTotalPages"
          :range-label="listRangeLabel"
          :total="eventBars.length"
          @prev="goListPage(listPage - 1)"
          @next="goListPage(listPage + 1)"
          @go="goListPage"
        />
      </div>
    </section>

    <!-- Exams & marks -->
    <section v-else class="school-section">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 class="school-section-title mb-0">
          Exams & marks · {{ periodLabel }}
        </h2>
        <CanAccess path="/gradebook">
          <Button
            variant="solid"
            icon-left="lucide-table-2"
            label="Open gradebook"
            @click="openLinked('/gradebook')"
          />
        </CanAccess>
      </div>
      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <button
          v-for="bar in listPageRows"
          :key="`exam-${bar.id}`"
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
        <p
          v-if="!examBars.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No exams scheduled in this term range yet.
        </p>
        <ListPagination
          v-if="examBars.length"
          :page="listPage"
          :total-pages="listTotalPages"
          :range-label="listRangeLabel"
          :total="examBars.length"
          @prev="goListPage(listPage - 1)"
          @next="goListPage(listPage + 1)"
          @go="goListPage"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.school-term-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.school-scale-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.school-scale-period {
  min-width: 10rem;
  border: 0;
  background: transparent;
  padding: 0.35rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 650;
  color: var(--ink-gray-9);
  cursor: pointer;
}

.school-cal {
  width: 100%;
  border: 1px solid var(--outline-gray-1);
  border-radius: 0.75rem;
  background: var(--surface-white);
  overflow: hidden;
}

.school-cal--week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.school-cal--month {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.school-cal__weekday {
  padding: 0.45rem 0.35rem;
  text-align: center;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-gray-5);
  background: var(--surface-gray-1);
  border-bottom: 1px solid var(--outline-gray-1);
}

.school-cal__cell {
  min-height: 5.75rem;
  padding: 0.4rem;
  border: 0;
  border-inline-end: 1px solid var(--outline-gray-1);
  border-bottom: 1px solid var(--outline-gray-1);
  background: var(--surface-white);
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.school-cal__cell[data-holiday] {
  background: color-mix(in srgb, #be123c 6%, white);
}

.school-cal--week .school-cal__cell {
  min-height: 7.5rem;
}

.school-cal__cell:hover {
  background: var(--surface-gray-1);
}

.school-cal__cell[data-muted] {
  opacity: 0.45;
}

.school-cal__cell[data-today],
.school-cal__day-card[data-today] {
  box-shadow: inset 0 0 0 2px
    color-mix(in srgb, var(--school-blue) 55%, white);
}

.school-cal__num {
  font-size: 0.8rem;
  font-weight: 650;
  color: var(--ink-gray-8);
}

.school-cal__cell-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.7rem;
  color: var(--ink-gray-5);
}

.school-cal__cell-head strong {
  font-size: 1rem;
  color: var(--ink-gray-9);
}

.school-cal__dots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  align-items: center;
}

.school-cal__dot-label {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
  font-weight: 650;
}

.school-cal__event-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.school-cal__event-chip {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 0.25rem;
  padding: 0.05rem 0.3rem;
  font-size: 0.6rem;
  font-weight: 650;
  line-height: 1.3;
}

.school-cal__day-card {
  padding: 0.85rem 1rem;
}

.school-cal__day-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.65rem;
}

.school-cal__day-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.school-cal__pill {
  border: 1px solid;
  border-radius: 0.45rem;
  padding: 0.45rem 0.65rem;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 650;
  cursor: pointer;
}

.school-gantt {
  width: 100%;
  border: 1px solid var(--outline-gray-1);
  border-radius: 0.75rem;
  background: var(--surface-white);
  overflow: auto;
}

.school-gantt__axis,
.school-gantt__row {
  display: grid;
  grid-template-columns: 9.5rem minmax(28rem, 1fr);
  min-width: 38rem;
}

@media (min-width: 900px) {
  .school-gantt__axis,
  .school-gantt__row {
    grid-template-columns: 11rem minmax(0, 1fr);
    min-width: 0;
  }
}

.school-gantt__axis {
  position: sticky;
  top: 0;
  z-index: 4;
  border-bottom: 1px solid var(--outline-gray-1);
}

.school-gantt__row {
  border-bottom: 1px solid var(--outline-gray-1);
}

.school-gantt__row:nth-child(even) .school-gantt__track-col {
  background: color-mix(in srgb, var(--surface-gray-1) 55%, white);
}

.school-gantt__label-col {
  border-inline-end: 1px solid var(--outline-gray-1);
  padding: 0.55rem 0.65rem;
  background: var(--surface-white);
}

.school-gantt__axis-label {
  display: flex;
  align-items: center;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-gray-5);
}

.school-gantt__label {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
  text-align: left;
  width: 100%;
  border-left: 3px solid transparent;
}

.school-gantt__lane-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink-gray-9);
  line-height: 1.2;
}

.school-gantt__lane-count {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--ink-gray-5);
}

.school-gantt__track-col {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 0.45rem 0.35rem;
  min-height: 3.1rem;
}

.school-gantt__months {
  min-height: 2.35rem;
  background: linear-gradient(
    180deg,
    var(--surface-gray-1),
    color-mix(in srgb, var(--surface-gray-1) 40%, white)
  );
}

.school-gantt__month {
  position: absolute;
  top: 0.3rem;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--ink-gray-6);
  white-space: nowrap;
  line-height: 1.15;
}

.school-gantt__month.is-weekend {
  color: var(--ink-gray-4);
}

.school-gantt__month-sub {
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.9;
}

.school-gantt__gridline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: color-mix(in srgb, var(--outline-gray-1) 80%, transparent);
  pointer-events: none;
  z-index: 0;
}

.school-gantt__gridline.is-weekend {
  background: color-mix(in srgb, var(--ink-gray-4) 35%, transparent);
}

.school-gantt__bar-wrap {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.05rem;
  min-width: 1.5rem;
  max-width: calc(100% - 0.25rem);
  min-height: 1.85rem;
  padding: 0.2rem 0.45rem;
  border: 1px solid;
  border-radius: 0.45rem;
  text-align: left;
  cursor: pointer;
  z-index: 1;
  overflow: hidden;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.school-gantt__bar-wrap:hover {
  transform: translateY(calc(-50% - 1px));
  box-shadow: 0 4px 12px rgb(15 23 42 / 0.1);
  z-index: 3;
}

.school-gantt__bar-wrap.is-compact {
  min-height: 1.45rem;
  padding: 0.15rem 0.3rem;
}

.school-gantt__bar-caption {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.15;
  color: var(--gantt-ink, inherit);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.school-gantt__bar-wrap.is-compact .school-gantt__bar-caption {
  font-size: 0.62rem;
}

.school-gantt__bar-meta {
  display: block;
  font-size: 0.58rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--gantt-ink, #475569) 70%, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.school-gantt-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.85rem;
  margin: 0.75rem 0 0.65rem;
}

.school-gantt-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink-gray-7);
}

.school-gantt-legend__swatch {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 0.2rem;
  flex-shrink: 0;
}

.school-gantt__today {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--school-blue);
  z-index: 2;
  pointer-events: none;
}

.school-gantt__today--axis {
  top: 0.15rem;
  bottom: 0.15rem;
  border-radius: 999px;
}

.school-gantt__today::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: var(--school-blue);
  transform: translate(-50%, -20%);
}

@media (max-width: 700px) {
  .school-cal--week {
    grid-template-columns: 1fr;
  }
}
</style>
