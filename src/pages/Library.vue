<script setup lang="ts">
import { PageHeader, PageHeaderTitle } from 'frappe-ui'
import CatalogTabDesk from '../components/CatalogTabDesk.vue'

const tabs = [
  { label: 'Books', value: 'books', module: 'library-books' },
  { label: 'Issues', value: 'issues', module: 'library-issues' },
]
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Library" />
  </PageHeader>
  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Books and issues in one desk — switch tabs instead of separate pages.
    </p>
    <CatalogTabDesk :tabs="tabs" />
  </div>
</template>
