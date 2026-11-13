<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
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
const channelTab = ref('all')
const query = ref('')

const tabs = [
  { label: 'All', value: 'all' },
  { label: 'MTN MoMo', value: 'MTN MoMo' },
  { label: 'Airtel Money', value: 'Airtel Money' },
  { label: 'Bank', value: 'Bank transfer' },
  { label: 'Pending', value: 'Pending' },
]

const canCreate = computed(() => canCurrentUser('payments', 'create'))
const canWrite = computed(() => canCurrentUser('payments', 'write'))

const rows = computed(() => schoolStore.payments?.rows || [])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (channelTab.value === 'Pending') {
      if (r.status !== 'Pending') return false
    } else if (channelTab.value !== 'all') {
      if (String(r.channel) !== channelTab.value) return false
    }
    if (!q) return true
    return [r.name, r.student, r.channel, r.phone, r.status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const stats = computed(() => {
  const all = rows.value
  const sum = (list: CatalogRow[]) =>
    list.reduce((n, r) => n + Number(r.amount || 0), 0)
  const reconciled = all.filter((r) => r.status === 'Reconciled')
  const pending = all.filter((r) => r.status === 'Pending')
  return [
    {
      title: 'Reconciled (UGX)',
      value: sum(reconciled),
      caption: `${reconciled.length} receipts`,
    },
    {
      title: 'Pending (UGX)',
      value: sum(pending),
      caption: `${pending.length} to match`,
    },
    {
      title: 'MTN',
      value: all.filter((r) => r.channel === 'MTN MoMo').length,
    },
    {
      title: 'Airtel',
      value: all.filter((r) => r.channel === 'Airtel Money').length,
    },
  ]
})

function statusTheme(status?: string) {
  if (status === 'Reconciled') return 'green'
  if (status === 'Pending') return 'amber'
  if (status === 'Failed') return 'red'
  return 'gray'
}

function channelTheme(channel?: string) {
  if (channel === 'MTN MoMo') return 'amber'
  if (channel === 'Airtel Money') return 'red'
  return 'blue'
}

function recordPayment() {
  if (!canCreate.value) {
    toast.error('Your role cannot record payments')
    return
  }
  const students = (schoolStore.students?.rows || []).map((s) => ({
    label: `${s.name} · ${s.className}`,
    value: s.name,
  }))
  dialog.prompt({
    title: 'Record mobile money payment',
    message: `Log an MTN, Airtel or bank payment for ${schoolSetup.shortName}. Demo desk — no live gateway yet.`,
    icon: 'lucide-smartphone-nfc',
    theme: 'blue',
    confirmLabel: 'Save payment',
    size: 'lg',
    fields: [
      {
        name: 'name',
        label: 'Transaction reference',
        type: 'text',
        required: true,
        defaultValue: `MM${Date.now().toString().slice(-8)}`,
      },
      {
        name: 'student',
        label: 'Student',
        type: 'select',
        required: true,
        options: students,
        defaultValue: students[0]?.value,
      },
      {
        name: 'channel',
        label: 'Channel',
        type: 'select',
        required: true,
        defaultValue: 'MTN MoMo',
        options: [
          { label: 'MTN MoMo', value: 'MTN MoMo' },
          { label: 'Airtel Money', value: 'Airtel Money' },
          { label: 'Bank transfer', value: 'Bank transfer' },
          { label: 'Cash', value: 'Cash' },
        ],
      },
      {
        name: 'amount',
        label: 'Amount (UGX)',
        type: 'text',
        required: true,
        defaultValue: '100000',
        validate: (v) =>
          Number(v) > 0 ? null : 'Enter a valid amount',
      },
      {
        name: 'phone',
        label: 'Payer phone',
        type: 'text',
        defaultValue: '+256 ',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        defaultValue: 'Pending',
        options: [
          { label: 'Pending', value: 'Pending' },
          { label: 'Reconciled', value: 'Reconciled' },
        ],
      },
    ],
    onConfirm: async ({ values }) => {
      const studentName = String(values.student)
      const stu = schoolStore.students?.rows.find((s) => s.name === studentName)
      const row = addRecord('payments', {
        name: String(values.name).trim(),
        student: studentName,
        studentId: stu?.id || '',
        channel: String(values.channel),
        amount: Number(values.amount),
        phone: String(values.phone || '—'),
        paidAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        status: String(values.status),
      })
      logActivity({
        action: 'Created',
        module: 'payments',
        moduleLabel: 'Payment',
        recordId: row.id,
        recordName: row.name,
        summary: `${row.channel} UGX ${Number(row.amount).toLocaleString()} · ${row.student}`,
        severity: 'success',
      })
      toast.success('Payment recorded')
    },
  })
}

function reconcile(row: CatalogRow) {
  if (!canWrite.value) {
    toast.error('Your role cannot reconcile')
    return
  }
  dialog.confirm({
    title: 'Reconcile payment?',
    message: `Mark ${row.name} (${row.channel}, UGX ${Number(row.amount).toLocaleString()}) as reconciled to the fee ledger?`,
    icon: 'lucide-check-circle',
    theme: 'green',
    confirmLabel: 'Reconcile',
    onConfirm: async () => {
      updateRecord('payments', row.id, {
        name: row.name,
        status: 'Reconciled',
      })
      toast.success('Payment reconciled')
    },
  })
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Mobile Money Payments" />
    <div class="flex flex-wrap gap-2">
      <Button
        icon-left="lucide-receipt"
        label="Fee ledger"
        @click="router.push('/fees')"
      />
      <Button
        v-if="canCreate"
        variant="solid"
        icon-left="lucide-plus"
        label="Record payment"
        @click="recordPayment"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-5xl">
    <p class="text-p-base text-ink-gray-6">
      Track <strong>MTN MoMo</strong>, <strong>Airtel Money</strong> and bank
      fee payments for {{ schoolSetup.shortName }}. Live gateway hooks come
      later — this desk records and reconciles today.
    </p>

    <ListStatCards :stats="stats" />

    <TabButtons v-model="channelTab" :options="tabs" />

    <FormControl
      v-model="query"
      class="max-w-md"
      label="Search"
      placeholder="Search reference, student, phone…"
    />

    <section class="school-section">
      <div
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <div
          v-for="row in filtered"
          :key="row.id"
          class="flex flex-wrap items-start justify-between gap-3 border-b border-outline-gray-1 px-4 py-4 last:border-b-0"
        >
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm-medium text-ink-gray-9">{{ row.name }}</p>
              <Badge
                :label="String(row.channel)"
                :theme="channelTheme(String(row.channel))"
                variant="subtle"
              />
              <Badge
                :label="String(row.status)"
                :theme="statusTheme(String(row.status))"
                variant="subtle"
              />
            </div>
            <p class="text-sm text-ink-gray-7">
              {{ row.student }} · UGX
              {{ Number(row.amount || 0).toLocaleString() }}
            </p>
            <p class="text-xs text-ink-gray-5">
              {{ row.paidAt }} · {{ row.phone || '—' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="canWrite && row.status === 'Pending'"
              variant="solid"
              label="Reconcile"
              @click="reconcile(row)"
            />
            <Button label="Open" @click="router.push(`/payments/${row.id}`)" />
          </div>
        </div>
        <p
          v-if="!filtered.length"
          class="px-4 py-12 text-center text-sm text-ink-gray-5"
        >
          No payments on this filter.
        </p>
      </div>
    </section>
  </div>
</template>
