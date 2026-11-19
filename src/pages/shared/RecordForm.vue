<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PageHeader, PageHeaderTitle, toast } from 'frappe-ui'
import { getLiveModule } from '@/data/catalog/store'
import {
  openCreateDialog,
  openEditDialog,
} from '@/composables/useModuleForms'
import { personDetailPath, personListPath } from '@/lib/personRoutes'
import { ensureModule } from '@/data/catalog/catalogSync'
import { isApiEnabled } from '@/lib/apiMode'

/**
 * Legacy /:module/new and /:module/:id/edit routes — bounce into the shared
 * popup modal so New/Edit always feel the same.
 */
const route = useRoute()
const router = useRouter()

const moduleKey = computed(() => String(route.params.module || ''))
const recordId = computed(() => {
  const id = route.params.id
  return id && id !== 'new' ? String(id) : ''
})
const isCreate = computed(() => !recordId.value)
const mod = computed(() => getLiveModule(moduleKey.value))
const row = computed(() =>
  recordId.value
    ? mod.value?.rows.find((r) => r.id === recordId.value)
    : undefined,
)

onMounted(async () => {
  const key = moduleKey.value
  if (!key) {
    void router.replace('/')
    return
  }

  if (isApiEnabled()) {
    await ensureModule(key, { force: true })
  }

  if (isCreate.value) {
    openCreateDialog(key)
  } else {
    const current = getLiveModule(key)?.rows.find((r) => r.id === recordId.value)
    if (current) openEditDialog(key, current)
    else toast.error('Record not found — open it from the list to edit')
  }

  // Always land on the list/detail page with the modal open — never history.back(),
  // which can bounce to login/dashboard when /new was opened cold or after redirect.
  const target = recordId.value
    ? personDetailPath(key, recordId.value)
    : personListPath(key)
  void router.replace(target)
})
</script>

<template>
  <PageHeader>
    <PageHeaderTitle :title="isCreate ? 'New record' : 'Edit record'" />
  </PageHeader>
  <div class="school-page">
    <p class="text-sm text-ink-gray-5">Opening form…</p>
  </div>
</template>
