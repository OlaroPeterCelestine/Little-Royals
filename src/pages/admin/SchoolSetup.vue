<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import {
  academicYearsSorted,
  termsForYear,
} from '@/data/school/academicCalendar'
import {
  formatSchoolAddress,
  isInsideSchoolGeofence,
  mapsLinkForGeofence,
  resetSchoolSetup,
  saveSchoolSetup,
  schoolGeoCenter,
  schoolGeoRadiusMeters,
  schoolSetup,
  type SchoolSetup,
} from '@/data/school/schoolSetup'
import { sanitizeText } from '@/lib/sanitize'
import SchoolLogo from '@/components/layout/SchoolLogo.vue'
import ListStatCards from '@/components/list/ListStatCards.vue'

type SetupTab =
  | 'identity'
  | 'address'
  | 'contact'
  | 'registration'
  | 'geofence'

const router = useRouter()
const route = useRoute()
const saving = ref(false)
const dirty = ref(false)
const locating = ref(false)
const testLat = ref('')
const testLng = ref('')
const testResult = ref('')

const form = reactive<SchoolSetup>({ ...schoolSetup })

function parseTab(raw: unknown): SetupTab {
  const v = String(raw || '').toLowerCase()
  if (v === 'address') return 'address'
  if (v === 'contact') return 'contact'
  if (v === 'registration' || v === 'academics') return 'registration'
  if (v === 'geofence' || v === 'geo' || v === 'fence') return 'geofence'
  return 'identity'
}

const tab = ref<SetupTab>(parseTab(route.query.tab))

const tabs = [
  { label: 'Identity', value: 'identity' },
  { label: 'Address', value: 'address' },
  { label: 'Contact', value: 'contact' },
  { label: 'Registration & academics', value: 'registration' },
  { label: 'Geofence', value: 'geofence' },
]

const geoPreview = computed(() => {
  const center = schoolGeoCenter(form)
  const radius = schoolGeoRadiusMeters(form)
  return {
    center,
    radius,
    mapsUrl: mapsLinkForGeofence(form),
    valid: Boolean(center && radius),
  }
})

const setupStats = computed(() => {
  const required = [
    form.name,
    form.shortName,
    form.phone,
    form.email,
    form.addressLine1,
    form.currentTerm,
    form.academicYear,
  ]
  const filled = required.filter((v) => String(v || '').trim()).length
  return [
    {
      title: 'Profile fields',
      value: filled,
      caption: `of ${required.length} key fields`,
    },
    {
      title: 'Geofence',
      value: geoPreview.value.valid ? 1 : 0,
      caption: geoPreview.value.valid
        ? `${geoPreview.value.radius} m radius`
        : 'not configured',
    },
    {
      title: 'Term',
      value: 1,
      caption: `${form.currentTerm || '—'} · ${form.academicYear || '—'}`,
    },
    {
      title: 'Unsaved',
      value: dirty.value ? 1 : 0,
      caption: dirty.value ? 'changes pending save' : 'all saved',
    },
  ]
})

const radiusOptions = [
  { label: '50 m · gate only', value: '50' },
  { label: '100 m · compound', value: '100' },
  { label: '150 m', value: '150' },
  { label: '250 m · campus (recommended)', value: '250' },
  { label: '500 m · neighbourhood', value: '500' },
  { label: '1000 m · wide zone', value: '1000' },
]

watch(tab, (value) => {
  router.replace({
    path: '/school-setup',
    query: { ...route.query, tab: value },
  })
})

watch(
  () => route.query.tab,
  (value) => {
    const next = parseTab(value)
    if (tab.value !== next) tab.value = next
  },
)

const yearOptions = computed(() =>
  academicYearsSorted().map((y) => ({
    label: String(y.name),
    value: String(y.name),
  })),
)

const termOptions = computed(() => {
  const year =
    academicYearsSorted().find((y) => String(y.name) === form.academicYear) ||
    null
  const linked = termsForYear(year)
  if (linked.length) {
    return linked.map((t) => ({
      label: String(t.name),
      value: String(t.name),
    }))
  }
  return [
    { label: 'Term I', value: 'Term I' },
    { label: 'Term II', value: 'Term II' },
    { label: 'Term III', value: 'Term III' },
  ]
})

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

function useDeviceLocation() {
  if (!navigator.geolocation) {
    toast.error('Geolocation is not available on this device')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.geoLatitude = pos.coords.latitude.toFixed(6)
      form.geoLongitude = pos.coords.longitude.toFixed(6)
      markDirty()
      locating.value = false
      toast.success('Campus centre set from this device')
    },
    () => {
      locating.value = false
      toast.error('Could not read location — allow location access and retry')
    },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}

function runGeofenceTest() {
  const lat = Number(testLat.value)
  const lng = Number(testLng.value)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    toast.error('Enter test latitude and longitude')
    return
  }
  const result = isInsideSchoolGeofence(lat, lng, form)
  if (!result.enabled) {
    testResult.value = 'Geofence is off — checks are skipped'
    return
  }
  if (result.distanceM == null) {
    testResult.value = 'Set a valid centre and radius first'
    return
  }
  testResult.value = result.inside
    ? `Inside fence · ${result.distanceM} m from centre`
    : `Outside fence · ${result.distanceM} m from centre (limit ${schoolGeoRadiusMeters(form)} m)`
}

function openMaps() {
  const url = geoPreview.value.mapsUrl
  if (!url) {
    toast.error('Set latitude and longitude first')
    return
  }
  window.open(url, '_blank', 'noopener')
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
  if (form.geoEnabled) {
    const center = schoolGeoCenter(form)
    const radius = schoolGeoRadiusMeters(form)
    if (!center) {
      toast.error('Geofence needs valid latitude (−90…90) and longitude (−180…180)')
      tab.value = 'geofence'
      return
    }
    if (!radius) {
      toast.error('Geofence radius must be between 25 m and 5 km')
      tab.value = 'geofence'
      return
    }
  }
  saving.value = true
  try {
    await saveSchoolSetup({
      ...form,
      name: sanitizeText(form.name, 'name'),
      shortName:
        sanitizeText(form.shortName, 'name') ||
        sanitizeText(form.name, 'name'),
      initials: (sanitizeText(form.initials, 'id', 4) || 'SC')
        .slice(0, 3)
        .toUpperCase(),
      geoLabel: sanitizeText(form.geoLabel, 'name', 80),
      geoLatitude: sanitizeText(form.geoLatitude, 'text', 24),
      geoLongitude: sanitizeText(form.geoLongitude, 'text', 24),
      geoRadiusMeters: String(schoolGeoRadiusMeters(form) || form.geoRadiusMeters),
      geoNotes: sanitizeText(form.geoNotes, 'textarea', 500),
      email: sanitizeText(form.email, 'email'),
      phone: sanitizeText(form.phone, 'phone'),
      phoneAlt: sanitizeText(form.phoneAlt, 'phone'),
    })
    syncFromStore()
    dirty.value = false
    toast.success('School setup saved')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not save school setup')
  } finally {
    saving.value = false
  }
}

function resetDefaults() {
  dialog.danger({
    title: 'Reload school setup?',
    message:
      'This reloads the school profile from the server (or offline defaults if the API is off). Unsaved edits will be lost.',
    confirmLabel: 'Yes, reload',
    cancelLabel: 'Keep current',
    onConfirm: async () => {
      await resetSchoolSetup()
      syncFromStore()
      toast.warning('School setup reloaded')
    },
  })
}
</script>

<template>
  <PageHeader>
    <PageHeaderTitle title="School Setup" />
    <div class="flex flex-wrap items-center gap-2">
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
    <ListStatCards :stats="setupStats" />
    <TabButtons v-model="tab" :options="tabs" class="school-tabs" />

    <section
      v-if="tab === 'identity'"
      class="school-section space-y-4"
      @input="markDirty"
      @change="markDirty"
    >
      <h2 class="school-section-title">Identity</h2>
      <div
        class="flex flex-wrap items-start gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
      >
        <div
          class="school-brand-mark flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full"
        >
          <SchoolLogo size="xl" />
        </div>
        <div class="min-w-0 flex-1 space-y-1.5">
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
              v-if="form.geoEnabled"
              :label="`Geofence ${form.geoRadiusMeters || '—'}m`"
              theme="violet"
              variant="subtle"
            />
            <Badge
              v-if="dirty"
              label="Unsaved changes"
              theme="amber"
              variant="subtle"
            />
          </div>
        </div>
      </div>
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
          label="Initials (logo & student numbers)"
          type="text"
        />
        <p class="sm:col-span-2 -mt-2 text-sm text-ink-gray-6">
          Used on the logo and as the start of student numbers (e.g. LR26001).
        </p>
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

    <section
      v-else-if="tab === 'address'"
      class="school-section"
      @input="markDirty"
      @change="markDirty"
    >
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

    <section
      v-else-if="tab === 'contact'"
      class="school-section"
      @input="markDirty"
      @change="markDirty"
    >
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

    <section
      v-else-if="tab === 'registration'"
      class="school-section"
      @input="markDirty"
      @change="markDirty"
    >
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
          v-model="form.academicYear"
          label="Academic year"
          type="select"
          :options="yearOptions"
        />
        <FormControl
          v-model="form.currentTerm"
          label="Current term"
          type="select"
          :options="termOptions"
        />
        <p class="sm:col-span-2 -mt-2 text-sm text-ink-gray-6">
          Years and terms stay linked —
          <button
            type="button"
            class="text-ink-blue-5 underline"
            @click="router.push('/years-and-terms')"
          >
            manage Years & terms
          </button>
          .
        </p>
        <FormControl v-model="form.currency" label="Currency" type="text" />
      </div>
    </section>

    <section
      v-else
      class="school-section space-y-4"
      @input="markDirty"
      @change="markDirty"
    >
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 class="school-section-title mb-0">Campus geofence</h2>
          <p class="mt-1 text-sm text-ink-gray-5">
            Circle around the school for gated attendance and staff check-in.
          </p>
        </div>
        <Badge
          :label="form.geoEnabled ? 'Enabled' : 'Off'"
          :theme="form.geoEnabled ? 'green' : 'gray'"
          variant="subtle"
        />
      </div>

      <div
        class="grid gap-4 rounded-6 border border-outline-gray-1 bg-surface-white p-5 sm:grid-cols-2"
      >
        <label
          class="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-5 border border-outline-gray-1 bg-surface-gray-1 px-4 py-3"
        >
          <input
            v-model="form.geoEnabled"
            type="checkbox"
            class="size-4"
            @change="markDirty"
          />
          <span>
            <span class="block text-sm font-medium text-ink-gray-9">
              Enforce campus geofence
            </span>
            <span class="block text-xs text-ink-gray-5">
              When on, check-ins outside the radius are flagged off-campus
            </span>
          </span>
        </label>

        <FormControl
          v-model="form.geoLabel"
          class="sm:col-span-2"
          label="Fence name"
          type="text"
          placeholder="Main campus"
        />
        <FormControl
          v-model="form.geoLatitude"
          label="Latitude"
          type="text"
          placeholder="0.347596"
        />
        <FormControl
          v-model="form.geoLongitude"
          label="Longitude"
          type="text"
          placeholder="32.582520"
        />
        <FormControl
          v-model="form.geoRadiusMeters"
          class="sm:col-span-2"
          label="Radius"
          type="select"
          :options="radiusOptions"
        />
        <div class="sm:col-span-2 flex flex-wrap gap-2">
          <Button
            icon-left="lucide-map-pin"
            label="Use my location"
            :loading="locating"
            @click="useDeviceLocation"
          />
          <Button
            v-if="geoPreview.mapsUrl"
            icon-left="lucide-external-link"
            label="Open in Maps"
            @click="openMaps"
          />
        </div>
        <FormControl
          v-model="form.geoNotes"
          class="sm:col-span-2"
          label="Notes"
          type="textarea"
          placeholder="e.g. Cover gate, playground and admin block"
        />
      </div>

      <div
        v-if="geoPreview.valid"
        class="rounded-6 border border-outline-gray-1 bg-surface-white p-4"
      >
        <p class="text-sm font-medium text-ink-gray-9">
          {{ form.geoLabel || 'Campus' }} · {{ geoPreview.radius }} m radius
        </p>
        <p class="mt-1 text-xs text-ink-gray-5">
          Centre {{ geoPreview.center?.lat }}, {{ geoPreview.center?.lng }}
          · about
          {{ ((geoPreview.radius || 0) / 1000).toFixed(2) }} km circle
        </p>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-surface-gray-2">
          <div
            class="h-full rounded-full bg-[color:var(--school-blue)]"
            :style="{
              width: `${Math.min(100, ((geoPreview.radius || 0) / 1000) * 100)}%`,
            }"
          />
        </div>
      </div>

      <div
        class="space-y-3 rounded-6 border border-dashed border-outline-gray-2 bg-surface-white p-4"
      >
        <p class="text-sm font-medium text-ink-gray-8">Test a coordinate</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <FormControl
            v-model="testLat"
            label="Test latitude"
            type="text"
            placeholder="0.348000"
          />
          <FormControl
            v-model="testLng"
            label="Test longitude"
            type="text"
            placeholder="32.583000"
          />
        </div>
        <Button label="Check against fence" @click="runGeofenceTest" />
        <p v-if="testResult" class="text-sm text-ink-gray-7">{{ testResult }}</p>
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
