<script setup lang="ts">
import { computed } from 'vue'
import type { PermFlag } from '../data/permissions'
import { canAccessModule, canAccessPath } from '../lib/accessControl'
import { currentUser } from '../data/activity'

const props = withDefaults(
  defineProps<{
    /** Catalog module key(s), or a path when `path` is set. */
    module?: string | string[]
    path?: string
    flag?: PermFlag
  }>(),
  {
    flag: 'read',
  },
)

const allowed = computed(() => {
  void currentUser.role
  if (props.path) return canAccessPath(props.path, props.flag)
  if (props.module) return canAccessModule(props.module, props.flag)
  return false
})
</script>

<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>
