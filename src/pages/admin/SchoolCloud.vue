<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
  toast,
} from 'frappe-ui'
import { schoolSetup } from '@/data/school/schoolSetup'
import { schoolStore, addRecord, updateRecord } from '@/data/catalog/store'
import { ensureModule } from '@/data/catalog/catalogSync'
import { apiRequest, getApiBase } from '@/services/http'
import { authToken } from '@/data/auth/auth'
import { connectRealtime, onRealtime, sendRealtime } from '@/composables/useRealtime'
import { iceServers } from '@/lib/webrtcIce'
import {
  schoolCloudApps,
  type SchoolCloudAppId,
} from '@/lib/schoolCloud'
import CloudCalendar from '@/components/cloud/CloudCalendar.vue'
import CloudContacts from '@/components/cloud/CloudContacts.vue'
import CloudBoard from '@/components/cloud/CloudBoard.vue'
import CloudDocEditor from '@/components/cloud/CloudDocEditor.vue'
import CloudSheet from '@/components/cloud/CloudSheet.vue'
import CloudSlides from '@/components/cloud/CloudSlides.vue'
import { saveAs } from 'file-saver'
import DOMPurify from 'dompurify'
import {
  deleteMail,
  getMailStatus,
  listMail,
  saveMailDraft,
  sendMail as sendMailApi,
  type MailMessage,
  type MailStatus,
} from '@/services/mail'

const route = useRoute()
const router = useRouter()

function parseApp(value: unknown): SchoolCloudAppId {
  const v = String(value || '').toLowerCase()
  return schoolCloudApps.some((a) => a.id === v)
    ? (v as SchoolCloudAppId)
    : 'files'
}

const activeApp = ref<SchoolCloudAppId>(parseApp(route.query.app))
watch(
  () => route.query.app,
  (app) => {
    activeApp.value = parseApp(app)
  },
)

function selectApp(id: string | number) {
  const next = parseApp(id)
  activeApp.value = next
  router.replace({ path: '/school-cloud', query: { app: next } })
}

const tabs = schoolCloudApps.map((a) => ({ label: a.label, value: a.id }))
const activeMeta = computed(
  () => schoolCloudApps.find((a) => a.id === activeApp.value)!,
)

// ——— Drive ———
type DriveFile = {
  id: string
  name: string
  sizeBytes: number
  contentType: string
  folder: string
  createdAt: string
}
const files = ref<DriveFile[]>([])
const filesLoading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const driveFolder = ref('Drive')

async function refreshFiles() {
  if (!authToken()) return
  filesLoading.value = true
  try {
    const { data } = await apiRequest<DriveFile[]>('/api/v1/files', {
      bustCache: true,
    })
    files.value = Array.isArray(data) ? data : []
  } catch (err) {
    toast.warning(err instanceof Error ? err.message : 'Could not load Drive')
  } finally {
    filesLoading.value = false
  }
}

async function onUpload(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const body = new FormData()
  body.append('file', file)
  body.append('folder', driveFolder.value || 'Drive')
  try {
    const base = getApiBase()
    const res = await fetch(`${base}/api/v1/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken()}` },
      body,
    })
    const payload = await res.json()
    if (!res.ok || payload?.ok === false) {
      throw new Error(payload?.error || 'Upload failed')
    }
    toast.success(`Uploaded ${file.name}`)
    await refreshFiles()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Upload failed')
  } finally {
    input.value = ''
  }
}

async function downloadFile(f: DriveFile) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/v1/files/${f.id}`, {
    headers: { Authorization: `Bearer ${authToken()}` },
  })
  if (!res.ok) {
    toast.error('Download failed')
    return
  }
  const blob = await res.blob()
  saveAs(blob, f.name)
}

async function deleteFile(f: DriveFile) {
  try {
    await apiRequest(`/api/v1/files/${f.id}`, { method: 'DELETE' })
    files.value = files.value.filter((x) => x.id !== f.id)
    toast.success('Deleted')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Delete failed')
  }
}

const folders = computed(() => {
  const set = new Set(files.value.map((f) => f.folder || 'Drive'))
  return ['Drive', 'Policies', 'Parent packs', ...[...set].filter((f) => !['Drive', 'Policies', 'Parent packs'].includes(f))]
})

const folderFiles = computed(() =>
  files.value.filter((f) => (f.folder || 'Drive') === driveFolder.value),
)

// ——— Mail (custom SMTP backend) ———
const mailTo = ref('')
const mailCc = ref('')
const mailSubject = ref('')
const mailBody = ref('<p></p>')
const mailBusy = ref(false)
const mailFolder = ref<'sent' | 'drafts'>('sent')
const mailItems = ref<MailMessage[]>([])
const mailStatus = ref<MailStatus | null>(null)
const mailLoading = ref(false)

async function refreshMail() {
  mailLoading.value = true
  try {
    mailStatus.value = await getMailStatus()
    mailItems.value = await listMail(mailFolder.value)
  } catch (err) {
    toast.warning(err instanceof Error ? err.message : 'Could not load mail')
  } finally {
    mailLoading.value = false
  }
}

async function sendMail() {
  const to = mailTo.value.trim()
  const subject = mailSubject.value.trim()
  const body = DOMPurify.sanitize(mailBody.value || '')
  const plain = body.replace(/<[^>]+>/g, ' ').trim()
  if (!to.includes('@')) {
    toast.error('Enter a valid To email')
    return
  }
  if (!subject) {
    toast.error('Subject is required')
    return
  }
  if (plain.length < 2) {
    toast.error('Write a short message first')
    return
  }
  mailBusy.value = true
  try {
    const msg = await sendMailApi({
      to,
      cc: mailCc.value.trim() || undefined,
      subject,
      bodyHtml: body,
      bodyText: plain,
    })
    mailTo.value = ''
    mailCc.value = ''
    mailSubject.value = ''
    mailBody.value = '<p></p>'
    mailFolder.value = 'sent'
    await refreshMail()
    toast.success(
      msg.status === 'sent-local'
        ? 'Saved in school mailbox (configure SMTP to relay)'
        : 'Email sent',
    )
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Send failed')
  } finally {
    mailBusy.value = false
  }
}

async function saveDraft() {
  const subject = mailSubject.value.trim() || 'Draft'
  mailBusy.value = true
  try {
    await saveMailDraft({
      to: mailTo.value.trim() || 'draft@local',
      cc: mailCc.value.trim() || undefined,
      subject,
      bodyHtml: DOMPurify.sanitize(mailBody.value || ''),
    })
    mailFolder.value = 'drafts'
    await refreshMail()
    toast.success('Draft saved')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save draft')
  } finally {
    mailBusy.value = false
  }
}

async function removeMail(id: string) {
  try {
    await deleteMail(id)
    mailItems.value = mailItems.value.filter((m) => m.id !== id)
    toast.success('Deleted')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Delete failed')
  }
}

// ——— Boards / Forms / Office ———
const formTitle = ref('')
const formQuestions = ref('Name, Phone, Notes')
const docTitle = ref('')
const docBody = ref('')
const activeDocId = ref('')
const cloudBusy = ref(false)
const officeKind = ref<'Doc' | 'Sheet' | 'Slides'>('Doc')

const boards = computed(() => schoolStore['task-cards']?.rows || [])
const forms = computed(() => schoolStore['school-forms']?.rows || [])
const docs = computed(() =>
  (schoolStore['school-docs']?.rows || []).filter(
    (d) => String(d.kind || 'Doc') === officeKind.value,
  ),
)
const activeDoc = computed(
  () => docs.value.find((d) => d.id === activeDocId.value) || docs.value[0],
)

async function addForm() {
  const title = formTitle.value.trim()
  if (!title) return
  cloudBusy.value = true
  try {
    await addRecord('school-forms', {
      name: title,
      questions: formQuestions.value.trim() || 'Name, Phone, Notes',
      status: 'Active',
    })
    formTitle.value = ''
    toast.success('Form saved on server')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save form')
  } finally {
    cloudBusy.value = false
  }
}

async function newDoc() {
  cloudBusy.value = true
  try {
    const defaults =
      officeKind.value === 'Sheet'
        ? '{}'
        : officeKind.value === 'Slides'
          ? JSON.stringify([{ title: 'Slide 1', body: '<p>Welcome</p>' }])
          : '<p></p>'
    const doc = await addRecord('school-docs', {
      name: docTitle.value.trim() || `Untitled ${officeKind.value}`,
      body: defaults,
      kind: officeKind.value,
      status: 'Draft',
    })
    activeDocId.value = doc.id
    docTitle.value = ''
    docBody.value = defaults
    toast.success(`${officeKind.value} created on server`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not create')
  } finally {
    cloudBusy.value = false
  }
}

async function saveActiveDoc() {
  const doc = activeDoc.value
  if (!doc) return
  cloudBusy.value = true
  try {
    await updateRecord('school-docs', doc.id, {
      name: doc.name,
      body: docBody.value,
      kind: officeKind.value,
      status: doc.status || 'Draft',
    })
    toast.success('Saved on server')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save')
  } finally {
    cloudBusy.value = false
  }
}

watch(activeDoc, (doc) => {
  docBody.value = String(doc?.body || '')
  if (doc) activeDocId.value = doc.id
})

watch(officeKind, () => {
  activeDocId.value = docs.value[0]?.id || ''
  docBody.value = String(docs.value[0]?.body || '')
})

// ——— Video (WebRTC + free STUN / optional TURN) ———
const roomId = ref('staff-room')
const localVideo = ref<HTMLVideoElement | null>(null)
const remoteVideo = ref<HTMLVideoElement | null>(null)
const inCall = ref(false)
const callStatus = ref('Idle')
let pc: RTCPeerConnection | null = null
let localStream: MediaStream | null = null
let stopRealtime: (() => void) | null = null

async function ensurePeer() {
  if (pc) return pc
  pc = new RTCPeerConnection({ iceServers: iceServers() })
  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      sendRealtime('rtc.ice', {
        room: roomId.value,
        candidate: ev.candidate,
      })
    }
  }
  pc.ontrack = (ev) => {
    if (remoteVideo.value) remoteVideo.value.srcObject = ev.streams[0]
  }
  return pc
}

async function startCall() {
  connectRealtime()
  callStatus.value = 'Connecting…'
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })
    if (localVideo.value) localVideo.value.srcObject = localStream
    const peer = await ensurePeer()
    localStream.getTracks().forEach((t) => peer.addTrack(t, localStream!))
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    sendRealtime('rtc.offer', { room: roomId.value, sdp: offer })
    inCall.value = true
    callStatus.value = 'In call · waiting for peer'
  } catch (err) {
    callStatus.value = 'Camera/mic blocked'
    toast.error(err instanceof Error ? err.message : 'Could not start call')
  }
}

async function endCall() {
  inCall.value = false
  callStatus.value = 'Idle'
  pc?.close()
  pc = null
  localStream?.getTracks().forEach((t) => t.stop())
  localStream = null
  if (localVideo.value) localVideo.value.srcObject = null
  if (remoteVideo.value) remoteVideo.value.srcObject = null
}

onMounted(async () => {
  await Promise.all([
    ensureModule('task-cards'),
    ensureModule('school-forms'),
    ensureModule('school-docs'),
    ensureModule('sms-messages'),
    ensureModule('school-events'),
    ensureModule('staff'),
    ensureModule('teachers'),
    ensureModule('parents'),
    ensureModule('academic-terms'),
  ])
  connectRealtime()
  stopRealtime = onRealtime(async (evt) => {
    const payload = evt.payload as {
      payload?: {
        room?: string
        sdp?: RTCSessionDescriptionInit
        candidate?: RTCIceCandidateInit
      }
    }
    const body = payload?.payload
    if (!body || body.room !== roomId.value) return
    if (evt.type === 'rtc.offer' && body.sdp) {
      const peer = await ensurePeer()
      if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        })
        if (localVideo.value) localVideo.value.srcObject = localStream
        localStream.getTracks().forEach((t) => peer.addTrack(t, localStream!))
      }
      await peer.setRemoteDescription(body.sdp)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      sendRealtime('rtc.answer', { room: roomId.value, sdp: answer })
      inCall.value = true
      callStatus.value = 'In call'
    }
    if (evt.type === 'rtc.answer' && body.sdp && pc) {
      await pc.setRemoteDescription(body.sdp)
      callStatus.value = 'In call'
    }
    if (evt.type === 'rtc.ice' && body.candidate && pc) {
      try {
        await pc.addIceCandidate(body.candidate)
      } catch {
        /* ignore */
      }
    }
  })
  if (activeApp.value === 'files') await refreshFiles()
  if (activeApp.value === 'mail') await refreshMail()
  await nextTick()
  if (activeDoc.value) docBody.value = String(activeDoc.value.body || '')
})

watch(activeApp, (app) => {
  if (app === 'files') void refreshFiles()
  if (app === 'mail') void refreshMail()
})

watch(mailFolder, () => {
  if (activeApp.value === 'mail') void refreshMail()
})

onUnmounted(() => {
  stopRealtime?.()
  void endCall()
})
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="School cloud" />
    <template #actions>
      <Button
        v-if="activeApp === 'files'"
        label="Upload"
        variant="solid"
        theme="blue"
        icon-left="lucide-upload"
        @click="fileInput?.click()"
      />
      <Button
        v-if="activeApp === 'mail'"
        label="Full inbox"
        variant="subtle"
        @click="router.push('/communications?tab=messages')"
      />
    </template>
  </PageHeader>

  <div class="school-page school-page--workspace">
    <section class="school-hero">
      <div class="space-y-2">
        <p
          class="text-xs font-medium uppercase tracking-wide"
          style="color: var(--school-blue)"
        >
          {{ schoolSetup.name }} · Free local packages
        </p>
        <h1 class="text-2xl-semibold text-ink-gray-9">School cloud</h1>
        <p class="max-w-2xl text-p-base text-ink-gray-6">
          {{ activeMeta.description }} — {{ activeMeta.package }} (like
          {{ activeMeta.like }}).
        </p>
      </div>
      <Badge label="Local / free" theme="green" variant="subtle" />
    </section>

    <TabButtons
      :buttons="tabs"
      v-model="activeApp"
      class="mb-4"
      @update:model-value="selectApp"
    />

    <input ref="fileInput" type="file" class="hidden" @change="onUpload" />

    <!-- Drive -->
    <section v-if="activeApp === 'files'" class="school-section space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="school-section-title mb-0">Files & Drive</h2>
        <Button
          label="Refresh"
          size="sm"
          variant="ghost"
          :loading="filesLoading"
          @click="refreshFiles"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="folder in folders"
          :key="folder"
          :label="folder"
          size="sm"
          :variant="driveFolder === folder ? 'solid' : 'subtle'"
          @click="driveFolder = folder"
        />
      </div>
      <p class="text-sm text-ink-gray-6">
        Uploads go to folder <strong>{{ driveFolder }}</strong> on the API
        (policies, parent packs, shared files).
      </p>
      <div
        v-if="!folderFiles.length"
        class="rounded-6 border border-dashed border-outline-gray-2 p-8 text-center text-sm text-ink-gray-6"
      >
        No files in this folder yet.
      </div>
      <div
        v-for="f in folderFiles"
        :key="f.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
      >
        <div>
          <p class="text-sm-semibold text-ink-gray-9">{{ f.name }}</p>
          <p class="text-xs text-ink-gray-5">
            {{ Math.round(f.sizeBytes / 1024) }} KB · {{ f.folder }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            label="Download"
            size="sm"
            variant="subtle"
            @click="downloadFile(f)"
          />
          <Button
            label="Delete"
            size="sm"
            variant="ghost"
            @click="deleteFile(f)"
          />
        </div>
      </div>
    </section>

    <!-- Mail -->
    <section v-else-if="activeApp === 'mail'" class="school-section space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="school-section-title mb-0">School mail</h2>
        <Badge
          :label="
            mailStatus?.smtpConfigured
              ? `SMTP · ${mailStatus.from || mailStatus.host}`
              : 'Local mailbox (set SMTP_* to relay)'
          "
          :theme="mailStatus?.smtpConfigured ? 'green' : 'amber'"
          variant="subtle"
        />
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <FormControl
          v-model="mailTo"
          type="text"
          label="To"
          placeholder="parent@example.com"
        />
        <FormControl
          v-model="mailCc"
          type="text"
          label="Cc"
          placeholder="optional"
        />
      </div>
      <FormControl v-model="mailSubject" type="text" label="Subject" />
      <CloudDocEditor
        v-model="mailBody"
        placeholder="Write your school email…"
      />
      <div class="flex flex-wrap gap-2">
        <Button
          label="Send email"
          variant="solid"
          theme="blue"
          icon-left="lucide-send"
          :loading="mailBusy"
          @click="sendMail"
        />
        <Button
          label="Save draft"
          variant="subtle"
          :loading="mailBusy"
          @click="saveDraft"
        />
        <Button
          label="Refresh"
          size="sm"
          variant="ghost"
          :loading="mailLoading"
          @click="refreshMail"
        />
      </div>

      <div class="flex flex-wrap gap-2 pt-2">
        <Button
          label="Sent"
          size="sm"
          :variant="mailFolder === 'sent' ? 'solid' : 'subtle'"
          @click="mailFolder = 'sent'"
        />
        <Button
          label="Drafts"
          size="sm"
          :variant="mailFolder === 'drafts' ? 'solid' : 'subtle'"
          @click="mailFolder = 'drafts'"
        />
        <Button
          label="Announcements desk"
          size="sm"
          variant="ghost"
          @click="router.push('/communications?tab=messages')"
        />
      </div>

      <div
        v-if="!mailItems.length"
        class="rounded-6 border border-dashed border-outline-gray-2 p-6 text-center text-sm text-ink-gray-6"
      >
        No messages in {{ mailFolder }}.
      </div>
      <div
        v-for="m in mailItems"
        :key="m.id"
        class="rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm-semibold text-ink-gray-9">{{ m.subject }}</p>
            <p class="text-xs text-ink-gray-5">
              To {{ m.to }} · {{ m.status }}
              <template v-if="m.sentAt || m.createdAt">
                · {{ (m.sentAt || m.createdAt).slice(0, 16).replace('T', ' ') }}
              </template>
            </p>
            <p
              v-if="m.error"
              class="mt-1 text-xs text-ink-amber-3"
            >
              {{ m.error }}
            </p>
          </div>
          <Button
            label="Delete"
            size="sm"
            variant="ghost"
            theme="red"
            @click="removeMail(m.id)"
          />
        </div>
      </div>
    </section>

    <!-- Calendar -->
    <section v-else-if="activeApp === 'calendar'" class="school-section">
      <h2 class="school-section-title">Calendar</h2>
      <CloudCalendar :can-create="true" />
    </section>

    <!-- Contacts -->
    <section v-else-if="activeApp === 'contacts'" class="school-section">
      <h2 class="school-section-title">Contacts</h2>
      <CloudContacts />
    </section>

    <!-- Video -->
    <section v-else-if="activeApp === 'talk'" class="school-section space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <FormControl
          v-model="roomId"
          type="text"
          label="Room"
          class="max-w-xs"
        />
        <Button
          v-if="!inCall"
          label="Start call"
          variant="solid"
          theme="blue"
          icon-left="lucide-video"
          @click="startCall"
        />
        <Button
          v-else
          label="End call"
          variant="subtle"
          theme="red"
          @click="endCall"
        />
        <Badge :label="callStatus" theme="gray" variant="subtle" />
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <video
          ref="localVideo"
          class="aspect-video w-full rounded-6 bg-ink-gray-9 object-cover"
          autoplay
          playsinline
          muted
        />
        <video
          ref="remoteVideo"
          class="aspect-video w-full rounded-6 bg-ink-gray-8 object-cover"
          autoplay
          playsinline
        />
      </div>
      <p class="text-sm text-ink-gray-6">
        Free Google STUN is on by default. For NAT traversal across networks, set
        <code>VITE_TURN_URL</code> (coturn) in
        <code>.env</code>. Signaling uses the desk WebSocket.
      </p>
    </section>

    <!-- Boards -->
    <section v-else-if="activeApp === 'boards'" class="school-section">
      <h2 class="school-section-title">Boards</h2>
      <CloudBoard :cards="boards" />
    </section>

    <!-- Forms -->
    <section v-else-if="activeApp === 'forms'" class="school-section space-y-4">
      <h2 class="school-section-title">Forms</h2>
      <div class="grid gap-3 md:grid-cols-2">
        <FormControl
          v-model="formTitle"
          type="text"
          label="Form title"
          placeholder="Parent feedback"
        />
        <FormControl
          v-model="formQuestions"
          type="text"
          label="Questions (comma-separated)"
        />
      </div>
      <Button
        label="Create form"
        variant="solid"
        theme="blue"
        :loading="cloudBusy"
        @click="addForm"
      />
      <div
        v-for="form in forms"
        :key="form.id"
        class="rounded-6 border border-outline-gray-1 bg-surface-white p-4"
      >
        <p class="text-sm-semibold text-ink-gray-9">{{ form.name }}</p>
        <ul class="mt-2 list-disc pl-5 text-sm text-ink-gray-6">
          <li
            v-for="(q, i) in String(form.questions || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)"
            :key="i"
          >
            {{ q }}
          </li>
        </ul>
      </div>
    </section>

    <!-- Office -->
    <section v-else-if="activeApp === 'docs'" class="school-section space-y-4">
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="k in (['Doc', 'Sheet', 'Slides'] as const)"
          :key="k"
          :label="k === 'Doc' ? 'Docs' : k"
          size="sm"
          :variant="officeKind === k ? 'solid' : 'subtle'"
          @click="officeKind = k"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <FormControl
          v-model="docTitle"
          type="text"
          :placeholder="`New ${officeKind.toLowerCase()} title…`"
        />
        <Button label="New" size="sm" :loading="cloudBusy" @click="newDoc" />
        <Button
          label="Save"
          size="sm"
          variant="solid"
          theme="blue"
          :loading="cloudBusy"
          @click="saveActiveDoc"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="d in docs"
          :key="d.id"
          type="button"
          class="rounded-5 border px-3 py-1.5 text-sm"
          :class="
            d.id === activeDocId
              ? 'border-[color:var(--school-blue)]'
              : 'border-outline-gray-1'
          "
          @click="activeDocId = String(d.id)"
        >
          {{ d.name }}
        </button>
      </div>
      <CloudDocEditor
        v-if="officeKind === 'Doc'"
        v-model="docBody"
        placeholder="Write a letter, policy, or note…"
      />
      <CloudSheet
        v-else-if="officeKind === 'Sheet'"
        v-model="docBody"
        :title="activeDoc?.name || 'sheet'"
      />
      <CloudSlides v-else v-model="docBody" />
    </section>
  </div>
</template>
