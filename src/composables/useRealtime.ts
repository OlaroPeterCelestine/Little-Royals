import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { authToken } from '@/data/auth/auth'
import { isApiEnabled, wsBaseUrl } from '@/lib/apiMode'

export type RealtimeEvent = {
  type: string
  payload: unknown
  at: string
}

const WS_BASE = wsBaseUrl()

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
  if (!isApiEnabled() || !WS_BASE) return
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

/** Send a realtime frame (WebRTC signaling, collab). No-op if socket is down. */
export function sendRealtime(type: string, payload: unknown) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false
  socket.send(JSON.stringify({ type, payload }))
  return true
}

/** Use in app shell to keep a single shared WebSocket alive. */
export function useRealtime() {
  onMounted(() => connectRealtime())
  onUnmounted(() => {
    /* keep connection app-wide; App.vue owns lifecycle */
  })
  return { connected, lastEvent, connectRealtime, disconnectRealtime, onRealtime }
}
