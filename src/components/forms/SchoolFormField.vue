<script setup lang="ts">
import { computed } from 'vue'
import { FormControl } from 'frappe-ui'
import type { FormFieldSpec } from '../../lib/forms/types'
import { getLiveModule } from '../../data/store'
import { compareSchoolClasses } from '../../data/grades'
import {
  sanitizeNumber,
  sanitizeText,
  type SanitizeKind,
} from '../../lib/sanitize'

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

const isDropdown = computed(
  () =>
    Boolean(props.field.optionsFrom) ||
    Boolean(props.field.options?.length) ||
    ['select', 'search', 'radio'].includes(props.field.type),
)

const options = computed(() => {
  if (props.field.options?.length) return props.field.options
  if (props.field.optionsFrom) {
    const mod = getLiveModule(props.field.optionsFrom)
    const useId = props.field.optionsValue === 'id'
    const seen = new Set<string>()
    let out: { label: string; value: string }[] = []
    for (const r of mod?.rows || []) {
      const value = useId ? r.id : String(r.name || '').trim()
      if (!value || seen.has(value)) continue
      seen.add(value)
      out.push({
        label: r.name ? String(r.name) : value,
        value,
      })
    }
    if (props.field.optionsFrom === 'classes' && !useId) {
      out = out
        .slice()
        .sort((a, b) => compareSchoolClasses(a.label, b.label))
    } else {
      out = out.slice().sort((a, b) => a.label.localeCompare(b.label))
    }
    return out
  }
  return []
})

const controlType = computed(() => {
  if (isDropdown.value) return 'select'
  switch (props.field.type) {
    case 'textarea':
      return 'textarea'
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

function sanitizeKind(): SanitizeKind {
  const t = props.field.type
  if (t === 'email') return 'email'
  if (t === 'phone') return 'phone'
  if (t === 'number' || t === 'currency') return 'number'
  if (t === 'date') return 'date'
  if (t === 'time') return 'time'
  if (t === 'textarea') return 'textarea'
  if (t === 'select' || t === 'search' || t === 'radio') return 'select'
  if (
    props.field.name === 'name' ||
    props.field.name === 'firstName' ||
    props.field.name === 'lastName' ||
    props.field.name === 'otherNames'
  ) {
    return 'name'
  }
  if (props.field.name === 'id' || props.field.name.endsWith('Number')) {
    return 'id'
  }
  return 'text'
}

function onUpdate(v: unknown) {
  if (typeof v === 'boolean') {
    emit('update:modelValue', v)
    return
  }
  if (Array.isArray(v)) {
    emit(
      'update:modelValue',
      v.map((item) => sanitizeText(item, 'select', 200)),
    )
    return
  }
  const kind = sanitizeKind()
  if (kind === 'number') {
    const n = sanitizeNumber(v)
    emit('update:modelValue', n === '' ? '' : n)
    return
  }
  emit('update:modelValue', sanitizeText(v, kind))
}
</script>

<template>
  <div v-if="visible" class="school-form-field space-y-1.5">
    <FormControl
      v-if="field.type !== 'file' && field.type !== 'multiselect'"
      :type="controlType"
      :label="`${field.label}${field.required ? ' *' : ''}`"
      :model-value="modelValue as string | number | boolean"
      :placeholder="
        isDropdown ? `Select ${field.label.toLowerCase()}…` : field.placeholder
      "
      :options="isDropdown ? options : undefined"
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
            Array.from(
              ($event.target as HTMLSelectElement).selectedOptions,
            ).map((o) => o.value),
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
          onUpdate(($event.target as HTMLInputElement).files?.[0]?.name || '')
        "
      />
      <p v-if="field.help" class="text-xs text-ink-gray-5">{{ field.help }}</p>
    </div>
  </div>
</template>
