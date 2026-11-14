import { computed, type MaybeRef, unref } from 'vue'
import type { PermFlag } from '../data/permissions'
import { canAccessModule, canAccessPath } from '../lib/accessControl'
import { currentUser } from '../data/activity'

/** Reactive permission checks — re-evaluate when the signed-in role changes. */
export function useCanAccess(
  moduleOrPath: MaybeRef<string | string[]>,
  flag: MaybeRef<PermFlag> = 'read',
  options?: { asPath?: boolean },
) {
  const allowed = computed(() => {
    // Depend on role so UI updates after login / role switch
    void currentUser.role
    const target = unref(moduleOrPath)
    const perm = unref(flag)
    if (options?.asPath) {
      return canAccessPath(String(Array.isArray(target) ? target[0] : target), perm)
    }
    return canAccessModule(target, perm)
  })

  return { allowed, can: allowed }
}

export function useModuleFlags(moduleKey: MaybeRef<string>) {
  return {
    canRead: computed(() => {
      void currentUser.role
      return canAccessModule(unref(moduleKey), 'read')
    }),
    canCreate: computed(() => {
      void currentUser.role
      return canAccessModule(unref(moduleKey), 'create')
    }),
    canWrite: computed(() => {
      void currentUser.role
      return canAccessModule(unref(moduleKey), 'write')
    }),
    canDelete: computed(() => {
      void currentUser.role
      return canAccessModule(unref(moduleKey), 'delete')
    }),
    canPrint: computed(() => {
      void currentUser.role
      return canAccessModule(unref(moduleKey), 'print')
    }),
    canExport: computed(() => {
      void currentUser.role
      return canAccessModule(unref(moduleKey), 'export')
    }),
    canShare: computed(() => {
      void currentUser.role
      return canAccessModule(unref(moduleKey), 'share')
    }),
  }
}
