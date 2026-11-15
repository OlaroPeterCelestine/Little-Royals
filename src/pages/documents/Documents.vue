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
} from '@/data/documents/documents'
import {
  canvasConfigFor,
  clearTextOverrides,
  defaultSignatureDataUrl,
  defaultStampDataUrl,
  readFileAsDataUrl,
  resetCanvasConfig,
  setTextOverride,
  type DocOverlayAsset,
} from '@/data/documents/documentCanvas'
import { schoolSetup } from '@/data/school/schoolSetup'
import { getLiveModule } from '@/data/catalog/store'
import type { CatalogRow } from '@/data/catalog/catalog'
import { canCurrentUser } from '@/data/auth/permissions'
import ListStatCards from '@/components/list/ListStatCards.vue'
import RelatedLinks from '@/components/list/RelatedLinks.vue'

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
const resizing = ref(false)
const zoom = ref(85)
const ZOOM_MIN = 45
const ZOOM_MAX = 140
const ZOOM_STEP = 10

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

const docStats = computed(() => {
  const kinds = importantDocuments
  let withStamp = 0
  let withSig = 0
  let customized = 0
  for (const doc of kinds) {
    const cfg = canvasConfigFor(doc.kind)
    if (cfg.stamp.visible) withStamp += 1
    if (cfg.signature.visible) withSig += 1
    if (
      Object.keys(cfg.textOverrides || {}).length ||
      cfg.stamp.src ||
      cfg.signature.src
    ) {
      customized += 1
    }
  }
  return [
    {
      title: 'Document types',
      value: kinds.length,
      caption: 'official layouts',
    },
    {
      title: 'Stamp on',
      value: withStamp,
      caption: 'canvas stamp visible',
    },
    {
      title: 'Signature on',
      value: withSig,
      caption: 'canvas signature visible',
    },
    {
      title: 'Customised',
      value: customized,
      caption: 'text / stamp / signature edits',
    },
  ]
})

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

/** Structural deps only — textOverrides are applied inside the iframe so typing does not remount. */
const previewHtml = computed(() => {
  if (!selectedKind.value || !selectedRow.value) return ''
  const c = canvas.value
  if (c) {
    void c.note
    void c.leftSigner
    void c.rightSigner
    void c.stamp.visible
    void c.signature.visible
  }
  void editMode.value
  try {
    return buildDocumentHtml(
      selectedKind.value,
      selectedModule.value,
      selectedRow.value,
      {
        omitOverlays: true,
        studioEdit: editMode.value,
        applyTextOverrides: false,
      },
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
      { omitOverlays: true, applyTextOverrides: true },
    ).title
  } catch {
    return currentDef.value?.label || 'Document'
  }
})

const previewFrameKey = computed(
  () =>
    `${selectedKind.value}|${selectedModule.value}|${selectedRecordId.value}|${editMode.value}|${canvas.value?.note || ''}|${canvas.value?.leftSigner || ''}|${canvas.value?.rightSigner || ''}`,
)

function onPreviewFrameLoad() {
  const doc = frameRef.value?.contentDocument
  const kind = selectedKind.value
  if (!doc || !kind || !editMode.value) return
  const cfg = canvasConfigFor(kind)
  doc.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
    const key = el.getAttribute('data-edit-key')
    if (!key) return
    const saved = cfg.textOverrides?.[key]
    if (saved != null && saved !== '') {
      el.textContent = saved
    }
    el.addEventListener('input', () => {
      setTextOverride(kind, key, el.textContent || '')
    })
    el.addEventListener('blur', () => {
      setTextOverride(kind, key, (el.textContent || '').trim())
    })
  })
}

function resetDocumentText() {
  if (!selectedKind.value) return
  clearTextOverrides(selectedKind.value)
  // Remount iframe to restore template defaults.
  editMode.value = false
  requestAnimationFrame(() => {
    editMode.value = true
  })
  toast.success('Document text edits cleared')
}

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
const paperRef = ref<HTMLElement | null>(null)
const frameRef = ref<HTMLIFrameElement | null>(null)
const editMode = ref(true)

function zoomIn() {
  zoom.value = Math.min(ZOOM_MAX, zoom.value + ZOOM_STEP)
}

function zoomOut() {
  zoom.value = Math.max(ZOOM_MIN, zoom.value - ZOOM_STEP)
}

function zoomFit() {
  zoom.value = 85
}

function onOverlayPointerDown(
  event: PointerEvent,
  target: 'stamp' | 'signature',
) {
  if (!canvas.value || !paperRef.value) return
  if ((event.target as HTMLElement).dataset.resize) return
  activeOverlay.value = target
  dragging.value = true
  const asset = target === 'stamp' ? canvas.value.stamp : canvas.value.signature
  const paper = paperRef.value.getBoundingClientRect()
  const startX = event.clientX
  const startY = event.clientY
  const origX = asset.x
  const origY = asset.y

  const onMove = (e: PointerEvent) => {
    const dx = ((e.clientX - startX) / paper.width) * 100
    const dy = ((e.clientY - startY) / paper.height) * 100
    asset.x = Math.min(88, Math.max(1, origX + dx))
    asset.y = Math.min(90, Math.max(1, origY + dy))
  }
  const onUp = () => {
    dragging.value = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function onResizePointerDown(
  event: PointerEvent,
  target: 'stamp' | 'signature',
) {
  if (!canvas.value || !paperRef.value) return
  event.stopPropagation()
  activeOverlay.value = target
  resizing.value = true
  const asset = target === 'stamp' ? canvas.value.stamp : canvas.value.signature
  const paper = paperRef.value.getBoundingClientRect()
  const startX = event.clientX
  const origW = Number(asset.width) || 16

  const onMove = (e: PointerEvent) => {
    const dx = ((e.clientX - startX) / paper.width) * 100
    asset.width = Math.min(45, Math.max(6, Math.round(origW + dx)))
  }
  const onUp = () => {
    resizing.value = false
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
  <PageHeader v-if="!studioOpen">
    <PageHeaderTitle title="Important Documents" />
    <div class="flex flex-wrap items-center gap-2">
      <Button
        icon-left="lucide-bar-chart-3"
        label="Reports"
        @click="router.push('/reports')"
      />
    </div>
  </PageHeader>

  <!-- Gallery -->
  <div v-if="!studioOpen" class="school-page">
    <p class="text-p-base text-ink-gray-6">
      Select a document to open the canvas studio — same statutory layout as
      print, with digital stamp and signature you can place and customise.
    </p>

    <RelatedLinks />
    <ListStatCards :stats="docStats" />

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
  </div>

  <!-- Canva-style studio -->
  <div v-else-if="canvas && currentDef" class="doc-studio">
    <header class="doc-studio-topbar">
      <div class="doc-studio-topbar__left">
        <Button
          size="sm"
          icon-left="lucide-arrow-left"
          label="All documents"
          @click="closeStudio"
        />
        <div class="doc-studio-topbar__titles">
          <p class="doc-studio-topbar__title">{{ currentDef.label }}</p>
          <p class="doc-studio-topbar__sub">
            {{ previewTitle || 'Untitled design' }}
          </p>
        </div>
      </div>
      <div class="doc-studio-topbar__center">
        <FormControl
          v-model="selectedModule"
          class="doc-studio-select"
          type="select"
          :options="moduleOptions"
        />
        <FormControl
          v-model="selectedRecordId"
          class="doc-studio-select doc-studio-select--wide"
          type="select"
          :options="recordOptions"
        />
      </div>
      <div class="doc-studio-topbar__right">
        <div class="doc-studio-zoom">
          <Button size="sm" icon="lucide-minus" @click="zoomOut" />
          <button type="button" class="doc-studio-zoom__value" @click="zoomFit">
            {{ zoom }}%
          </button>
          <Button size="sm" icon="lucide-plus" @click="zoomIn" />
        </div>
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
        <Button
          size="sm"
          variant="solid"
          icon-left="lucide-printer"
          label="Print"
          @click="printSelected"
        />
      </div>
    </header>

    <div class="doc-studio-body">
      <aside class="doc-studio-rail" aria-label="Layers">
        <p class="doc-studio-rail__label">Elements</p>
        <button
          type="button"
          class="doc-studio-rail__item"
          :class="{ active: activeOverlay === 'stamp' }"
          @click="activeOverlay = 'stamp'"
        >
          <span class="lucide-stamp size-5" />
          Stamp
        </button>
        <button
          type="button"
          class="doc-studio-rail__item"
          :class="{ active: activeOverlay === 'signature' }"
          @click="activeOverlay = 'signature'"
        >
          <span class="lucide-pen-line size-5" />
          Signature
        </button>
        <div class="doc-studio-rail__spacer" />
        <button
          type="button"
          class="doc-studio-rail__item"
          title="Apply default stamp & signature"
          @click="useDefaultAssets"
        >
          <span class="lucide-sparkles size-5" />
          Defaults
        </button>
      </aside>

      <div
        ref="stageRef"
        class="doc-studio-stage"
        :class="{ 'is-dragging': dragging || resizing }"
      >
        <div class="doc-studio-viewport">
          <div
            ref="paperRef"
            class="doc-studio-paper"
            :style="{ width: `${(42 * zoom) / 100}rem` }"
          >
            <iframe
              v-if="previewHtml"
              ref="frameRef"
              :key="previewFrameKey"
              class="doc-studio-frame"
              title="Document preview"
              :srcdoc="previewHtml"
              @load="onPreviewFrameLoad"
            />
            <div v-else class="doc-studio-empty">
              No record available for this document yet.
            </div>

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
              @click="activeOverlay = 'stamp'"
            >
              <img :src="stampPreviewSrc()" alt="" draggable="false" />
              <span class="doc-studio-handle-label">Stamp</span>
              <span
                v-if="activeOverlay === 'stamp'"
                class="doc-studio-resize"
                data-resize="1"
                @pointerdown.prevent="onResizePointerDown($event, 'stamp')"
              />
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
              @click="activeOverlay = 'signature'"
            >
              <img :src="signaturePreviewSrc()" alt="" draggable="false" />
              <span class="doc-studio-handle-label">Signature</span>
              <span
                v-if="activeOverlay === 'signature'"
                class="doc-studio-resize"
                data-resize="1"
                @pointerdown.prevent="onResizePointerDown($event, 'signature')"
              />
            </button>
          </div>
        </div>
      </div>

      <aside class="doc-studio-panel">
        <div class="doc-studio-panel__head">
          <h2>Properties</h2>
          <p>
            Click any purple-dashed text on the page to edit · drag stamp /
            signature · resize from the corner
          </p>
        </div>

        <div class="doc-studio-panel-block">
          <p class="doc-studio-panel-block__title">Page text</p>
          <FormControl
            :model-value="editMode ? 'yes' : 'no'"
            type="select"
            label="Edit text on page"
            :options="[
              { label: 'On — click fields to type', value: 'yes' },
              { label: 'Off — view only', value: 'no' },
            ]"
            @update:model-value="(v: string) => (editMode = v === 'yes')"
          />
          <Button
            size="sm"
            icon-left="lucide-type"
            label="Reset text edits"
            @click="resetDocumentText"
          />
        </div>

        <div class="doc-studio-panel-block">
          <p class="doc-studio-panel-block__title">
            {{ activeOverlay === 'stamp' ? 'Stamp' : 'Signature' }}
          </p>
          <label class="doc-studio-upload">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              class="sr-only"
              @change="onUpload($event, activeOverlay)"
            />
            <span class="lucide-upload size-4" />
            Upload image
          </label>
          <div class="flex flex-wrap gap-2">
            <Button
              size="sm"
              label="Clear"
              @click="clearAsset(activeOverlay)"
            />
            <FormControl
              :model-value="
                activeOverlay === 'stamp'
                  ? canvas.stamp.visible
                    ? 'yes'
                    : 'no'
                  : canvas.signature.visible
                    ? 'yes'
                    : 'no'
              "
              type="select"
              label="Visibility"
              :options="[
                { label: 'Visible', value: 'yes' },
                { label: 'Hidden', value: 'no' },
              ]"
              @update:model-value="
                (v: string) => setOverlayVisible(activeOverlay, v)
              "
            />
          </div>
          <FormControl
            v-if="activeOverlay === 'stamp'"
            v-model="canvas.stamp.width"
            type="number"
            label="Size (%)"
          />
          <FormControl
            v-else
            v-model="canvas.signature.width"
            type="number"
            label="Size (%)"
          />
          <FormControl
            v-if="activeOverlay === 'stamp'"
            v-model="canvas.stamp.opacity"
            type="number"
            label="Opacity (0–1)"
          />
          <FormControl
            v-else
            v-model="canvas.signature.opacity"
            type="number"
            label="Opacity (0–1)"
          />
          <p v-if="activeAsset()" class="doc-studio-meta">
            x {{ Math.round(activeAsset()!.x) }}% · y
            {{ Math.round(activeAsset()!.y) }}% · w
            {{ Math.round(Number(activeAsset()!.width)) }}%
          </p>
        </div>

        <div class="doc-studio-panel-block">
          <p class="doc-studio-panel-block__title">Signers & note</p>
          <FormControl
            v-model="canvas.leftSigner"
            label="Left signer"
            type="text"
          />
          <FormControl
            v-model="canvas.rightSigner"
            label="Right signer"
            type="text"
          />
          <FormControl
            v-model="canvas.note"
            label="Extra note"
            type="textarea"
          />
        </div>

        <div class="doc-studio-panel__actions">
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
              selectedRow && router.push(`/${selectedModule}/${selectedRow.id}`)
            "
          />
        </div>
      </aside>
    </div>
  </div>
</template>
