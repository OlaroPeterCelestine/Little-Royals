<script setup lang="ts">
import { PageHeader, PageHeaderTitle } from 'frappe-ui'
import CatalogTabDesk from '@/components/list/CatalogTabDesk.vue'

const tabs = [
  { label: 'Menus', value: 'menus', module: 'meals-menus' },
  { label: 'Meal attendance', value: 'attendance', module: 'meal-attendance' },
  {
    label: 'Dietary',
    value: 'dietary',
    module: 'dietary-requirements',
  },
]
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Meals" />
  </PageHeader>
  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Menus, meal attendance, and dietary needs — tabbed (was three pages).
    </p>
    <CatalogTabDesk :tabs="tabs" />
  </div>
</template>
