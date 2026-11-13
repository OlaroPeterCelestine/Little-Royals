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
} from 'frappe-ui'
import { educationNav, parentNav } from '../data/workspace'
import { currentUser } from '../data/activity'
import { getCurrentSystemUser, isParentRole } from '../data/permissions'
import { schoolSetup } from '../data/schoolSetup'
import SchoolLogo from './SchoolLogo.vue'
import { useSidebarCollapse } from '../composables/useSidebarCollapse'

const route = useRoute()
const router = useRouter()
const { collapsed } = useSidebarCollapse()

const profileRoute = computed(() => {
  const me = getCurrentSystemUser()
  return me ? `/users/${me.id}` : '/me'
})

const usersRolesActive = computed(
  () =>
    route.path === '/users' ||
    (route.path.startsWith('/users') && !route.params.id),
)

const isParent = computed(() => isParentRole(currentUser.role))
const navGroups = computed(() =>
  isParent.value ? parentNav : educationNav,
)

function isActive(path?: string) {
  if (!path) return false
  if (path === '/' || path === '/dashboard') {
    return route.path === '/' || route.path === '/dashboard'
  }
  if (path === '/users') {
    return route.path === '/users'
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

function openUsersRoles() {
  router.push('/users')
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

      <Tooltip v-if="!isParent" text="Users & Roles" placement="right">
        <Button
          class="school-sidebar-users-btn"
          :variant="usersRolesActive ? 'solid' : 'subtle'"
          theme="blue"
          icon="lucide-users"
          aria-label="Users & Roles"
          @click="openUsersRoles"
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
