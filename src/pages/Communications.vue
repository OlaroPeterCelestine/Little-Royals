<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
  dialog,
  toast,
} from 'frappe-ui'
import { schoolStore, addRecord, updateRecord } from '../data/store'
import { schoolSetup } from '../data/schoolSetup'
import { canCurrentUser } from '../data/permissions'
import { logActivity } from '../data/activity'
import type { CatalogRow } from '../data/catalog'
import ListStatCards from '../components/ListStatCards.vue'

const router = useRouter()
const route = useRoute()

const channelTab = ref(normalizeTab(route.query.channel))
const query = ref('')

const tabs = [
  { label: 'All', value: 'all' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Email', value: 'Email' },
  { label: 'WhatsApp', value: 'WhatsApp' },
  { label: 'Templates', value: 'templates' },
]

function normalizeTab(value: unknown) {
  const v = String(value || 'all')
  if (['SMS', 'Email', 'WhatsApp', 'templates'].includes(v)) return v
  return 'all'
}

watch(channelTab, (value) => {
  router.replace({
    query: value === 'all' ? {} : { channel: value },
  })
})

watch(
  () => route.query.channel,
  (value) => {
    const next = normalizeTab(value)
    if (channelTab.value !== next) channelTab.value = next
  },
)

const canCreate = computed(() => canCurrentUser('sms-messages', 'create'))
const canWrite = computed(() => canCurrentUser('sms-messages', 'write'))

const messages = computed(() => schoolStore['sms-messages']?.rows || [])
const templates = computed(
  () => schoolStore['message-templates']?.rows || [],
)

const filteredMessages = computed(() => {
  const q = query.value.trim().toLowerCase()
  return messages.value.filter((m) => {
    if (channelTab.value !== 'all' && channelTab.value !== 'templates') {
      if (String(m.channel) !== channelTab.value) return false
    }
    if (!q) return true
    return [m.name, m.channel, m.audience, m.body, m.status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const filteredTemplates = computed(() => {
  const q = query.value.trim().toLowerCase()
  return templates.value.filter((t) => {
    if (!q) return true
    return [t.name, t.channel, t.category, t.body]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const stats = computed(() => {
  const all = messages.value
  return [
    {
      title: 'Messages',
      value: all.length,
      caption: 'all channels',
    },
    {
      title: 'SMS',
      value: all.filter((m) => m.channel === 'SMS').length,
    },
    {
      title: 'Email',
      value: all.filter((m) => m.channel === 'Email').length,
    },
    {
      title: 'WhatsApp',
      value: all.filter((m) => m.channel === 'WhatsApp').length,
    },
  ]
})

function channelTheme(channel?: string) {
  const c = String(channel || '')
  if (c === 'SMS') return 'blue'
  if (c === 'Email') return 'violet'
  if (c === 'WhatsApp') return 'green'
  return 'gray'
}

function statusTheme(status?: string) {
  const s = String(status || '')
  if (s === 'Sent') return 'green'
  if (s === 'Scheduled') return 'blue'
  if (s === 'Draft') return 'amber'
  if (s === 'Failed') return 'red'
  return 'gray'
}

function openMessage(row: CatalogRow) {
  router.push(`/sms-messages/${row.id}`)
}

function openTemplate(row: CatalogRow) {
  router.push(`/message-templates/${row.id}`)
}

function compose(presetChannel?: string, template?: CatalogRow) {
  if (!canCreate.value) {
    toast.error('Your role cannot send messages')
    return
  }
  const channel = presetChannel || String(template?.channel || 'SMS')
  dialog.prompt({
    title: `New ${channel} message`,
    message: `Compose a ${channel} message to parents or staff for ${schoolSetup.shortName}.`,
    icon:
      channel === 'Email'
        ? 'lucide-mail'
        : channel === 'WhatsApp'
          ? 'lucide-message-circle'
          : 'lucide-smartphone',
    theme: 'blue',
    confirmLabel: 'Save & send',
    size: 'lg',
    fields: [
      {
        name: 'name',
        label: 'Subject / title',
        type: 'text',
        required: true,
        defaultValue: template?.name ? String(template.name) : '',
        validate: (v) =>
          String(v || '').trim().length >= 2 ? null : 'Subject is required',
      },
      {
        name: 'channel',
        label: 'Channel',
        type: 'select',
        required: true,
        defaultValue: channel,
        options: [
          { label: 'SMS', value: 'SMS' },
          { label: 'Email', value: 'Email' },
          { label: 'WhatsApp', value: 'WhatsApp' },
        ],
      },
      {
        name: 'audience',
        label: 'Audience',
        type: 'select',
        required: true,
        defaultValue: 'All guardians',
        options: [
          { label: 'All guardians', value: 'All guardians' },
          { label: 'Nursery parents', value: 'Nursery parents' },
          { label: 'Primary parents', value: 'Primary parents' },
          { label: 'Teachers', value: 'Teachers' },
          { label: 'Parents with balance', value: 'Parents with balance' },
          { label: 'Selected guardians', value: 'Selected guardians' },
          { label: 'Whole school', value: 'Whole school' },
        ],
      },
      {
        name: 'body',
        label: 'Message body',
        type: 'textarea',
        required: true,
        defaultValue: template?.body ? String(template.body) : '',
        validate: (v) =>
          String(v || '').trim().length >= 5 ? null : 'Enter a message',
      },
      {
        name: 'when',
        label: 'Send',
        type: 'select',
        required: true,
        defaultValue: 'now',
        options: [
          { label: 'Send now', value: 'now' },
          { label: 'Schedule for later', value: 'later' },
          { label: 'Save as draft', value: 'draft' },
        ],
      },
    ],
    onConfirm: async ({ values }) => {
      const when = String(values.when)
      const status =
        when === 'draft' ? 'Draft' : when === 'later' ? 'Scheduled' : 'Sent'
      const sentAt =
        status === 'Sent'
          ? new Date().toISOString().slice(0, 16).replace('T', ' ')
          : status === 'Scheduled'
            ? '2026-11-18 08:00'
            : '—'
      const recipients =
        String(values.audience).includes('Selected')
          ? 8
          : String(values.audience).includes('Teachers')
            ? 18
            : String(values.audience).includes('Nursery')
              ? 48
              : 120
      const row = addRecord('sms-messages', {
        name: String(values.name).trim(),
        channel: String(values.channel),
        audience: String(values.audience),
        recipients,
        sentAt,
        body: String(values.body).trim(),
        status,
      })
      logActivity({
        action: status === 'Sent' ? 'Published' : 'Created',
        module: 'sms-messages',
        moduleLabel: 'Communications',
        recordId: row.id,
        recordName: row.name,
        summary: `${status === 'Sent' ? 'Sent' : status} ${row.channel} · ${row.name}`,
        detail: String(row.audience),
        severity: status === 'Sent' ? 'success' : 'info',
      })
      toast.success(
        status === 'Sent'
          ? `${row.channel} sent to ${recipients} recipients`
          : status === 'Scheduled'
            ? `${row.channel} scheduled`
            : 'Draft saved',
      )
    },
  })
}

function sendNow(row: CatalogRow) {
  if (!canWrite.value) {
    toast.error('Your role cannot send messages')
    return
  }
  dialog.confirm({
    title: `Send ${row.channel}?`,
    message: `Send “${row.name}” to ${row.audience} (${row.recipients || '—'} recipients) via ${row.channel}?`,
    icon: 'lucide-send',
    theme: 'blue',
    confirmLabel: 'Send now',
    onConfirm: async () => {
      updateRecord('sms-messages', row.id, {
        status: 'Sent',
        sentAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      })
      toast.success(`${row.channel} sent`)
    },
  })
}

function useTemplate(tpl: CatalogRow) {
  compose(String(tpl.channel || 'SMS'), tpl)
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Communications" />
    <div class="flex flex-wrap items-center gap-2">
      <Button
        icon-left="lucide-calendar-days"
        label="Calendar"
        @click="router.push('/calendar')"
      />
      <Button
        icon-left="lucide-megaphone"
        label="Announcements"
        @click="router.push('/announcements')"
      />
      <Button
        v-if="canCreate"
        variant="solid"
        icon-left="lucide-plus"
        label="Compose"
        @click="compose()"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-5xl">
    <p class="text-p-base text-ink-gray-6">
      Reach parents and staff by <strong>SMS</strong>, <strong>Email</strong>,
      and <strong>WhatsApp</strong> for fees, attendance, events and emergencies
      — {{ schoolSetup.shortName }}.
    </p>

    <ListStatCards :stats="stats" />

    <div class="flex flex-wrap gap-2">
      <Button
        v-if="canCreate"
        icon-left="lucide-smartphone"
        label="New SMS"
        @click="compose('SMS')"
      />
      <Button
        v-if="canCreate"
        icon-left="lucide-mail"
        label="New email"
        @click="compose('Email')"
      />
      <Button
        v-if="canCreate"
        icon-left="lucide-message-circle"
        label="New WhatsApp"
        @click="compose('WhatsApp')"
      />
      <Button
        icon-left="lucide-file-text"
        label="Templates"
        @click="channelTab = 'templates'"
      />
    </div>

    <TabButtons v-model="channelTab" :options="tabs" />

    <FormControl
      v-model="query"
      class="max-w-md"
      label="Search"
      :placeholder="
        channelTab === 'templates'
          ? 'Search templates…'
          : 'Search messages…'
      "
    />

    <!-- Templates -->
    <section v-if="channelTab === 'templates'" class="school-section">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="school-section-title mb-0">Message templates</h2>
        <Button
          label="Manage templates"
          @click="router.push('/message-templates')"
        />
      </div>
      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <div
          v-for="tpl in filteredTemplates"
          :key="tpl.id"
          class="flex flex-wrap items-start justify-between gap-3 border-b border-outline-gray-1 px-4 py-4 last:border-b-0"
        >
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm-medium text-ink-gray-9">{{ tpl.name }}</p>
              <Badge
                :label="String(tpl.channel)"
                :theme="channelTheme(String(tpl.channel))"
                variant="subtle"
              />
              <Badge
                :label="String(tpl.category || '')"
                theme="gray"
                variant="subtle"
              />
            </div>
            <p class="line-clamp-2 text-sm text-ink-gray-6">
              {{ tpl.body }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="canCreate"
              variant="solid"
              label="Use template"
              @click="useTemplate(tpl)"
            />
            <Button label="Open" @click="openTemplate(tpl)" />
          </div>
        </div>
        <p
          v-if="!filteredTemplates.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No templates match.
        </p>
      </div>
    </section>

    <!-- Messages -->
    <section v-else class="school-section">
      <h2 class="school-section-title">
        {{
          channelTab === 'all' ? 'All messages' : `${channelTab} messages`
        }}
      </h2>
      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <div
          v-for="msg in filteredMessages"
          :key="msg.id"
          class="space-y-2 border-b border-outline-gray-1 px-4 py-4 last:border-b-0"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm-medium text-ink-gray-9">{{ msg.name }}</p>
                <Badge
                  :label="String(msg.channel)"
                  :theme="channelTheme(String(msg.channel))"
                  variant="subtle"
                />
                <Badge
                  :label="String(msg.status)"
                  :theme="statusTheme(String(msg.status))"
                  variant="subtle"
                />
              </div>
              <p class="text-xs text-ink-gray-5">
                {{ msg.audience }} · {{ msg.recipients || '—' }} recipients ·
                {{ msg.sentAt || '—' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                v-if="
                  canWrite &&
                  ['Draft', 'Scheduled'].includes(String(msg.status))
                "
                variant="solid"
                icon-left="lucide-send"
                label="Send"
                @click="sendNow(msg)"
              />
              <Button label="Open" @click="openMessage(msg)" />
            </div>
          </div>
          <p class="line-clamp-2 text-sm text-ink-gray-7">{{ msg.body }}</p>
        </div>
        <p
          v-if="!filteredMessages.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No messages on this channel yet.
        </p>
      </div>
    </section>
  </div>
</template>
