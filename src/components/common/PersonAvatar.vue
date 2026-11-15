<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Avatar } from 'frappe-ui'
import {
  personPhotoUrl,
  resolvePersonPhotoSrc,
} from '@/lib/personPhoto'

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
const image = ref(
  personPhotoUrl(props.person || { name: name.value }),
)

watch(
  () => [props.person?.photo, props.person?.id, props.person?.name, name.value],
  async () => {
    image.value = await resolvePersonPhotoSrc(
      props.person?.photo,
      name.value,
      String(props.person?.id || ''),
    )
  },
  { immediate: true },
)
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
