<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import {
  downloadRecordDocument,
  importantDocuments,
  printRecordDocument,
  shareRecordDocument,
  type DocumentKind,
} from '../data/documents'
import { getLiveModule } from '../data/store'
import type { CatalogRow } from '../data/catalog'
import { canCurrentUser } from '../data/permissions'

const router = useRouter()

const selectedKind = ref<DocumentKind>('invoice')
const selectedModule = ref('fees')
const selectedRecordId = ref('')

const currentDef = computed(
  () => importantDocuments.find((d) => d.kind === selectedKind.value) || null,
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

watch(selectedKind, () => {
  const mods = currentDef.value?.modules || []
  selectedModule.value = mods[0] || 'fees'
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

function assertCanPrint(moduleKey: string) {
  if (canCurrentUser(moduleKey, 'print')) return true
  toast.error('Your role cannot print or export documents for this module')
  return false
}

function requireSelection() {
  if (!selectedRow.value) {
    toast.error('Pick a record first')
    return false
  }
  if (!assertCanPrint(selectedModule.value)) return false
  return true
}

function printSelected() {
  if (!requireSelection() || !selectedRow.value) return
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
  if (!requireSelection() || !selectedRow.value) return
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
  if (!requireSelection() || !selectedRow.value) return
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

function quickPrint(kind: DocumentKind) {
  selectedKind.value = kind
  const mods = importantDocuments.find((d) => d.kind === kind)?.modules || []
  selectedModule.value = mods[0] || 'fees'
  if (!assertCanPrint(selectedModule.value)) return
  const first = getLiveModule(selectedModule.value)?.rows[0]
  if (!first) {
    toast.warning('No records in that module yet')
    return
  }
  selectedRecordId.value = first.id
  try {
    printRecordDocument(kind, selectedModule.value, first)
    toast.success('Print preview opened')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not print')
  }
}

const kindOptions = importantDocuments.map((d) => ({
  label: d.label,
  value: d.kind,
}))
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Important Documents" />
    <div class="flex flex-wrap items-center gap-2">
      <Button
        icon-left="lucide-bar-chart-3"
        label="School reports"
        @click="router.push('/reports')"
      />
      <Button
        icon-left="lucide-share-2"
        label="Share"
        :disabled="!selectedRow"
        @click="shareSelected"
      />
      <Button
        icon-left="lucide-download"
        label="Download"
        :disabled="!selectedRow"
        @click="downloadSelected"
      />
      <Button
        variant="solid"
        icon-left="lucide-printer"
        label="Print"
        @click="printSelected"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-4xl">
    <p class="text-p-base text-ink-gray-6">
      Print only official school documents: fee invoices, receipts, admission
      letters, exam reports and term report cards. For school-wide summaries,
      use School Reports.
    </p>

    <section class="school-section">
      <h2 class="school-section-title">Important documents</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="doc in importantDocuments"
          :key="doc.kind"
          type="button"
          class="rounded-6 border border-outline-gray-1 bg-surface-white p-4 text-left transition hover:border-outline-gray-3 hover:bg-surface-gray-1"
          @click="quickPrint(doc.kind)"
        >
          <p class="text-sm-medium text-ink-gray-9">{{ doc.label }}</p>
          <p class="mt-1 text-xs text-ink-gray-5">{{ doc.description }}</p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <Badge label="Official" theme="blue" variant="subtle" />
            <Badge
              v-for="m in doc.modules"
              :key="m"
              :label="m"
              theme="gray"
              variant="subtle"
            />
          </div>
        </button>
      </div>
    </section>

    <section class="school-section">
      <h2 class="school-section-title">Print, download or share a record</h2>
      <div
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <FormControl
          v-model="selectedKind"
          label="Document type"
          type="select"
          :options="kindOptions"
        />
        <FormControl
          v-model="selectedModule"
          label="Module"
          type="select"
          :options="moduleOptions"
        />
        <FormControl
          v-model="selectedRecordId"
          class="sm:col-span-2"
          label="Record"
          type="select"
          :options="recordOptions"
        />
        <div class="sm:col-span-2 flex flex-wrap gap-2">
          <Button
            variant="solid"
            icon-left="lucide-printer"
            label="Print"
            @click="printSelected"
          />
          <Button
            icon-left="lucide-download"
            label="Download"
            :disabled="!selectedRow"
            @click="downloadSelected"
          />
          <Button
            icon-left="lucide-share-2"
            label="Share"
            :disabled="!selectedRow"
            @click="shareSelected"
          />
          <Button
            label="Open record"
            :disabled="!selectedRow"
            @click="
              selectedRow &&
              router.push(`/${selectedModule}/${selectedRow.id}`)
            "
          />
        </div>
      </div>
    </section>
  </div>
</template>
