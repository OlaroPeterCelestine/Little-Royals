<script setup lang="ts">
import { brand } from '../data/brand'

withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg' | 'xl'
    rounded?: boolean
  }>(),
  {
    size: 'md',
    rounded: true,
  },
)

const sizeClass = {
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-12',
  xl: 'size-16',
} as const
</script>

<template>
  <img
    :src="brand.logoUrl"
    :alt="brand.shortName"
    :class="[
      sizeClass[size],
      'object-contain shrink-0 bg-white',
      rounded ? 'rounded-full' : 'rounded-none',
    ]"
    decoding="async"
  />
</template>
