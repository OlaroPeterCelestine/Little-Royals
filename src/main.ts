import { createApp } from 'vue'
import { useColorScheme } from 'frappe-ui'
import App from './App.vue'
import { router } from './router'
import { refreshAuthSession } from './data/auth'
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
app.mount('#app')

refreshAuthSession()
window.addEventListener('focus', () => refreshAuthSession())

void router.isReady().then(() => {
  schedulePrefetch()
})
