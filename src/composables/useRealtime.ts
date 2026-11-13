import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { authToken } from '../data/auth'

export type RealtimeEvent = {
  type: string
  payload: unknown
  at: string
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(
  /\/$/,
  '',
)
const WS_BASE = (
  import.meta.env.VITE_WS_URL ||
  API_BASE.replace(/^http/, 'ws')
).replace(/\/$/, '')

function wsURL(token: string) {
  return `${WS_BASE}/api/v1/ws?token=${encodeURIComponent(token)}`
}

const connected = ref(false)
const lastEvent = shallowRef<RealtimeEvent | null>(null)
const listeners = new Set<(evt: RealtimeEvent) => void>()

let socket: WebSocket | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retries = 0

function emit(evt: RealtimeEvent) {
  lastEvent.value = evt
  listeners.forEach((fn) => fn(evt))
}

export function onRealtime(fn: (evt: RealtimeEvent) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function connectRealtime() {
  const token = authToken()
  if (!token) return
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return
  }

  try {
    socket = new WebSocket(wsURL(token))
  } catch {
    scheduleReconnect()
    return
  }

  socket.onopen = () => {
    connected.value = true
    retries = 0
  }

  socket.onmessage = (msg) => {
    try {
      const data = JSON.parse(String(msg.data)) as RealtimeEvent
      emit(data)
    } catch {
      /* ignore bad frames */
    }
  }

  socket.onclose = () => {
    connected.value = false
    socket = null
    scheduleReconnect()
  }

  socket.onerror = () => {
    socket?.close()
  }
}

function scheduleReconnect() {
  if (retryTimer) return
  const delay = Math.min(1000 * 2 ** retries, 15000)
  retries += 1
  retryTimer = setTimeout(() => {
    retryTimer = null
    if (authToken()) connectRealtime()
  }, delay)
}

export function disconnectRealtime() {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  socket?.close()
  socket = null
  connected.value = false
}

/** Use in app shell to keep a single shared WebSocket alive. */
export function useRealtime() {
  onMounted(() => connectRealtime())
  onUnmounted(() => {
    /* keep connection app-wide; App.vue owns lifecycle */
  })
  return { connected, lastEvent, connectRealtime, disconnectRealtime, onRealtime }
}
