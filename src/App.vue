<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FrappeUIProvider, DesktopShell } from 'frappe-ui'
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
      class="school-brand-shell flex h-screen flex-col bg-surface-base text-ink-gray-8"
    >
      <AppTopBar />
      <div class="min-h-0 flex-1">
        <DesktopShell>
          <template #sidebar>
            <ModuleSidebar />
          </template>
          <RouterView v-slot="{ Component, route: r }">
            <Suspense timeout="0">
              <component :is="Component" :key="r.path" />
              <template #fallback>
                <div class="school-page-loading">Loading…</div>
              </template>
            </Suspense>
          </RouterView>
        </DesktopShell>
      </div>
    </div>
  </FrappeUIProvider>
</template>
