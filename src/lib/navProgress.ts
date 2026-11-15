import { ref } from 'vue'
import type { Router } from 'vue-router'

/** Gmail-style thin top progress during soft navigation. */
export const navProgress = ref(0)
export const navBusy = ref(false)

let hideTimer: ReturnType<typeof setTimeout> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null

function clearTimers() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

export function startNavProgress() {
  clearTimers()
  navBusy.value = true
  navProgress.value = 0.12
  tickTimer = setInterval(() => {
    if (navProgress.value >= 0.88) return
    navProgress.value += Math.max(0.015, (0.9 - navProgress.value) * 0.08)
  }, 120)
}

export function finishNavProgress() {
  clearTimers()
  navProgress.value = 1
  hideTimer = setTimeout(() => {
    navBusy.value = false
    navProgress.value = 0
  }, 90)
}

/** Wire once after router is created. */
export function installNavProgress(router: Router) {
  router.beforeEach((to, from) => {
    if (to.fullPath === from.fullPath) return
    startNavProgress()
  })
  router.afterEach(() => {
    finishNavProgress()
  })
  router.onError(() => {
    finishNavProgress()
  })
}
