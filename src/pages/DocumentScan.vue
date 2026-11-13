<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  Progress,
  toast,
} from 'frappe-ui'
import {
  emptyScannedFields,
  fieldsToRecordValues,
  parseScannedText,
  recognizeImage,
  scanTargets,
  terminateScanWorker,
  type ScanTarget,
  type ScannedFields,
} from '../data/documentScan'
import { addRecord } from '../data/store'
import { canCurrentUser } from '../data/permissions'

const router = useRouter()

const target = ref<ScanTarget>('applicants')
const previewUrl = ref('')
const fileName = ref('')
const rawText = ref('')
const confidence = ref(0)
const fields = ref<ScannedFields>(emptyScannedFields())
const scanning = ref(false)
const progress = ref(0)
const progressLabel = ref('')
const showRaw = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const targetDef = computed(
  () => scanTargets.find((t) => t.id === target.value)!,
)

const targetOptions = scanTargets.map((t) => ({
  label: t.label,
  value: t.id,
}))

const canCreate = computed(() =>
  canCurrentUser(targetDef.value.moduleKey, 'create'),
)

const hasImage = computed(() => Boolean(previewUrl.value))
const hasFields = computed(() => Boolean(fields.value.name.trim()))

watch(target, () => {
  if (rawText.value) {
    fields.value = parseScannedText(rawText.value, target.value)
    fields.value.status =
      fields.value.status || targetDef.value.statusDefault
  }
})

function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  fileName.value = ''
}

function resetAll() {
  clearPreview()
  rawText.value = ''
  confidence.value = 0
  fields.value = emptyScannedFields()
  progress.value = 0
  progressLabel.value = ''
  showRaw.value = false
}

function pickFile() {
  fileInput.value?.click()
}

async function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.error('Choose a photo or scanned image (JPG, PNG, WebP)')
    return
  }
  if (file.size > 12 * 1024 * 1024) {
    toast.error('Image is too large — keep under 12 MB')
    return
  }
  clearPreview()
  previewUrl.value = URL.createObjectURL(file)
  fileName.value = file.name
  rawText.value = ''
  confidence.value = 0
  fields.value = emptyScannedFields()
  await runScan(file)
}

async function runScan(source?: File | Blob | string) {
  const img = source || previewUrl.value
  if (!img) {
    toast.error('Upload or capture a photo first')
    return
  }
  if (!canCreate.value) {
    toast.error('Your role cannot create records for this module')
    return
  }
  scanning.value = true
  progress.value = 0
  progressLabel.value = 'Preparing OCR…'
  try {
    const result = await recognizeImage(img, (pct, status) => {
      progress.value = pct
      progressLabel.value =
        status === 'recognizing text'
          ? `Reading text… ${pct}%`
          : status === 'loading language traineddata'
            ? 'Loading language pack…'
            : status === 'initializing tesseract'
              ? 'Starting scanner…'
              : `Scanning… ${pct}%`
    })
    rawText.value = result.text.trim()
    confidence.value = Math.round(result.confidence || 0)
    if (!rawText.value) {
      toast.warning(
        'No text found — try a clearer photo or fill the fields manually',
      )
      fields.value = {
        ...emptyScannedFields(),
        status: targetDef.value.statusDefault,
        applied: new Date().toISOString().slice(0, 10),
      }
      return
    }
    fields.value = parseScannedText(rawText.value, target.value)
    fields.value.status =
      fields.value.status || targetDef.value.statusDefault
    toast.success(
      confidence.value
        ? `Scanned · ~${confidence.value}% confidence`
        : 'Scanned — review the fields below',
    )
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Scan failed')
  } finally {
    scanning.value = false
    progressLabel.value = ''
  }
}

function saveRecord() {
  if (!canCreate.value) {
    toast.error('Your role cannot create records for this module')
    return
  }
  if (!fields.value.name.trim()) {
    toast.error('Enter a name before saving')
    return
  }
  try {
    const values = fieldsToRecordValues(target.value, fields.value)
    const row = addRecord(targetDef.value.moduleKey, values)
    toast.success(`Saved · ${row.name}`)
    router.push(`/${targetDef.value.moduleKey}/${row.id}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save')
  }
}

onBeforeUnmount(() => {
  clearPreview()
  void terminateScanWorker()
})
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Scan to data" />
    <div class="flex flex-wrap gap-2">
      <Button label="Clear" :disabled="scanning" @click="resetAll" />
      <Button
        icon-left="lucide-camera"
        label="Upload / camera"
        :disabled="scanning"
        @click="pickFile"
      />
      <Button
        variant="solid"
        icon-left="lucide-save"
        label="Save record"
        :disabled="scanning || !hasFields"
        @click="saveRecord"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-5xl">
    <p class="text-p-base text-ink-gray-6">
      Upload or take a photo of an admission form, registration sheet, fee
      invoice, receipt, or contact card. We read the text on your device and
      fill the fields — review, then save into the school desk.
    </p>

    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="image/*"
      capture="environment"
      @change="onFileChange"
    />

    <section class="school-section">
      <h2 class="school-section-title">What are you scanning?</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="t in scanTargets"
          :key="t.id"
          type="button"
          class="rounded-6 border p-4 text-left transition"
          :class="
            target === t.id
              ? 'border-outline-gray-4 bg-surface-gray-2'
              : 'border-outline-gray-1 bg-surface-white hover:border-outline-gray-3'
          "
          @click="target = t.id"
        >
          <p class="text-sm-medium text-ink-gray-9">{{ t.label }}</p>
          <p class="mt-1 text-xs text-ink-gray-5">{{ t.description }}</p>
        </button>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Photo</h2>
      <div
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 lg:grid-cols-2"
      >
        <div class="space-y-3">
          <div
            class="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-6 border border-dashed border-outline-gray-2 bg-surface-gray-1 p-4 text-center"
            @click="!scanning && pickFile()"
          >
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :alt="fileName || 'Scan preview'"
              class="max-h-64 w-full object-contain"
            />
            <template v-else>
              <p class="text-sm-medium text-ink-gray-8">
                Drop a photo here or tap to upload
              </p>
              <p class="text-xs text-ink-gray-5">
                Phone camera works too · JPG, PNG, WebP
              </p>
            </template>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="solid"
              icon-left="lucide-upload"
              label="Choose photo"
              :disabled="scanning"
              @click="pickFile"
            />
            <Button
              icon-left="lucide-scan-text"
              label="Scan again"
              :disabled="scanning || !hasImage"
              @click="runScan()"
            />
          </div>
          <p v-if="fileName" class="text-xs text-ink-gray-5">{{ fileName }}</p>
        </div>

        <div class="space-y-3">
          <FormControl
            v-model="target"
            label="Save into"
            type="select"
            :options="targetOptions"
          />
          <div v-if="scanning" class="space-y-2">
            <p class="text-sm text-ink-gray-7">{{ progressLabel }}</p>
            <Progress :value="progress" />
          </div>
          <div v-else-if="rawText" class="flex flex-wrap items-center gap-2">
            <Badge
              :label="
                confidence
                  ? `OCR confidence ~${confidence}%`
                  : 'Text extracted'
              "
              theme="blue"
              variant="subtle"
            />
            <Badge
              :label="targetDef.label"
              theme="gray"
              variant="subtle"
            />
          </div>
          <p v-else class="text-sm text-ink-gray-5">
            After you upload, text is read on this device — nothing is sent to
            a cloud OCR service.
          </p>
          <Button
            v-if="rawText"
            :label="showRaw ? 'Hide raw text' : 'Show raw text'"
            @click="showRaw = !showRaw"
          />
          <pre
            v-if="showRaw && rawText"
            class="max-h-48 overflow-auto rounded-6 bg-surface-gray-2 p-3 text-xs text-ink-gray-7 whitespace-pre-wrap"
          >{{ rawText }}</pre>
        </div>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Review & edit</h2>
      <div
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <FormControl v-model="fields.name" label="Name" type="text" />
        <FormControl v-model="fields.status" label="Status" type="text" />

        <template v-if="target === 'applicants' || target === 'students'">
          <FormControl v-model="fields.program" label="Section" type="text" />
          <FormControl
            v-model="fields.grade"
            :label="target === 'students' ? 'Class' : 'Class / grade'"
            type="text"
          />
          <FormControl
            v-if="target === 'students'"
            v-model="fields.className"
            label="Class name"
            type="text"
          />
          <FormControl
            v-if="target === 'applicants'"
            v-model="fields.applied"
            label="Applied date"
            type="text"
          />
        </template>

        <template v-if="target === 'guardians'">
          <FormControl v-model="fields.relation" label="Relation" type="text" />
          <FormControl v-model="fields.student" label="Student" type="text" />
        </template>

        <template v-if="target === 'fees' || target === 'payments'">
          <FormControl
            v-if="target === 'fees'"
            v-model="fields.invoice"
            label="Invoice"
            type="text"
          />
          <FormControl v-model="fields.amount" label="Amount" type="text" />
          <FormControl
            v-if="target === 'fees'"
            v-model="fields.paid"
            label="Paid"
            type="text"
          />
          <FormControl
            v-if="target === 'payments'"
            v-model="fields.channel"
            label="Channel"
            type="text"
          />
          <FormControl
            v-if="target === 'payments'"
            v-model="fields.student"
            label="Student"
            type="text"
          />
        </template>

        <FormControl v-model="fields.phone" label="Phone" type="text" />
        <FormControl v-model="fields.email" label="Email" type="text" />
        <FormControl
          v-model="fields.notes"
          class="sm:col-span-2"
          label="Notes from scan"
          type="textarea"
        />

        <div class="sm:col-span-2 flex flex-wrap gap-2">
          <Button
            variant="solid"
            icon-left="lucide-save"
            label="Save to school desk"
            :disabled="scanning || !hasFields"
            @click="saveRecord"
          />
          <Button label="Clear" :disabled="scanning" @click="resetAll" />
        </div>
      </div>
    </section>
  </div>
</template>
