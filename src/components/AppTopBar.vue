<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Avatar,
  Button,
  Dropdown,
  TextInput,
  toast,
} from 'frappe-ui'
import { HelpIcon } from 'frappe-ui/icons'
import { commandItems } from '../data/workspace'
import { currentUser } from '../data/activity'
import { getCurrentSystemUser } from '../data/permissions'
import {
  openDocumentation,
  openKeyboardShortcuts,
  openUserMenu,
} from '../composables/useAppActions'
import { useSidebarCollapse } from '../composables/useSidebarCollapse'
import { logout } from '../data/auth'
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationBadgeLabel,
  notifications,
  unreadNotificationCount,
  type NotificationTone,
} from '../data/notifications'
import SchoolLogo from './SchoolLogo.vue'

const router = useRouter()
const { collapsed, toggle: toggleSidebar } = useSidebarCollapse()
const avatarLabel = computed(() => currentUser.name || 'PC')
const sidebarToggleIcon = computed(() =>
  collapsed.value ? 'lucide-panel-left-open' : 'lucide-panel-left-close',
)

const query = ref('')
const open = ref(false)
const notifOpen = ref(false)
const inputEl = ref<{ focus?: () => void } | null>(null)
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

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return commandItems.slice(0, 8)
  return commandItems
    .filter((item) => item.label.toLowerCase().includes(q))
    .slice(0, 10)
})

const unreadCount = unreadNotificationCount
const badgeLabel = notificationBadgeLabel
const items = notifications

function go(route: string) {
  open.value = false
  notifOpen.value = false
  query.value = ''
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
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
    e.preventDefault()
    open.value = true
    notifOpen.value = false
    queueMicrotask(() => inputEl.value?.focus?.())
  }
  if (e.key === 'Escape') {
    open.value = false
    notifOpen.value = false
  }
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

const helpItems = computed(() => [
  {
    label: 'Documentation',
    icon: 'lucide-book-open',
    onClick: () => openDocumentation(),
  },
  {
    label: 'Keyboard shortcuts',
    icon: 'lucide-keyboard',
    onClick: () => openKeyboardShortcuts(),
  },
])

const accountItems = computed(() => [
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
  {
    label: 'School Setup',
    icon: 'lucide-building-2',
    onClick: () => router.push('/school-setup'),
  },
  {
    label: 'Users & Roles',
    icon: 'lucide-users',
    onClick: () => router.push('/users'),
  },
  {
    label: 'Log out',
    icon: 'lucide-log-out',
    onClick: () => signOut(),
  },
])

async function signOut() {
  logout()
  toast.success('Signed out')
  await router.push('/login')
}
</script>

<template>
  <header class="school-topbar">
    <RouterLink
      to="/"
      class="school-brand-mark flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full"
      aria-label="Dashboard home"
    >
      <SchoolLogo size="sm" class="!size-8" />
    </RouterLink>

    <div class="relative mx-auto w-full max-w-xl">
      <button
        type="button"
        class="flex h-9 w-full items-center gap-2.5 rounded-5 border border-outline-gray-2 bg-surface-gray-1 px-3.5 text-left text-sm text-ink-gray-5 transition hover:border-outline-gray-3 hover:bg-surface-white"
        @click="open = true"
      >
        <span class="lucide-search size-3.5 shrink-0" aria-hidden="true" />
        <span class="flex-1 truncate">Search or type a command</span>
        <kbd
          class="hidden rounded-3 border border-outline-gray-2 bg-surface-white px-1.5 py-0.5 text-xs text-ink-gray-5 sm:inline"
          >⌘G</kbd
        >
      </button>

      <div
        v-if="open"
        class="absolute inset-x-0 top-0 z-50 overflow-hidden rounded-6 border border-outline-gray-2 bg-white shadow-xl"
      >
        <div class="border-b border-outline-gray-1 bg-white p-2">
          <TextInput
            ref="inputEl"
            v-model="query"
            placeholder="Search students, fees, programs…"
          >
            <template #prefix>
              <span class="lucide-search size-4 text-ink-gray-5" />
            </template>
          </TextInput>
        </div>
        <ul class="max-h-72 overflow-y-auto bg-white p-1">
          <li v-for="item in results" :key="item.route + item.label">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-4 px-3 py-2 text-left hover:bg-surface-gray-1"
              @click="go(item.route)"
            >
              <span class="text-sm text-ink-gray-9">{{ item.label }}</span>
              <span class="text-xs text-ink-gray-5">{{ item.group }}</span>
            </button>
          </li>
          <li
            v-if="results.length === 0"
            class="px-3 py-6 text-center text-sm text-ink-gray-5"
          >
            No matches
          </li>
        </ul>
      </div>
      <button
        v-if="open"
        type="button"
        class="fixed inset-0 z-40 cursor-default bg-ink-gray-9/20"
        aria-label="Close search"
        @click="open = false"
      />
    </div>

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

      <Dropdown :options="helpItems">
        <Button>
          <template #default>
            <span class="flex items-center gap-1.5 px-1">
              <HelpIcon class="size-4" />
              <span class="hidden text-sm sm:inline">Help</span>
              <span class="lucide-chevron-down size-3.5 text-ink-gray-5" />
            </span>
          </template>
        </Button>
      </Dropdown>
      <Dropdown :options="accountItems">
        <button
          type="button"
          class="ms-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4"
          aria-label="Account menu"
        >
          <Avatar :label="avatarLabel" size="md" />
        </button>
      </Dropdown>
      <Button
        class="ms-1"
        variant="subtle"
        theme="red"
        aria-label="Log out"
        @click="signOut"
      >
        <template #default>
          <span class="flex items-center gap-1.5 px-1">
            <span class="lucide-log-out size-4" aria-hidden="true" />
            <span class="hidden text-sm sm:inline">Log out</span>
          </span>
        </template>
      </Button>
      <Button
        class="ms-0.5"
        :icon="sidebarToggleIcon"
        :tooltip="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleSidebar"
      />
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
