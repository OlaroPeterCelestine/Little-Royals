<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, FormControl } from 'frappe-ui'
import CloudDocEditor from '@/components/cloud/CloudDocEditor.vue'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

type Slide = { title: string; body: string }

function parse(raw?: string): Slide[] {
  try {
    const data = JSON.parse(raw || '[]') as Slide[]
    return Array.isArray(data) && data.length
      ? data
      : [{ title: 'Slide 1', body: '<p>Welcome</p>' }]
  } catch {
    return [{ title: 'Slide 1', body: '<p>Welcome</p>' }]
  }
}

const slides = ref<Slide[]>(parse(props.modelValue))
const index = ref(0)

watch(
  () => props.modelValue,
  (v) => {
    slides.value = parse(v)
    if (index.value >= slides.value.length) index.value = 0
  },
)

function persist() {
  emit('update:modelValue', JSON.stringify(slides.value))
}

const current = computed(() => slides.value[index.value])

function addSlide() {
  slides.value.push({
    title: `Slide ${slides.value.length + 1}`,
    body: '<p></p>',
  })
  index.value = slides.value.length - 1
  persist()
}

function updateTitle(v: string) {
  if (!current.value) return
  current.value.title = v
  persist()
}

function updateBody(v: string) {
  if (!current.value) return
  current.value.body = v
  persist()
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <Button
        v-for="(s, i) in slides"
        :key="i"
        :label="s.title || `Slide ${i + 1}`"
        size="sm"
        :variant="i === index ? 'solid' : 'subtle'"
        @click="index = i"
      />
      <Button label="Add slide" size="sm" variant="subtle" @click="addSlide" />
    </div>
    <FormControl
      v-if="current"
      type="text"
      :model-value="current.title"
      @update:model-value="updateTitle(String($event || ''))"
    />
    <CloudDocEditor
      v-if="current"
      :model-value="current.body"
      placeholder="Slide content…"
      @update:model-value="updateBody"
    />
  </div>
</template>
