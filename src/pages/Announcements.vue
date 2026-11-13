<script setup lang="ts">
import { ref } from 'vue'
import {
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  dialog,
  toast,
} from 'frappe-ui'
import {
  Editor,
  EditorContent,
  EditorFixedMenu,
  RichTextKit,
  articleToolbar,
} from 'frappe-ui/editor'
import { defaultAnnouncement } from '../data/school'
import { logActivity } from '../data/activity'

const title = ref('Weekly assembly notice')
const content = ref(defaultAnnouncement)
const extensions = [RichTextKit]
const lastPublished = ref<string | null>(null)

try {
  const raw = localStorage.getItem('pearl-last-announcement')
  if (raw) {
    const parsed = JSON.parse(raw) as { title?: string; at?: string }
    if (parsed.at) lastPublished.value = parsed.at
  }
} catch {
  /* ignore */
}

function publish() {
  const heading = title.value.trim()
  if (!heading) {
    toast.error('Title is required')
    return
  }
  if (!String(content.value || '').trim()) {
    toast.error('Announcement body cannot be empty')
    return
  }

  dialog.confirm({
    title: 'Publish announcement?',
    message: `Publish “${heading}” to parents and teachers for Little Royals Kindergarten and Primary School?`,
    icon: 'lucide-send',
    theme: 'blue',
    confirmLabel: 'Publish',
    onConfirm: async () => {
      const at = new Date().toISOString()
      localStorage.setItem(
        'pearl-last-announcement',
        JSON.stringify({
          title: heading,
          content: content.value,
          at,
        }),
      )
      lastPublished.value = at
      logActivity({
        action: 'Published',
        module: 'announcements',
        moduleLabel: 'Announcements',
        recordName: heading,
        summary: `Published announcement ${heading}`,
        severity: 'success',
      })
      toast.success('Announcement published to parents and teachers')
    },
  })
}

function saveDraft() {
  const heading = title.value.trim() || 'Untitled draft'
  localStorage.setItem(
    'pearl-announcement-draft',
    JSON.stringify({
      title: heading,
      content: content.value,
      at: new Date().toISOString(),
    }),
  )
  toast.info('Draft saved on this device')
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Announcements" />
    <div class="flex items-center gap-2">
      <Button icon-left="lucide-save" label="Save draft" @click="saveDraft" />
      <Button
        variant="solid"
        icon-left="lucide-send"
        label="Publish"
        @click="publish"
      />
    </div>
  </PageHeader>

  <div class="school-page mx-auto max-w-3xl">
    <p v-if="lastPublished" class="text-xs text-ink-gray-5">
      Last published {{ new Date(lastPublished).toLocaleString() }}
    </p>

    <FormControl
      v-model="title"
      label="Title"
      placeholder="Announcement title"
    />

    <div class="space-y-2">
      <p class="text-xs text-ink-gray-5">Body</p>
      <div
        class="overflow-hidden rounded-6 border border-outline-gray-2 bg-surface-white"
      >
        <Editor
          v-model="content"
          :extensions="extensions"
          format="html"
          placeholder="Write the school announcement…"
        >
          <div
            class="border-b border-outline-gray-1 bg-surface-gray-1 px-2 py-1.5"
          >
            <EditorFixedMenu :items="articleToolbar" size="sm" />
          </div>
          <EditorContent class="min-h-56 px-4 py-3" />
        </Editor>
      </div>
    </div>
  </div>
</template>
