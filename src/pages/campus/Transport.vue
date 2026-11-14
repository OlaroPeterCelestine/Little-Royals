<script setup lang="ts">
import { PageHeader, PageHeaderTitle } from 'frappe-ui'
import CatalogTabDesk from '@/components/list/CatalogTabDesk.vue'

const tabs = [
  { label: 'Routes', value: 'routes', module: 'transport-routes' },
  { label: 'Vehicles', value: 'vehicles', module: 'transport-vehicles' },
]
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Transport" />
  </PageHeader>
  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Routes and vehicles together — one place, tabbed.
    </p>
    <CatalogTabDesk :tabs="tabs" />
  </div>
</template>
