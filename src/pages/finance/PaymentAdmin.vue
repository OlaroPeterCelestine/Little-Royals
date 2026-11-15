<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Alert,
  Badge,
  Button,
  PageHeader,
  PageHeaderTitle,
  TabButtons,
} from 'frappe-ui'
import { schoolStore, unpaidFeeCount } from '@/data/catalog/store'
import { schoolSetup } from '@/data/school/schoolSetup'
import ListStatCards from '@/components/list/ListStatCards.vue'
import RelatedLinks from '@/components/list/RelatedLinks.vue'

const PaymentsLedger = defineAsyncComponent(() => import('@/pages/finance/Payments.vue'))
const BarChart = defineAsyncComponent(() =>
  import('frappe-ui/charts').then((m) => m.BarChart),
)
const DonutChart = defineAsyncComponent(() =>
  import('frappe-ui/charts').then((m) => m.DonutChart),
)

const router = useRouter()
const route = useRoute()

type PayTab = 'desk' | 'ledger'

function parseTab(raw: unknown): PayTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'ledger' || v === 'payments' || v === 'momo') return 'ledger'
  return 'desk'
}

const tab = ref<PayTab>(parseTab(route.query.tab))
const tabs = [
  { label: 'Dashboard', value: 'desk' },
  { label: 'Payment ledger', value: 'ledger' },
]

watch(tab, (value) => {
  router.replace({ path: '/payment', query: { ...route.query, tab: value } })
})
watch(
  () => route.query.tab,
  (value) => {
    const next = parseTab(value)
    if (tab.value !== next) tab.value = next
  },
)

const payments = computed(() => schoolStore.payments?.rows || [])

const reconciled = computed(() =>
  payments.value.filter((p) => p.status === 'Reconciled'),
)
const pending = computed(() =>
  payments.value.filter((p) => p.status === 'Pending'),
)
const failed = computed(() =>
  payments.value.filter((p) => p.status === 'Failed'),
)

const sum = (rows: Array<{ amount?: string | number | undefined } | Record<string, unknown>>) =>
  rows.reduce((n, r) => n + Number((r as { amount?: unknown }).amount || 0), 0)

const channelMix = computed(() => {
  const map = new Map<string, number>()
  for (const p of payments.value) {
    const c = String(p.channel || 'Other')
    map.set(c, (map.get(c) || 0) + 1)
  }
  return [...map.entries()].map(([channel, count]) => ({ channel, count }))
})

const volumeByChannel = computed(() =>
  channelMix.value.map((c) => ({
    channel: c.channel,
    amount: Math.round(
      sum(payments.value.filter((p) => p.channel === c.channel)) / 1000,
    ),
  })),
)

const stats = computed(() => [
  {
    title: 'Collected (UGX)',
    value: sum(reconciled.value),
    caption: `${reconciled.value.length} reconciled`,
  },
  {
    title: 'Pending (UGX)',
    value: sum(pending.value),
    caption: `${pending.value.length} to match`,
  },
  {
    title: 'Fee invoices open',
    value: unpaidFeeCount.value,
    caption: 'Unpaid / partial / overdue',
  },
  {
    title: 'Failed',
    value: failed.value.length,
    caption: 'retry with parent',
  },
])

function statusTheme(status?: string) {
  if (status === 'Reconciled') return 'green'
  if (status === 'Pending') return 'amber'
  if (status === 'Failed') return 'red'
  return 'gray'
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Payments" />
  </PageHeader>

  <div class="school-page">
    <p class="mb-3 text-sm text-ink-gray-5">
      Dashboard and mobile-money ledger — one desk (was two pages).
    </p>

    <RelatedLinks />
    <TabButtons v-model="tab" :options="tabs" class="school-tabs" />

    <template v-if="tab === 'desk'">
      <div class="school-page-toolbar">
        <div class="school-page-toolbar__grow" />
        <Button
          icon-left="lucide-smartphone-nfc"
          label="Open ledger"
          @click="tab = 'ledger'"
        />
        <Button
          variant="solid"
          icon-left="lucide-receipt"
          label="Fee invoices"
          @click="router.push('/fees')"
        />
      </div>

      <Alert
        v-if="pending.length"
        theme="amber"
        :title="`${pending.length} payment${pending.length === 1 ? '' : 's'} waiting to reconcile`"
        description="Match MTN MoMo / Airtel Money receipts to pupil fee invoices."
        icon="lucide-alert-triangle"
        :primary-action="{
          label: 'Open ledger',
          route: '/payment?tab=ledger',
        }"
      />

      <section class="school-hero">
        <div class="space-y-2">
          <p
            class="text-xs font-medium uppercase tracking-wide"
            style="color: var(--school-blue)"
          >
            {{ schoolSetup.shortName }} · Admin dashboard
          </p>
          <h1 class="text-2xl-semibold text-ink-gray-9">Fee collections</h1>
          <p class="max-w-xl text-p-base text-ink-gray-6">
            School fee desk only (MTN / Airtel / bank) —
            {{ schoolSetup.currentTerm }} {{ schoolSetup.academicYear }}. Not
            linked to any external gateway product.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Badge label="MTN MoMo" theme="amber" variant="subtle" />
          <Badge label="Airtel Money" theme="red" variant="subtle" />
          <Badge :label="schoolSetup.currency" theme="blue" variant="subtle" />
        </div>
      </section>

      <ListStatCards :stats="stats" />

      <section class="school-section">
        <h2 class="school-section-title">Charts</h2>
        <div class="school-card-grid lg:grid-cols-2">
          <div class="school-chart-card">
            <BarChart
              title="Volume by channel"
              subtitle="UGX thousands"
              :data="volumeByChannel"
              x="channel"
              y="amount"
              class="min-h-[260px]"
            />
          </div>
          <div class="school-chart-card">
            <DonutChart
              title="Channel mix"
              subtitle="Payment count"
              :data="channelMix"
              category="channel"
              value="count"
              center-label="Payments"
              class="min-h-[260px]"
            />
          </div>
        </div>
      </section>

      <section class="school-section">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Latest payments</h2>
          <Button label="All payments" @click="tab = 'ledger'" />
        </div>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="row in payments.slice(0, 6)"
            :key="row.id"
            class="flex flex-wrap items-center justify-between gap-3 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ row.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ row.student }} · {{ row.channel }} · {{ row.paidAt }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <p class="text-sm-medium">
                UGX {{ Number(row.amount || 0).toLocaleString() }}
              </p>
              <Badge
                :label="String(row.status)"
                :theme="statusTheme(String(row.status))"
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </section>
    </template>

    <PaymentsLedger v-else embedded />
  </div>
</template>
