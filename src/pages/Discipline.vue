<script setup lang="ts">
import { PageHeader, PageHeaderTitle } from 'frappe-ui'
import CatalogTabDesk from '../components/CatalogTabDesk.vue'

const tabs = [
  { label: 'Cases', value: 'cases', module: 'disciplinary-cases' },
  {
    label: 'Positive recognition',
    value: 'recognition',
    module: 'positive-recognition',
  },
  { label: 'Pupil log', value: 'log', module: 'student-log' },
]
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Discipline" />
  </PageHeader>
  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Cases, recognition, and pupil log — tabbed (was three pages).
    </p>
    <CatalogTabDesk :tabs="tabs" />
  </div>
</template>
