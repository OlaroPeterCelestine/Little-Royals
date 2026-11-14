<script setup lang="ts">
import { PageHeader, PageHeaderTitle } from 'frappe-ui'
import CatalogTabDesk from '../components/CatalogTabDesk.vue'

const tabs = [
  { label: 'Health records', value: 'records', module: 'health-records' },
  { label: 'Clinic visits', value: 'clinic', module: 'clinic-visits' },
  {
    label: 'Safeguarding',
    value: 'safeguarding',
    module: 'safeguarding-incidents',
  },
  { label: 'Visitor log', value: 'visitors', module: 'visitor-log' },
]
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Health & safety" />
  </PageHeader>
  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Health, clinic, safeguarding, and visitors — one desk with tabs.
    </p>
    <CatalogTabDesk :tabs="tabs" />
  </div>
</template>
