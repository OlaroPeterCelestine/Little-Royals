<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Button,
  Sidebar,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  Tooltip,
  toast,
} from 'frappe-ui'
import { educationNav, parentNav } from '../data/workspace'
import { currentUser } from '../data/activity'
import { logout } from '../data/auth'
import { getCurrentSystemUser, isParentRole } from '../data/permissions'
import { schoolSetup } from '../data/schoolSetup'
import SchoolLogo from './SchoolLogo.vue'
import { useSidebarCollapse } from '../composables/useSidebarCollapse'
import {
  isPeopleNavActive,
  isStudentsNavActive,
} from '../lib/personRoutes'
import { filterNavByPermissions } from '../lib/accessControl'
import { prefetchRoute } from '../utils/prefetch'

const route = useRoute()
const router = useRouter()
const { collapsed, toggle: toggleSidebar } = useSidebarCollapse()

async function signOut() {
  logout()
  toast.success('Signed out')
  await router.push('/login')
}

const profileRoute = computed(() => {
  const me = getCurrentSystemUser()
  return me ? `/users/${me.id}` : '/me'
})

const isParent = computed(() => isParentRole(currentUser.role))
const navGroups = computed(() => {
  void currentUser.role
  const base = isParent.value ? parentNav : educationNav
  return filterNavByPermissions(base)
})

const sidebarToggleIcon = computed(() =>
  collapsed.value ? 'lucide-panel-left-open' : 'lucide-panel-left-close',
)

function isActive(path?: string) {
  if (!path) return false
  const base = path.split('?')[0]
  if (base === '/users') {
    return route.path === '/users' || route.path.startsWith('/users/')
  }
  if (base === '/attendance') {
    return route.path === '/attendance' || route.path.startsWith('/attendance/')
  }
  if (base === '/students') {
    return isStudentsNavActive(route.path)
  }
  if (base === '/people') {
    return isPeopleNavActive(route.path, route.query.tab, path)
  }
  if (base === '/academics') {
    return route.path === '/academics'
  }
  if (base === '/inventory') {
    return route.path === '/inventory'
  }
  // Do not treat /staff-attendance or /staff-leave as Staff 360
  if (base === '/staff') {
    return false
  }
  return route.path === base || route.path.startsWith(`${base}/`)
}
</script>

<template>
  <Sidebar
    v-model:collapsed="collapsed"
    :collapsible="true"
    width="17.5rem"
    collapsed-width="3.25rem"
    class="school-sidebar border-e border-outline-gray-1"
  >
    <div class="school-sidebar-header">
      <SidebarHeader
        :title="schoolSetup.shortName"
        :subtitle="schoolSetup.motto"
        class="min-w-0 flex-1"
      >
        <template #prefix>
          <SchoolLogo size="sm" :rounded="false" />
        </template>
      </SidebarHeader>

      <Tooltip
        :text="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        placement="right"
      >
        <Button
          class="school-sidebar-collapse-btn"
          variant="subtle"
          :icon="sidebarToggleIcon"
          :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="toggleSidebar"
        />
      </Tooltip>
    </div>

    <div class="school-sidebar-scroll">
      <div
        v-for="group in navGroups"
        :key="group.title"
        class="school-sidebar-group"
      >
        <SidebarLabel divider>{{ group.title }}</SidebarLabel>
        <div class="school-sidebar-items">
          <div
            v-for="mod in group.items"
            :key="mod.label"
            @pointerenter="prefetchRoute(mod.route)"
            @focusin="prefetchRoute(mod.route)"
          >
            <SidebarItem
              :label="mod.label"
              :icon="mod.icon"
              :route="mod.route"
              :active="isActive(mod.route)"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="school-sidebar-footer">
      <SidebarItem
        :label="currentUser.name || 'Account'"
        icon="lucide-user-round"
        :route="profileRoute"
        :active="route.path.startsWith('/users/') || route.path === '/me'"
      />
      <button
        type="button"
        class="school-sidebar-logout"
        :aria-label="collapsed ? 'Log out' : undefined"
        @click="signOut"
      >
        <span class="lucide-log-out size-4 shrink-0" aria-hidden="true" />
        <span v-if="!collapsed" class="truncate">Log out</span>
      </button>
    </div>
  </Sidebar>
</template>
