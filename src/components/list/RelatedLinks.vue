<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from 'frappe-ui'
import {
  relatedLinksFor,
  type DeskLink,
} from '@/data/school/deskLinks'

const props = defineProps<{
  /** Override auto links from the current route */
  links?: DeskLink[]
  label?: string
}>()

const route = useRoute()
const router = useRouter()

const links = computed(
  () => props.links || relatedLinksFor(route.fullPath),
)

function go(to: string) {
  const [path, qs] = to.split('?')
  if (!qs) {
    router.push(path)
    return
  }
  const query: Record<string, string> = {}
  new URLSearchParams(qs).forEach((v, k) => {
    query[k] = v
  })
  router.push({ path, query })
}
</script>

<template>
  <div
    v-if="links.length"
    class="related-links mb-3 flex flex-wrap items-center gap-2"
  >
    <span class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
      {{ label || 'Related' }}
    </span>
    <Button
      v-for="link in links"
      :key="link.route"
      size="sm"
      variant="ghost"
      :label="link.label"
      @click="go(link.route)"
    />
  </div>
</template>
