<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Button,
  Sidebar,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  Tooltip,
} from 'frappe-ui'
import { educationNav, parentNav } from '../data/workspace'
import { currentUser } from '../data/activity'
import { getCurrentSystemUser, isParentRole } from '../data/permissions'
import { schoolSetup } from '../data/schoolSetup'
import SchoolLogo from './SchoolLogo.vue'
import { useSidebarCollapse } from '../composables/useSidebarCollapse'

const route = useRoute()
const { collapsed, toggle: toggleSidebar } = useSidebarCollapse()

const profileRoute = computed(() => {
  const me = getCurrentSystemUser()
  return me ? `/users/${me.id}` : '/me'
})

const isParent = computed(() => isParentRole(currentUser.role))
const navGroups = computed(() =>
  isParent.value ? parentNav : educationNav,
)

const sidebarToggleIcon = computed(() =>
  collapsed.value ? 'lucide-panel-left-open' : 'lucide-panel-left-close',
)

function isActive(path?: string) {
  if (!path) return false
  const base = path.split('?')[0]
  if (base === '/users') {
    return route.path === '/users' || route.path.startsWith('/users/')
  }
  if (base === '/attendance/take') {
    return route.path === '/attendance/take'
  }
  if (base === '/people') {
    return route.path === '/people' || route.path.startsWith('/teachers/')
  }
  if (base === '/academics') {
    return route.path === '/academics'
  }
  if (base === '/inventory') {
    return route.path === '/inventory'
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
          <SchoolLogo size="md" :rounded="false" />
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
          <SidebarItem
            v-for="mod in group.items"
            :key="mod.label"
            :label="mod.label"
            :icon="mod.icon"
            :route="mod.route"
            :active="isActive(mod.route)"
          />
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
    </div>
  </Sidebar>
</template>
