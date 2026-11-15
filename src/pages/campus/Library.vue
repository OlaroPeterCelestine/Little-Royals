<script setup lang="ts">
import { computed } from 'vue'
import { PageHeader, PageHeaderTitle } from 'frappe-ui'
import CatalogTabDesk from '@/components/list/CatalogTabDesk.vue'
import ListStatCards from '@/components/list/ListStatCards.vue'
import { getLiveModule } from '@/data/catalog/store'

const tabs = [
  { label: 'Books', value: 'books', module: 'library-books' },
  { label: 'Issues', value: 'issues', module: 'library-issues' },
]

const books = computed(() => getLiveModule('library-books')?.rows || [])
const issues = computed(() => getLiveModule('library-issues')?.rows || [])

function statusOf(row: { status?: unknown }) {
  return String(row.status || '').toLowerCase()
}

const stats = computed(() => {
  const bookRows = books.value
  const issueRows = issues.value
  const available = bookRows.filter((r) => statusOf(r).includes('available')).length
  const onLoan = issueRows.filter(
    (r) => statusOf(r).includes('loan') || statusOf(r).includes('issued'),
  ).length
  const overdue = issueRows.filter((r) => statusOf(r).includes('overdue')).length
  const returned = issueRows.filter((r) => statusOf(r).includes('return')).length
  const copies = bookRows.reduce((sum, r) => {
    const n = Number(r.copies)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)

  return [
    {
      title: 'Titles',
      value: bookRows.length,
      caption: `${copies} copies in catalogue`,
    },
    {
      title: 'Available',
      value: available,
      caption: 'titles marked available',
    },
    {
      title: 'On loan',
      value: onLoan,
      caption: `${returned} returned`,
    },
    {
      title: 'Overdue',
      value: overdue,
      caption: 'need follow-up',
    },
  ]
})
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Library" />
  </PageHeader>
  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Books and issues in one desk — switch tabs instead of separate pages.
    </p>
    <ListStatCards :stats="stats" />
    <CatalogTabDesk :tabs="tabs" :show-stats="false" />
  </div>
</template>
