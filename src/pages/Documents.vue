<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import {
  buildDocumentHtml,
  downloadRecordDocument,
  importantDocuments,
  printRecordDocument,
  shareRecordDocument,
  type DocumentKind,
} from '../data/documents'
import {
  canvasConfigFor,
  defaultSignatureDataUrl,
  defaultStampDataUrl,
  readFileAsDataUrl,
  resetCanvasConfig,
  type DocOverlayAsset,
} from '../data/documentCanvas'
import { schoolSetup } from '../data/schoolSetup'
import { getLiveModule } from '../data/store'
import type { CatalogRow } from '../data/catalog'
import { canCurrentUser } from '../data/permissions'

const router = useRouter()
const route = useRoute()

function parseKind(raw: unknown): DocumentKind | '' {
  const v = String(raw || '')
  if (importantDocuments.some((d) => d.kind === v)) return v as DocumentKind
  return ''
}

const selectedKind = ref<DocumentKind | ''>(parseKind(route.query.kind))
const selectedModule = ref('fees')
const selectedRecordId = ref('')
const studioOpen = ref(Boolean(parseKind(route.query.kind)))
const activeOverlay = ref<'stamp' | 'signature'>('stamp')
const dragging = ref(false)

watch(
  () => route.query.kind,
  (kind) => {
    const parsed = parseKind(kind)
    selectedKind.value = parsed
    studioOpen.value = Boolean(parsed)
  },
)

const currentDef = computed(
  () => importantDocuments.find((d) => d.kind === selectedKind.value) || null,
)

const canvas = computed(() =>
  selectedKind.value ? canvasConfigFor(selectedKind.value) : null,
)

const moduleOptions = computed(() => {
  const mods = currentDef.value?.modules || []
  return mods.map((m) => ({
    label: getLiveModule(m)?.title || m,
    value: m,
  }))
})

const recordOptions = computed(() => {
  const mod = getLiveModule(selectedModule.value)
  return (mod?.rows || []).map((r) => ({
    label: `${r.name} (${r.id})`,
    value: r.id,
  }))
})

const selectedRow = computed<CatalogRow | null>(() => {
  const mod = getLiveModule(selectedModule.value)
  return mod?.rows.find((r) => r.id === selectedRecordId.value) || null
})

watch(selectedKind, (kind) => {
  if (!kind) return
  const mods = currentDef.value?.modules || []
  selectedModule.value = mods[0] || 'fees'
  router.replace({
    path: '/documents',
    query: { ...route.query, kind },
  })
})

watch(
  [selectedModule, recordOptions],
  () => {
    if (!recordOptions.value.some((o) => o.value === selectedRecordId.value)) {
      selectedRecordId.value = recordOptions.value[0]?.value || ''
    }
  },
  { immediate: true },
)

const previewHtml = computed(() => {
  if (!selectedKind.value || !selectedRow.value) return ''
  try {
    return buildDocumentHtml(
      selectedKind.value,
      selectedModule.value,
      selectedRow.value,
    ).html
  } catch {
    return ''
  }
})

const previewTitle = computed(() => {
  if (!selectedKind.value || !selectedRow.value) return ''
  try {
    return buildDocumentHtml(
      selectedKind.value,
      selectedModule.value,
      selectedRow.value,
    ).title
  } catch {
    return currentDef.value?.label || 'Document'
  }
})

function assertCanPrint(moduleKey: string) {
  if (
    canCurrentUser(moduleKey, 'print') ||
    canCurrentUser(moduleKey, 'export') ||
    canCurrentUser(moduleKey, 'read')
  ) {
    return true
  }
  toast.error('Your role cannot print documents for this module')
  return false
}

function requireSelection() {
  if (!selectedKind.value) {
    toast.error('Select a document type first')
    return false
  }
  if (!selectedRow.value) {
    toast.error('Pick a record first')
    return false
  }
  if (!assertCanPrint(selectedModule.value)) return false
  return true
}

function openStudio(kind: DocumentKind) {
  selectedKind.value = kind
  studioOpen.value = true
  const mods = importantDocuments.find((d) => d.kind === kind)?.modules || []
  selectedModule.value = mods[0] || 'fees'
}

function closeStudio() {
  studioOpen.value = false
  selectedKind.value = ''
  router.replace({ path: '/documents', query: { ...route.query, kind: undefined } })
}

function printSelected() {
  if (!requireSelection() || !selectedRow.value || !selectedKind.value) return
  try {
    const title = printRecordDocument(
      selectedKind.value,
      selectedModule.value,
      selectedRow.value,
    )
    toast.success(`Opened print preview · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

function downloadSelected() {
  if (!requireSelection() || !selectedRow.value || !selectedKind.value) return
  try {
    const title = downloadRecordDocument(
      selectedKind.value,
      selectedModule.value,
      selectedRow.value,
    )
    toast.success(`Downloaded · ${title}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not download')
  }
}

async function shareSelected() {
  if (!requireSelection() || !selectedRow.value || !selectedKind.value) return
  try {
    const mode = await shareRecordDocument(
      selectedKind.value,
      selectedModule.value,
      selectedRow.value,
    )
    toast.success(
      mode === 'shared'
        ? 'Share sheet opened'
        : 'Document summary copied to clipboard',
    )
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    toast.error(err instanceof Error ? err.message : 'Could not share')
  }
}

function activeAsset(): DocOverlayAsset | null {
  if (!canvas.value) return null
  return activeOverlay.value === 'stamp'
    ? canvas.value.stamp
    : canvas.value.signature
}

async function onUpload(event: Event, target: 'stamp' | 'signature') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !canvas.value) return
  if (!file.type.startsWith('image/')) {
    toast.error('Choose an image file (PNG, JPG, SVG, WebP)')
    input.value = ''
    return
  }
  if (file.size > 2_500_000) {
    toast.error('Image must be under 2.5 MB')
    input.value = ''
    return
  }
  try {
    const src = await readFileAsDataUrl(file)
    if (target === 'stamp') {
      canvas.value.stamp.src = src
      canvas.value.stamp.visible = true
    } else {
      canvas.value.signature.src = src
      canvas.value.signature.visible = true
    }
    activeOverlay.value = target
    toast.success(target === 'stamp' ? 'Stamp image added' : 'Signature image added')
  } catch {
    toast.error('Could not read image')
  } finally {
    input.value = ''
  }
}

function clearAsset(target: 'stamp' | 'signature') {
  if (!canvas.value) return
  if (target === 'stamp') canvas.value.stamp.src = ''
  else canvas.value.signature.src = ''
  toast.info('Image cleared — default placeholder will show')
}

function useDefaultAssets() {
  if (!canvas.value) return
  canvas.value.stamp.src = defaultStampDataUrl()
  canvas.value.signature.src = defaultSignatureDataUrl(
    schoolSetup.headTeacher || 'Head teacher',
  )
  canvas.value.stamp.visible = true
  canvas.value.signature.visible = true
  toast.success('Default digital stamp & signature applied')
}

function resetLayout() {
  if (!selectedKind.value) return
  resetCanvasConfig(selectedKind.value)
  toast.warning('Canvas reset for this document type')
}

const stageRef = ref<HTMLElement | null>(null)

function onOverlayPointerDown(
  event: PointerEvent,
  target: 'stamp' | 'signature',
) {
  if (!canvas.value || !stageRef.value) return
  activeOverlay.value = target
  dragging.value = true
  const asset = target === 'stamp' ? canvas.value.stamp : canvas.value.signature
  const stage = stageRef.value.getBoundingClientRect()
  const startX = event.clientX
  const startY = event.clientY
  const origX = asset.x
  const origY = asset.y

  const onMove = (e: PointerEvent) => {
    const dx = ((e.clientX - startX) / stage.width) * 100
    const dy = ((e.clientY - startY) / stage.height) * 100
    asset.x = Math.min(88, Math.max(2, origX + dx))
    asset.y = Math.min(90, Math.max(2, origY + dy))
  }
  const onUp = () => {
    dragging.value = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function stampPreviewSrc() {
  return canvas.value?.stamp.src || defaultStampDataUrl()
}

function signaturePreviewSrc() {
  return (
    canvas.value?.signature.src ||
    defaultSignatureDataUrl(schoolSetup.headTeacher || 'Head teacher')
  )
}

function setOverlayVisible(target: 'stamp' | 'signature', value: string) {
  if (!canvas.value) return
  const visible = value === 'yes'
  if (target === 'stamp') canvas.value.stamp.visible = visible
  else canvas.value.signature.visible = visible
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Important Documents" />
    <div class="flex flex-wrap items-center gap-2">
      <Button
        v-if="studioOpen"
        icon-left="lucide-layout-grid"
        label="All documents"
        @click="closeStudio"
      />
      <Button
        v-else
        icon-left="lucide-bar-chart-3"
        label="Reports"
        @click="router.push('/reports')"
      />
      <Button
        v-if="studioOpen"
        variant="solid"
        icon-left="lucide-printer"
        label="Print"
        @click="printSelected"
      />
    </div>
  </PageHeader>

  <div class="school-page">
    <!-- Gallery -->
    <template v-if="!studioOpen">
      <p class="text-p-base text-ink-gray-6">
        Select a document to open the canvas studio — same statutory layout as
        print, with digital stamp and signature you can place and customise.
      </p>

      <section class="school-section">
        <h2 class="school-section-title">Important documents</h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="doc in importantDocuments"
            :key="doc.kind"
            type="button"
            class="doc-pick-card rounded-6 border border-outline-gray-1 bg-surface-white p-4 text-left transition hover:border-outline-gray-3 hover:bg-surface-gray-1"
            @click="openStudio(doc.kind)"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm-medium text-ink-gray-9">{{ doc.label }}</p>
              <span class="lucide-panel-right size-4 text-ink-gray-5" />
            </div>
            <p class="mt-1 text-xs text-ink-gray-5">{{ doc.description }}</p>
            <div class="mt-3 flex flex-wrap gap-1.5">
              <Badge label="Official layout" theme="blue" variant="subtle" />
              <Badge label="Canvas" theme="violet" variant="subtle" />
            </div>
          </button>
        </div>
      </section>
    </template>

    <!-- Canvas studio -->
    <template v-else-if="canvas && currentDef">
      <p class="text-p-base text-ink-gray-6">
        {{ currentDef.label }} — live statutory preview. Drag stamp or signature
        on the canvas, or upload your own images.
      </p>

      <div class="doc-studio">
        <div class="doc-studio-stage-wrap">
          <div class="doc-studio-toolbar">
            <FormControl
              v-model="selectedModule"
              class="min-w-[10rem] flex-1"
              label="Module"
              type="select"
              :options="moduleOptions"
            />
            <FormControl
              v-model="selectedRecordId"
              class="min-w-[14rem] flex-[2]"
              label="Record"
              type="select"
              :options="recordOptions"
            />
            <div class="flex flex-wrap items-end gap-2 pb-0.5">
              <Button
                size="sm"
                :variant="activeOverlay === 'stamp' ? 'solid' : 'subtle'"
                label="Stamp"
                icon-left="lucide-stamp"
                @click="activeOverlay = 'stamp'"
              />
              <Button
                size="sm"
                :variant="activeOverlay === 'signature' ? 'solid' : 'subtle'"
                label="Signature"
                icon-left="lucide-pen-line"
                @click="activeOverlay = 'signature'"
              />
              <Button
                size="sm"
                icon-left="lucide-share-2"
                label="Share"
                :disabled="!selectedRow"
                @click="shareSelected"
              />
              <Button
                size="sm"
                icon-left="lucide-download"
                label="Download"
                :disabled="!selectedRow"
                @click="downloadSelected"
              />
            </div>
          </div>

          <div
            ref="stageRef"
            class="doc-studio-stage"
            :class="{ 'is-dragging': dragging }"
          >
            <div class="doc-studio-paper">
              <iframe
                v-if="previewHtml"
                class="doc-studio-frame"
                title="Document preview"
                :srcdoc="previewHtml"
              />
              <div v-else class="doc-studio-empty">
                No record available for this document yet.
              </div>

              <!-- Draggable overlay handles -->
              <button
                v-if="canvas.stamp.visible"
                type="button"
                class="doc-studio-handle"
                :class="{ active: activeOverlay === 'stamp' }"
                :style="{
                  left: `${canvas.stamp.x}%`,
                  top: `${canvas.stamp.y}%`,
                  width: `${canvas.stamp.width}%`,
                  opacity: canvas.stamp.opacity,
                }"
                aria-label="Move stamp"
                @pointerdown.prevent="onOverlayPointerDown($event, 'stamp')"
              >
                <img :src="stampPreviewSrc()" alt="" draggable="false" />
                <span class="doc-studio-handle-label">Stamp</span>
              </button>

              <button
                v-if="canvas.signature.visible"
                type="button"
                class="doc-studio-handle"
                :class="{ active: activeOverlay === 'signature' }"
                :style="{
                  left: `${canvas.signature.x}%`,
                  top: `${canvas.signature.y}%`,
                  width: `${canvas.signature.width}%`,
                  opacity: canvas.signature.opacity,
                }"
                aria-label="Move signature"
                @pointerdown.prevent="onOverlayPointerDown($event, 'signature')"
              >
                <img :src="signaturePreviewSrc()" alt="" draggable="false" />
                <span class="doc-studio-handle-label">Signature</span>
              </button>
            </div>
          </div>

          <p class="doc-studio-caption">
            Preview · {{ previewTitle || currentDef.label }}
          </p>
        </div>

        <aside class="doc-studio-panel">
          <h2 class="school-section-title">Customise</h2>
          <p class="text-xs text-ink-gray-5">
            Uploads and positions are saved for this document type on this
            device.
          </p>

          <div class="doc-studio-panel-block">
            <p class="text-sm-medium text-ink-gray-8">Digital stamp</p>
            <label class="doc-studio-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                class="sr-only"
                @change="onUpload($event, 'stamp')"
              />
              <span class="lucide-upload size-4" />
              Upload stamp image
            </label>
            <div class="flex flex-wrap gap-2">
              <Button size="sm" label="Clear stamp" @click="clearAsset('stamp')" />
              <FormControl
                :model-value="canvas.stamp.visible ? 'yes' : 'no'"
                type="select"
                label="Show stamp"
                :options="[
                  { label: 'Visible', value: 'yes' },
                  { label: 'Hidden', value: 'no' },
                ]"
                @update:model-value="(v: string) => setOverlayVisible('stamp', v)"
              />
            </div>
            <FormControl
              v-model="canvas.stamp.width"
              type="number"
              label="Stamp size (%)"
            />
            <FormControl
              v-model="canvas.stamp.opacity"
              type="number"
              label="Stamp opacity (0–1)"
            />
          </div>

          <div class="doc-studio-panel-block">
            <p class="text-sm-medium text-ink-gray-8">Digital signature</p>
            <label class="doc-studio-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                class="sr-only"
                @change="onUpload($event, 'signature')"
              />
              <span class="lucide-upload size-4" />
              Upload signature image
            </label>
            <div class="flex flex-wrap gap-2">
              <Button
                size="sm"
                label="Clear signature"
                @click="clearAsset('signature')"
              />
              <FormControl
                :model-value="canvas.signature.visible ? 'yes' : 'no'"
                type="select"
                label="Show signature"
                :options="[
                  { label: 'Visible', value: 'yes' },
                  { label: 'Hidden', value: 'no' },
                ]"
                @update:model-value="
                  (v: string) => setOverlayVisible('signature', v)
                "
              />
            </div>
            <FormControl
              v-model="canvas.signature.width"
              type="number"
              label="Signature size (%)"
            />
            <FormControl
              v-model="canvas.signature.opacity"
              type="number"
              label="Signature opacity (0–1)"
            />
          </div>

          <div class="doc-studio-panel-block">
            <p class="text-sm-medium text-ink-gray-8">Signers & note</p>
            <FormControl
              v-model="canvas.leftSigner"
              label="Left signer label"
              type="text"
            />
            <FormControl
              v-model="canvas.rightSigner"
              label="Right signer label"
              type="text"
            />
            <FormControl
              v-model="canvas.note"
              label="Extra note on document"
              type="textarea"
            />
          </div>

          <div class="flex flex-col gap-2">
            <Button
              variant="solid"
              icon-left="lucide-sparkles"
              label="Apply default stamp & signature"
              @click="useDefaultAssets"
            />
            <Button
              theme="red"
              icon-left="lucide-rotate-ccw"
              label="Reset canvas"
              @click="resetLayout"
            />
            <Button
              icon-left="lucide-external-link"
              label="Open record"
              :disabled="!selectedRow"
              @click="
                selectedRow &&
                router.push(`/${selectedModule}/${selectedRow.id}`)
              "
            />
          </div>

          <div
            v-if="activeAsset()"
            class="rounded-5 border border-outline-gray-1 bg-surface-gray-1 p-3 text-xs text-ink-gray-6"
          >
            Active layer:
            <strong class="text-ink-gray-8">{{ activeOverlay }}</strong>
            · x {{ Math.round(activeAsset()!.x) }}% · y
            {{ Math.round(activeAsset()!.y) }}%
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>
