<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Button } from 'frappe-ui'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit,
    Underline,
    Link.configure({ openOnClick: false }),
    Placeholder.configure({
      placeholder: props.placeholder || 'Start writing…',
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
  },
})

watch(
  () => props.modelValue,
  (html) => {
    if (!editor.value) return
    if (editor.value.getHTML() === html) return
    editor.value.commands.setContent(html || '', { emitUpdate: false })
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function run(cmd: () => void) {
  cmd()
  editor.value?.chain().focus().run()
}
</script>

<template>
  <div class="rounded-6 border border-outline-gray-1 bg-surface-white">
    <div
      v-if="editor"
      class="flex flex-wrap gap-1 border-b border-outline-gray-1 p-2"
    >
      <Button
        label="B"
        size="sm"
        :variant="editor.isActive('bold') ? 'solid' : 'subtle'"
        @click="run(() => editor!.chain().focus().toggleBold().run())"
      />
      <Button
        label="I"
        size="sm"
        :variant="editor.isActive('italic') ? 'solid' : 'subtle'"
        @click="run(() => editor!.chain().focus().toggleItalic().run())"
      />
      <Button
        label="U"
        size="sm"
        :variant="editor.isActive('underline') ? 'solid' : 'subtle'"
        @click="run(() => editor!.chain().focus().toggleUnderline().run())"
      />
      <Button
        label="H2"
        size="sm"
        variant="subtle"
        @click="
          run(() => editor!.chain().focus().toggleHeading({ level: 2 }).run())
        "
      />
      <Button
        label="List"
        size="sm"
        variant="subtle"
        @click="run(() => editor!.chain().focus().toggleBulletList().run())"
      />
      <Button
        label="Table"
        size="sm"
        variant="subtle"
        @click="
          run(() =>
            editor!
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
          )
        "
      />
    </div>
    <EditorContent class="cloud-doc-editor min-h-[220px] p-4" :editor="editor" />
  </div>
</template>

<style scoped>
.cloud-doc-editor :deep(.tiptap) {
  min-height: 200px;
  outline: none;
}
.cloud-doc-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
.cloud-doc-editor :deep(table) {
  border-collapse: collapse;
  width: 100%;
}
.cloud-doc-editor :deep(td),
.cloud-doc-editor :deep(th) {
  border: 1px solid #e5e7eb;
  padding: 0.4rem 0.5rem;
}
</style>
