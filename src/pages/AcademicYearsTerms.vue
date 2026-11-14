<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  dialog,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import type { CatalogRow } from '../data/catalog'
import {
  TERM_NAMES,
  academicYearsSorted,
  addTermToYear,
  createAcademicYear,
  setCurrentYearAndTerm,
  suggestedTermDates,
  termsForYear,
} from '../data/academicCalendar'
import { schoolSetup } from '../data/schoolSetup'
import {
  openDeleteDialog,
  openEditDialog,
} from '../composables/useModuleForms'
import { useModuleAccess } from '../composables/useModuleAccess'
import PageIntro from '../components/PageIntro.vue'
import AppBackButton from '../components/AppBackButton.vue'

const router = useRouter()
const { canCreate: canCreateYear, canWrite: canWriteYear, canDelete: canDeleteYear } =
  useModuleAccess('academic-years')
const { canCreate: canCreateTerm, canWrite: canWriteTerm, canDelete: canDeleteTerm } =
  useModuleAccess('academic-terms')

const selectedYearId = ref('')

const years = computed(() => academicYearsSorted())

watch(
  years,
  (list) => {
    if (!list.length) {
      selectedYearId.value = ''
      return
    }
    if (!list.some((y) => y.id === selectedYearId.value)) {
      const current =
        list.find((y) => String(y.name) === schoolSetup.academicYear) ||
        list.find((y) => y.status === 'Active') ||
        list[0]
      selectedYearId.value = current.id
    }
  },
  { immediate: true },
)

const selectedYear = computed(
  () => years.value.find((y) => y.id === selectedYearId.value) || null,
)

const terms = computed(() => termsForYear(selectedYear.value))

const stats = computed(() => [
  {
    title: 'Years',
    value: years.value.length,
    caption: `Current ${schoolSetup.currentTerm} · ${schoolSetup.academicYear}`,
  },
  { title: 'Terms in year', value: terms.value.length },
  {
    title: 'Open terms',
    value: terms.value.filter((t) => t.status === 'Open').length,
  },
])

function openYear(year: CatalogRow) {
  selectedYearId.value = year.id
}

function promptNewYear() {
  if (!canCreateYear.value) {
    toast.error('Your role cannot create academic years')
    return
  }
  const nextYear = String(new Date().getFullYear() + 1)
  dialog.prompt({
    title: 'New academic year',
    message:
      'Create a year and optionally seed Term I–III with typical Uganda dates. Terms stay linked to this year.',
    icon: 'lucide-calendar-range',
    theme: 'blue',
    confirmLabel: 'Create year',
    fields: [
      {
        name: 'name',
        label: 'Year',
        type: 'text',
        required: true,
        defaultValue: nextYear,
        placeholder: '2027',
      },
      {
        name: 'startDate',
        label: 'Year start (YYYY-MM-DD)',
        type: 'text',
        required: true,
        defaultValue: `${nextYear}-01-15`,
        placeholder: '2027-01-15',
      },
      {
        name: 'endDate',
        label: 'Year end (YYYY-MM-DD)',
        type: 'text',
        required: true,
        defaultValue: `${nextYear}-12-05`,
        placeholder: '2027-12-05',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        defaultValue: 'Planned',
        options: [
          { label: 'Planned', value: 'Planned' },
          { label: 'Active', value: 'Active' },
          { label: 'Closed', value: 'Closed' },
        ],
      },
      {
        name: 'withTerms',
        label: 'Also create Term I–III',
        type: 'select',
        required: true,
        defaultValue: 'Yes',
        options: [
          { label: 'Yes — link three terms', value: 'Yes' },
          { label: 'No — year only', value: 'No' },
        ],
      },
    ],
    onConfirm: async ({ values }) => {
      try {
        const { year, terms: created } = createAcademicYear({
          name: String(values.name || ''),
          startDate: String(values.startDate || ''),
          endDate: String(values.endDate || ''),
          status: String(values.status || 'Planned'),
          withTerms: String(values.withTerms) !== 'No',
        })
        selectedYearId.value = year.id
        toast.success(
          created.length
            ? `${year.name} created with ${created.length} linked terms`
            : `${year.name} created`,
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not create year')
        throw err
      }
    },
  })
}

function promptAddTerm() {
  const year = selectedYear.value
  if (!year) {
    toast.error('Pick an academic year first')
    return
  }
  if (!canCreateTerm.value) {
    toast.error('Your role cannot create terms')
    return
  }
  const used = new Set(terms.value.map((t) => t.name))
  const available = TERM_NAMES.filter((n) => !used.has(n))
  if (!available.length) {
    toast.error('This year already has Term I–III')
    return
  }
  const suggestion =
    suggestedTermDates(String(year.name)).find((s) => s.name === available[0]) ||
    suggestedTermDates(String(year.name))[0]

  dialog.prompt({
    title: `Add term · ${year.name}`,
    message: `Terms are linked to academic year ${year.name}.`,
    icon: 'lucide-calendar-days',
    theme: 'blue',
    confirmLabel: 'Add term',
    fields: [
      {
        name: 'name',
        label: 'Term',
        type: 'select',
        required: true,
        defaultValue: available[0],
        options: available.map((n) => ({ label: n, value: n })),
      },
      {
        name: 'start',
        label: 'Start (YYYY-MM-DD)',
        type: 'text',
        required: true,
        defaultValue: suggestion.start,
        placeholder: suggestion.start,
      },
      {
        name: 'end',
        label: 'End (YYYY-MM-DD)',
        type: 'text',
        required: true,
        defaultValue: suggestion.end,
        placeholder: suggestion.end,
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        defaultValue: 'Planned',
        options: [
          { label: 'Planned', value: 'Planned' },
          { label: 'Open', value: 'Open' },
          { label: 'Closed', value: 'Closed' },
        ],
      },
    ],
    onConfirm: async ({ values }) => {
      try {
        const term = addTermToYear(year, {
          name: String(values.name || ''),
          start: String(values.start || ''),
          end: String(values.end || ''),
          status: String(values.status || 'Planned'),
        })
        toast.success(`${term.name} linked to ${year.name}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not add term')
        throw err
      }
    },
  })
}

function editYear() {
  if (!selectedYear.value || !canWriteYear.value) return
  openEditDialog('academic-years', selectedYear.value)
}

function deleteYear() {
  if (!selectedYear.value || !canDeleteYear.value) return
  openDeleteDialog('academic-years', [selectedYear.value.id])
}

function editTerm(term: CatalogRow) {
  if (!canWriteTerm.value) return
  openEditDialog('academic-terms', term)
}

function deleteTerm(term: CatalogRow) {
  if (!canDeleteTerm.value) return
  openDeleteDialog('academic-terms', [term.id])
}

function makeCurrent(term?: CatalogRow) {
  if (!selectedYear.value) return
  if (!canWriteYear.value && !canWriteTerm.value) {
    toast.error('Your role cannot set the current year / term')
    return
  }
  setCurrentYearAndTerm(selectedYear.value, term || terms.value.find((t) => t.status === 'Open') || terms.value[0] || null)
  toast.success(
    `Current desk set to ${schoolSetup.currentTerm} · ${schoolSetup.academicYear}`,
  )
}

function goOverview() {
  router.push('/term-overview')
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Years & terms" />
    <AppBackButton only-when-from fallback="/term-overview" />
    <Button
      variant="subtle"
      icon-left="lucide-calendar-days"
      label="Term overview"
      @click="goOverview"
    />
    <Button
      v-if="canCreateYear"
      variant="solid"
      icon-left="lucide-plus"
      label="New year"
      @click="promptNewYear"
    />
  </PageHeader>

  <div class="school-page space-y-6">
    <PageIntro
      description="Academic years and terms are linked — pick a year to manage its Term I–III dates, then set the current term for the whole school desk."
      :stats="stats"
    />

    <div class="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <aside class="space-y-2">
        <p class="px-1 text-xs font-semibold uppercase tracking-wide text-ink-gray-5">
          Academic years
        </p>
        <button
          v-for="year in years"
          :key="year.id"
          type="button"
          class="flex w-full items-center justify-between gap-2 rounded-5 border px-3 py-2.5 text-left transition"
          :class="
            year.id === selectedYearId
              ? 'border-outline-blue-2 bg-surface-blue-1'
              : 'border-outline-gray-1 bg-surface-white hover:bg-surface-gray-1'
          "
          @click="openYear(year)"
        >
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium text-ink-gray-9">
              {{ year.name }}
            </span>
            <span class="block truncate text-xs text-ink-gray-5">
              {{ year.startDate || '—' }} → {{ year.endDate || '—' }}
            </span>
          </span>
          <Badge
            :label="String(year.status || '—')"
            :theme="year.status === 'Active' ? 'green' : year.status === 'Planned' ? 'blue' : 'gray'"
            variant="subtle"
          />
        </button>
        <p v-if="!years.length" class="px-1 text-sm text-ink-gray-5">
          No academic years yet.
        </p>
      </aside>

      <section
        v-if="selectedYear"
        class="space-y-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-semibold text-ink-gray-9">
                {{ selectedYear.name }}
              </h2>
              <Badge
                :label="String(selectedYear.status || '—')"
                :theme="selectedYear.status === 'Active' ? 'green' : 'gray'"
                variant="subtle"
              />
              <Badge
                v-if="String(selectedYear.name) === schoolSetup.academicYear"
                label="Desk current year"
                theme="blue"
                variant="subtle"
              />
            </div>
            <p class="text-sm text-ink-gray-6">
              {{ selectedYear.startDate || '—' }} → {{ selectedYear.endDate || '—' }}
              <span class="text-ink-gray-4"> · </span>
              {{ terms.length }} linked term{{ terms.length === 1 ? '' : 's' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="canWriteYear || canWriteTerm"
              variant="subtle"
              label="Set as current"
              @click="makeCurrent()"
            />
            <Button
              v-if="canWriteYear"
              variant="ghost"
              icon="lucide-pencil"
              aria-label="Edit year"
              @click="editYear"
            />
            <Button
              v-if="canDeleteYear"
              variant="ghost"
              theme="red"
              icon="lucide-trash-2"
              aria-label="Delete year"
              @click="deleteYear"
            />
            <Button
              v-if="canCreateTerm"
              variant="solid"
              icon-left="lucide-plus"
              label="Add term"
              @click="promptAddTerm"
            />
          </div>
        </div>

        <div class="overflow-x-auto rounded-5 border border-outline-gray-1">
          <table class="w-full min-w-[36rem] text-left text-sm">
            <thead class="bg-surface-gray-1 text-ink-gray-6">
              <tr>
                <th class="px-3 py-2 font-medium">Term</th>
                <th class="px-3 py-2 font-medium">Year</th>
                <th class="px-3 py-2 font-medium">Start</th>
                <th class="px-3 py-2 font-medium">End</th>
                <th class="px-3 py-2 font-medium">Status</th>
                <th class="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="term in terms"
                :key="term.id"
                class="border-t border-outline-gray-1"
              >
                <td class="px-3 py-2.5 font-medium text-ink-gray-9">
                  {{ term.name }}
                  <Badge
                    v-if="
                      term.name === schoolSetup.currentTerm &&
                      String(selectedYear.name) === schoolSetup.academicYear
                    "
                    class="ml-2"
                    label="Current"
                    theme="green"
                    variant="subtle"
                  />
                </td>
                <td class="px-3 py-2.5 text-ink-gray-7">
                  {{ term.year || selectedYear.name }}
                </td>
                <td class="px-3 py-2.5 text-ink-gray-7">{{ term.start || '—' }}</td>
                <td class="px-3 py-2.5 text-ink-gray-7">{{ term.end || '—' }}</td>
                <td class="px-3 py-2.5">
                  <Badge
                    :label="String(term.status || '—')"
                    :theme="
                      term.status === 'Open'
                        ? 'green'
                        : term.status === 'Planned'
                          ? 'blue'
                          : 'gray'
                    "
                    variant="subtle"
                  />
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex justify-end gap-1">
                    <Button
                      v-if="canWriteTerm"
                      variant="ghost"
                      label="Use"
                      @click="makeCurrent(term)"
                    />
                    <Button
                      v-if="canWriteTerm"
                      variant="ghost"
                      icon="lucide-pencil"
                      aria-label="Edit term"
                      @click="editTerm(term)"
                    />
                    <Button
                      v-if="canDeleteTerm"
                      variant="ghost"
                      theme="red"
                      icon="lucide-trash-2"
                      aria-label="Delete term"
                      @click="deleteTerm(term)"
                    />
                  </div>
                </td>
              </tr>
              <tr v-if="!terms.length">
                <td colspan="6" class="px-3 py-8 text-center text-ink-gray-5">
                  No terms linked to this year yet.
                  <button
                    v-if="canCreateTerm"
                    type="button"
                    class="ml-1 text-ink-blue-5 underline"
                    @click="promptAddTerm"
                  >
                    Add Term I–III
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        v-else
        class="rounded-6 border border-dashed border-outline-gray-2 bg-surface-gray-1 p-10 text-center text-sm text-ink-gray-6"
      >
        Create an academic year to start linking terms.
      </section>
    </div>
  </div>
</template>
