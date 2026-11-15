<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { Button, FormControl, toast } from 'frappe-ui'
import type { CatalogRow } from '@/data/catalog/catalog'
import { addRecord, updateRecord } from '@/data/catalog/store'

const props = defineProps<{
  cards: CatalogRow[]
}>()

const title = ref('')
const busy = ref(false)
const columns = ['Todo', 'Doing', 'Done'] as const

const byColumn = computed(() => {
  const map: Record<string, CatalogRow[]> = {
    Todo: [],
    Doing: [],
    Done: [],
  }
  for (const card of props.cards) {
    const col = String(card.column || 'Todo')
    if (map[col]) map[col].push(card)
    else map.Todo.push(card)
  }
  return map
})

async function addCard() {
  const name = title.value.trim()
  if (!name) return
  busy.value = true
  try {
    await addRecord('task-cards', { name, column: 'Todo', status: 'Open' })
    title.value = ''
    toast.success('Card saved on server')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save')
  } finally {
    busy.value = false
  }
}

async function onDrop(column: string, list: CatalogRow[]) {
  for (const card of list) {
    if (String(card.column) === column) continue
    try {
      await updateRecord('task-cards', card.id, {
        name: card.name,
        column,
        status: card.status || 'Open',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not move card')
    }
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <FormControl
        v-model="title"
        type="text"
        placeholder="New card"
        class="min-w-[200px] flex-1"
      />
      <Button
        label="Add"
        variant="solid"
        theme="blue"
        :loading="busy"
        @click="addCard"
      />
    </div>
    <div class="grid gap-3 md:grid-cols-3">
      <div
        v-for="col in columns"
        :key="col"
        class="rounded-6 border border-outline-gray-1 bg-surface-gray-1 p-3"
      >
        <p class="mb-2 text-sm-semibold text-ink-gray-8">{{ col }}</p>
        <draggable
          :list="byColumn[col]"
          item-key="id"
          group="school-board"
          class="min-h-[120px] space-y-2"
          @change="onDrop(col, byColumn[col])"
        >
          <template #item="{ element }">
            <div
              class="cursor-grab rounded-5 bg-surface-white p-3 text-sm shadow-sm"
            >
              {{ element.name }}
            </div>
          </template>
        </draggable>
      </div>
    </div>
  </div>
</template>
