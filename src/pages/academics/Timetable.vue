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
  toast,
} from 'frappe-ui'
import type { CatalogRow } from '@/data/catalog/catalog'
import {
  WEEK_DAYS,
  classOptionsFromTimetable,
  dayShort,
  isBreakPeriod,
  periodsSorted,
  slotsAt,
  slotsForClass,
  subjectTheme,
  type WeekDay,
} from '@/data/school/timetableCalendar'
import { schoolSetup } from '@/data/school/schoolSetup'
import {
  openCreateDialog,
  openEditDialog,
} from '@/composables/useModuleForms'
import { useModuleAccess } from '@/composables/useModuleAccess'
import { pushWithReturn } from '@/composables/useAppBack'
import CatalogTable from '@/components/list/CatalogTable.vue'
import PageIntro from '@/components/list/PageIntro.vue'
import { buildListColumnTracks } from '@/lib/listColumns'
import { getLiveModule } from '@/data/catalog/store'
import { useListPage } from '@/composables/useListPage'

const route = useRoute()
const router = useRouter()
const { canCreate, canWrite } = useModuleAccess('timetable')
const periodsAccess = useModuleAccess('periods')

type ViewTab = 'calendar' | 'list' | 'periods'

function parseView(raw: unknown): ViewTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'list') return 'list'
  if (v === 'periods' || v === 'period') return 'periods'
  return 'calendar'
}

const view = ref<ViewTab>(parseView(route.query.view || route.query.tab))
const classFilter = ref(String(route.query.class || 'P.5 Blue'))

function syncQuery() {
  router.replace({
    path: '/timetable',
    query: {
      ...route.query,
      view: view.value,
      tab: undefined,
      class:
        view.value !== 'periods' && classFilter.value !== 'all'
          ? classFilter.value
          : undefined,
    },
  })
}

watch(view, syncQuery)
watch(classFilter, () => {
  if (view.value !== 'periods') syncQuery()
})

watch(
  () => [route.query.view, route.query.tab, route.query.class] as const,
  ([v, tab, c]) => {
    const nextView = parseView(v || tab)
    if (view.value !== nextView) view.value = nextView
    if (c) {
      const nextClass = String(c)
      if (classFilter.value !== nextClass) classFilter.value = nextClass
    }
  },
)

const classOptions = computed(() => classOptionsFromTimetable())
const periods = computed(() => periodsSorted())
const days = WEEK_DAYS

const filteredSlots = computed(() => slotsForClass(classFilter.value))

const stats = computed(() => {
  if (view.value === 'periods') {
    return [
      {
        title: 'Bell periods',
        value: periods.value.length,
        caption: 'Lessons + breaks',
      },
      {
        title: 'Teaching slots',
        value: periods.value.filter((p) => !isBreakPeriod(p)).length,
      },
      {
        title: 'Breaks',
        value: periods.value.filter((p) => isBreakPeriod(p)).length,
      },
    ]
  }
  return [
    {
      title: 'Lessons shown',
      value: filteredSlots.value.filter((s) => s.status !== 'Draft').length,
      caption: classFilter.value === 'all' ? 'All classes' : classFilter.value,
    },
    {
      title: 'Periods / day',
      value: periods.value.filter((p) => !isBreakPeriod(p)).length,
    },
    {
      title: 'Draft slots',
      value: filteredSlots.value.filter((s) => s.status === 'Draft').length,
    },
  ]
})

const mod = computed(() => getLiveModule('timetable'))
const periodsMod = computed(() => getLiveModule('periods'))
const gridColumns = computed(() =>
  buildListColumnTracks(mod.value?.columns || []),
)
const periodGridColumns = computed(() =>
  buildListColumnTracks(periodsMod.value?.columns || []),
)
const listRows = computed(() => filteredSlots.value)
const { pageRows, page, totalPages, rangeLabel, goToPage } = useListPage(
  listRows,
  { searchKeys: ['name', 'day', 'group', 'course', 'room', 'teacher'] },
)

const periodList = computed(() => periods.value)
const {
  pageRows: periodPageRows,
  page: periodPage,
  totalPages: periodTotalPages,
  rangeLabel: periodRangeLabel,
  goToPage: goPeriodPage,
} = useListPage(periodList, {
  searchKeys: ['name', 'startTime', 'endTime', 'type', 'status'],
})

const intro = computed(() =>
  view.value === 'periods'
    ? `School day bell times — lessons and breaks used by the weekly timetable (${schoolSetup.currentTerm} ${schoolSetup.academicYear}).`
    : `Weekly lesson calendar by day — filter by class for ${schoolSetup.currentTerm} ${schoolSetup.academicYear}.`,
)

const viewButtons = [
  { label: 'Calendar', value: 'calendar' },
  { label: 'Lessons', value: 'list' },
  { label: 'Periods', value: 'periods' },
]

function cellSlots(day: WeekDay, period: CatalogRow) {
  return slotsAt(day, period, classFilter.value)
}

function openSlot(slot: CatalogRow) {
  pushWithReturn(router, `/timetable/${slot.id}`)
}

function openPeriod(row: CatalogRow) {
  pushWithReturn(router, `/periods/${row.id}`)
}

function addLesson() {
  if (!canCreate.value) {
    toast.error('Your role cannot allocate timetable lessons')
    return
  }
  openCreateDialog('timetable')
}

function addPeriod() {
  if (!periodsAccess.canCreate.value) {
    toast.error('Your role cannot add periods')
    return
  }
  openCreateDialog('periods')
}

function editPeriod(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!periodsAccess.canWrite.value) {
    openPeriod(row)
    return
  }
  openEditDialog('periods', row)
}

function editLesson(row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  if (!canWrite.value) {
    openSlot(row)
    return
  }
  openEditDialog('timetable', row)
}

function primaryAction() {
  if (view.value === 'periods') addPeriod()
  else addLesson()
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Timetable" />
    <Button
      v-if="view === 'periods' ? periodsAccess.canCreate.value : canCreate"
      variant="solid"
      icon-left="lucide-plus"
      :label="view === 'periods' ? 'Add period' : 'Add lesson'"
      @click="primaryAction"
    />
  </PageHeader>

  <div class="school-page space-y-5">
    <PageIntro :description="intro" :stats="stats" />

    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap items-end gap-3">
        <FormControl
          v-if="view !== 'periods'"
          v-model="classFilter"
          class="min-w-[12rem]"
          label="Class"
          type="select"
          :options="classOptions"
        />
        <TabButtons v-model="view" :buttons="viewButtons" />
      </div>
      <div v-if="view !== 'periods'" class="flex flex-wrap gap-1.5">
        <Badge label="Lesson" theme="blue" variant="subtle" />
        <Badge label="Break / lunch" theme="gray" variant="subtle" />
        <Badge label="Draft" theme="amber" variant="subtle" />
      </div>
    </div>

    <div v-if="view === 'calendar'" class="tt-calendar">
      <div class="tt-calendar__scroll">
        <div
          class="tt-calendar__grid"
          :style="{ '--tt-days': days.length }"
        >
          <div class="tt-calendar__corner">Period</div>
          <div
            v-for="day in days"
            :key="day"
            class="tt-calendar__dayhead"
            :class="{
              'is-today':
                new Date().toLocaleDateString('en-US', { weekday: 'long' }) ===
                day,
            }"
          >
            <span class="tt-calendar__day-short">{{ dayShort(day) }}</span>
            <span class="tt-calendar__day-full">{{ day }}</span>
          </div>

          <template v-for="period in periods" :key="period.id">
            <div
              class="tt-calendar__period"
              :class="{ 'is-break': isBreakPeriod(period) }"
            >
              <span class="tt-calendar__period-name">{{ period.name }}</span>
              <span class="tt-calendar__period-time">
                {{ period.startTime }}–{{ period.endTime }}
              </span>
            </div>

            <div
              v-for="day in days"
              :key="`${period.id}-${day}`"
              class="tt-calendar__cell"
              :class="{ 'is-break': isBreakPeriod(period) }"
            >
              <template v-if="isBreakPeriod(period)">
                <span class="tt-calendar__break-label">{{ period.name }}</span>
              </template>
              <template v-else>
                <button
                  v-for="slot in cellSlots(day, period)"
                  :key="slot.id"
                  type="button"
                  class="tt-calendar__slot"
                  :data-theme="subjectTheme(String(slot.course || ''))"
                  :class="{ 'is-draft': slot.status === 'Draft' }"
                  @click="openSlot(slot)"
                >
                  <span class="tt-calendar__slot-course">{{ slot.course }}</span>
                  <span
                    v-if="classFilter === 'all'"
                    class="tt-calendar__slot-class"
                  >
                    {{ slot.group }}
                  </span>
                  <span class="tt-calendar__slot-meta">
                    <span v-if="slot.room">{{ slot.room }}</span>
                    <span v-if="slot.teacher"> · {{ slot.teacher }}</span>
                  </span>
                </button>
                <span
                  v-if="!cellSlots(day, period).length"
                  class="tt-calendar__empty"
                >
                  —
                </span>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-else-if="view === 'list'">
      <CatalogTable
        :rows="pageRows"
        :columns="mod?.columns || []"
        :grid-columns="gridColumns"
        :selectable="false"
        :can-print="false"
        :can-write="canWrite"
        :page="page"
        :total-pages="totalPages"
        :range-label="rangeLabel"
        :total="filteredSlots.length"
        @open="openSlot"
        @edit="editLesson"
        @prev="goToPage(page - 1)"
        @next="goToPage(page + 1)"
        @go="goToPage"
      />
    </div>

    <div v-else>
      <CatalogTable
        :rows="periodPageRows"
        :columns="periodsMod?.columns || []"
        :grid-columns="periodGridColumns"
        :selectable="false"
        :can-print="false"
        :can-write="periodsAccess.canWrite.value"
        :page="periodPage"
        :total-pages="periodTotalPages"
        :range-label="periodRangeLabel"
        :total="periods.length"
        empty-text="No periods yet. Add lesson and break times for the school day."
        @open="openPeriod"
        @edit="editPeriod"
        @prev="goPeriodPage(periodPage - 1)"
        @next="goPeriodPage(periodPage + 1)"
        @go="goPeriodPage"
      />
    </div>
  </div>
</template>

<style scoped>
.tt-calendar {
  border: 1px solid var(--outline-gray-1);
  border-radius: 0.75rem;
  background: var(--surface-white);
  overflow: hidden;
}

.tt-calendar__scroll {
  overflow-x: auto;
}

.tt-calendar__grid {
  display: grid;
  grid-template-columns: minmax(7.5rem, 9rem) repeat(
      var(--tt-days),
      minmax(8.5rem, 1fr)
    );
  min-width: 48rem;
}

.tt-calendar__corner,
.tt-calendar__dayhead {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--surface-gray-1);
  border-bottom: 1px solid var(--outline-gray-1);
  padding: 0.75rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-gray-6);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tt-calendar__corner {
  left: 0;
  z-index: 3;
  border-right: 1px solid var(--outline-gray-1);
}

.tt-calendar__dayhead {
  text-align: center;
  border-left: 1px solid var(--outline-gray-1);
}

.tt-calendar__dayhead.is-today {
  color: var(--school-blue-dark);
  background: var(--surface-blue-1);
}

.tt-calendar__day-short {
  display: none;
}

.tt-calendar__period {
  position: sticky;
  left: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  justify-content: center;
  padding: 0.65rem 0.75rem;
  border-top: 1px solid var(--outline-gray-1);
  border-right: 1px solid var(--outline-gray-1);
  background: var(--surface-white);
  min-height: 4.25rem;
}

.tt-calendar__period.is-break {
  background: var(--surface-gray-1);
}

.tt-calendar__period-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ink-gray-9);
}

.tt-calendar__period-time {
  font-size: 0.7rem;
  color: var(--ink-gray-5);
}

.tt-calendar__cell {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.4rem;
  border-top: 1px solid var(--outline-gray-1);
  border-left: 1px solid var(--outline-gray-1);
  min-height: 4.25rem;
  background: var(--surface-white);
}

.tt-calendar__cell.is-break {
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(
    -45deg,
    var(--surface-gray-1),
    var(--surface-gray-1) 6px,
    var(--surface-white) 6px,
    var(--surface-white) 12px
  );
}

.tt-calendar__break-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-gray-5);
}

.tt-calendar__slot {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  width: 100%;
  text-align: left;
  border-radius: 0.45rem;
  border: 1px solid transparent;
  padding: 0.4rem 0.45rem;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.tt-calendar__slot:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.06);
}

.tt-calendar__slot[data-theme='blue'] {
  background: var(--surface-blue-1);
  border-color: color-mix(in srgb, var(--school-blue) 22%, white);
}
.tt-calendar__slot[data-theme='green'] {
  background: #eef8f1;
  border-color: #c6e6d0;
}
.tt-calendar__slot[data-theme='amber'] {
  background: #fff7e8;
  border-color: #f0d7a8;
}
.tt-calendar__slot[data-theme='violet'] {
  background: #f4f0fb;
  border-color: #d9ccec;
}
.tt-calendar__slot[data-theme='red'] {
  background: var(--school-red-soft);
  border-color: #f3b4b7;
}
.tt-calendar__slot[data-theme='pink'] {
  background: #fdf0f6;
  border-color: #efc5d8;
}
.tt-calendar__slot[data-theme='gray'] {
  background: var(--surface-gray-1);
  border-color: var(--outline-gray-2);
}

.tt-calendar__slot.is-draft {
  opacity: 0.72;
  border-style: dashed;
}

.tt-calendar__slot-course {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-gray-9);
  line-height: 1.25;
}

.tt-calendar__slot-class {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--ink-gray-6);
}

.tt-calendar__slot-meta {
  font-size: 0.65rem;
  color: var(--ink-gray-5);
  line-height: 1.2;
}

.tt-calendar__empty {
  margin: auto;
  font-size: 0.75rem;
  color: var(--ink-gray-4);
}

@media (max-width: 640px) {
  .tt-calendar__day-full {
    display: none;
  }
  .tt-calendar__day-short {
    display: inline;
  }
  .tt-calendar__grid {
    grid-template-columns: minmax(5.5rem, 6.5rem) repeat(
        var(--tt-days),
        minmax(7rem, 1fr)
      );
  }
}
</style>
