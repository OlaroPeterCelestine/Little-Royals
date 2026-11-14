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
} from '../data/permissions'
import { catalog } from '../data/catalog'
import { catalogExtra } from '../data/catalogExtra'
import { currentUser, formatActivityTime, logActivity } from '../data/activity'
import ListPagination from '../components/ListPagination.vue'
import ListToolbar from '../components/ListToolbar.vue'
import PageIntro from '../components/PageIntro.vue'
import { PAGE_SIZE } from '../composables/useListPage'

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
    rolePanel.value = 'list'
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
type RolePanel = 'list' | 'editor'
const rolePanel = ref<RolePanel>('list')
const editingKey = ref<string | null>(null)
const dirty = ref(false)
const showExtraFlags = ref(false)
const moduleGroup = ref('All')
const moduleQuery = ref('')

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
  () => rolePanel.value === 'editor' && !editingKey.value,
)

const currentRole = computed(
  () => roles.find((r) => r.key === editingKey.value) || null,
)

const allModules = computed(() => {
  const mods = { ...catalog, ...catalogExtra }
  return documentTypes.map((d) => ({
    key: d.key,
    label: d.label,
    group: mods[d.key]?.group || 'Other',
  }))
})

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
  rolePanel.value = 'editor'
  tab.value = 'roles'
}

function openEditRole(roleKey: string) {
  const role = roles.find((r) => r.key === roleKey)
  if (!role) return
  editingKey.value = role.key
  roleForm.name = role.name
  roleForm.description = role.description
  roleForm.deskAccess = role.deskAccess ? 'yes' : 'no'
  roleForm.status = role.status
  roleForm.copyFrom = ''
  moduleGroup.value = 'All'
  moduleQuery.value = ''
  loadMatrix({ roleKey: role.key })
  rolePanel.value = 'editor'
  tab.value = 'roles'
}

watch(
  () => roleForm.copyFrom,
  (from) => {
    if (!isCreating.value) return
    loadMatrix({ copyFrom: from || '' })
  },
)

function closeRoleEditor() {
  if (dirty.value) {
    dialog.confirm({
      title: 'Discard CRUD changes?',
      message: 'Unsaved permission matrix changes will be lost.',
      icon: 'lucide-alert-triangle',
      theme: 'amber',
      confirmLabel: 'Discard',
      onConfirm: async () => {
        dirty.value = false
        rolePanel.value = 'list'
        editingKey.value = null
      },
    })
    return
  }
  rolePanel.value = 'list'
  editingKey.value = null
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
    editingKey.value = role.key
    dirty.value = false
    toast.success(
      `Role “${role.name}” created from custom CRUD (${matrixSummary.value.read} modules readable)`,
    )
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

    <!-- Roles list -->
    <template v-else-if="rolePanel === 'list'">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-ink-gray-6">
          Roles are built from custom CRUD permissions (Create, Read, Update,
          Delete) on each module.
        </p>
        <Button
          variant="solid"
          icon-left="lucide-plus"
          label="Create role"
          @click="openCreateRole"
        />
      </div>

      <section
        class="grid gap-3 rounded-6 border border-outline-gray-1 bg-surface-white p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <button
          v-for="role in roles"
          :key="role.id"
          type="button"
          class="rounded-5 border border-outline-gray-1 px-3.5 py-3 text-left transition hover:bg-surface-gray-1"
          @click="openEditRole(role.key)"
        >
          <div class="flex flex-wrap items-center gap-1.5">
            <p class="text-sm-medium text-ink-gray-9">{{ role.name }}</p>
            <Badge
              :label="role.status"
              :theme="role.status === 'Active' ? 'green' : 'gray'"
              variant="subtle"
            />
            <Badge
              :label="role.deskAccess ? 'Desk' : 'Portal'"
              :theme="role.deskAccess ? 'blue' : 'amber'"
              variant="subtle"
            />
          </div>
          <p class="mt-1 text-xs text-ink-gray-5">{{ role.description }}</p>
          <p class="mt-2 text-xs font-medium tabular-nums text-ink-gray-7">
            CRUD · {{ roleSummaryLabel(role.key) }}
          </p>
          <div class="mt-3">
            <Button
              size="sm"
              icon-left="lucide-shield"
              label="Edit CRUD permissions"
              @click.stop="openEditRole(role.key)"
            />
          </div>
        </button>
      </section>
    </template>

    <!-- Create / edit role from CRUD matrix -->
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="space-y-1">
          <p class="text-sm-medium text-ink-gray-9">
            {{ isCreating ? 'Create role from CRUD' : `Edit · ${currentRole?.name || ''}` }}
          </p>
          <p class="text-sm text-ink-gray-6">
            Name the role, then tick Create / Read / Update / Delete for each
            module. That matrix becomes the role.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button label="Back to roles" @click="closeRoleEditor" />
          <Button label="Reset" :disabled="!dirty" @click="resetMatrix" />
          <Button
            variant="solid"
            icon-left="lucide-check"
            :label="isCreating ? 'Create role' : 'Save role & CRUD'"
            @click="saveRole"
          />
        </div>
      </div>

      <section
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
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
            v-if="dirty"
            label="Unsaved"
            theme="amber"
            variant="subtle"
          />
        </div>
      </section>

      <section class="school-section">
        <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 class="school-section-title mb-0">CRUD permissions</h2>
          <div class="flex flex-wrap gap-2">
            <Button
              size="sm"
              label="Clear visible"
              @click="setVisibleCrud('none')"
            />
            <Button
              size="sm"
              label="Read-only visible"
              @click="setVisibleCrud('read')"
            />
            <Button
              size="sm"
              label="Full CRUD visible"
              @click="setVisibleCrud('full')"
            />
            <Button
              size="sm"
              :label="showExtraFlags ? 'Hide export/print' : 'Show export/print'"
              @click="showExtraFlags = !showExtraFlags"
            />
          </div>
        </div>

        <div class="mb-3 grid gap-3 sm:grid-cols-2">
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

        <div
          class="school-perm-matrix"
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
    </template>
  </div>
</template>
