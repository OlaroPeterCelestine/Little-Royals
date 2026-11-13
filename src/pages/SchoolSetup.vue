<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Badge,
  Button,
  FormControl,
  PageHeader,
  PageHeaderTitle,
  dialog,
  toast,
} from 'frappe-ui'
import {
  formatSchoolAddress,
  resetSchoolSetup,
  saveSchoolSetup,
  schoolSetup,
  type SchoolSetup,
} from '../data/schoolSetup'
import SchoolLogo from '../components/SchoolLogo.vue'

const router = useRouter()
const saving = ref(false)
const dirty = ref(false)

const form = reactive<SchoolSetup>({ ...schoolSetup })

watch(
  schoolSetup,
  (value) => {
    if (dirty.value) return
    Object.assign(form, value)
  },
  { deep: true },
)

function markDirty() {
  dirty.value = true
}

function syncFromStore() {
  Object.assign(form, schoolSetup)
  dirty.value = false
}

function discard() {
  dialog.confirm({
    title: 'Discard changes?',
    message: 'Unsaved school setup edits will be lost.',
    icon: 'lucide-rotate-ccw',
    theme: 'amber',
    confirmLabel: 'Discard',
    onConfirm: async () => {
      syncFromStore()
      toast.info('Changes discarded')
    },
  })
}

async function save() {
  if (!form.name.trim()) {
    toast.error('School name is required')
    return
  }
  if (!form.phone.trim()) {
    toast.error('Phone number is required')
    return
  }
  saving.value = true
  try {
    saveSchoolSetup({
      ...form,
      name: form.name.trim(),
      shortName: form.shortName.trim() || form.name.trim(),
      initials: (form.initials.trim() || 'LR').slice(0, 3).toUpperCase(),
    })
    dirty.value = false
    toast.success('School setup saved')
  } finally {
    saving.value = false
  }
}

function resetDefaults() {
  dialog.danger({
    title: 'Reset school setup?',
    message:
      'This restores Little Royals default address, phones and registration details. Your current values will be replaced.',
    confirmLabel: 'Yes, reset',
    cancelLabel: 'Keep current',
    onConfirm: async () => {
      resetSchoolSetup()
      syncFromStore()
      toast.warning('School setup reset to defaults')
    },
  })
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="School Setup" />
    <div class="flex flex-wrap items-center gap-2">
      <Button
        icon-left="lucide-users"
        label="Users & Roles"
        @click="router.push('/users')"
      />
      <Button
        label="Discard"
        :disabled="!dirty || saving"
        @click="discard"
      />
      <Button
        variant="solid"
        icon-left="lucide-check"
        label="Save setup"
        :loading="saving"
        :disabled="!dirty"
        @click="save"
      />
    </div>
  </PageHeader>

  <div class="school-page max-w-4xl">
    <p class="text-p-base text-ink-gray-6">
      School identity, contact numbers, address and academic registration for
      Little Royals Kindergarten and Primary School.
    </p>

    <section
      class="flex flex-wrap items-start justify-between gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
    >
      <div class="flex min-w-0 items-start gap-4">
        <div
          class="school-brand-mark flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full"
        >
          <SchoolLogo size="xl" />
        </div>
        <div class="min-w-0 space-y-1.5">
          <p
            class="text-xs font-medium uppercase tracking-wide"
            style="color: var(--school-blue)"
          >
            School profile · {{ form.motto || 'In God We Trust' }}
          </p>
          <h1 class="text-2xl-semibold text-ink-gray-9">
            {{ form.name || 'School name' }}
          </h1>
          <p class="whitespace-pre-line text-sm text-ink-gray-6">
            {{ formatSchoolAddress(form) }}
          </p>
          <div class="flex flex-wrap gap-2 pt-1">
            <Badge
              :label="`${form.currentTerm} · ${form.academicYear}`"
              theme="blue"
              variant="subtle"
            />
            <Badge :label="form.currency" theme="green" variant="subtle" />
            <Badge
              v-if="dirty"
              label="Unsaved changes"
              theme="amber"
              variant="subtle"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="school-section" @input="markDirty" @change="markDirty">
      <h2 class="school-section-title">Identity</h2>
      <div
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <FormControl
          v-model="form.name"
          class="sm:col-span-2"
          label="School name"
          type="text"
          required
        />
        <FormControl v-model="form.shortName" label="Short name" type="text" />
        <FormControl
          v-model="form.initials"
          label="Initials (logo)"
          type="text"
        />
        <FormControl
          v-model="form.motto"
          class="sm:col-span-2"
          label="Motto"
          type="text"
        />
        <FormControl
          v-model="form.about"
          class="sm:col-span-2"
          label="About the school"
          type="textarea"
        />
      </div>
    </section>

    <section class="school-section" @input="markDirty" @change="markDirty">
      <h2 class="school-section-title">Address</h2>
      <div
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <FormControl
          v-model="form.addressLine1"
          class="sm:col-span-2"
          label="Address line 1"
          type="text"
        />
        <FormControl
          v-model="form.addressLine2"
          class="sm:col-span-2"
          label="Address line 2"
          type="text"
        />
        <FormControl v-model="form.city" label="City / town" type="text" />
        <FormControl v-model="form.district" label="District" type="text" />
        <FormControl
          v-model="form.country"
          class="sm:col-span-2"
          label="Country"
          type="text"
        />
      </div>
    </section>

    <section class="school-section" @input="markDirty" @change="markDirty">
      <h2 class="school-section-title">Contact</h2>
      <div
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <FormControl
          v-model="form.phone"
          label="Phone"
          type="text"
          required
        />
        <FormControl
          v-model="form.phoneAlt"
          label="Alternate phone"
          type="text"
        />
        <FormControl v-model="form.email" label="Email" type="text" />
        <FormControl v-model="form.website" label="Website" type="text" />
      </div>
    </section>

    <section class="school-section" @input="markDirty" @change="markDirty">
      <h2 class="school-section-title">Registration & academics</h2>
      <div
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <FormControl
          v-model="form.registrationNo"
          label="MoES registration no."
          type="text"
        />
        <FormControl
          v-model="form.unebCentre"
          label="UNEB centre no."
          type="text"
        />
        <FormControl
          v-model="form.headTeacher"
          label="Head teacher"
          type="text"
        />
        <FormControl
          v-model="form.established"
          label="Year established"
          type="text"
        />
        <FormControl
          v-model="form.currentTerm"
          label="Current term"
          type="text"
        />
        <FormControl
          v-model="form.academicYear"
          label="Academic year"
          type="text"
        />
        <FormControl v-model="form.currency" label="Currency" type="text" />
      </div>
    </section>

    <div class="flex flex-wrap gap-2">
      <Button
        variant="solid"
        icon-left="lucide-check"
        label="Save setup"
        :loading="saving"
        :disabled="!dirty"
        @click="save"
      />
      <Button label="Discard" :disabled="!dirty || saving" @click="discard" />
      <Button
        theme="red"
        icon-left="lucide-rotate-ccw"
        label="Reset defaults"
        @click="resetDefaults"
      />
    </div>
  </div>
</template>
