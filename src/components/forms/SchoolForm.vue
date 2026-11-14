<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Button } from 'frappe-ui'
import type { ModuleFormSpec } from '@/lib/forms/types'
import { getLiveModule } from '@/data/catalog/store'
import {
  learnerNumberFromStudentNumber,
  nextStudentNumber,
  schoolPayAccountFromStudentNumber,
} from '@/data/students/studentNumber'
import SchoolFormField from '@/components/forms/SchoolFormField.vue'

const props = defineProps<{
  schema: ModuleFormSpec
  initial?: Record<string, unknown>
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [values: Record<string, unknown>, asDraft: boolean]
  cancel: []
}>()

const values = reactive<Record<string, unknown>>({})

function resetFromInitial() {
  for (const key of Object.keys(values)) delete values[key]
  for (const section of props.schema.sections) {
    for (const field of section.fields) {
      const fromInitial = props.initial?.[field.name]
      if (fromInitial !== undefined) {
        values[field.name] = fromInitial
        continue
      }
      if (field.type === 'checkbox' || field.type === 'toggle') {
        values[field.name] = false
      } else if (field.type === 'multiselect') {
        values[field.name] = []
      } else if (field.name === 'status' && field.auto) {
        values[field.name] = 'Active'
      } else {
        values[field.name] = ''
      }
    }
  }
}

watch(
  () => [props.schema.module, props.initial] as const,
  () => resetFromInitial(),
  { immediate: true, deep: true },
)

watch(
  () => [values.firstName, values.lastName] as const,
  ([first, last]) => {
    if (!props.schema.sections.some((s) => s.fields.some((f) => f.name === 'name' && f.auto)))
      return
    const full = `${String(first || '').trim()} ${String(last || '').trim()}`.trim()
    if (full) values.name = full
  },
)

watch(
  () => [props.schema.module, values.admissionDate, props.initial?.id] as const,
  () => {
    if (props.schema.module !== 'students') return
    if (props.initial?.id) return
    const hasAutoId = props.schema.sections.some((s) =>
      s.fields.some((f) => f.name === 'id' && f.auto),
    )
    if (!hasAutoId) return
    const existing =
      getLiveModule('students')?.rows.map((r) => r.id) || []
    const studentNumber = nextStudentNumber(
      existing,
      String(values.admissionDate || '') || null,
    )
    values.id = studentNumber
    values.studentNumber = studentNumber
    if (!String(values.learnerNumber || '').trim()) {
      values.learnerNumber = learnerNumberFromStudentNumber(studentNumber)
    }
    if (!String(values.schoolPayAccount || '').trim()) {
      values.schoolPayAccount =
        schoolPayAccountFromStudentNumber(studentNumber)
    }
  },
  { immediate: true },
)

watch(
  () => values.id,
  (id) => {
    if (props.schema.module !== 'students') return
    const sn = String(id || '').trim()
    if (!sn) return
    values.studentNumber = sn
  },
)

const missingRequired = computed(() => {
  const missing: string[] = []
  for (const section of props.schema.sections) {
    for (const field of section.fields) {
      if (!field.required || field.auto || field.type === 'readonly') continue
      if (field.when) {
        const current = String(values[field.when.field] ?? '')
        if (!field.when.in.includes(current)) continue
      }
      const v = values[field.name]
      if (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length)) {
        missing.push(field.label)
      }
    }
  }
  return missing
})

function submit(asDraft: boolean) {
  if (!asDraft && missingRequired.value.length) return
  // Values are sanitized live in SchoolFormField; pass a plain copy.
  emit('save', { ...values }, asDraft)
}
</script>

<template>
  <form class="school-form space-y-8" @submit.prevent="submit(false)">
    <section
      v-for="section in schema.sections"
      :key="section.title"
      class="school-section rounded-6 border border-outline-gray-1 bg-surface-white p-5"
    >
      <div class="mb-4 space-y-1">
        <h2 class="school-section-title">{{ section.title }}</h2>
        <p v-if="section.description" class="text-sm text-ink-gray-6">
          {{ section.description }}
        </p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <SchoolFormField
          v-for="field in section.fields"
          :key="field.name"
          :field="field"
          :model-value="values[field.name] as string | number | boolean | string[]"
          :values="values"
          :class="
            field.type === 'textarea' || field.type === 'file'
              ? 'sm:col-span-2'
              : ''
          "
          @update:model-value="(v) => (values[field.name] = v)"
        />
      </div>
    </section>

    <p v-if="missingRequired.length" class="text-sm text-ink-red-7">
      Required: {{ missingRequired.join(', ') }}
    </p>

    <div class="flex flex-wrap gap-2">
      <Button
        type="submit"
        variant="solid"
        theme="blue"
        label="Save"
        :loading="saving"
        :disabled="!!missingRequired.length"
      />
      <Button
        v-if="schema.draft"
        type="button"
        variant="subtle"
        label="Save as draft"
        :disabled="saving"
        @click="submit(true)"
      />
      <Button type="button" variant="ghost" label="Cancel" @click="emit('cancel')" />
    </div>
  </form>
</template>
