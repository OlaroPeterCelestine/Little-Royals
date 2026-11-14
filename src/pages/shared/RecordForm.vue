<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PageHeader, PageHeaderTitle } from 'frappe-ui'
import { getLiveModule } from '@/data/catalog/store'
import {
  openCreateDialog,
  openEditDialog,
} from '@/composables/useModuleForms'
import { personDetailPath, personListPath } from '@/lib/personRoutes'
import { useAppBack } from '@/composables/useAppBack'

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

const { goBack } = useAppBack(() =>
  recordId.value
    ? personDetailPath(moduleKey.value, recordId.value)
    : personListPath(moduleKey.value),
)

onMounted(() => {
  const key = moduleKey.value
  if (!key) {
    void router.replace('/')
    return
  }
  if (isCreate.value) {
    openCreateDialog(key)
  } else if (row.value) {
    openEditDialog(key, row.value)
  }
  goBack()
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
