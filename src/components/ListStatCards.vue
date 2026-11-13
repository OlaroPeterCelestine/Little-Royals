<script setup lang="ts">
import { NumberCard } from 'frappe-ui/charts'
import type { ListStat } from '../composables/useListPage'

defineProps<{
  stats: ListStat[]
}>()
</script>

<template>
  <div class="school-card-grid sm:grid-cols-2 lg:grid-cols-4">
    <NumberCard
      v-for="stat in stats"
      :key="stat.title"
      :title="stat.title"
      :value="stat.value"
      :delta="null"
      :delta-caption="stat.caption || ''"
    />
  </div>
</template>
