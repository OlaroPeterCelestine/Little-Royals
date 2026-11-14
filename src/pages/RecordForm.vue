<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, PageHeader, PageHeaderTitle, toast } from 'frappe-ui'
import SchoolForm from '../components/forms/SchoolForm.vue'
import { buildFallbackForm, getFormSchema } from '../data/formSchemas'
import { addRecord, getLiveModule, updateRecord } from '../data/store'
import { useModuleAccess } from '../composables/useModuleAccess'
import type { RecordValues } from '../types/records'

const route = useRoute()
const router = useRouter()

const moduleKey = computed(() => String(route.params.module || ''))
const recordId = computed(() => {
  const id = route.params.id
  return id && id !== 'new' ? String(id) : ''
})
const isCreate = computed(() => !recordId.value)

const mod = computed(() => getLiveModule(moduleKey.value))
const schema = computed(() => {
  const custom = getFormSchema(moduleKey.value)
  if (custom) return custom
  if (!mod.value) return undefined
  return buildFallbackForm(
    moduleKey.value,
    mod.value.title,
    mod.value.singular,
    mod.value.columns,
  )
})
const row = computed(() =>
  recordId.value
    ? mod.value?.rows.find((r) => r.id === recordId.value)
    : undefined,
)

const { canCreate, canWrite, requirePerm } = useModuleAccess(moduleKey)
const saving = ref(false)

const initial = computed(() => {
  if (!row.value) return undefined
  return { ...row.value } as Record<string, unknown>
})

const title = computed(() => {
  if (!schema.value) return 'Form'
  return isCreate.value ? schema.value.title : `Edit ${schema.value.singular}`
})

function onCancel() {
  if (recordId.value) router.push(`/${moduleKey.value}/${recordId.value}`)
  else router.push(`/${moduleKey.value}`)
}

async function onSave(values: Record<string, unknown>, asDraft: boolean) {
  if (isCreate.value && !canCreate.value) {
    requirePerm('create')
    return
  }
  if (!isCreate.value && !canWrite.value) {
    requirePerm('write')
    return
  }
  if (!mod.value) {
    toast.error('Module not found')
    return
  }

  const payload: RecordValues = {}
  for (const [k, v] of Object.entries(values)) {
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean' ||
      v === null ||
      v === undefined
    ) {
      payload[k] = v
    } else if (Array.isArray(v)) {
      payload[k] = v.join(', ')
    } else {
      payload[k] = String(v)
    }
  }
  if (asDraft) payload.status = 'Draft'
  if (!payload.name && payload.firstName) {
    payload.name = `${payload.firstName} ${payload.lastName || ''}`.trim()
  }

  saving.value = true
  try {
    if (isCreate.value) {
      const created = addRecord(moduleKey.value, payload)
      toast.success(`${mod.value.singular} saved`)
      await router.replace(`/${moduleKey.value}/${created.id}`)
    } else {
      updateRecord(moduleKey.value, recordId.value, payload)
      toast.success('Changes saved')
      await router.push(`/${moduleKey.value}/${recordId.value}`)
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle :title="title" />
    <Button
      variant="ghost"
      icon-left="lucide-arrow-left"
      label="Back"
      @click="onCancel"
    />
  </PageHeader>

  <div class="school-page max-w-4xl">
    <div v-if="!schema" class="school-card space-y-3">
      <p class="text-p-base text-ink-gray-7">
        No full-page form schema for <strong>{{ moduleKey }}</strong> yet. Use
        the list page Add / Edit actions for this module.
      </p>
      <Button label="Open list" @click="router.push(`/${moduleKey}`)" />
    </div>

    <div v-else-if="!isCreate && !row" class="school-card">
      <p class="text-p-base text-ink-gray-7">Record not found.</p>
    </div>

    <SchoolForm
      v-else
      :schema="schema"
      :initial="initial"
      :saving="saving"
      @save="onSave"
      @cancel="onCancel"
    />
  </div>
</template>
