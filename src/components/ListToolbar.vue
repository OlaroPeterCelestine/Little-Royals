<script setup lang="ts">
defineSlots<{
  search?: () => unknown
  default?: () => unknown
}>()
</script>

<template>
  <div class="school-toolbar">
    <div class="school-toolbar-search">
      <slot name="search" />
    </div>
    <div class="school-toolbar-filters">
      <slot />
    </div>
  </div>
</template>
