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
import { defaultAnnouncement } from '../data/school'
import { logActivity } from '../data/activity'
import ListToolbar from '../components/ListToolbar.vue'

function plainText(value: unknown) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const title = ref('Weekly assembly notice')
const content = ref(
  plainText(defaultAnnouncement) ||
    'Dear parents and teachers,\n\nPlease note this week’s school updates.',
)
const lastPublished = ref<string | null>(null)

try {
  const raw = localStorage.getItem('pearl-last-announcement')
  if (raw) {
    const parsed = JSON.parse(raw) as {
      title?: string
      content?: string
      at?: string
    }
    if (parsed.at) lastPublished.value = parsed.at
    if (parsed.title) title.value = parsed.title
    if (parsed.content) content.value = plainText(parsed.content)
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
  </PageHeader>

  <div class="school-page mx-auto max-w-3xl">
    <p class="text-p-base text-ink-gray-6">
      Write and publish school notices for parents and teachers.
    </p>
    <p v-if="lastPublished" class="text-xs text-ink-gray-5">
      Last published {{ new Date(lastPublished).toLocaleString() }}
    </p>

    <ListToolbar>
      <template #actions>
        <Button icon-left="lucide-save" label="Save draft" @click="saveDraft" />
        <Button
          variant="solid"
          icon-left="lucide-send"
          label="Publish"
          @click="publish"
        />
      </template>
    </ListToolbar>

    <FormControl
      v-model="title"
      label="Title"
      placeholder="Announcement title"
    />

    <FormControl
      v-model="content"
      type="textarea"
      label="Body"
      placeholder="Write the school announcement…"
      :rows="12"
    />
  </div>
</template>
