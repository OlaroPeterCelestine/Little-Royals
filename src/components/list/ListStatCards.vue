<script setup lang="ts">
import type { ListStat } from '@/composables/useListPage'

defineProps<{
  stats: ListStat[]
}>()
</script>

<template>
  <div class="school-card-grid sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="stat in stats"
      :key="stat.title"
      class="school-stat-card"
    >
      <p class="school-stat-card__title">{{ stat.title }}</p>
      <p class="school-stat-card__value">{{ stat.value }}</p>
      <p v-if="stat.caption" class="school-stat-card__caption">
        {{ stat.caption }}
      </p>
    </div>
  </div>
</template>
