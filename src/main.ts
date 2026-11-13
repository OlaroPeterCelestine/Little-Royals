import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { schedulePrefetch } from './utils/prefetch'
import './style.css'

const app = createApp(App)
app.use(router)
app.mount('#app')

void router.isReady().then(() => {
  schedulePrefetch()
})
