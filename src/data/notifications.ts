import { computed, reactive } from 'vue'
import {
  pendingApplicantCount,
  schoolStore,
  unpaidFeeCount,
} from './store'

export type NotificationTone = 'amber' | 'red' | 'blue' | 'green' | 'gray'

export interface SchoolNotification {
  id: string
  title: string
  body: string
  route: string
  tone: NotificationTone
  createdAt: string
  read: boolean
}

const dismissed = reactive(new Set<string>())

function todayLabel() {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Live queue from the same signals as the dashboard alerts. */
export const notifications = computed<SchoolNotification[]>(() => {
  const items: SchoolNotification[] = []
  const unpaid = unpaidFeeCount.value
  const pending = pendingApplicantCount.value
  const absent = (schoolStore.attendance?.rows || []).filter(
    (r) => r.status === 'Absent',
  ).length
  const onLeave = (schoolStore.students?.rows || []).filter(
    (r) => r.status === 'On Leave',
  ).length
  const pendingPayments = (schoolStore.payments?.rows || []).filter(
    (r) => r.status === 'Pending',
  ).length
  const draftCards = (schoolStore['report-cards']?.rows || []).filter(
    (r) => r.status === 'Draft',
  ).length
  const scheduledMsgs = (schoolStore['sms-messages']?.rows || []).filter(
    (r) => r.status === 'Scheduled',
  ).length

  if (unpaid > 0) {
    items.push({
      id: 'fees-unpaid',
      title: `${unpaid} fee invoice${unpaid === 1 ? '' : 's'} need attention`,
      body: 'Unpaid, partial, or overdue balances are waiting.',
      route: '/fees',
      tone: 'amber',
      createdAt: todayLabel(),
      read: dismissed.has('fees-unpaid'),
    })
  }
  if (pending > 0) {
    items.push({
      id: 'admissions-pending',
      title: `${pending} admission${pending === 1 ? '' : 's'} pending review`,
      body: 'Applicants on Pending or Waitlist need a decision this week.',
      route: '/applicants',
      tone: 'red',
      createdAt: todayLabel(),
      read: dismissed.has('admissions-pending'),
    })
  }
  if (absent > 0) {
    items.push({
      id: 'attendance-absent',
      title: `${absent} absence${absent === 1 ? '' : 's'} on the roll`,
      body: 'Review today’s attendance register.',
      route: '/attendance',
      tone: 'amber',
      createdAt: todayLabel(),
      read: dismissed.has('attendance-absent'),
    })
  }
  if (onLeave > 0) {
    items.push({
      id: 'students-leave',
      title: `${onLeave} student${onLeave === 1 ? '' : 's'} on leave`,
      body: 'Check return dates and guardians.',
      route: '/students',
      tone: 'blue',
      createdAt: todayLabel(),
      read: dismissed.has('students-leave'),
    })
  }
  if (pendingPayments > 0) {
    items.push({
      id: 'payments-pending',
      title: `${pendingPayments} mobile money payment${pendingPayments === 1 ? '' : 's'} to reconcile`,
      body: 'MTN / Airtel receipts waiting in Accounts.',
      route: '/payments',
      tone: 'amber',
      createdAt: todayLabel(),
      read: dismissed.has('payments-pending'),
    })
  }
  if (draftCards > 0) {
    items.push({
      id: 'report-cards-draft',
      title: `${draftCards} report card${draftCards === 1 ? '' : 's'} still draft`,
      body: 'Publish so parents can view on the portal.',
      route: '/report-cards',
      tone: 'blue',
      createdAt: todayLabel(),
      read: dismissed.has('report-cards-draft'),
    })
  }
  if (scheduledMsgs > 0) {
    items.push({
      id: 'messages-scheduled',
      title: `${scheduledMsgs} scheduled message${scheduledMsgs === 1 ? '' : 's'}`,
      body: 'SMS / WhatsApp / Email ready to send.',
      route: '/communications',
      tone: 'green',
      createdAt: todayLabel(),
      read: dismissed.has('messages-scheduled'),
    })
  }

  return items
})

export const unreadNotificationCount = computed(
  () => notifications.value.filter((n) => !n.read).length,
)

export const notificationBadgeLabel = computed(() => {
  const n = unreadNotificationCount.value
  if (n <= 0) return ''
  return n > 9 ? '9+' : String(n)
})

export function markNotificationRead(id: string) {
  dismissed.add(id)
}

export function markAllNotificationsRead() {
  for (const n of notifications.value) dismissed.add(n.id)
}
