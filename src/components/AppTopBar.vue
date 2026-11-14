<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Dropdown, toast } from 'frappe-ui'
import { currentUser } from '../data/activity'
import { getCurrentSystemUser } from '../data/permissions'
import { openUserMenu } from '../composables/useAppActions'
import { canAccessPath } from '../lib/accessControl'
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationBadgeLabel,
  notifications,
  unreadNotificationCount,
  type NotificationTone,
} from '../data/notifications'

const router = useRouter()

/** Two initials with a gap, e.g. "C O" from Celestine Olaro. */
const avatarInitials = computed(() => {
  const name = String(currentUser.name || '').trim()
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] || ''
    const b = parts[parts.length - 1][0] || ''
    return `${a} ${b}`.toUpperCase()
  }
  const one = parts[0] || String(currentUser.email || 'PC').split('@')[0] || 'PC'
  const letters = one.replace(/[^a-zA-Z0-9]/g, '')
  if (letters.length >= 2) return `${letters[0]} ${letters[1]}`.toUpperCase()
  if (letters.length === 1) return `${letters[0]} U`.toUpperCase()
  return 'P C'
})

const notifOpen = ref(false)
const bellEl = ref<HTMLElement | null>(null)
const notifPanelStyle = ref<Record<string, string>>({})

function placeNotifPanel() {
  const bell = bellEl.value
  if (!bell) return
  const rect = bell.getBoundingClientRect()
  const width = Math.min(22 * 16, window.innerWidth - 16)
  const right = Math.max(8, window.innerWidth - rect.right)
  const top = rect.bottom + 8
  notifPanelStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    right: `${right}px`,
    width: `${width}px`,
    maxWidth: 'calc(100vw - 1rem)',
    zIndex: '80',
  }
}

watch(notifOpen, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  placeNotifPanel()
})

const unreadCount = unreadNotificationCount
const badgeLabel = notificationBadgeLabel
const items = notifications

function go(route: string) {
  notifOpen.value = false
  router.push(route)
}

function openNotification(id: string, route: string) {
  markNotificationRead(id)
  go(route)
}

function clearAll() {
  markAllNotificationsRead()
  toast.success('Notifications cleared')
}

function toneDot(tone: NotificationTone) {
  if (tone === 'red') return 'bg-red-500'
  if (tone === 'amber') return 'bg-amber-500'
  if (tone === 'green') return 'bg-green-500'
  if (tone === 'blue') return 'bg-blue-500'
  return 'bg-gray-400'
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') notifOpen.value = false
}

function onWindowReposition() {
  if (notifOpen.value) placeNotifPanel()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onWindowReposition)
  window.addEventListener('scroll', onWindowReposition, true)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onWindowReposition)
  window.removeEventListener('scroll', onWindowReposition, true)
})

const accountItems = computed(() => {
  void currentUser.role
  const items = [
    {
      label: 'My profile',
      icon: 'lucide-user',
      onClick: () => {
        const me = getCurrentSystemUser()
        router.push(me ? `/users/${me.id}` : '/me')
      },
    },
    {
      label: 'Account actions',
      icon: 'lucide-settings',
      onClick: () => openUserMenu(router),
    },
  ]
  if (canAccessPath('/school-setup', 'read')) {
    items.push({
      label: 'School Setup',
      icon: 'lucide-building-2',
      onClick: () => router.push('/school-setup'),
    })
  }
  if (canAccessPath('/users', 'read')) {
    items.push({
      label: 'Users & Roles',
      icon: 'lucide-users',
      onClick: () => router.push('/users'),
    })
  }
  return items
})
</script>

<template>
  <header class="school-topbar school-topbar--compact">
    <div class="flex-1" aria-hidden="true" />

    <div class="flex shrink-0 items-center gap-1">
      <div class="relative">
        <button
          ref="bellEl"
          type="button"
          class="school-notif-bell relative inline-flex size-8 items-center justify-center rounded-4 text-ink-gray-7 transition hover:bg-surface-gray-2"
          :aria-label="
            unreadCount
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          "
          :aria-expanded="notifOpen"
          @click="notifOpen = !notifOpen"
        >
          <span class="lucide-bell size-4" aria-hidden="true" />
          <span
            v-if="badgeLabel"
            class="school-notif-badge absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white"
          >
            {{ badgeLabel }}
          </span>
        </button>
      </div>

      <Dropdown :options="accountItems">
        <button
          type="button"
          class="school-topbar-avatar ms-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4"
          :aria-label="`Account menu · ${currentUser.name || 'User'}`"
        >
          <span class="school-topbar-avatar-text" aria-hidden="true">{{
            avatarInitials
          }}</span>
        </button>
      </Dropdown>
    </div>

    <Teleport to="body">
      <button
        v-if="notifOpen"
        type="button"
        class="school-overlay-scrim"
        aria-label="Close notifications"
        @click="notifOpen = false"
      />
      <div
        v-if="notifOpen"
        class="school-notif-panel"
        :style="notifPanelStyle"
        role="dialog"
        aria-label="Notifications"
      >
        <div
          class="flex items-center justify-between gap-2 border-b border-outline-gray-1 px-3 py-2.5"
        >
          <div>
            <p class="text-sm-medium text-ink-gray-9">Notifications</p>
            <p class="text-xs text-ink-gray-5">
              {{
                unreadCount
                  ? `${unreadCount} unread`
                  : 'You are all caught up'
              }}
            </p>
          </div>
          <Button v-if="unreadCount" label="Clear" @click="clearAll" />
        </div>
        <ul class="max-h-80 overflow-y-auto bg-white">
          <li v-for="n in items" :key="n.id">
            <button
              type="button"
              class="flex w-full gap-3 bg-white px-3 py-3 text-left transition hover:bg-surface-gray-1"
              :class="n.read ? 'opacity-70' : ''"
              @click="openNotification(n.id, n.route)"
            >
              <span
                class="mt-1.5 size-2 shrink-0 rounded-full"
                :class="toneDot(n.tone)"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 space-y-0.5">
                <span class="block text-sm-medium text-ink-gray-9">
                  {{ n.title }}
                </span>
                <span class="block text-xs text-ink-gray-6">{{ n.body }}</span>
                <span class="block text-xs text-ink-gray-4">{{
                  n.createdAt
                }}</span>
              </span>
            </button>
          </li>
          <li
            v-if="!items.length"
            class="bg-white px-3 py-10 text-center text-sm text-ink-gray-5"
          >
            No notifications right now.
          </li>
        </ul>
      </div>
    </Teleport>
  </header>
</template>
