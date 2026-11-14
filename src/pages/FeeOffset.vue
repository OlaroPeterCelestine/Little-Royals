<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Alert,
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  toast,
} from 'frappe-ui'
import {
  leftSchoolOutstandingFees,
  offsetFeeDues,
  schoolStore,
} from '../data/store'
import ListStatCards from '../components/ListStatCards.vue'
import { useModuleAccess } from '../composables/useModuleAccess'

const router = useRouter()
const { canWrite, requirePerm } = useModuleAccess('fees')

const selection = ref<string[]>([])
const reason = ref('Withdrawn')
const notes = ref('')
const saving = ref(false)

const reasonOptions = [
  { label: 'Withdrawn', value: 'Withdrawn' },
  { label: 'Transferred', value: 'Transferred' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Other', value: 'Other' },
]

const outstanding = leftSchoolOutstandingFees

const offsetHistory = computed(() => schoolStore['fee-offsets']?.rows || [])

const stats = computed(() => [
  {
    title: 'Open dues',
    value: outstanding.value.length,
    caption: 'left school · unpaid',
  },
  {
    title: 'Selected',
    value: selection.value.length,
    caption: 'to write off',
  },
  {
    title: 'Offsets posted',
    value: offsetHistory.value.length,
    caption: 'audit trail',
  },
])

const allSelected = computed(
  () =>
    outstanding.value.length > 0 &&
    outstanding.value.every((r) => selection.value.includes(r.id)),
)

function toggle(id: string) {
  if (selection.value.includes(id)) {
    selection.value = selection.value.filter((x) => x !== id)
  } else {
    selection.value = [...selection.value, id]
  }
}

function selectAll() {
  selection.value = outstanding.value.map((r) => r.id)
}

function clearSelection() {
  selection.value = []
}

function applyOffset() {
  if (!requirePerm('write', 'offset fee dues')) return
  if (!selection.value.length) {
    toast.error('Select at least one invoice')
    return
  }
  saving.value = true
  try {
    const n = offsetFeeDues(selection.value, reason.value, notes.value)
    toast.success(
      n === 1 ? '1 invoice offset' : `${n} invoices offset`,
    )
    selection.value = []
    notes.value = ''
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not offset dues')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="Offset left dues" />
    <div class="flex flex-wrap gap-2">
      <Button
        icon-left="lucide-receipt"
        label="Fee ledger"
        @click="router.push('/fees')"
      />
      <Button
        icon-left="lucide-history"
        label="Offset history"
        @click="router.push('/fee-offsets')"
      />
    </div>
  </PageHeader>

  <div class="school-page space-y-4">
    <p class="text-p-base text-ink-gray-6">
      Write off outstanding balances for children who left the school
      (withdrawn, transferred, or completed). Active pupils are not listed here.
    </p>

    <ListStatCards :stats="stats" />

    <Alert
      v-if="!outstanding.length"
      theme="green"
      title="No open dues for leavers"
      description="When a fee invoice is marked Left school = Yes with an unpaid balance, it appears here for offset."
      icon="lucide-check-circle"
    />

    <template v-else>
      <Alert
        theme="amber"
        title="Write-off confirms clearance"
        description="Offset sets the invoice to Offset, clears the balance, and posts a fee-offset audit record. Use only for children who have left."
        icon="lucide-alert-triangle"
      />

      <section
        class="school-card space-y-3 rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <div class="flex flex-wrap items-end gap-3">
          <FormControl
            v-model="reason"
            class="min-w-[10rem] flex-1"
            type="select"
            label="Exit reason"
            :options="reasonOptions"
          />
          <FormControl
            v-model="notes"
            class="min-w-[14rem] flex-[2]"
            type="text"
            label="Notes (optional)"
            placeholder="Approved by accounts / board"
          />
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="!allSelected"
              icon-left="lucide-list-checks"
              label="Select all"
              @click="selectAll"
            />
            <Button
              v-else
              icon-left="lucide-x"
              label="Clear"
              @click="clearSelection"
            />
            <Button
              variant="solid"
              theme="blue"
              icon-left="lucide-circle-off"
              :label="
                selection.length
                  ? `Offset ${selection.length}`
                  : 'Offset selected'
              "
              :disabled="!canWrite || !selection.length"
              :loading="saving"
              @click="applyOffset"
            />
          </div>
        </div>
      </section>

      <section
        class="overflow-hidden rounded-6 border border-outline-gray-1 bg-surface-white"
      >
        <div
          v-for="fee in outstanding"
          :key="fee.id"
          class="flex cursor-pointer items-start gap-3 border-b border-outline-gray-1 px-4 py-3 last:border-b-0 hover:bg-surface-gray-1"
          @click="toggle(fee.id)"
        >
          <input
            class="mt-1"
            type="checkbox"
            :checked="selection.includes(fee.id)"
            @click.stop
            @change="toggle(fee.id)"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium text-ink-gray-9">{{ fee.name }}</p>
              <Badge
                :label="String(fee.status || '')"
                :theme="fee.statusTheme || 'red'"
                variant="subtle"
              />
            </div>
            <p class="text-sm text-ink-gray-6">
              {{ fee.invoice }} · {{ fee.className || '—' }} · balance
              {{ fee.balance || fee.amount }}
            </p>
            <p
              v-if="fee.exitReason || fee.subtitle"
              class="text-xs text-ink-gray-5"
            >
              {{ fee.exitReason || fee.subtitle }}
            </p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
