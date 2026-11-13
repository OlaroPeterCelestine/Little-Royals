<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  dialog,
  toast,
} from 'frappe-ui'
import { schoolStore, updateRecord } from '../data/store'
import { schoolSetup } from '../data/schoolSetup'
import { canCurrentUser } from '../data/permissions'
import type { CatalogRow } from '../data/catalog'
import { openPrintWindow } from '../data/documents'
import { isNurseryClass } from '../data/grades'
import ListStatCards from '../components/ListStatCards.vue'

const router = useRouter()
const route = useRoute()
const query = ref('')
const selectedId = ref(String(route.query.id || ''))

watch(
  () => route.query.id,
  (id) => {
    if (id) selectedId.value = String(id)
  },
)

const canWrite = computed(() => canCurrentUser('report-cards', 'write'))
const canPrint = computed(() => canCurrentUser('report-cards', 'print'))

const cards = computed(() => schoolStore['report-cards']?.rows || [])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return cards.value.filter((r) => {
    if (!q) return true
    return [r.name, r.className, r.term, r.division, r.status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const selected = computed(() => {
  const byId = cards.value.find((r) => r.id === selectedId.value)
  if (byId) return byId
  return filtered.value[0] || null
})

const subjectRows = computed(() => {
  const name = selected.value?.name
  if (!name) return []
  const fromResults = (schoolStore['exam-results']?.rows || []).filter(
    (r) => r.name === name,
  )
  if (fromResults.length) {
    return fromResults.map((r) => ({
      subject: String(r.subject || r.exam || 'Subject'),
      score: Number(r.score || 0),
      grade: String(r.grade || '—'),
    }))
  }
  const avg = Number(selected.value?.average || 70)
  if (isNurseryClass(selected.value?.className)) {
    return [
      { subject: 'Literacy readiness', score: avg + 2, grade: 'Secure' },
      { subject: 'Numeracy play', score: avg - 3, grade: 'Developing' },
      { subject: 'Creative arts', score: avg + 4, grade: 'Exceeding' },
      { subject: 'Social skills', score: avg, grade: 'Secure' },
    ]
  }
  return [
    { subject: 'English', score: avg + 2, grade: 'C3' },
    { subject: 'Mathematics', score: avg - 4, grade: 'C4' },
    { subject: 'Science', score: avg + 1, grade: 'C3' },
    { subject: 'Social Studies', score: avg - 1, grade: 'C4' },
  ]
})

const selectedIsNursery = computed(() =>
  isNurseryClass(selected.value?.className),
)

const stats = computed(() => [
  { title: 'Report cards', value: cards.value.length },
  {
    title: 'Published',
    value: cards.value.filter((r) => r.status === 'Published').length,
  },
  {
    title: 'Draft',
    value: cards.value.filter((r) => r.status === 'Draft').length,
  },
  {
    title: 'Div 1 / Secure',
    value: cards.value.filter((r) =>
      ['Div 1', 'Secure', 'Exceeding'].includes(String(r.division)),
    ).length,
  },
])

function publish(row: CatalogRow) {
  if (!canWrite.value) {
    toast.error('Your role cannot publish report cards')
    return
  }
  dialog.confirm({
    title: 'Publish report card?',
    message: `Publish Term report for ${row.name}? Parents will see it on the portal.`,
    icon: 'lucide-megaphone',
    theme: 'blue',
    confirmLabel: 'Publish',
    onConfirm: async () => {
      updateRecord('report-cards', row.id, {
        name: row.name,
        status: 'Published',
      })
      toast.success('Report card published')
    },
  })
}

function printCard() {
  if (!selected.value) return
  if (!canPrint.value) {
    toast.error('Your role cannot print')
    return
  }
  const row = selected.value
  const subjects = subjectRows.value
    .map(
      (s) =>
        `<tr><td>${s.subject}</td><td style="text-align:center">${s.score}</td><td style="text-align:center">${s.grade}</td></tr>`,
    )
    .join('')
  const html = `<!DOCTYPE html><html><head><title>Report Card · ${row.name}</title>
<style>
  body{font-family:Georgia,serif;max-width:720px;margin:24px auto;color:#111;padding:0 16px}
  h1{font-size:20px;margin:0} h2{font-size:16px;margin:8px 0 0;font-weight:normal;color:#444}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:13px}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th,td{border:1px solid #ccc;padding:8px;font-size:13px}
  th{background:#f5f5f5;text-align:left}
  .footer{margin-top:28px;font-size:12px;color:#555}
  .brand{border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:16px}
  .motto{font-style:italic;color:#666;font-size:12px}
</style></head><body>
<div class="brand">
  <h1>${schoolSetup.name}</h1>
  <p class="motto">${schoolSetup.motto} · UNEB Centre ${schoolSetup.unebCentre || '—'}</p>
  <h2>End of Term Report Card · ${row.term}</h2>
</div>
<div class="meta">
  <div><strong>Learner:</strong> ${row.name}</div>
  <div><strong>Class:</strong> ${row.className}</div>
  <div><strong>Average:</strong> ${row.average}%</div>
  <div><strong>${isNurseryClass(row.className) ? 'Readiness' : 'Division'}:</strong> ${row.division}${row.aggregate != null && !isNurseryClass(row.className) ? ` · Agg ${row.aggregate}` : ''}</div>
  <div><strong>Position:</strong> ${row.position || '—'}</div>
  <div><strong>Status:</strong> ${row.status}</div>
</div>
<table>
  <thead><tr><th>Subject</th><th>Score %</th><th>${isNurseryClass(row.className) ? 'Band' : 'Aggregate'}</th></tr></thead>
  <tbody>${subjects}</tbody>
</table>
<p><strong>Class teacher:</strong> ${row.teacherComment || '—'}</p>
<p><strong>Head teacher:</strong> ${row.headComment || '—'}</p>
<div class="footer">
  <p>${schoolSetup.addressLine1}, ${schoolSetup.city} · ${schoolSetup.phone}</p>
  <p>Generated ${new Date().toLocaleDateString()} · ${isNurseryClass(row.className) ? 'NCDC nursery descriptors' : 'NCDC / UNEB PLE primary'} desk template</p>
</div>
</body></html>`
  openPrintWindow(`Report Card · ${row.name}`, html)
  toast.success('Print dialog opened')
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Report Cards" />
    <div class="flex flex-wrap gap-2">
      <Button
        icon-left="lucide-table-2"
        label="Gradebook"
        @click="router.push('/gradebook')"
      />
      <Button
        v-if="selected && canPrint"
        variant="solid"
        icon-left="lucide-printer"
        label="Print UNEB card"
        @click="printCard"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-5xl">
    <p class="text-p-base text-ink-gray-6">
      UNEB / NCDC style term reports for {{ schoolSetup.shortName }} —
      publish to the parent portal and print branded cards.
    </p>

    <ListStatCards :stats="stats" />

    <FormControl
      v-model="query"
      class="max-w-md"
      label="Search"
      placeholder="Search learner, class, term…"
    />

    <div class="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section class="school-section">
        <h2 class="school-section-title">Cards</h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <button
            v-for="row in filtered"
            :key="row.id"
            type="button"
            class="flex w-full flex-wrap items-start justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 text-left last:border-b-0 hover:bg-surface-gray-1"
            :class="
              selected?.id === row.id ? 'bg-surface-blue-1' : 'bg-surface-white'
            "
            @click="selectedId = row.id"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ row.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ row.className }} · {{ row.term }}
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
              <Badge
                :label="`Div ${row.division}`"
                theme="blue"
                variant="subtle"
              />
              <Badge
                :label="String(row.status)"
                :theme="row.status === 'Published' ? 'green' : 'amber'"
                variant="subtle"
              />
            </div>
          </button>
        </div>
      </section>

      <section v-if="selected" class="school-section">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Preview · {{ selected.name }}</h2>
          <Button
            v-if="canWrite && selected.status === 'Draft'"
            variant="solid"
            label="Publish"
            @click="publish(selected)"
          />
        </div>
        <div
          class="space-y-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
        >
          <div>
            <p class="text-base font-semibold text-ink-gray-9">
              {{ schoolSetup.name }}
            </p>
            <p class="text-xs italic text-ink-gray-5">
              {{ schoolSetup.motto }} · Centre {{ schoolSetup.unebCentre }}
            </p>
            <p class="mt-2 text-sm text-ink-gray-7">{{ selected.term }}</p>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <p><span class="text-ink-gray-5">Class:</span> {{ selected.className }}</p>
            <p><span class="text-ink-gray-5">Average:</span> {{ selected.average }}%</p>
            <p>
              <span class="text-ink-gray-5">
                {{ selectedIsNursery ? 'Readiness:' : 'Division:' }}
              </span>
              {{ selected.division
              }}{{
                !selectedIsNursery && selected.aggregate != null
                  ? ` · Agg ${selected.aggregate}`
                  : ''
              }}
            </p>
            <p><span class="text-ink-gray-5">Position:</span> {{ selected.position }}</p>
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-outline-gray-2 text-left text-ink-gray-5">
                <th class="py-2">Subject</th>
                <th class="py-2">Score</th>
                <th class="py-2">{{ selectedIsNursery ? 'Band' : 'Agg' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in subjectRows"
                :key="s.subject"
                class="border-b border-outline-gray-1"
              >
                <td class="py-2">{{ s.subject }}</td>
                <td class="py-2">{{ s.score }}</td>
                <td class="py-2">{{ s.grade }}</td>
              </tr>
            </tbody>
          </table>
          <div class="space-y-2 text-sm text-ink-gray-7">
            <p>
              <strong class="text-ink-gray-8">Teacher:</strong>
              {{ selected.teacherComment }}
            </p>
            <p>
              <strong class="text-ink-gray-8">Head:</strong>
              {{ selected.headComment }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
