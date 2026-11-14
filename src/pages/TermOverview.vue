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
  axisTicks,
  barLeftPct,
  barWidthPct,
  buildTimelineBars,
  calendarCells,
  currentTermRow,
  kindThemes,
  scaleOptions,
  scaleTitle,
  shiftAnchor,
  todayIso,
  todayPct,
  resolveScaleRange,
  type TimelineKind,
  type TimelineScale,
} from '../data/termTimeline'

const router = useRouter()

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

const range = computed(() =>
  resolveScaleRange(scale.value, anchor.value, selectedTerm.value),
)

const periodLabel = computed(() =>
  scaleTitle(scale.value, anchor.value, selectedTerm.value?.name),
)

const visibleBars = computed(() => {
  const r = range.value
  if (!r) return []
  return allBars.value.filter((bar) => {
    if (kindFilter.value !== 'All' && bar.kind !== kindFilter.value) return false
    if (bar.kind === 'term' && (scale.value === 'day' || scale.value === 'week'))
      return false
    const s = Date.parse(`${bar.start}T12:00:00`)
    const e = Date.parse(`${bar.end}T12:00:00`)
    if (!Number.isFinite(s)) return false
    return e >= r.start && s <= r.end
  })
})

const ticks = computed(() => {
  const r = range.value
  if (!r) return []
  return axisTicks(scale.value, r.start, r.end)
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
      caption: periodLabel.value,
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

const weekdayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function barStyle(bar: (typeof visibleBars.value)[number]) {
  const r = range.value
  if (!r) return {}
  const theme = kindThemes[bar.kind as TimelineKind]
  const left = barLeftPct(bar, r.start, r.end)
  return {
    left: `${left}%`,
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
      Calendar and Gantt for {{ schoolSetup.shortName }} — switch Day, Week,
      Month, Term, or Year. {{ schoolSetup.currentTerm }}
      {{ schoolSetup.academicYear }}.
    </p>

    <ListStatCards :stats="stats" />

    <div class="school-scale-bar">
      <div class="school-scale-tabs" role="tablist" aria-label="Timeline scale">
        <button
          v-for="opt in scaleOptions"
          :key="opt.value"
          type="button"
          role="tab"
          class="school-scale-tab"
          :aria-selected="scale === opt.value"
          :data-active="scale === opt.value ? '' : undefined"
          @click="scale = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
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
        label="Activity type"
        :options="kindOptions"
      />
    </div>

    <section class="school-section">
      <h2 class="school-section-title">Calendar · {{ periodLabel }}</h2>

      <div
        v-if="scale === 'day'"
        class="school-cal school-cal--day"
      >
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

      <div
        v-else-if="scale === 'week'"
        class="school-cal school-cal--week"
      >
        <button
          v-for="cell in days"
          :key="cell.iso"
          type="button"
          class="school-cal__cell"
          :data-today="cell.isToday ? '' : undefined"
          @click="selectDay(cell.iso); scale = 'day'"
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
          @click="selectDay(cell.iso)"
        >
          <span class="school-cal__num">{{ cell.day }}</span>
          <div class="school-cal__dots">
            <span
              v-for="bar in cell.bars.slice(0, 3)"
              :key="bar.id"
              class="school-cal__chip"
              :style="{ background: chipColor(bar.kind) }"
              :title="bar.name"
            />
            <span
              v-if="cell.bars.length > 3"
              class="text-[0.6rem] text-ink-gray-5"
              >+{{ cell.bars.length - 3 }}</span
            >
          </div>
        </button>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">
        Gantt · starts by {{ scale }} · {{ periodLabel }}
      </h2>

      <div class="school-gantt">
        <div class="school-gantt__axis">
          <div class="school-gantt__label-col" />
          <div class="school-gantt__track-col school-gantt__months">
            <span
              v-for="tick in ticks"
              :key="(tick.iso || tick.label) + tick.pct"
              class="school-gantt__month"
              :style="{ left: `${tick.pct}%` }"
            >
              <span>{{ tick.label }}</span>
              <span v-if="tick.sub" class="school-gantt__month-sub">{{
                tick.sub
              }}</span>
            </span>
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
.school-scale-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.school-scale-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  padding: 0.2rem;
  border-radius: 0.65rem;
  background: var(--surface-gray-2);
}

.school-scale-tab {
  border: 0;
  border-radius: 0.5rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-gray-6);
  background: transparent;
  cursor: pointer;
}

.school-scale-tab[data-active] {
  background: var(--surface-white);
  color: var(--ink-gray-9);
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.08);
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
  min-height: 4.5rem;
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

.school-cal__chip {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
}

.school-cal__dot-label {
  display: block;
  width: 100%;
  font-size: 0.65rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.school-cal__day-card {
  padding: 1rem;
}

.school-cal__day-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
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
  font-weight: 600;
  cursor: pointer;
}

.school-gantt {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
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
  min-height: 2.1rem;
  background: var(--surface-gray-1);
}

.school-gantt__month {
  position: absolute;
  top: 0.25rem;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink-gray-5);
  white-space: nowrap;
  line-height: 1.15;
}

.school-gantt__month-sub {
  font-size: 0.55rem;
  font-weight: 500;
  text-transform: uppercase;
  opacity: 0.85;
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

@media (max-width: 700px) {
  .school-cal--week {
    grid-template-columns: 1fr;
  }
}
</style>
