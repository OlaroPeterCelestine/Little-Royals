<script setup lang="ts">
import { computed } from 'vue'
import { Button } from 'frappe-ui'

const props = defineProps<{
  page: number
  totalPages: number
  rangeLabel: string
  total: number
}>()

const emit = defineEmits<{
  prev: []
  next: []
  go: [page: number]
}>()

const pages = computed(() => {
  const total = props.totalPages
  const current = props.page
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const set = new Set([1, total, current, current - 1, current + 1].filter(
    (p) => p >= 1 && p <= total,
  ))
  return [...set].sort((a, b) => a - b)
})
</script>

<template>
  <div
    class="flex flex-col gap-3 border-t border-outline-gray-1 bg-surface-gray-1/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <p class="text-xs text-ink-gray-5">
      Showing <span class="font-medium text-ink-gray-7">{{ rangeLabel }}</span>
      · 10 per page
    </p>

    <div class="flex flex-wrap items-center gap-1.5">
      <Button
        label="Previous"
        icon-left="lucide-chevron-left"
        :disabled="page <= 1 || total === 0"
        @click="emit('prev')"
      />
      <template v-for="(p, index) in pages" :key="p">
        <span
          v-if="index > 0 && p - pages[index - 1]! > 1"
          class="px-1 text-xs text-ink-gray-4"
          >…</span
        >
        <Button
          :label="String(p)"
          :variant="p === page ? 'solid' : 'subtle'"
          @click="emit('go', p)"
        />
      </template>
      <Button
        label="Next"
        icon-right="lucide-chevron-right"
        :disabled="page >= totalPages || total === 0"
        @click="emit('next')"
      />
    </div>
  </div>
</template>
