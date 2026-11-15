<script setup lang="ts">
import { reactive, watch } from 'vue'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { Button, FormControl } from 'frappe-ui'

const props = defineProps<{
  title?: string
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

type CellMap = Record<string, string>
const cols = ['A', 'B', 'C', 'D', 'E', 'F']
const rows = [1, 2, 3, 4, 5, 6, 7, 8]

function parse(raw?: string): CellMap {
  try {
    const data = JSON.parse(raw || '{}') as CellMap
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

const cells = reactive<CellMap>(parse(props.modelValue))

watch(
  () => props.modelValue,
  (v) => {
    const next = parse(v)
    for (const k of Object.keys(cells)) delete cells[k]
    Object.assign(cells, next)
  },
)

function setCell(key: string, value: string) {
  cells[key] = value
  emit('update:modelValue', JSON.stringify({ ...cells }))
}

function exportXlsx() {
  const aoa = rows.map((r) => cols.map((c) => cells[`${c}${r}`] || ''))
  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1')
  const out = XLSX.write(book, { bookType: 'xlsx', type: 'array' })
  saveAs(
    new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${props.title || 'school-sheet'}.xlsx`,
  )
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex justify-end">
      <Button
        label="Export Excel"
        variant="subtle"
        icon-left="lucide-download"
        @click="exportXlsx"
      />
    </div>
    <div class="overflow-x-auto rounded-6 border border-outline-gray-1">
      <table class="min-w-full border-collapse text-sm">
        <thead>
          <tr class="bg-surface-gray-1">
            <th class="w-10 border border-outline-gray-1 p-2" />
            <th
              v-for="c in cols"
              :key="c"
              class="border border-outline-gray-1 p-2 text-center"
            >
              {{ c }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r">
            <td
              class="border border-outline-gray-1 bg-surface-gray-1 p-2 text-center text-ink-gray-6"
            >
              {{ r }}
            </td>
            <td
              v-for="c in cols"
              :key="`${c}${r}`"
              class="border border-outline-gray-1 p-1"
            >
              <FormControl
                type="text"
                :model-value="cells[`${c}${r}`] || ''"
                @update:model-value="setCell(`${c}${r}`, String($event || ''))"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
