<script setup lang="ts">
import ListStatCards from '@/components/list/ListStatCards.vue'
import type { ListStat } from '@/composables/useListPage'

defineProps<{
  description?: string
  stats?: ListStat[]
}>()
</script>

<template>
  <div class="school-page-intro">
    <p v-if="description" class="text-p-base text-ink-gray-6">
      {{ description }}
    </p>
    <slot />
    <ListStatCards v-if="stats?.length" :stats="stats" />
  </div>
</template>
