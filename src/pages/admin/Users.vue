<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Avatar,
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
  dialog,
  toast,
} from 'frappe-ui'
import {
  List,
  ListCell,
  ListHeader,
  ListHeaderCell,
  ListRow,
  ListRows,
} from 'frappe-ui/list'
import {
  applyPermMatrix,
  buildPermMatrix,
  createRole,
  crudFlags,
  crudFlagLabels,
  documentTypes,
  extraPermFlags,
  permissionStats,
  permFlagLabels,
  roleCrudSummary,
  roles,
  systemUsers,
  updateRole,
  type DocPerms,
  type PermFlag,
  type SystemUser,
} from '@/data/auth/permissions'
import { currentUser, formatActivityTime, logActivity } from '@/data/activity/activity'
import ListPagination from '@/components/list/ListPagination.vue'
import ListToolbar from '@/components/list/ListToolbar.vue'
import PageIntro from '@/components/list/PageIntro.vue'
import { PAGE_SIZE } from '@/composables/useListPage'

const router = useRouter()
const route = useRoute()

type AccessTab = 'users' | 'roles'

function parseTab(raw: unknown): AccessTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'roles' || v === 'role' || v === 'permissions' || v === 'perms')
    return 'roles'
  return 'users'
}

const tab = ref<AccessTab>(parseTab(route.query.tab))

const tabs = computed(() => [
  { label: `Users (${systemUsers.length})`, value: 'users' },
  { label: `Roles (${roles.length})`, value: 'roles' },
])

watch(tab, (value) => {
  router.replace({
    path: '/users',
    query: { ...route.query, tab: value },
  })
  if (value === 'users') {
    roleDialogOpen.value = false
    editingKey.value = null
    dirty.value = false
  }
})

watch(
  () => route.query.tab,
  (value) => {
    const next = parseTab(value)
    if (tab.value !== next) tab.value = next
  },
)

/* ——— Users tab ——— */
const query = ref('')
const statusFilter = ref('All')
const page = ref(1)
const active = ref<string>()

const columns = {
  base: ['minmax(0, 1.5fr)', 'minmax(0, 0.7fr)', 'minmax(0, 5.5rem)'],
  md: [
    'minmax(0, 1.4fr)',
    'minmax(0, 1.2fr)',
    'minmax(0, 0.75fr)',
    'minmax(0, 0.7fr)',
    'minmax(0, 0.8fr)',
    'minmax(0, 5.5rem)',
  ],
}

const statusOptions = computed(() => {
  const statuses = Array.from(new Set(systemUsers.map((u) => u.status)))
  return [
    { label: 'All statuses', value: 'All' },
    ...statuses.map((s) => ({
      label: `${s} (${systemUsers.filter((u) => u.status === s).length})`,
      value: s,
    })),
  ]
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return systemUsers.filter((u) => {
    if (statusFilter.value !== 'All' && u.status !== statusFilter.value)
      return false
    if (!q) return true
    return [u.name, u.email, u.role, u.department, u.status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)),
)

const pageRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const rangeLabel = computed(() => {
  if (!filtered.value.length) return '0 of 0'
  const start = (page.value - 1) * PAGE_SIZE + 1
  const end = Math.min(page.value * PAGE_SIZE, filtered.value.length)
  return `${start}–${end}`
})

watch([query, statusFilter], () => {
  page.value = 1
})

const stats = computed(() => [
  { title: 'Users', value: systemUsers.length },
  {
    title: 'Active',
    value: systemUsers.filter((u) => u.status === 'Active').length,
  },
  {
    title: 'Roles',
    value: roles.filter((r) => r.status === 'Active').length,
  },
  {
    title: 'Invited',
    value: systemUsers.filter((u) => u.status === 'Invited').length,
  },
])

function statusTheme(status: string) {
  if (status === 'Active') return 'green'
  if (status === 'Invited') return 'amber'
  return 'gray'
}

function goToPage(p: number) {
  page.value = Math.min(Math.max(1, p), totalPages.value)
}

function inviteUser() {
  dialog.prompt({
    title: 'Invite user',
    message: 'Send a Little Royals desk invite with a starting role.',
    icon: 'lucide-user-plus',
    theme: 'blue',
    confirmLabel: 'Send invite',
    fields: [
      {
        name: 'name',
        label: 'Full name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Agnes Nabukeera',
        validate: (v) =>
          String(v || '').trim().length >= 2 ? null : 'Name is required',
      },
      {
        name: 'email',
        label: 'Email',
        type: 'text',
        required: true,
        placeholder: 'name@littleroyals.ug',
        validate: (v) =>
          String(v || '').includes('@') ? null : 'Enter a valid email',
      },
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        defaultValue: 'Teacher',
        options: roles.map((r) => ({ label: r.name, value: r.key })),
      },
      {
        name: 'department',
        label: 'Department',
        type: 'text',
        placeholder: 'Primary / Nursery / Finance',
      },
    ],
    onConfirm: async ({ values }) => {
      const id = `USR-${String(systemUsers.length + 1).padStart(2, '0')}`
      const user: SystemUser = {
        id,
        name: String(values.name).trim(),
        email: String(values.email).trim().toLowerCase(),
        role: String(values.role),
        status: 'Invited',
        department: values.department
          ? String(values.department)
          : undefined,
      }
      systemUsers.unshift(user)
      logActivity({
        action: 'Created',
        module: 'users',
        moduleLabel: 'User',
        recordId: user.id,
        recordName: user.name,
        summary: `Invited user ${user.name}`,
        detail: `${user.role} · ${user.email}`,
        severity: 'success',
      })
      toast.success(`Invite sent to ${user.email}`)
    },
  })
}

function editUser(user: SystemUser) {
  dialog.prompt({
    title: `Edit ${user.name}`,
    message: 'Update role or account status.',
    icon: 'lucide-pencil',
    theme: 'blue',
    confirmLabel: 'Save',
    fields: [
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        defaultValue: user.role,
        options: roles.map((r) => ({ label: r.name, value: r.key })),
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        defaultValue: user.status,
        options: [
          { label: 'Active', value: 'Active' },
          { label: 'Invited', value: 'Invited' },
          { label: 'Disabled', value: 'Disabled' },
        ],
      },
      {
        name: 'department',
        label: 'Department',
        type: 'text',
        defaultValue: user.department || '',
      },
    ],
    onConfirm: async ({ values }) => {
      user.role = String(values.role)
      user.status = String(values.status) as SystemUser['status']
      user.department = values.department
        ? String(values.department)
        : undefined
      if (user.email === currentUser.email) {
        currentUser.role = user.role
        currentUser.name = user.name
      }
      logActivity({
        action: 'Updated',
        module: 'users',
        moduleLabel: 'User',
        recordId: user.id,
        recordName: user.name,
        summary: `Updated user ${user.name}`,
        detail: `${user.role} · ${user.status}`,
        severity: 'info',
      })
      toast.success(`${user.name} updated`)
    },
  })
}

function disableUser(user: SystemUser) {
  if (user.email === currentUser.email) {
    toast.error('You cannot disable your own account')
    return
  }
  dialog.danger({
    title: `Disable ${user.name}?`,
    message: `They will lose desk access until re-enabled. Role “${user.role}” is kept.`,
    confirmLabel: 'Yes, disable',
    cancelLabel: 'Keep active',
    onConfirm: async () => {
      user.status = 'Disabled'
      logActivity({
        action: 'Updated',
        module: 'users',
        moduleLabel: 'User',
        recordId: user.id,
        recordName: user.name,
        summary: `Disabled user ${user.name}`,
        severity: 'warning',
      })
      toast.warning(`${user.name} disabled`)
    },
  })
}

function openUser(user: SystemUser) {
  active.value = user.id
  router.push(`/users/${user.id}`)
}

/* ——— Roles tab ——— */
const roleDialogOpen = ref(false)
const editingKey = ref<string | null>(null)
const dirty = ref(false)
const showExtraFlags = ref(false)
const moduleGroup = ref('All')
const moduleQuery = ref('')
const roleQuery = ref('')
const roleStatusFilter = ref('All')
const activeRole = ref<string>()

const roleColumns = {
  base: ['minmax(0, 1.4fr)', 'minmax(0, 0.7fr)', 'minmax(0, 6.5rem)'],
  md: [
    'minmax(0, 1.3fr)',
    'minmax(0, 1.1fr)',
    'minmax(0, 0.7fr)',
    'minmax(0, 0.7fr)',
    'minmax(0, 1fr)',
    'minmax(0, 6.5rem)',
  ],
}

const roleForm = reactive({
  name: '',
  description: '',
  deskAccess: 'yes',
  status: 'Active',
  copyFrom: '',
})

/** Working CRUD matrix — this is what defines the role. */
const matrix = reactive<Record<string, DocPerms>>({})

const isCreating = computed(
  () => roleDialogOpen.value && !editingKey.value,
)

const currentRole = computed(
  () => roles.find((r) => r.key === editingKey.value) || null,
)

const roleDialogTitle = computed(() =>
  isCreating.value
    ? 'Create role'
    : `Edit role · ${currentRole.value?.name || ''}`,
)

const filteredRoles = computed(() => {
  const q = roleQuery.value.trim().toLowerCase()
  return roles.filter((r) => {
    if (roleStatusFilter.value !== 'All' && r.status !== roleStatusFilter.value)
      return false
    if (!q) return true
    return [r.name, r.description, r.key, roleSummaryLabel(r.key)]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const roleStatusOptions = computed(() => {
  const statuses = Array.from(new Set(roles.map((r) => r.status)))
  return [
    { label: 'All statuses', value: 'All' },
    ...statuses.map((s) => ({
      label: `${s} (${roles.filter((r) => r.status === s).length})`,
      value: s,
    })),
  ]
})

const allModules = computed(() =>
  documentTypes.map((d) => ({
    key: d.key,
    label: d.label,
    group: d.group || 'Other',
  })),
)

const moduleGroups = computed(() => {
  const groups = Array.from(new Set(allModules.value.map((m) => m.group))).sort()
  return [
    { label: 'All modules', value: 'All' },
    ...groups.map((g) => ({ label: g, value: g })),
  ]
})

const filteredModules = computed(() => {
  const q = moduleQuery.value.trim().toLowerCase()
  return allModules.value.filter((m) => {
    if (moduleGroup.value !== 'All' && m.group !== moduleGroup.value) return false
    if (!q) return true
    return `${m.label} ${m.key} ${m.group}`.toLowerCase().includes(q)
  })
})

const copyFromOptions = computed(() => [
  { label: 'Blank (no access)', value: '' },
  ...roles.map((r) => ({ label: `Start from ${r.name}`, value: r.key })),
])

const roleStats = computed(() => [
  { title: 'Active roles', value: permissionStats.value.roles },
  { title: 'Active users', value: permissionStats.value.users },
  { title: 'Permission rules', value: permissionStats.value.rules },
  {
    title: 'Invited users',
    value: permissionStats.value.invited,
    caption: 'Awaiting first login',
  },
])

const matrixSummary = computed(() => {
  let create = 0
  let read = 0
  let write = 0
  let del = 0
  for (const doc of documentTypes) {
    const p = matrix[doc.key]
    if (!p) continue
    if (p.create) create += 1
    if (p.read) read += 1
    if (p.write) write += 1
    if (p.delete) del += 1
  }
  return { create, read, write, delete: del, total: documentTypes.length }
})

function ensureMatrixRow(key: string): DocPerms {
  if (!matrix[key]) {
    matrix[key] = {
      read: false,
      write: false,
      create: false,
      delete: false,
      export: false,
      print: false,
      share: false,
    }
  }
  return matrix[key]
}

function loadMatrix(opts?: { roleKey?: string; copyFrom?: string }) {
  const next = buildPermMatrix(opts)
  for (const key of Object.keys(matrix)) delete matrix[key]
  Object.assign(matrix, next)
  dirty.value = false
}

function openCreateRole() {
  editingKey.value = null
  roleForm.name = ''
  roleForm.description = ''
  roleForm.deskAccess = 'yes'
  roleForm.status = 'Active'
  roleForm.copyFrom = ''
  moduleGroup.value = 'All'
  moduleQuery.value = ''
  showExtraFlags.value = false
  loadMatrix({ copyFrom: '' })
  tab.value = 'roles'
  roleDialogOpen.value = true
}

function openEditRole(roleKey: string) {
  const role = roles.find((r) => r.key === roleKey)
  if (!role) return
  activeRole.value = role.id
  editingKey.value = role.key
  roleForm.name = role.name
  roleForm.description = role.description
  roleForm.deskAccess = role.deskAccess ? 'yes' : 'no'
  roleForm.status = role.status
  roleForm.copyFrom = ''
  moduleGroup.value = 'All'
  moduleQuery.value = ''
  showExtraFlags.value = false
  loadMatrix({ roleKey: role.key })
  tab.value = 'roles'
  roleDialogOpen.value = true
}

watch(
  () => roleForm.copyFrom,
  (from) => {
    if (!isCreating.value) return
    loadMatrix({ copyFrom: from || '' })
  },
)

function forceCloseRoleDialog() {
  dirty.value = false
  roleDialogOpen.value = false
  editingKey.value = null
}

watch(roleDialogOpen, (open) => {
  document.body.classList.toggle('school-modal-open', open)
})

onUnmounted(() => {
  document.body.classList.remove('school-modal-open')
})

function closeRoleEditor() {
  if (dirty.value) {
    dialog.confirm({
      title: 'Discard CRUD changes?',
      message: 'Unsaved permission matrix changes will be lost.',
      icon: 'lucide-alert-triangle',
      theme: 'amber',
      confirmLabel: 'Discard',
      onConfirm: async () => {
        forceCloseRoleDialog()
      },
    })
    return
  }
  forceCloseRoleDialog()
}

function disableRole(roleKey: string) {
  const role = roles.find((r) => r.key === roleKey)
  if (!role || role.status === 'Disabled') return
  dialog.danger({
    title: `Disable “${role.name}”?`,
    message:
      'Users with this role keep their assignment, but the role is marked disabled until re-enabled.',
    confirmLabel: 'Disable role',
    onConfirm: async () => {
      updateRole(role.key, { status: 'Disabled' })
      toast.success(`Role “${role.name}” disabled`)
    },
  })
}

function toggleCell(docKey: string, flag: PermFlag) {
  const row = ensureMatrixRow(docKey)
  row[flag] = !row[flag]
  if (flag === 'read' && !row.read) {
    row.write = false
    row.create = false
    row.delete = false
    row.export = false
    row.print = false
    row.share = false
  }
  if (['write', 'create', 'delete'].includes(flag) && row[flag]) {
    row.read = true
  }
  dirty.value = true
}

function setRowCrud(docKey: string, mode: 'none' | 'read' | 'full') {
  const row = ensureMatrixRow(docKey)
  if (mode === 'none') {
    for (const f of [...crudFlags, ...extraPermFlags]) row[f] = false
  } else if (mode === 'read') {
    row.read = true
    row.create = false
    row.write = false
    row.delete = false
    row.export = true
    row.print = true
    row.share = false
  } else {
    for (const f of [...crudFlags, ...extraPermFlags]) row[f] = true
  }
  dirty.value = true
}

function setVisibleCrud(mode: 'none' | 'read' | 'full') {
  for (const m of filteredModules.value) setRowCrud(m.key, mode)
}

function resetMatrix() {
  if (isCreating.value) loadMatrix({ copyFrom: roleForm.copyFrom || '' })
  else if (editingKey.value) loadMatrix({ roleKey: editingKey.value })
  toast.info('CRUD matrix reset')
}

function saveRole() {
  const name = roleForm.name.trim()
  if (name.length < 2) {
    toast.error('Role name is required')
    return
  }

  const snapshot: Record<string, DocPerms> = {}
  for (const doc of documentTypes) {
    snapshot[doc.key] = { ...(matrix[doc.key] || ensureMatrixRow(doc.key)) }
  }

  if (isCreating.value) {
    const role = createRole({
      name,
      description: roleForm.description,
      deskAccess: roleForm.deskAccess === 'yes',
      status: roleForm.status as 'Active' | 'Disabled',
      matrix: snapshot,
    })
    dirty.value = false
    toast.success(
      `Role “${role.name}” created from custom CRUD (${matrixSummary.value.read} modules readable)`,
    )
    forceCloseRoleDialog()
    return
  }

  const key = editingKey.value
  if (!key) return
  updateRole(key, {
    name,
    description: roleForm.description,
    deskAccess: roleForm.deskAccess === 'yes',
    status: roleForm.status as 'Active' | 'Disabled',
  })
  applyPermMatrix(key, snapshot)
  dirty.value = false
  toast.success(`Role “${name}” saved with custom CRUD permissions`)
  forceCloseRoleDialog()
}

function roleSummaryLabel(roleKey: string) {
  const s = roleCrudSummary(roleKey)
  return `C${s.create} · R${s.read} · U${s.write} · D${s.delete}`
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Users & Roles" />
  </PageHeader>

  <div class="school-page">
    <PageIntro :stats="tab === 'users' ? stats : roleStats">
      <p class="text-p-base text-ink-gray-6">
        Desk logins and roles. Each role is defined by custom Create / Read /
        Update / Delete permissions per module. Signed in as
        <span class="font-medium text-ink-gray-8">{{ currentUser.name }}</span>
        ({{ currentUser.role }}).
      </p>
    </PageIntro>

    <TabButtons v-model="tab" :options="tabs" class="school-tabs" />

    <!-- Users -->
    <template v-if="tab === 'users'">
      <ListToolbar>
        <template #search>
          <FormControl
            v-model="query"
            class="w-full"
            label="Search"
            placeholder="Search name, email, role…"
          />
        </template>
        <FormControl
          v-if="statusOptions.length > 1"
          v-model="statusFilter"
          class="school-filter-select"
          type="select"
          label="Status"
          :options="statusOptions"
        />
        <template #actions>
          <Button
            icon-left="lucide-history"
            label="Activity log"
            @click="router.push('/activity-log')"
          />
          <Button
            variant="solid"
            icon-left="lucide-user-plus"
            label="Invite user"
            @click="inviteUser"
          />
        </template>
      </ListToolbar>

      <div class="school-table">
        <List v-model:active="active" :columns="columns">
          <ListHeader>
            <ListHeaderCell>User</ListHeaderCell>
            <ListHeaderCell class="hidden md:flex">Email</ListHeaderCell>
            <ListHeaderCell class="hidden md:flex">Role</ListHeaderCell>
            <ListHeaderCell>Status</ListHeaderCell>
            <ListHeaderCell class="hidden md:flex">Last login</ListHeaderCell>
            <ListHeaderCell class="school-list-actions-head">
              Actions
            </ListHeaderCell>
          </ListHeader>

          <ListRows :items="pageRows" v-slot="{ item }">
            <ListRow
              :value="item.id"
              class="cursor-pointer"
              @click="openUser(item)"
            >
              <ListCell class="school-list-primary">
                <div class="flex items-center gap-3 pe-2">
                  <Avatar :label="item.name" size="md" class="shrink-0" />
                  <div class="school-list-primary-text flex-1 space-y-0.5">
                    <p class="text-sm-medium text-ink-gray-9">
                      {{ item.name }}
                      <span
                        v-if="item.email === currentUser.email"
                        class="text-xs text-ink-gray-5"
                        >(you)</span
                      >
                    </p>
                    <p class="text-xs text-ink-gray-5 md:hidden">
                      {{ item.role }}
                    </p>
                  </div>
                </div>
              </ListCell>
              <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
                <span class="school-cell-text" :title="item.email">{{
                  item.email
                }}</span>
              </ListCell>
              <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
                <span class="school-cell-text" :title="item.role">{{
                  item.role
                }}</span>
              </ListCell>
              <ListCell class="school-list-nowrap">
                <Badge
                  :label="item.status"
                  :theme="statusTheme(item.status)"
                  variant="subtle"
                />
              </ListCell>
              <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
                <span class="school-cell-text">{{
                  item.lastLogin ? formatActivityTime(item.lastLogin) : '—'
                }}</span>
              </ListCell>
              <ListCell class="school-list-actions">
                <Button
                  class="relative shrink-0"
                  icon="lucide-eye"
                  aria-label="Open profile"
                  @click.stop="openUser(item)"
                />
                <Button
                  class="relative shrink-0"
                  icon="lucide-pencil"
                  aria-label="Edit"
                  @click.stop="editUser(item)"
                />
                <Button
                  v-if="item.status !== 'Disabled'"
                  class="relative shrink-0"
                  icon="lucide-user-x"
                  theme="red"
                  aria-label="Disable"
                  @click.stop="disableUser(item)"
                />
              </ListCell>
            </ListRow>
          </ListRows>
        </List>

        <p
          v-if="filtered.length === 0"
          class="px-4 py-10 text-center text-sm text-ink-gray-5"
        >
          No users match your filters.
        </p>

        <ListPagination
          v-else
          :page="page"
          :total-pages="totalPages"
          :range-label="rangeLabel"
          :total="filtered.length"
          @prev="goToPage(page - 1)"
          @next="goToPage(page + 1)"
          @go="goToPage"
        />
      </div>
    </template>

    <!-- Roles table -->
    <template v-else>
      <ListToolbar>
        <template #search>
          <FormControl
            v-model="roleQuery"
            class="w-full"
            label="Search"
            placeholder="Search role, description, CRUD…"
          />
        </template>
        <FormControl
          v-if="roleStatusOptions.length > 1"
          v-model="roleStatusFilter"
          class="school-filter-select"
          type="select"
          label="Status"
          :options="roleStatusOptions"
        />
        <template #actions>
          <Button
            variant="solid"
            icon-left="lucide-plus"
            label="Create role"
            @click="openCreateRole"
          />
        </template>
      </ListToolbar>

      <div class="school-table">
        <List v-model:active="activeRole" :columns="roleColumns">
          <ListHeader>
            <ListHeaderCell>Role</ListHeaderCell>
            <ListHeaderCell class="hidden md:flex">Description</ListHeaderCell>
            <ListHeaderCell>Status</ListHeaderCell>
            <ListHeaderCell class="hidden md:flex">Access</ListHeaderCell>
            <ListHeaderCell class="hidden md:flex">CRUD</ListHeaderCell>
            <ListHeaderCell class="school-list-actions-head">
              Actions
            </ListHeaderCell>
          </ListHeader>

          <ListRows :items="filteredRoles" v-slot="{ item }">
            <ListRow
              :value="item.id"
              class="cursor-pointer"
              @click="openEditRole(item.key)"
            >
              <ListCell class="school-list-primary">
                <div class="school-list-primary-text space-y-0.5">
                  <p class="text-sm-medium text-ink-gray-9">{{ item.name }}</p>
                  <p class="text-xs text-ink-gray-5 md:hidden">
                    CRUD · {{ roleSummaryLabel(item.key) }}
                  </p>
                </div>
              </ListCell>
              <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
                <span class="school-cell-text" :title="item.description">{{
                  item.description
                }}</span>
              </ListCell>
              <ListCell class="school-list-nowrap">
                <Badge
                  :label="item.status"
                  :theme="item.status === 'Active' ? 'green' : 'gray'"
                  variant="subtle"
                />
              </ListCell>
              <ListCell class="hidden school-list-nowrap md:flex">
                <Badge
                  :label="item.deskAccess ? 'Desk' : 'Portal'"
                  :theme="item.deskAccess ? 'blue' : 'amber'"
                  variant="subtle"
                />
              </ListCell>
              <ListCell class="hidden school-list-nowrap text-ink-gray-7 md:flex">
                <span class="school-cell-text tabular-nums">{{
                  roleSummaryLabel(item.key)
                }}</span>
              </ListCell>
              <ListCell class="school-list-actions">
                <Button
                  class="relative shrink-0"
                  icon="lucide-shield"
                  aria-label="Edit CRUD permissions"
                  @click.stop="openEditRole(item.key)"
                />
                <Button
                  class="relative shrink-0"
                  icon="lucide-pencil"
                  aria-label="Edit role"
                  @click.stop="openEditRole(item.key)"
                />
                <Button
                  v-if="item.status !== 'Disabled'"
                  class="relative shrink-0"
                  icon="lucide-ban"
                  theme="red"
                  aria-label="Disable role"
                  @click.stop="disableRole(item.key)"
                />
              </ListCell>
            </ListRow>
          </ListRows>
        </List>

        <p
          v-if="!filteredRoles.length"
          class="px-4 py-10 text-center text-sm text-ink-gray-5"
        >
          No roles match your filters.
        </p>
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="roleDialogOpen"
        class="school-side-overlay"
        role="presentation"
      >
        <button
          type="button"
          class="school-side-overlay__scrim"
          aria-label="Close role panel"
          @click="closeRoleEditor"
        />
        <aside
          class="school-side-panel"
          role="dialog"
          aria-modal="true"
          :aria-label="roleDialogTitle"
        >
          <header class="school-side-panel__head">
            <div class="min-w-0">
              <p class="text-base-medium text-ink-gray-9">{{ roleDialogTitle }}</p>
              <p class="text-sm text-ink-gray-6">
                Create / Read / Update / Delete per module
              </p>
            </div>
            <Button
              icon="lucide-x"
              variant="ghost"
              aria-label="Close"
              @click="closeRoleEditor"
            />
          </header>

          <div class="school-side-panel__body">
            <div class="school-role-form grid gap-3 sm:grid-cols-2">
              <FormControl
                v-model="roleForm.name"
                label="Role name"
                type="text"
                placeholder="e.g. Sports Coach"
              />
              <FormControl
                v-model="roleForm.status"
                label="Status"
                type="select"
                :options="[
                  { label: 'Active', value: 'Active' },
                  { label: 'Disabled', value: 'Disabled' },
                ]"
              />
              <FormControl
                v-model="roleForm.deskAccess"
                label="Access type"
                type="select"
                :options="[
                  { label: 'Desk access', value: 'yes' },
                  { label: 'Portal only', value: 'no' },
                ]"
              />
              <FormControl
                v-if="isCreating"
                v-model="roleForm.copyFrom"
                label="Optional starter"
                type="select"
                :options="copyFromOptions"
              />
              <FormControl
                v-model="roleForm.description"
                class="sm:col-span-2"
                label="Description"
                type="textarea"
                :rows="2"
                placeholder="What this role can do at Little Royals"
              />
              <div class="flex flex-wrap gap-2 sm:col-span-2">
                <Badge
                  :label="`Create ${matrixSummary.create}`"
                  theme="blue"
                  variant="subtle"
                />
                <Badge
                  :label="`Read ${matrixSummary.read}`"
                  theme="green"
                  variant="subtle"
                />
                <Badge
                  :label="`Update ${matrixSummary.write}`"
                  theme="amber"
                  variant="subtle"
                />
                <Badge
                  :label="`Delete ${matrixSummary.delete}`"
                  theme="red"
                  variant="subtle"
                />
                <Badge
                  :label="matrixSummary.total + ' modules'"
                  theme="gray"
                  variant="subtle"
                />
                <Badge
                  v-if="dirty"
                  label="Unsaved"
                  theme="amber"
                  variant="subtle"
                />
              </div>
            </div>

            <section class="school-role-crud">
              <div class="school-role-crud__toolbar space-y-3">
                <div class="flex flex-wrap items-end justify-between gap-3">
                  <h3 class="text-sm-medium text-ink-gray-9">CRUD permissions</h3>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      label="Clear"
                      @click="setVisibleCrud('none')"
                    />
                    <Button
                      size="sm"
                      label="Read-only"
                      @click="setVisibleCrud('read')"
                    />
                    <Button
                      size="sm"
                      label="Full CRUD"
                      @click="setVisibleCrud('full')"
                    />
                    <Button
                      size="sm"
                      :label="showExtraFlags ? 'Less' : 'More'"
                      @click="showExtraFlags = !showExtraFlags"
                    />
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <FormControl
                    v-model="moduleGroup"
                    type="select"
                    label="Module group"
                    :options="moduleGroups"
                  />
                  <FormControl
                    v-model="moduleQuery"
                    type="text"
                    label="Search modules"
                    placeholder="students, fees, exams…"
                  />
                </div>
              </div>

              <div
                class="school-perm-matrix school-perm-matrix--dialog"
                :class="showExtraFlags ? 'school-perm-matrix--extra' : ''"
              >
              <div class="school-perm-matrix__row school-perm-matrix__row--head">
                <span class="min-w-0">Module</span>
                <span
                  v-for="flag in crudFlags"
                  :key="flag"
                  class="school-perm-matrix__cell"
                  :title="crudFlagLabels[flag]"
                  >{{ crudFlagLabels[flag].charAt(0) }}</span
                >
                <span
                  v-for="flag in showExtraFlags ? extraPermFlags : []"
                  :key="flag"
                  class="school-perm-matrix__cell"
                  :title="permFlagLabels[flag]"
                  >{{ permFlagLabels[flag].charAt(0) }}</span
                >
              </div>

              <div
                v-for="mod in filteredModules"
                :key="mod.key"
                class="school-perm-matrix__row"
              >
                <div class="min-w-0">
                  <p class="school-cell-text text-sm-medium text-ink-gray-9">
                    {{ mod.label }}
                  </p>
                  <p class="school-cell-text text-xs text-ink-gray-5">
                    {{ mod.group }}
                  </p>
                  <div class="school-perm-matrix__quick">
                    <button
                      type="button"
                      class="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-gray-5 hover:text-ink-gray-8"
                      @click="setRowCrud(mod.key, 'read')"
                    >
                      Read
                    </button>
                    <button
                      type="button"
                      class="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-gray-5 hover:text-ink-gray-8"
                      @click="setRowCrud(mod.key, 'full')"
                    >
                      Full
                    </button>
                    <button
                      type="button"
                      class="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-gray-5 hover:text-ink-gray-8"
                      @click="setRowCrud(mod.key, 'none')"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div
                  v-for="flag in crudFlags"
                  :key="flag"
                  class="school-perm-matrix__cell"
                >
                  <button
                    type="button"
                    class="school-perm-matrix__toggle"
                    :class="matrix[mod.key]?.[flag] ? 'is-on' : ''"
                    :title="`${crudFlagLabels[flag]} · ${mod.label}`"
                    :aria-pressed="Boolean(matrix[mod.key]?.[flag])"
                    @click="toggleCell(mod.key, flag)"
                  >
                    {{ crudFlagLabels[flag].charAt(0) }}
                  </button>
                </div>
                <div
                  v-for="flag in showExtraFlags ? extraPermFlags : []"
                  :key="flag"
                  class="school-perm-matrix__cell"
                >
                  <button
                    type="button"
                    class="school-perm-matrix__toggle"
                    :class="matrix[mod.key]?.[flag] ? 'is-on' : ''"
                    :title="`${permFlagLabels[flag]} · ${mod.label}`"
                    :aria-pressed="Boolean(matrix[mod.key]?.[flag])"
                    @click="toggleCell(mod.key, flag)"
                  >
                    {{ permFlagLabels[flag].charAt(0) }}
                  </button>
                </div>
              </div>

                <p
                  v-if="!filteredModules.length"
                  class="px-4 py-10 text-center text-sm text-ink-gray-5"
                >
                  No modules match this filter.
                </p>
              </div>
            </section>
          </div>

          <footer class="school-side-panel__foot">
            <Button label="Cancel" @click="closeRoleEditor" />
            <Button label="Reset" :disabled="!dirty" @click="resetMatrix" />
            <Button
              variant="solid"
              icon-left="lucide-check"
              :label="isCreating ? 'Create role' : 'Save'"
              @click="saveRole"
            />
          </footer>
        </aside>
      </div>
    </Teleport>
  </div>
</template>
