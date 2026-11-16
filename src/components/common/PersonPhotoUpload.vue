<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, toast } from 'frappe-ui'
import {
  resolvePersonPhotoSrc,
  uploadPersonPhoto,
} from '@/lib/personPhoto'
import { updateRecord } from '@/data/catalog/store'
import type { CatalogRow } from '@/data/catalog/catalog'

const props = withDefaults(
  defineProps<{
    /** Current photo field value (file:id, data URL, or http). */
    modelValue?: string
    personName?: string
    personId?: string
    /** When set with personId, saves photo onto the catalog record after upload. */
    moduleKey?: string
    person?: CatalogRow | null
    folder?: string
    size?: 'md' | 'lg' | 'xl'
    canEdit?: boolean
  }>(),
  {
    folder: 'Photos',
    size: 'xl',
    canEdit: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [string]
  saved: [string]
}>()

const preview = ref('')
const uploading = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

const displayName = computed(
  () => props.personName || String(props.person?.name || 'Person'),
)
const photoValue = computed(
  () =>
    props.modelValue ||
    String(props.person?.photo || '') ||
    '',
)

watch(
  photoValue,
  async (v) => {
    preview.value = await resolvePersonPhotoSrc(
      v,
      displayName.value,
      props.personId || String(props.person?.id || ''),
    )
  },
  { immediate: true },
)

async function onPick(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const value = await uploadPersonPhoto(file, props.folder)
    emit('update:modelValue', value)

    if (props.moduleKey && (props.personId || props.person?.id)) {
      const id = String(props.personId || props.person!.id)
      const name = displayName.value
      await updateRecord(props.moduleKey, id, {
        name,
        photo: value,
      })
      toast.success('Photo saved for identification')
    } else {
      toast.success('Photo ready — save the record to keep it')
    }
    emit('saved', value)
    preview.value = await resolvePersonPhotoSrc(value, displayName.value, idSafe())
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Photo upload failed')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function idSafe() {
  return props.personId || String(props.person?.id || '')
}

async function clearPhoto() {
  emit('update:modelValue', '')
  if (props.moduleKey && (props.personId || props.person?.id)) {
    try {
      await updateRecord(props.moduleKey, idSafe(), {
        name: displayName.value,
        photo: '',
      })
      toast.success('Photo removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove photo')
      return
    }
  }
  preview.value = await resolvePersonPhotoSrc(
    '',
    displayName.value,
    idSafe(),
  )
  emit('saved', '')
}
</script>

<template>
  <div class="inline-flex flex-col items-center gap-2">
    <button
      type="button"
      class="relative overflow-hidden rounded-full ring-2 ring-outline-gray-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4"
      :class="
        size === 'xl'
          ? 'size-28'
          : size === 'lg'
            ? 'size-20'
            : 'size-16'
      "
      :disabled="!canEdit || uploading"
      :title="canEdit ? 'Upload identification photo' : displayName"
      @click="canEdit && inputEl?.click()"
    >
      <img
        :src="preview"
        :alt="displayName"
        class="size-full object-cover"
      />
      <span
        v-if="canEdit"
        class="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[10px] font-medium text-white"
      >
        {{ uploading ? '…' : 'Photo' }}
      </span>
    </button>
    <input
      ref="inputEl"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      title="Images are compressed to WebP on upload"
      class="hidden"
      @change="onPick"
    />
    <div v-if="canEdit" class="flex gap-2">
      <Button
        label="Upload"
        size="sm"
        variant="subtle"
        :loading="uploading"
        @click="inputEl?.click()"
      />
      <Button
        v-if="photoValue"
        label="Remove"
        size="sm"
        variant="ghost"
        theme="red"
        @click="clearPhoto"
      />
    </div>
  </div>
</template>
