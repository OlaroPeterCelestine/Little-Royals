<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import { schoolStore } from '../data/store'
import { schoolSetup } from '../data/schoolSetup'
import { openCreateDialog } from '../composables/useModuleForms'
import { canCurrentUser } from '../data/permissions'
import type { CatalogRow } from '../data/catalog'

const router = useRouter()

/** Calendar defaults to Term III 2026 (desk sample year). */
const cursor = ref(new Date(2026, 10, 1))
const selectedKey = ref(isoDate(new Date(2026, 10, 13)))

const canCreate = computed(() => canCurrentUser('school-events', 'create'))

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIso(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  }),
)

interface CalendarItem extends CatalogRow {
  date: string
  type: string
  audience?: string
  source: 'event' | 'exam'
}

const events = computed(() => {
  const fromEvents: CalendarItem[] = (
    schoolStore['school-events']?.rows || []
  ).map((row) => ({
    ...row,
    date: String(row.date || ''),
    type: String(row.type || 'Event'),
    audience: row.audience != null ? String(row.audience) : undefined,
    source: 'event' as const,
  }))
  const fromExams: CalendarItem[] = (schoolStore.exams?.rows || [])
    .filter((row) => row.date)
    .map((row) => ({
      ...row,
      date: String(row.date),
      type: 'Exams',
      audience: String(row.course || 'Assessment'),
      source: 'exam' as const,
    }))
  return [...fromEvents, ...fromExams]
})

function typeTheme(type?: string) {
  const t = String(type || '').toLowerCase()
  if (t.includes('exam')) return 'red'
  if (t.includes('holiday')) return 'amber'
  if (t.includes('parent')) return 'violet'
  if (t.includes('activity')) return 'blue'
  if (t.includes('school')) return 'green'
  return 'gray'
}

function eventsOn(dayKey: string) {
  return events.value.filter((e) => String(e.date) === dayKey)
}

const calendarCells = computed(() => {
  const year = cursor.value.getFullYear()
  const month = cursor.value.getMonth()
  const first = new Date(year, month, 1)
  const startPad = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{
    key: string
    day: number | null
    inMonth: boolean
    isToday: boolean
    isWeekend: boolean
    items: CalendarItem[]
  }> = []

  for (let i = 0; i < startPad; i++) {
    cells.push({
      key: `pad-${i}`,
      day: null,
      inMonth: false,
      isToday: false,
      isWeekend: false,
      items: [],
    })
  }

  const todayKey = isoDate(new Date(2026, 10, 13))
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const key = isoDate(date)
    const dow = date.getDay()
    cells.push({
      key,
      day: d,
      inMonth: true,
      isToday: key === todayKey,
      isWeekend: dow === 0 || dow === 6,
      items: eventsOn(key),
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `trail-${cells.length}`,
      day: null,
      inMonth: false,
      isToday: false,
      isWeekend: false,
      items: [],
    })
  }

  return cells
})

const selectedEvents = computed(() => eventsOn(selectedKey.value))

const selectedLabel = computed(() => {
  const d = parseIso(selectedKey.value)
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const monthStats = computed(() => {
  const inMonth = events.value.filter((e) => {
    const raw = String(e.date || '')
    return (
      raw.startsWith(
        `${cursor.value.getFullYear()}-${String(cursor.value.getMonth() + 1).padStart(2, '0')}`,
      )
    )
  })
  return {
    total: inMonth.length,
    schoolDays: inMonth.filter((e) =>
      String(e.type).toLowerCase().includes('school'),
    ).length,
    activities: inMonth.filter((e) =>
      String(e.type).toLowerCase().includes('activity'),
    ).length,
    exams: inMonth.filter((e) =>
      String(e.type).toLowerCase().includes('exam'),
    ).length,
    holidays: inMonth.filter((e) =>
      String(e.type).toLowerCase().includes('holiday'),
    ).length,
  }
})

function prevMonth() {
  cursor.value = new Date(
    cursor.value.getFullYear(),
    cursor.value.getMonth() - 1,
    1,
  )
}

function nextMonth() {
  cursor.value = new Date(
    cursor.value.getFullYear(),
    cursor.value.getMonth() + 1,
    1,
  )
}

function goToday() {
  cursor.value = new Date(2026, 10, 1)
  selectedKey.value = isoDate(new Date(2026, 10, 13))
}

function selectDay(key: string, inMonth: boolean) {
  if (!inMonth) return
  selectedKey.value = key
}

function openEvent(row: CalendarItem) {
  if (row.source === 'exam') {
    router.push(`/exams/${row.id}`)
    return
  }
  router.push(`/school-events/${row.id}`)
}

function addEvent() {
  if (!canCreate.value) {
    toast.error('Your role cannot create calendar events')
    return
  }
  openCreateDialog('school-events')
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="School Calendar" />
    <div class="flex flex-wrap items-center gap-2">
      <Button label="Today" @click="goToday" />
      <Button
        icon-left="lucide-list"
        label="Event list"
        @click="router.push('/school-events/list')"
      />
      <Button
        v-if="canCreate"
        variant="solid"
        icon-left="lucide-plus"
        label="Add event"
        @click="addEvent"
      />
    </div>
  </PageHeader>

  <div class="school-page">
    <p class="text-p-base text-ink-gray-6">
      School days, activities, exams and holidays for
      {{ schoolSetup.shortName }} · {{ schoolSetup.currentTerm }}
      {{ schoolSetup.academicYear }}.
    </p>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
        <p class="text-xs text-ink-gray-5">This month</p>
        <p class="text-xl font-semibold text-ink-gray-9">
          {{ monthStats.total }}
        </p>
      </div>
      <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
        <p class="text-xs text-ink-gray-5">School days</p>
        <p class="text-xl font-semibold text-ink-gray-9">
          {{ monthStats.schoolDays }}
        </p>
      </div>
      <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
        <p class="text-xs text-ink-gray-5">Activities</p>
        <p class="text-xl font-semibold text-ink-gray-9">
          {{ monthStats.activities }}
        </p>
      </div>
      <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
        <p class="text-xs text-ink-gray-5">Exams</p>
        <p class="text-xl font-semibold text-ink-gray-9">
          {{ monthStats.exams }}
        </p>
      </div>
      <div class="rounded-6 border border-outline-gray-1 bg-surface-white p-4">
        <p class="text-xs text-ink-gray-5">Holidays</p>
        <p class="text-xl font-semibold text-ink-gray-9">
          {{ monthStats.holidays }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Button icon="lucide-chevron-left" @click="prevMonth" />
        <h2 class="min-w-[12rem] text-center text-lg-semibold text-ink-gray-9">
          {{ monthLabel }}
        </h2>
        <Button icon="lucide-chevron-right" @click="nextMonth" />
      </div>
      <div class="flex flex-wrap gap-1.5">
        <Badge label="School day" theme="green" variant="subtle" />
        <Badge label="Activity" theme="blue" variant="subtle" />
        <Badge label="Exams" theme="red" variant="subtle" />
        <Badge label="Parents" theme="violet" variant="subtle" />
        <Badge label="Holiday" theme="amber" variant="subtle" />
      </div>
    </div>

    <div class="school-calendar">
      <div class="school-calendar-weekdays">
        <div v-for="d in WEEKDAYS" :key="d" class="school-calendar-weekday">
          {{ d }}
        </div>
      </div>
      <div class="school-calendar-grid">
        <button
          v-for="cell in calendarCells"
          :key="cell.key"
          type="button"
          class="school-calendar-day"
          :class="{
            'is-muted': !cell.inMonth,
            'is-today': cell.isToday,
            'is-selected': cell.inMonth && cell.key === selectedKey,
            'is-weekend': cell.isWeekend && cell.inMonth,
          }"
          :disabled="!cell.inMonth"
          @click="selectDay(cell.key, cell.inMonth)"
        >
          <span class="school-calendar-daynum">{{ cell.day }}</span>
          <div class="school-calendar-dots">
            <span
              v-for="item in cell.items.slice(0, 3)"
              :key="item.id"
              class="school-calendar-pill"
              :data-theme="typeTheme(String(item.type))"
              :title="item.name"
            >
              {{ item.name }}
            </span>
            <span
              v-if="cell.items.length > 3"
              class="school-calendar-more"
            >
              +{{ cell.items.length - 3 }} more
            </span>
          </div>
        </button>
      </div>
    </div>

    <section class="school-section">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="school-section-title mb-0">{{ selectedLabel }}</h2>
        <Button
          v-if="canCreate"
          icon-left="lucide-plus"
          label="Add for this day"
          @click="addEvent"
        />
      </div>

      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <div
          v-for="item in selectedEvents"
          :key="item.id"
          class="flex cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
          @click="openEvent(item)"
        >
          <div class="min-w-0">
            <p class="truncate text-sm-medium text-ink-gray-9">
              {{ item.name }}
            </p>
            <p class="text-xs text-ink-gray-5">
              {{ item.type }} · {{ item.audience || '—' }}
              <span v-if="item.source === 'exam'"> · Assessment plan</span>
            </p>
          </div>
          <Badge
            :label="String(item.status || item.type || '')"
            :theme="typeTheme(String(item.type))"
            variant="subtle"
          />
        </div>
        <p
          v-if="!selectedEvents.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No school days or activities on this date.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.school-calendar {
  border: 1px solid var(--outline-gray-1);
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--surface-white);
}

.school-calendar-weekdays,
.school-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.school-calendar-weekday {
  padding: 0.65rem 0.5rem;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-gray-5);
  background: var(--surface-gray-1);
  border-bottom: 1px solid var(--outline-gray-1);
}

.school-calendar-day {
  min-height: 7.25rem;
  padding: 0.45rem;
  text-align: left;
  border: 0;
  border-right: 1px solid var(--outline-gray-1);
  border-bottom: 1px solid var(--outline-gray-1);
  background: #fff;
  cursor: pointer;
  vertical-align: top;
}

.school-calendar-day:nth-child(7n) {
  border-right: 0;
}

.school-calendar-day.is-muted {
  background: #fafafa;
  cursor: default;
}

.school-calendar-day.is-weekend:not(.is-selected) {
  background: #fcfcfd;
}

.school-calendar-day.is-today .school-calendar-daynum {
  background: var(--school-blue);
  color: #fff;
}

.school-calendar-day.is-selected {
  background: color-mix(in srgb, var(--school-blue) 10%, white);
  box-shadow: inset 0 0 0 2px var(--school-blue);
}

.school-calendar-daynum {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink-gray-8);
}

.school-calendar-dots {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.35rem;
}

.school-calendar-pill {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 0.3rem;
  padding: 0.1rem 0.35rem;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.3;
  color: #1e1b4b;
  background: #e8e9f6;
}

.school-calendar-pill[data-theme='green'] {
  background: #dcfce7;
  color: #166534;
}
.school-calendar-pill[data-theme='blue'] {
  background: #dbeafe;
  color: #1d4ed8;
}
.school-calendar-pill[data-theme='red'] {
  background: #fee2e2;
  color: #b91c1c;
}
.school-calendar-pill[data-theme='amber'] {
  background: #fef3c7;
  color: #b45309;
}
.school-calendar-pill[data-theme='violet'] {
  background: #ede9fe;
  color: #6d28d9;
}

.school-calendar-more {
  font-size: 0.65rem;
  color: var(--ink-gray-5);
  padding-inline: 0.2rem;
}

@media (max-width: 900px) {
  .school-calendar-day {
    min-height: 5.5rem;
  }
  .school-calendar-pill {
    font-size: 0.58rem;
  }
}
</style>
