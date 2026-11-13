<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import { schoolStore } from '../data/store'
import { schoolSetup } from '../data/schoolSetup'
import { currentUser } from '../data/activity'
import ListStatCards from '../components/ListStatCards.vue'

const router = useRouter()

const guardian = computed(() => {
  const email = currentUser.email?.toLowerCase()
  const rows = schoolStore.guardians?.rows || []
  if (email) {
    const byEmail = rows.find(
      (g) => String(g.email || '').toLowerCase() === email,
    )
    if (byEmail) return byEmail
  }
  return rows.find((g) => g.name === currentUser.name) || rows[1] || rows[0]
})

const student = computed(() => {
  const id = String(guardian.value?.studentId || '')
  const name = String(guardian.value?.student || '')
  return (
    schoolStore.students?.rows.find((s) => s.id === id || s.name === name) ||
    null
  )
})

const fees = computed(() =>
  (schoolStore.fees?.rows || []).filter(
    (f) =>
      f.name === student.value?.name ||
      String(f.studentId || '') === student.value?.id,
  ),
)

const attendance = computed(() =>
  (schoolStore.attendance?.rows || []).filter(
    (a) => a.name === student.value?.name,
  ),
)

const results = computed(() =>
  (schoolStore['exam-results']?.rows || []).filter(
    (r) => r.name === student.value?.name,
  ),
)

const reportCards = computed(() =>
  (schoolStore['report-cards']?.rows || []).filter(
    (r) =>
      r.name === student.value?.name ||
      String(r.studentId || '') === student.value?.id,
  ),
)

const payments = computed(() =>
  (schoolStore.payments?.rows || []).filter(
    (p) =>
      p.student === student.value?.name ||
      String(p.studentId || '') === student.value?.id,
  ),
)

const messages = computed(() =>
  (schoolStore['sms-messages']?.rows || [])
    .filter((m) => m.status === 'Sent')
    .slice(0, 5),
)

const events = computed(() =>
  (schoolStore['school-events']?.rows || [])
    .filter((e) => e.status === 'Scheduled')
    .slice(0, 4),
)

function parseUgx(value: unknown) {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

const balance = computed(() =>
  fees.value
    .filter((f) => ['Unpaid', 'Overdue', 'Partial'].includes(String(f.status)))
    .reduce((sum, f) => {
      const amount = parseUgx(f.amount)
      const paid = parseUgx(f.paid)
      return sum + Math.max(amount - paid, 0)
    }, 0),
)

const presentPct = computed(() => {
  const rows = attendance.value
  if (!rows.length) return 0
  const ok = rows.filter((r) =>
    ['Present', 'Late'].includes(String(r.status)),
  ).length
  return Math.round((ok / rows.length) * 100)
})

const stats = computed(() => [
  {
    title: 'Fee balance (UGX)',
    value: balance.value,
    caption: schoolSetup.currentTerm,
  },
  {
    title: 'Attendance %',
    value: presentPct.value,
    caption: `${attendance.value.length} recent days`,
  },
  {
    title: 'Average %',
    value: Number(student.value?.average || 0),
    caption: String(student.value?.className || ''),
  },
  {
    title: 'Payments',
    value: payments.value.length,
    caption: 'this term',
  },
])

function printReport(id: string) {
  router.push({ path: '/report-cards', query: { id } })
  toast.success('Open report card to print')
}

function payFees() {
  toast.success(
    'Demo: open MTN *165# or Airtel *185# with school pay code LR-1002',
  )
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Parent Portal" />
    <div class="flex flex-wrap gap-2">
      <Button
        icon-left="lucide-calendar-days"
        label="Calendar"
        @click="router.push('/calendar')"
      />
      <Button
        variant="solid"
        icon-left="lucide-smartphone"
        label="Pay fees"
        @click="payFees"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-5xl">
    <p class="text-p-base text-ink-gray-6">
      Welcome, {{ guardian?.name || currentUser.name }}. Viewing
      <strong>{{ student?.name || 'your child' }}</strong>
      · {{ student?.className || '—' }} · {{ schoolSetup.shortName }}.
    </p>

    <ListStatCards :stats="stats" />

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="school-section">
        <h2 class="school-section-title">Fees & payments</h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="fee in fees"
            :key="fee.id"
            class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ fee.name }}</p>
              <p class="text-xs text-ink-gray-5">
                {{ fee.feeCategory || fee.category || 'School fees' }}
              </p>
            </div>
            <Badge
              :label="String(fee.status)"
              :theme="
                fee.status === 'Paid'
                  ? 'green'
                  : fee.status === 'Partial'
                    ? 'amber'
                    : 'red'
              "
              variant="subtle"
            />
          </div>
          <div
            v-for="pay in payments"
            :key="pay.id"
            class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div>
              <p class="text-sm text-ink-gray-8">{{ pay.channel }} · {{ pay.name }}</p>
              <p class="text-xs text-ink-gray-5">{{ pay.paidAt }}</p>
            </div>
            <p class="text-sm-medium text-ink-gray-9">
              UGX {{ Number(pay.amount || 0).toLocaleString() }}
            </p>
          </div>
          <p
            v-if="!fees.length && !payments.length"
            class="px-4 py-8 text-center text-sm text-ink-gray-5"
          >
            No fee records linked yet.
          </p>
        </div>
      </section>

      <section class="school-section">
        <h2 class="school-section-title">Attendance</h2>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="row in attendance.slice(0, 8)"
            :key="row.id"
            class="flex items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <p class="text-sm text-ink-gray-7">{{ row.date || row.id }}</p>
            <Badge
              :label="String(row.status)"
              :theme="
                row.status === 'Present'
                  ? 'green'
                  : row.status === 'Late'
                    ? 'amber'
                    : 'red'
              "
              variant="subtle"
            />
          </div>
          <p
            v-if="!attendance.length"
            class="px-4 py-8 text-center text-sm text-ink-gray-5"
          >
            No attendance rows for this learner.
          </p>
        </div>
      </section>

      <section class="school-section">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h2 class="school-section-title mb-0">Results & report cards</h2>
        </div>
        <div
          class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
        >
          <div
            v-for="rc in reportCards"
            :key="rc.id"
            class="flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <div>
              <p class="text-sm-medium text-ink-gray-9">{{ rc.term }}</p>
              <p class="text-xs text-ink-gray-5">
                Avg {{ rc.average }}% · Div {{ rc.division }} · {{ rc.position }}
              </p>
            </div>
            <Button
              v-if="rc.status === 'Published'"
              label="Print"
              @click="printReport(rc.id)"
            />
            <Badge v-else :label="String(rc.status)" theme="amber" variant="subtle" />
          </div>
          <div
            v-for="res in results.slice(0, 5)"
            :key="res.id"
            class="flex items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-3 last:border-b-0"
          >
            <p class="text-sm text-ink-gray-8">
              {{ res.exam || res.assessment || res.name }}
            </p>
            <p class="text-sm-medium">{{ res.score || res.grade || res.status }}</p>
          </div>
          <p
            v-if="!reportCards.length && !results.length"
            class="px-4 py-8 text-center text-sm text-ink-gray-5"
          >
            No results published yet.
          </p>
        </div>
      </section>

      <section class="school-section">
        <h2 class="school-section-title">School updates</h2>
        <div class="space-y-3">
          <div
            v-for="ev in events"
            :key="ev.id"
            class="rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
          >
            <p class="text-sm-medium text-ink-gray-9">{{ ev.name }}</p>
            <p class="text-xs text-ink-gray-5">
              {{ ev.date }} · {{ ev.type }} · {{ ev.audience }}
            </p>
          </div>
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="rounded-6 border border-outline-gray-1 bg-surface-white px-4 py-3"
          >
            <div class="mb-1 flex flex-wrap gap-2">
              <Badge
                :label="String(msg.channel)"
                theme="blue"
                variant="subtle"
              />
              <span class="text-xs text-ink-gray-5">{{ msg.sentAt }}</span>
            </div>
            <p class="text-sm text-ink-gray-8">{{ msg.name }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
