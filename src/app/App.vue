<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FrappeUIProvider } from 'frappe-ui'
import AppTopBar from '@/components/layout/AppTopBar.vue'
import ModuleSidebar from '@/components/layout/ModuleSidebar.vue'
import PageShimmer from '@/components/layout/PageShimmer.vue'
import RecordFormModal from '@/components/common/RecordFormModal.vue'
import { isAuthenticated } from '@/data/auth/auth'
import {
  startRealtimeNotifications,
  stopRealtimeNotifications,
} from '@/data/activity/liveNotifications'

const route = useRoute()

/** Desk chrome only after a real signed-in session — never flash it on Login. */
const showDesk = computed(
  () =>
    isAuthenticated.value &&
    route.name !== 'login' &&
    route.meta.public !== true,
)

/** Keep list shells warm; remount each detail id for fresh data. */
function viewKey(r: {
  name?: string | symbol | null
  fullPath: string
  params: Record<string, unknown>
}) {
  if (r.params && (r.params.id || r.params.kind)) return r.fullPath
  return String(r.name || r.fullPath)
}

watch(
  showDesk,
  (on) => {
    if (on) startRealtimeNotifications()
    else stopRealtimeNotifications()
  },
  { immediate: true },
)
</script>

<template>
  <FrappeUIProvider>
    <RouterView v-if="!showDesk" />
    <div
      v-else
      class="school-brand-shell flex h-dvh max-h-dvh min-w-0 w-full max-w-full flex-row overflow-hidden bg-surface-base text-ink-gray-8"
    >
      <ModuleSidebar />
      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopBar />
        <main
          data-slot="desktop-shell-content"
          class="school-main-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
        >
          <RouterView v-slot="{ Component, route: r }">
            <Suspense timeout="0">
              <KeepAlive :max="12">
                <component
                  :is="Component"
                  :key="viewKey(r)"
                  class="school-page-enter"
                />
              </KeepAlive>
              <template #fallback>
                <PageShimmer />
              </template>
            </Suspense>
          </RouterView>
        </main>
      </div>
    </div>
    <RecordFormModal />
  </FrappeUIProvider>
</template>
