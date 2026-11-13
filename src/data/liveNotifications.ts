import { computed, reactive } from 'vue'
import { authToken } from './auth'
import type { NotificationTone, SchoolNotification } from './notifications'
import { onRealtime, connectRealtime, disconnectRealtime } from '../composables/useRealtime'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(
  /\/$/,
  '',
)

type APINotification = {
  id: string
  title: string
  body?: string
  route?: string
  tone?: string
  read?: boolean
  createdAt?: string
}

const live = reactive({
  items: [] as SchoolNotification[],
  connected: false,
})

function mapTone(tone?: string): NotificationTone {
  if (tone === 'amber' || tone === 'red' || tone === 'blue' || tone === 'green' || tone === 'gray') {
    return tone
  }
  return 'blue'
}

function mapItem(n: APINotification): SchoolNotification {
  return {
    id: n.id,
    title: n.title,
    body: n.body || '',
    route: n.route || '/dashboard',
    tone: mapTone(n.tone),
    createdAt: n.createdAt
      ? new Date(n.createdAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleString('en-GB'),
    read: Boolean(n.read),
  }
}

export const liveNotifications = computed(() => live.items)
export const realtimeConnected = computed(() => live.connected)

export async function fetchLiveNotifications() {
  const token = authToken()
  if (!token) {
    live.items = []
    return
  }
  try {
    const res = await fetch(`${API_BASE}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!res.ok) return
    const body = (await res.json()) as { ok?: boolean; data?: APINotification[] }
    if (body.ok && Array.isArray(body.data)) {
      live.items = body.data.map(mapItem)
    }
  } catch {
    /* API offline — keep local desk alerts */
  }
}

export async function markLiveNotificationRead(id: string) {
  const token = authToken()
  if (!token) return
  const item = live.items.find((n) => n.id === id)
  if (item) item.read = true
  try {
    await fetch(`${API_BASE}/api/v1/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    /* ignore */
  }
}

let unsub: (() => void) | null = null

export function startRealtimeNotifications() {
  connectRealtime()
  void fetchLiveNotifications()
  if (unsub) return
  unsub = onRealtime((evt) => {
    if (evt.type === 'connected') {
      live.connected = true
      return
    }
    if (evt.type === 'notification' && evt.payload && typeof evt.payload === 'object') {
      const n = mapItem(evt.payload as APINotification)
      live.items = [n, ...live.items.filter((x) => x.id !== n.id)].slice(0, 50)
    }
  })
}

export function stopRealtimeNotifications() {
  disconnectRealtime()
  live.connected = false
  if (unsub) {
    unsub()
    unsub = null
  }
}
