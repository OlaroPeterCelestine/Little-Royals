<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button, PageHeader, PageHeaderTitle, toast } from 'frappe-ui'
import CatalogTabDesk from '@/components/list/CatalogTabDesk.vue'
import ListStatCards from '@/components/list/ListStatCards.vue'
import { getLiveModule } from '@/data/catalog/store'
import type { CatalogRow } from '@/data/catalog/catalog'
import {
  admitAndPrintLetter,
  admitApplicant,
  printAdmissionLetter,
} from '@/data/admissions/admitFlow'
import {
  openEditDialog,
} from '@/composables/useModuleForms'
import { pushWithReturn } from '@/composables/useAppBack'
import { canCurrentUser } from '@/data/auth/permissions'

const router = useRouter()

const tabs = [
  { label: 'Applications', value: 'applications', module: 'applicants' },
  { label: 'Admissions', value: 'admissions', module: 'admissions' },
]

const applicants = computed(() => getLiveModule('applicants')?.rows || [])
const admissions = computed(() => getLiveModule('admissions')?.rows || [])

function statusOf(row: { status?: unknown }) {
  return String(row.status || '').toLowerCase()
}

function isAdmitted(row: CatalogRow) {
  return statusOf(row).includes('admit')
}

const stats = computed(() => {
  const apps = applicants.value
  const adm = admissions.value
  const pending = apps.filter((r) => statusOf(r).includes('pending')).length
  const waitlist = apps.filter((r) => statusOf(r).includes('wait')).length
  const approvedApps = apps.filter((r) =>
    statusOf(r).includes('approved'),
  ).length
  const admitted = adm.filter((r) => isAdmitted(r) || statusOf(r).includes('approved')).length
  const feeDue = adm.filter((r) => {
    const fee = String(r.fee || '').toLowerCase()
    return fee.includes('unpaid') || fee.includes('partial')
  }).length
  return [
    {
      title: 'Applications',
      value: apps.length,
      caption: `${pending} pending review`,
    },
    {
      title: 'Approved',
      value: approvedApps,
      caption: `${waitlist} on waitlist`,
    },
    {
      title: 'Admissions',
      value: adm.length,
      caption: `${admitted} admitted / confirmed`,
    },
    {
      title: 'Fees due',
      value: feeDue,
      caption: 'Unpaid / partial admission fees',
    },
  ]
})

function openRow(moduleKey: string, row: CatalogRow) {
  pushWithReturn(router, `/${moduleKey}/${row.id}`)
}

function editRow(moduleKey: string, row: CatalogRow, event?: Event) {
  event?.stopPropagation()
  openEditDialog(moduleKey, row)
}

function onAdmit(row: CatalogRow, withLetter: boolean) {
  try {
    if (withLetter) {
      const result = admitAndPrintLetter(row)
      toast.success(
        result.created
          ? `Admitted ${row.name} · letter opened`
          : `Updated admission for ${row.name} · letter opened`,
      )
    } else {
      const result = admitApplicant(row)
      toast.success(
        result.created
          ? `${row.name} moved to Admissions (${result.admission.id})`
          : `${row.name} marked admitted (${result.admission.id})`,
      )
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not admit applicant')
  }
}

function onLetter(row: CatalogRow, moduleKey: string) {
  try {
    if (moduleKey === 'applicants' && !isAdmitted(row)) {
      onAdmit(row, true)
      return
    }
    printAdmissionLetter(row, moduleKey === 'applicants' ? 'admissions' : moduleKey)
    toast.success(`Admission letter · ${row.name}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not open letter')
  }
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Admissions" />
  </PageHeader>
  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Review applications, admit learners, then print the admission letter with
      requirements.
    </p>
    <ListStatCards :stats="stats" />
    <CatalogTabDesk :tabs="tabs" :show-stats="false" :show-related="true">
      <template #row-actions="{ item, moduleKey, canWrite }">
        <Button
          v-if="moduleKey === 'applicants' && canCurrentUser('admissions', 'create') && !isAdmitted(item)"
          class="relative shrink-0"
          icon="lucide-user-check"
          tooltip="Admit to school"
          aria-label="Admit"
          @click.stop="onAdmit(item, false)"
        />
        <Button
          class="relative shrink-0"
          icon="lucide-scroll-text"
          :tooltip="
            moduleKey === 'applicants' && !isAdmitted(item)
              ? 'Admit & print letter'
              : 'Admission letter'
          "
          aria-label="Admission letter"
          @click.stop="onLetter(item, moduleKey)"
        />
        <Button
          class="relative shrink-0"
          icon="lucide-eye"
          :tooltip="`Open ${item.name}`"
          aria-label="Open"
          @click.stop="openRow(moduleKey, item)"
        />
        <Button
          v-if="canWrite"
          class="relative shrink-0"
          icon="lucide-pencil"
          :tooltip="`Edit ${item.name}`"
          aria-label="Edit"
          @click="editRow(moduleKey, item, $event)"
        />
      </template>
    </CatalogTabDesk>
  </div>
</template>
