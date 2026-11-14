<script setup lang="ts">
defineSlots<{
  search?: () => unknown
  default?: () => unknown
  actions?: () => unknown
}>()
</script>

<template>
  <div class="school-toolbar">
    <div class="school-toolbar-search">
      <slot name="search" />
    </div>
    <div class="school-toolbar-filters">
      <slot />
      <div v-if="$slots.actions" class="school-toolbar-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
