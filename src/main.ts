import { createApp } from 'vue'
import { useColorScheme } from 'frappe-ui'
import App from './App.vue'
import { router } from './router'
import { isAuthenticated, refreshAuthSession } from './data/auth'
import { schedulePrefetch } from './utils/prefetch'
import './style.css'

// Keep Little Royals on light / white mode only.
const { setColorScheme } = useColorScheme()
setColorScheme('light')
localStorage.setItem('theme', 'light')
document.documentElement.dataset.theme = 'light'
document.documentElement.style.colorScheme = 'light'

const app = createApp(App)
app.use(router)

async function boot() {
  refreshAuthSession()
  await router.isReady()

  // Resolve auth redirects before first paint so the desk never flashes.
  if (!isAuthenticated.value && router.currentRoute.value.name !== 'login') {
    await router.replace({ name: 'login' })
  }

  app.mount('#app')
  window.addEventListener('focus', () => refreshAuthSession())
  schedulePrefetch()
}

void boot()
