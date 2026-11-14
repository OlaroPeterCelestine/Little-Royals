<script setup lang="ts">
import { computed } from 'vue'
import { Button } from 'frappe-ui'
import { useAppBack } from '../composables/useAppBack'

const props = withDefaults(
  defineProps<{
    fallback?: string
    label?: string
    /** Only show when navigated with ?from= (e.g. from Term overview). */
    onlyWhenFrom?: boolean
  }>(),
  {
    fallback: '/',
    onlyWhenFrom: false,
  },
)

const { goBack, backLabel, returnTo } = useAppBack(() => props.fallback)

const buttonLabel = computed(() => props.label || backLabel.value)
const visible = computed(() =>
  props.onlyWhenFrom ? Boolean(returnTo.value) : true,
)
</script>

<template>
  <Button
    v-if="visible"
    icon-left="lucide-arrow-left"
    :label="buttonLabel"
    @click="goBack"
  />
</template>
