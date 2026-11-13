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
  documentTypes,
  getRolePerms,
  permissionFlags,
  permissionStats,
  permFlagLabels,
  roles,
  saveRolePerms,
  systemUsers,
  type DocPerms,
  type PermFlag,
  type SystemUser,
} from '../data/permissions'
import { currentUser, formatActivityTime, logActivity } from '../data/activity'
import ListPagination from '../components/ListPagination.vue'
import ListStatCards from '../components/ListStatCards.vue'
import ListToolbar from '../components/ListToolbar.vue'
import { PAGE_SIZE } from '../composables/useListPage'

const router = useRouter()
const route = useRoute()

const tab = ref(
  String(route.query.tab || '').toLowerCase() === 'roles' ? 'roles' : 'users',
)

const tabs = [
  { label: 'Users', value: 'users' },
  { label: 'Roles', value: 'roles' },
]

watch(tab, (value) => {
  const query =
    value === 'roles' ? { ...route.query, tab: 'roles' } : { ...route.query }
  if (value !== 'roles') delete (query as Record<string, unknown>).tab
  router.replace({ query })
})

watch(
  () => route.query.tab,
  (value) => {
    const next = String(value || '').toLowerCase() === 'roles' ? 'roles' : 'users'
    if (tab.value !== next) tab.value = next
  },
)

/* ——— Users tab ——— */
const query = ref('')
const statusFilter = ref('All')
const page = ref(1)
const active = ref<string>()

const columns = {
  base: ['minmax(0, 1.5fr)', '7.5rem', '9rem'],
  md: [
    'minmax(0, 1.15fr)',
    'minmax(0, 1.35fr)',
    'minmax(0, 10rem)',
    '7.5rem',
    '8rem',
    '9rem',
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
        options: roles.map((r) => ({ label: r.name, value: r.name })),
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
        options: roles.map((r) => ({ label: r.name, value: r.name })),
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
const selectedRole = ref(roles[0]?.name || 'Education Manager')
const selectedDoc = ref(documentTypes[0]?.key || 'students')
const dirty = ref(false)

const draft = reactive<DocPerms>({
  read: true,
  write: false,
  create: false,
  delete: false,
  export: false,
  print: false,
  share: false,
})

const roleOptions = computed(() =>
  roles.map((r) => ({ label: r.name, value: r.name })),
)

const docOptions = computed(() =>
  documentTypes.map((d) => ({ label: d.label, value: d.key })),
)

const currentRole = computed(
  () => roles.find((r) => r.name === selectedRole.value) || null,
)

const currentDocLabel = computed(
  () =>
    documentTypes.find((d) => d.key === selectedDoc.value)?.label ||
    selectedDoc.value,
)

function loadDraft() {
  const row = getRolePerms(selectedRole.value, selectedDoc.value)
  const perms = row?.perms
  for (const flag of permissionFlags) {
    draft[flag] = Boolean(perms?.[flag])
  }
  dirty.value = false
}

watch([selectedRole, selectedDoc], loadDraft, { immediate: true })

function toggle(flag: PermFlag) {
  draft[flag] = !draft[flag]
  if (flag === 'read' && !draft.read) {
    draft.write = false
    draft.create = false
    draft.delete = false
    draft.export = false
    draft.print = false
    draft.share = false
  }
  if (['write', 'create', 'delete'].includes(flag) && draft[flag]) {
    draft.read = true
  }
  dirty.value = true
}

function savePerms() {
  saveRolePerms(selectedRole.value, selectedDoc.value, { ...draft })
  dirty.value = false
  toast.success(
    `${selectedRole.value} permissions saved for ${currentDocLabel.value}`,
  )
}

function resetDraft() {
  loadDraft()
  toast.info('Changes discarded')
}

function selectAll() {
  for (const flag of permissionFlags) draft[flag] = true
  dirty.value = true
}

function clearAll() {
  for (const flag of permissionFlags) draft[flag] = false
  dirty.value = true
}

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

const matrixPreview = computed(() =>
  documentTypes.slice(0, 10).map((doc) => {
    const row = getRolePerms(selectedRole.value, doc.key)
    const enabled = permissionFlags.filter((f) => row?.perms[f]).length
    return {
      key: doc.key,
      label: doc.label,
      enabled,
      total: permissionFlags.length,
      canDelete: Boolean(row?.perms.delete),
      canWrite: Boolean(row?.perms.write),
    }
  }),
)

function openRole(roleName: string) {
  selectedRole.value = roleName
  tab.value = 'roles'
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Users & Roles" />
    <div class="flex flex-wrap items-center gap-2">
      <Button
        icon-left="lucide-history"
        label="Activity Log"
        @click="router.push('/activity-log')"
      />
      <Button
        v-if="tab === 'roles'"
        variant="solid"
        icon-left="lucide-check"
        label="Update permissions"
        :disabled="!dirty"
        @click="savePerms"
      />
      <Button
        v-else
        variant="solid"
        icon-left="lucide-user-plus"
        label="Invite user"
        @click="inviteUser"
      />
    </div>
  </PageHeader>

  <div class="school-page" :class="tab === 'roles' ? 'max-w-5xl' : ''">
    <div class="space-y-3">
      <p class="text-p-base text-ink-gray-6">
        Manage desk users and the roles that control what they can do across
        Little Royals modules. Signed in as
        <span class="font-medium text-ink-gray-8">{{ currentUser.name }}</span>
        ({{ currentUser.role }}).
      </p>
      <ListStatCards :stats="tab === 'roles' ? roleStats : stats" />
    </div>

    <TabButtons v-model="tab" :options="tabs" />

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
              <ListCell>
                <div class="flex min-w-0 items-center gap-3 pe-2">
                  <Avatar :label="item.name" size="md" />
                  <div class="min-w-0 flex-1 space-y-0.5">
                    <p class="truncate text-sm-medium text-ink-gray-9">
                      {{ item.name }}
                      <span
                        v-if="item.email === currentUser.email"
                        class="text-xs text-ink-gray-5"
                        >(you)</span
                      >
                    </p>
                    <p class="truncate text-xs text-ink-gray-5 md:hidden">
                      {{ item.role }}
                    </p>
                  </div>
                </div>
              </ListCell>
              <ListCell class="hidden text-ink-gray-7 md:flex">
                <span class="block truncate" :title="item.email">{{
                  item.email
                }}</span>
              </ListCell>
              <ListCell class="hidden text-ink-gray-7 md:flex">
                <span class="block truncate" :title="item.role">{{
                  item.role
                }}</span>
              </ListCell>
              <ListCell>
                <Badge
                  :label="item.status"
                  :theme="statusTheme(item.status)"
                  variant="subtle"
                />
              </ListCell>
              <ListCell class="hidden text-ink-gray-7 md:flex">
                <span class="block truncate">{{
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

    <!-- Roles -->
    <template v-else>
      <section
        class="grid gap-3 rounded-6 border border-outline-gray-1 bg-surface-white p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <button
          v-for="role in roles"
          :key="role.id"
          type="button"
          class="rounded-5 border px-3.5 py-3 text-left transition"
          :class="
            selectedRole === role.name
              ? 'border-[color:var(--school-blue)] bg-[color:var(--school-blue-soft)]'
              : 'border-outline-gray-1 hover:bg-surface-gray-1'
          "
          @click="openRole(role.name)"
        >
          <div class="flex flex-wrap items-center gap-1.5">
            <p class="text-sm-medium text-ink-gray-9">{{ role.name }}</p>
            <Badge
              :label="role.status"
              :theme="role.status === 'Active' ? 'green' : 'gray'"
              variant="subtle"
            />
          </div>
          <p class="mt-1 text-xs text-ink-gray-5">{{ role.description }}</p>
        </button>
      </section>

      <section
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <FormControl
          v-model="selectedRole"
          label="Role"
          type="select"
          :options="roleOptions"
        />
        <FormControl
          v-model="selectedDoc"
          label="Document type"
          type="select"
          :options="docOptions"
        />
        <div v-if="currentRole" class="sm:col-span-2">
          <div class="flex flex-wrap items-center gap-2">
            <Badge
              :label="currentRole.deskAccess ? 'Desk access' : 'Portal only'"
              :theme="currentRole.deskAccess ? 'blue' : 'amber'"
              variant="subtle"
            />
            <p class="text-sm text-ink-gray-6">{{ currentRole.description }}</p>
          </div>
        </div>
      </section>

      <section class="school-section">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">
            Permissions · {{ selectedRole }} → {{ currentDocLabel }}
          </h2>
          <div class="flex flex-wrap gap-2">
            <Button label="Select all" @click="selectAll" />
            <Button label="Clear all" @click="clearAll" />
            <Button label="Discard" :disabled="!dirty" @click="resetDraft" />
          </div>
        </div>

        <div
          class="grid gap-0 overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white sm:grid-cols-2"
        >
          <button
            v-for="flag in permissionFlags"
            :key="flag"
            type="button"
            class="flex items-center justify-between gap-3 border-b border-outline-gray-1 px-4 py-3.5 text-left transition-colors hover:bg-surface-gray-1 sm:odd:border-e"
            @click="toggle(flag)"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">
                {{ permFlagLabels[flag] }}
              </p>
              <p class="mt-0.5 text-xs text-ink-gray-5">
                {{
                  flag === 'read'
                    ? 'View lists and detail pages'
                    : flag === 'write'
                      ? 'Edit and update existing records'
                      : flag === 'create'
                        ? 'Add new records'
                        : flag === 'delete'
                          ? 'Permanently remove records'
                          : flag === 'export'
                            ? 'Download CSV / reports'
                            : flag === 'print'
                              ? 'Print forms and reports'
                              : 'Share records with others'
                }}
              </p>
            </div>
            <Badge
              :label="draft[flag] ? 'Allowed' : 'Denied'"
              :theme="draft[flag] ? 'green' : 'red'"
              variant="subtle"
            />
          </button>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <Button
            variant="solid"
            icon-left="lucide-check"
            label="Update permissions"
            :disabled="!dirty"
            @click="savePerms"
          />
          <Button
            v-if="dirty"
            label="Discard changes"
            @click="resetDraft"
          />
        </div>
      </section>

      <section class="school-section">
        <h2 class="school-section-title">
          {{ selectedRole }} · module overview
        </h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="row in matrixPreview"
            :key="row.key"
            class="flex cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
            @click="selectedDoc = row.key"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ row.label }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ row.enabled }} of {{ row.total }} permissions enabled
              </p>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <Badge
                :label="row.canWrite ? 'Write' : 'Read only'"
                :theme="row.canWrite ? 'blue' : 'gray'"
                variant="subtle"
              />
              <Badge
                v-if="row.canDelete"
                label="Delete"
                theme="red"
                variant="subtle"
              />
              <Badge
                v-if="row.key === selectedDoc"
                label="Editing"
                theme="amber"
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
