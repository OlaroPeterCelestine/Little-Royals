<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FrappeUIProvider } from 'frappe-ui'
import AppTopBar from './components/AppTopBar.vue'
import ModuleSidebar from './components/ModuleSidebar.vue'
import { isAuthenticated } from './data/auth'
import {
  startRealtimeNotifications,
  stopRealtimeNotifications,
} from './data/liveNotifications'

const route = useRoute()

/** Desk chrome only after a real signed-in session — never flash it on Login. */
const showDesk = computed(
  () =>
    isAuthenticated.value &&
    route.name !== 'login' &&
    route.meta.public !== true,
)

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
              <component :is="Component" :key="r.path" />
              <template #fallback>
                <div class="school-page-loading">Loading…</div>
              </template>
            </Suspense>
          </RouterView>
        </main>
      </div>
    </div>
  </FrappeUIProvider>
</template>
