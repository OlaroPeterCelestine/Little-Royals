import { computed, unref, type MaybeRef } from 'vue'
import { canCurrentUser, type PermFlag } from '../data/permissions'
import { currentUser } from '../data/activity'
import { toast } from 'frappe-ui'

/** Live create / write / delete / print flags for a module, based on Role Permissions. */
export function useModuleAccess(moduleKey: MaybeRef<string>) {
  const key = computed(() => unref(moduleKey))

  const canRead = computed(() => canCurrentUser(key.value, 'read'))
  const canCreate = computed(() => canCurrentUser(key.value, 'create'))
  const canWrite = computed(() => canCurrentUser(key.value, 'write'))
  const canDelete = computed(() => canCurrentUser(key.value, 'delete'))
  const canPrint = computed(() => canCurrentUser(key.value, 'print'))
  const canExport = computed(() => canCurrentUser(key.value, 'export'))

  function requirePerm(flag: PermFlag, label?: string) {
    if (canCurrentUser(key.value, flag)) return true
    toast.error(
      `Your role (${currentUser.role || 'Guest'}) cannot ${label || flag} here`,
    )
    return false
  }

  return {
    canRead,
    canCreate,
    canWrite,
    canDelete,
    canPrint,
    canExport,
    requirePerm,
  }
}
