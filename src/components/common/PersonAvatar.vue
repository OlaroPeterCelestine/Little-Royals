<script setup lang="ts">
import { computed } from 'vue'
import { Avatar } from 'frappe-ui'
import { personPhotoUrl } from '@/lib/personPhoto'

const props = withDefaults(
  defineProps<{
    person?: {
      id?: unknown
      name?: unknown
      photo?: unknown
      gender?: unknown
    } | null
    label?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  }>(),
  {
    size: 'md',
  },
)

const name = computed(
  () => props.label || String(props.person?.name || 'Learner'),
)
const image = computed(() => personPhotoUrl(props.person || { name: name.value }))
</script>

<template>
  <Avatar
    :label="name"
    :image="image"
    :size="size"
    shape="circle"
    class="school-person-avatar shrink-0"
  />
</template>
