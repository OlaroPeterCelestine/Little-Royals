<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Avatar,
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  dialog,
  toast,
} from 'frappe-ui'
import {
  activityLog,
  currentUser,
  formatActivityTime,
  logActivity,
  actionTheme,
} from '../data/activity'
import {
  getCurrentSystemUser,
  getRolePerms,
  getUserById,
  permissionFlags,
  permFlagLabels,
  roles,
  systemUsers,
  type SystemUser,
} from '../data/permissions'

const route = useRoute()
const router = useRouter()

const editing = ref(false)
const saving = ref(false)
const form = reactive({
  name: '',
  email: '',
  title: '',
  phone: '',
  department: '',
  location: '',
  bio: '',
  role: '',
  status: 'Active' as SystemUser['status'],
})

const userId = computed(() => {
  if (route.name === 'me' || route.path === '/me') {
    return getCurrentSystemUser()?.id || 'USR-01'
  }
  return String(route.params.id || '')
})

const user = computed(() => getUserById(userId.value))

const isSelf = computed(
  () => Boolean(user.value && user.value.email === currentUser.email),
)

const roleDef = computed(
  () => roles.find((r) => r.name === user.value?.role) || null,
)

const roleOptions = computed(() =>
  roles.map((r) => ({ label: r.name, value: r.name })),
)

const statusOptions = [
  { label: 'Active', value: 'Active' },
  { label: 'Invited', value: 'Invited' },
  { label: 'Disabled', value: 'Disabled' },
]

const recentActivity = computed(() => {
  if (!user.value) return []
  return activityLog.entries
    .filter((e) => e.user === user.value!.name)
    .slice(0, 8)
})

const permissionSummary = computed(() => {
  if (!user.value) return []
  const docs = [
    'students',
    'teachers',
    'attendance',
    'fees',
    'applicants',
    'exams',
  ]
  return docs.map((key) => {
    const row = getRolePerms(user.value!.role, key)
    const enabled = permissionFlags.filter((f) => row?.perms[f]).length
    return {
      key,
      label: row?.doctypeLabel || key,
      enabled,
      total: permissionFlags.length,
      flags: permissionFlags
        .filter((f) => row?.perms[f])
        .map((f) => permFlagLabels[f]),
    }
  })
})

function syncForm() {
  const u = user.value
  if (!u) return
  form.name = u.name
  form.email = u.email
  form.title = u.title || ''
  form.phone = u.phone || ''
  form.department = u.department || ''
  form.location = u.location || ''
  form.bio = u.bio || ''
  form.role = u.role
  form.status = u.status
}

watch(user, syncForm, { immediate: true })

function goBack() {
  router.push('/users')
}

function startEdit() {
  syncForm()
  editing.value = true
}

function cancelEdit() {
  syncForm()
  editing.value = false
}

async function saveProfile() {
  const u = user.value
  if (!u) return
  const name = form.name.trim()
  if (!name) {
    toast.error('Name is required')
    return
  }
  if (!form.email.trim().includes('@')) {
    toast.error('Enter a valid email')
    return
  }
  saving.value = true
  try {
    u.name = name
    u.email = form.email.trim().toLowerCase()
    u.title = form.title.trim() || undefined
    u.phone = form.phone.trim() || undefined
    u.department = form.department.trim() || undefined
    u.location = form.location.trim() || undefined
    u.bio = form.bio.trim() || undefined
    u.role = form.role
    u.status = form.status
    if (isSelf.value) {
      currentUser.name = u.name
      currentUser.email = u.email
      currentUser.role = u.role
    }
    logActivity({
      action: 'Updated',
      module: 'users',
      moduleLabel: 'User',
      recordId: u.id,
      recordName: u.name,
      summary: `Updated profile ${u.name}`,
      detail: `${u.role} · ${u.status}`,
      severity: 'info',
    })
    editing.value = false
    toast.success('Profile updated')
  } finally {
    saving.value = false
  }
}

function disableUser() {
  const u = user.value
  if (!u) return
  if (isSelf.value) {
    toast.error('You cannot disable your own account')
    return
  }
  dialog.danger({
    title: `Disable ${u.name}?`,
    message: `They will lose desk access until re-enabled. Role “${u.role}” is kept.`,
    confirmLabel: 'Yes, disable',
    cancelLabel: 'Keep active',
    onConfirm: async () => {
      u.status = 'Disabled'
      logActivity({
        action: 'Updated',
        module: 'users',
        moduleLabel: 'User',
        recordId: u.id,
        recordName: u.name,
        summary: `Disabled user ${u.name}`,
        severity: 'warning',
      })
      toast.warning(`${u.name} disabled`)
    },
  })
}

function statusTheme(status: string) {
  if (status === 'Active') return 'green'
  if (status === 'Invited') return 'amber'
  return 'gray'
}

const detailFields = computed(() => {
  const u = user.value
  if (!u) return []
  return [
    { label: 'User ID', value: u.id },
    { label: 'Email', value: u.email },
    { label: 'Phone', value: u.phone || '—' },
    { label: 'Title', value: u.title || '—' },
    { label: 'Department', value: u.department || '—' },
    { label: 'Location', value: u.location || '—' },
    { label: 'Role', value: u.role },
    { label: 'Status', value: u.status, badge: true },
    {
      label: 'Joined',
      value: u.joinedAt ? formatActivityTime(`${u.joinedAt}T08:00:00`) : '—',
    },
    {
      label: 'Last login',
      value: u.lastLogin ? formatActivityTime(u.lastLogin) : '—',
    },
  ]
})

// keep reactive list length for empty-state messaging
const totalUsers = computed(() => systemUsers.length)
</script>

<template>
  <PageHeader>
    <PageHeaderTitle :title="user?.name || 'User profile'" />
    <div class="flex flex-wrap items-center gap-2">
      <Button icon-left="lucide-arrow-left" label="Back" @click="goBack" />
      <template v-if="user">
        <Button
          v-if="!editing"
          icon-left="lucide-pencil"
          label="Edit profile"
          @click="startEdit"
        />
        <Button
          v-if="editing"
          label="Cancel"
          :disabled="saving"
          @click="cancelEdit"
        />
        <Button
          v-if="editing"
          variant="solid"
          icon-left="lucide-check"
          label="Update"
          :loading="saving"
          @click="saveProfile"
        />
        <Button
          icon-left="lucide-shield"
          label="Permissions"
          @click="router.push({ path: '/users', query: { tab: 'roles' } })"
        />
        <Button
          v-if="user.status !== 'Disabled'"
          icon-left="lucide-user-x"
          label="Disable"
          theme="red"
          :disabled="editing || isSelf"
          @click="disableUser"
        />
      </template>
    </div>
  </PageHeader>

  <div class="school-page max-w-4xl">
    <div
      v-if="!user"
      class="rounded-6 border border-outline-gray-1 px-4 py-16 text-center text-ink-gray-5"
    >
      <p class="text-sm">User not found among {{ totalUsers }} accounts.</p>
      <Button class="mt-4" label="Back to users" @click="goBack" />
    </div>

    <template v-else>
      <section
        class="flex flex-wrap items-start justify-between gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
      >
        <div class="flex min-w-0 items-start gap-4">
          <Avatar :label="user.name" size="xl" />
          <div class="min-w-0 space-y-1.5">
            <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
              User · {{ user.id }}
              <span v-if="isSelf"> · You</span>
            </p>
            <h1 class="truncate text-2xl-semibold text-ink-gray-9">
              {{ user.name }}
            </h1>
            <p v-if="user.title" class="text-p-base text-ink-gray-6">
              {{ user.title }}
            </p>
            <p v-else class="text-p-base text-ink-gray-6">{{ user.email }}</p>
            <div class="flex flex-wrap gap-2 pt-1">
              <Badge
                :label="user.status"
                :theme="statusTheme(user.status)"
                variant="subtle"
              />
              <Badge :label="user.role" theme="blue" variant="subtle" />
              <Badge
                v-if="roleDef"
                :label="roleDef.deskAccess ? 'Desk access' : 'Portal only'"
                :theme="roleDef.deskAccess ? 'green' : 'amber'"
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </section>

      <section v-if="!editing" class="school-section">
        <h2 class="school-section-title">Profile details</h2>
        <div
          class="grid gap-0 overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white sm:grid-cols-2"
        >
          <div
            v-for="field in detailFields"
            :key="field.label"
            class="border-b border-outline-gray-1 px-4 py-3.5 sm:odd:border-e"
          >
            <p class="text-xs font-medium uppercase tracking-wide text-ink-gray-5">
              {{ field.label }}
            </p>
            <div class="mt-1.5">
              <Badge
                v-if="field.badge"
                :label="field.value"
                :theme="statusTheme(field.value)"
                variant="subtle"
              />
              <p v-else class="text-sm text-ink-gray-9">{{ field.value }}</p>
            </div>
          </div>
        </div>
        <p
          v-if="user.bio"
          class="mt-4 rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3.5 text-sm text-ink-gray-7"
        >
          {{ user.bio }}
        </p>
        <p
          v-if="roleDef"
          class="mt-3 text-sm text-ink-gray-6"
        >
          {{ roleDef.description }}
        </p>
      </section>

      <section v-else class="school-section">
        <h2 class="school-section-title">Update profile</h2>
        <div
          class="space-y-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
        >
          <FormControl v-model="form.name" label="Full name" type="text" required />
          <FormControl v-model="form.email" label="Email" type="text" required />
          <FormControl v-model="form.title" label="Job title" type="text" />
          <FormControl v-model="form.phone" label="Phone" type="text" />
          <FormControl v-model="form.department" label="Department" type="text" />
          <FormControl v-model="form.location" label="Location" type="text" />
          <FormControl
            v-model="form.role"
            label="Role"
            type="select"
            :options="roleOptions"
          />
          <FormControl
            v-model="form.status"
            label="Status"
            type="select"
            :options="statusOptions"
            :disabled="isSelf"
          />
          <FormControl v-model="form.bio" label="About" type="textarea" />
          <div class="flex flex-wrap gap-2 pt-2">
            <Button
              variant="solid"
              icon-left="lucide-check"
              label="Save update"
              :loading="saving"
              @click="saveProfile"
            />
            <Button label="Cancel" :disabled="saving" @click="cancelEdit" />
          </div>
        </div>
      </section>

      <section class="school-section">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Role permissions snapshot</h2>
          <Button
            label="Manage permissions"
            icon-left="lucide-shield"
            @click="router.push({ path: '/users', query: { tab: 'roles' } })"
          />
        </div>
        <div
          class="grid gap-0 overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white sm:grid-cols-2"
        >
          <div
            v-for="row in permissionSummary"
            :key="row.key"
            class="border-b border-outline-gray-1 px-4 py-3.5 sm:odd:border-e"
          >
            <p class="text-sm-medium text-ink-gray-9">{{ row.label }}</p>
            <p class="mt-0.5 text-xs text-ink-gray-5">
              {{ row.enabled }} of {{ row.total }} enabled
              <span v-if="row.flags.length">
                · {{ row.flags.slice(0, 4).join(', ') }}</span
              >
            </p>
          </div>
        </div>
      </section>

      <section class="school-section">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Recent activity</h2>
          <Button
            label="Full activity log"
            icon-left="lucide-history"
            @click="router.push('/activity-log')"
          />
        </div>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="entry in recentActivity"
            :key="entry.id"
            class="flex flex-wrap items-start justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <Badge
                  :label="entry.action"
                  :theme="actionTheme(entry.action)"
                  variant="subtle"
                />
                <p class="text-sm text-ink-gray-9">{{ entry.summary }}</p>
              </div>
              <p v-if="entry.detail" class="text-xs text-ink-gray-5">
                {{ entry.detail }}
              </p>
            </div>
            <p class="shrink-0 text-xs text-ink-gray-5">
              {{ formatActivityTime(entry.at) }}
            </p>
          </div>
          <p
            v-if="!recentActivity.length"
            class="px-4 py-10 text-center text-sm text-ink-gray-5"
          >
            No recent activity for this user.
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
