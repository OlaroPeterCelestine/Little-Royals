import { createApp } from 'vue'
import { useColorScheme } from 'frappe-ui'
import App from '@/app/App.vue'
import { router } from '@/app/router'
import { isAuthenticated, refreshAuthSession } from '@/data/auth/auth'
import {
  ensureModule,
  hydrateCatalogFromApi,
  moduleFromPath,
} from '@/data/catalog/catalogSync'
import {
  hydrateSchoolFromApi,
  hydrateSchoolPublic,
} from '@/data/school/schoolSetup'
import { hydrateRolesFromApi } from '@/data/auth/permissions'
import { isApiEnabled } from '@/lib/apiMode'
import { installNavProgress } from '@/lib/navProgress'
import { schedulePrefetch } from '@/lib/prefetch'
import '@/app/styles/main.css'

// Keep Little Royals on light / white mode only.
const { setColorScheme } = useColorScheme()
setColorScheme('light')
localStorage.setItem('theme', 'light')
document.documentElement.dataset.theme = 'light'
document.documentElement.style.colorScheme = 'light'

const app = createApp(App)
app.use(router)
installNavProgress(router)

async function boot() {
  refreshAuthSession()
  await router.isReady()

  // Resolve auth redirects before first paint so the desk never flashes.
  if (!isAuthenticated.value && router.currentRoute.value.name !== 'login') {
    await router.replace({ name: 'login' })
  }

  app.mount('#app')
  window.addEventListener('focus', () => {
    refreshAuthSession()
    // Quiet revalidate of the open desk module only (Gmail-style).
    if (isApiEnabled() && isAuthenticated.value) {
      const mod = moduleFromPath(router.currentRoute.value.path)
      if (mod) void ensureModule(mod)
    }
  })
  schedulePrefetch()

  if (isApiEnabled()) {
    // Branding + catalog come from the Go API — not frontend seed data.
    if (isAuthenticated.value) {
      void hydrateSchoolFromApi().then(() => {
        const first = moduleFromPath(router.currentRoute.value.path)
        void Promise.all([
          hydrateRolesFromApi(),
          hydrateCatalogFromApi(first ? [first] : []),
        ])
      })
    } else {
      void hydrateSchoolPublic()
    }
  }
}

void boot()
