<script setup lang="ts">
import { computed } from 'vue'
import { FormControl } from 'frappe-ui'
import type { FormFieldSpec } from '../../lib/forms/types'
import { getLiveModule } from '../../data/store'

const props = defineProps<{
  field: FormFieldSpec
  modelValue: string | number | boolean | string[] | null | undefined
  values: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean | string[]]
}>()

const visible = computed(() => {
  const when = props.field.when
  if (!when) return true
  const current = String(props.values[when.field] ?? '')
  return when.in.includes(current)
})

const options = computed(() => {
  if (props.field.options?.length) return props.field.options
  if (props.field.optionsFrom) {
    const mod = getLiveModule(props.field.optionsFrom)
    return (mod?.rows || []).map((r) => ({
      label: r.name,
      value: r.id,
    }))
  }
  return []
})

const controlType = computed(() => {
  switch (props.field.type) {
    case 'textarea':
      return 'textarea'
    case 'select':
    case 'search':
    case 'radio':
      return 'select'
    case 'number':
    case 'currency':
      return 'number'
    case 'date':
      return 'date'
    case 'time':
      return 'time'
    case 'email':
      return 'email'
    case 'checkbox':
    case 'toggle':
      return 'checkbox'
    case 'readonly':
      return 'text'
    default:
      return 'text'
  }
})

function onUpdate(v: unknown) {
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    emit('update:modelValue', v)
    return
  }
  emit('update:modelValue', String(v ?? ''))
}
</script>

<template>
  <div v-if="visible" class="school-form-field space-y-1.5">
    <FormControl
      v-if="field.type !== 'file' && field.type !== 'multiselect'"
      :type="controlType"
      :label="`${field.label}${field.required ? ' *' : ''}`"
      :model-value="modelValue as string | number | boolean"
      :placeholder="field.placeholder"
      :options="
        ['select', 'search', 'radio'].includes(field.type)
          ? options
          : undefined
      "
      :disabled="field.readOnly || field.auto || field.type === 'readonly'"
      :description="field.help"
      @update:model-value="onUpdate"
    />

    <div v-else-if="field.type === 'multiselect'" class="space-y-1">
      <p class="text-sm font-medium text-ink-gray-8">
        {{ field.label }}{{ field.required ? ' *' : '' }}
      </p>
      <select
        class="w-full rounded-md border border-outline-gray-2 bg-surface-white px-3 py-2 text-sm"
        multiple
        :value="Array.isArray(modelValue) ? modelValue : []"
        @change="
          onUpdate(
            Array.from(($event.target as HTMLSelectElement).selectedOptions).map(
              (o) => o.value,
            ),
          )
        "
      >
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <p v-if="field.help" class="text-xs text-ink-gray-5">{{ field.help }}</p>
    </div>

    <div v-else class="space-y-1">
      <p class="text-sm font-medium text-ink-gray-8">
        {{ field.label }}{{ field.required ? ' *' : '' }}
      </p>
      <input
        type="file"
        class="block w-full text-sm text-ink-gray-6"
        @change="
          onUpdate(
            ($event.target as HTMLInputElement).files?.[0]?.name || '',
          )
        "
      />
      <p v-if="field.help" class="text-xs text-ink-gray-5">{{ field.help }}</p>
    </div>
  </div>
</template>
