<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Button, toast } from 'frappe-ui'
import SchoolForm from '@/components/forms/SchoolForm.vue'
import {
  closeRecordFormModal,
  recordFormModal,
} from '@/composables/useModuleForms'
import { buildFallbackForm, getFormSchema } from '@/data/catalog/formSchemas'
import { addRecord, getLiveModule, updateRecord } from '@/data/catalog/store'
import type { RecordValues } from '@/types/records'
import { canCurrentUser } from '@/data/auth/permissions'
import { sanitizeRecordValues } from '@/lib/sanitize'

const saving = ref(false)

const mod = computed(() =>
  recordFormModal.moduleKey
    ? getLiveModule(recordFormModal.moduleKey)
    : undefined,
)

const schema = computed(() => {
  const key = recordFormModal.moduleKey
  if (!key || !mod.value) return undefined
  return (
    getFormSchema(key) ||
    buildFallbackForm(
      key,
      mod.value.title,
      mod.value.singular,
      mod.value.columns,
    )
  )
})

const row = computed(() => {
  if (!recordFormModal.recordId || !mod.value) return undefined
  return mod.value.rows.find((r) => r.id === recordFormModal.recordId)
})

const isCreate = computed(() => !recordFormModal.recordId)

const title = computed(() => {
  if (!schema.value) return 'Form'
  if (isCreate.value) return schema.value.title
  return `Edit ${schema.value.singular}`
})

const initial = computed(() => {
  if (!row.value) return undefined
  return { ...row.value } as Record<string, unknown>
})

watch(
  () => recordFormModal.open,
  (open) => {
    if (open) saving.value = false
    document.body.classList.toggle('school-modal-open', open)
  },
)

onUnmounted(() => {
  document.body.classList.remove('school-modal-open')
})

function onCancel() {
  closeRecordFormModal()
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget && !saving.value) onCancel()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && recordFormModal.open && !saving.value) onCancel()
}

watch(
  () => recordFormModal.open,
  (open) => {
    if (typeof window === 'undefined') return
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)

async function onSave(values: Record<string, unknown>, asDraft: boolean) {
  const key = recordFormModal.moduleKey
  if (!key || !mod.value || !schema.value) return

  if (isCreate.value && !canCurrentUser(key, 'create')) {
    toast.error('Your role cannot create here')
    return
  }
  if (!isCreate.value && !canCurrentUser(key, 'write')) {
    toast.error('Your role cannot edit here')
    return
  }

  const cleaned = sanitizeRecordValues(values)
  const payload: RecordValues = {}
  for (const [k, v] of Object.entries(cleaned)) {
    if (
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean' ||
      v === null ||
      v === undefined
    ) {
      payload[k] = v as string | number | boolean | null | undefined
    } else if (Array.isArray(v)) {
      payload[k] = v.map(String).join(', ')
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
      const created = await addRecord(key, payload)
      toast.success(`${mod.value.singular} “${created.name}” created`)
      recordFormModal.onSaved?.(created)
    } else if (recordFormModal.recordId) {
      const updated = await updateRecord(
        key,
        recordFormModal.recordId,
        payload,
      )
      toast.success(`${mod.value.singular} “${updated.name}” updated`)
      recordFormModal.onSaved?.(updated)
    }
    closeRecordFormModal()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="recordFormModal.open"
      class="school-form-modal-root"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @mousedown="onBackdrop"
    >
      <div class="school-form-modal">
        <header class="school-form-modal__head">
          <div class="min-w-0">
            <p class="text-xs uppercase tracking-wide text-ink-gray-5">
              {{ isCreate ? 'New record' : 'Edit record' }}
            </p>
            <h2 class="truncate text-lg font-semibold text-ink-gray-9">
              {{ title }}
            </h2>
          </div>
          <Button
            icon="lucide-x"
            variant="ghost"
            aria-label="Close"
            :disabled="saving"
            @click="onCancel"
          />
        </header>

        <div class="school-form-modal__body">
          <p v-if="!schema" class="text-sm text-ink-gray-6">
            No form available for this module.
          </p>
          <p
            v-else-if="!isCreate && !row"
            class="text-sm text-ink-gray-6"
          >
            Record not found.
          </p>
          <SchoolForm
            v-else
            :key="`${recordFormModal.moduleKey}:${recordFormModal.recordId || 'new'}`"
            :schema="schema"
            :initial="initial"
            :saving="saving"
            @save="onSave"
            @cancel="onCancel"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
