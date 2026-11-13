<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FrappeUIProvider, DesktopShell } from 'frappe-ui'
import AppTopBar from './components/AppTopBar.vue'
import ModuleSidebar from './components/ModuleSidebar.vue'

const route = useRoute()
const isLogin = computed(() => route.name === 'login' || route.meta.public === true)
</script>

<template>
  <FrappeUIProvider>
    <RouterView v-if="isLogin" />
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
