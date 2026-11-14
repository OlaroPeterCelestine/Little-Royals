<script setup lang="ts">
import { computed } from 'vue'
import { PageHeader, PageHeaderTitle } from 'frappe-ui'
import CatalogTabDesk from '@/components/list/CatalogTabDesk.vue'
import ListStatCards from '@/components/list/ListStatCards.vue'
import { getLiveModule } from '@/data/catalog/store'

const tabs = [
  { label: 'Applications', value: 'applications', module: 'applicants' },
  { label: 'Admissions', value: 'admissions', module: 'admissions' },
]

const applicants = computed(() => getLiveModule('applicants')?.rows || [])
const admissions = computed(() => getLiveModule('admissions')?.rows || [])

function statusOf(row: { status?: unknown }) {
  return String(row.status || '').toLowerCase()
}

const stats = computed(() => {
  const apps = applicants.value
  const adm = admissions.value
  const pending = apps.filter((r) => statusOf(r).includes('pending')).length
  const waitlist = apps.filter((r) => statusOf(r).includes('wait')).length
  const approvedApps = apps.filter((r) =>
    statusOf(r).includes('approved'),
  ).length
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
      caption: `${adm.filter((r) => statusOf(r).includes('approved')).length} confirmed`,
    },
    {
      title: 'Fees due',
      value: feeDue,
      caption: 'Unpaid / partial admission fees',
    },
  ]
})
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Admissions" />
  </PageHeader>
  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Applications and accepted admissions — one desk (was two pages).
    </p>
    <ListStatCards :stats="stats" />
    <CatalogTabDesk :tabs="tabs" />
  </div>
</template>
