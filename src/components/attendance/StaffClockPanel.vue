<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Badge, toast } from 'frappe-ui'
import { currentUser } from '@/data/activity/activity'
import { addRecord, getLiveModule, updateRecord } from '@/data/catalog/store'
import { canCurrentUser } from '@/data/auth/permissions'
import { ensureModule } from '@/data/catalog/catalogSync'
import { isApiEnabled } from '@/lib/apiMode'
import {
  formatClockTime,
  getCurrentPosition,
  todayIsoDate,
} from '@/lib/geolocation'
import {
  isInsideSchoolGeofence,
  mapsLinkForGeofence,
  schoolGeoRadiusMeters,
  schoolSetup,
} from '@/data/school/schoolSetup'
import { useRouter } from 'vue-router'

const router = useRouter()
const busy = ref(false)
const lastCheck = ref('')
const locating = ref(false)

const canClock = computed(
  () =>
    canCurrentUser('staff-attendance', 'create') ||
    canCurrentUser('staff-attendance', 'write'),
)

const geoOn = computed(() => Boolean(schoolSetup.geoEnabled))
const geoReady = computed(() => {
  if (!geoOn.value) return false
  const r = schoolGeoRadiusMeters()
  return r > 0 && Boolean(schoolSetup.geoLatitude && schoolSetup.geoLongitude)
})

const todayRows = computed(() => {
  const today = todayIsoDate()
  const email = (currentUser.email || '').toLowerCase()
  const name = (currentUser.name || '').toLowerCase()
  return (getLiveModule('staff-attendance')?.rows || []).filter((r) => {
    if (String(r.date || '') !== today) return false
    const rowEmail = String(r.staffEmail || r.email || '').toLowerCase()
    if (email && rowEmail === email) return true
    return name && String(r.name || '').toLowerCase() === name
  })
})

const openShift = computed(() =>
  todayRows.value.find((r) => {
    const out = String(r.checkOut || '').trim()
    return !out
  }),
)

onMounted(() => {
  if (isApiEnabled()) void ensureModule('staff-attendance')
})

async function locateAndCheck() {
  locating.value = true
  lastCheck.value = ''
  try {
    const pos = await getCurrentPosition()
    const result = isInsideSchoolGeofence(pos.lat, pos.lng)
    if (!result.enabled) {
      lastCheck.value = `Location OK (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}) · geofence is off in School Setup`
      return { pos, result }
    }
    if (result.distanceM == null) {
      lastCheck.value =
        'Geofence is on but campus centre/radius is incomplete — fix it in School Setup → Geofence'
      return { pos, result }
    }
    lastCheck.value = result.inside
      ? `On campus · ${result.distanceM} m from centre${pos.accuracyM ? ` (±${pos.accuracyM} m)` : ''}`
      : `Off campus · ${result.distanceM} m away (limit ${schoolGeoRadiusMeters()} m)`
    return { pos, result }
  } finally {
    locating.value = false
  }
}

async function clockIn() {
  if (!canClock.value) {
    toast.error('Your role cannot clock staff attendance')
    return
  }
  if (!currentUser.name?.trim()) {
    toast.error('Sign in again before clocking in')
    return
  }
  if (openShift.value) {
    toast.info('You already have an open shift today — clock out first')
    return
  }
  if (geoOn.value && !geoReady.value) {
    toast.error('Campus geofence is enabled but not configured — open School Setup → Geofence')
    return
  }

  busy.value = true
  try {
    const { pos, result } = await locateAndCheck()
    if (result.enabled && !result.inside) {
      toast.error(
        `Clock-in blocked — you are outside the school fence (${result.distanceM} m away)`,
      )
      return
    }

    const now = new Date()
    await addRecord('staff-attendance', {
      name: currentUser.name,
      staffEmail: currentUser.email || '',
      role: currentUser.role || '',
      date: todayIsoDate(now),
      checkIn: formatClockTime(now),
      checkOut: '',
      status: 'Present',
      onCampus: result.enabled ? 'Yes' : 'N/A',
      latitude: pos.lat.toFixed(6),
      longitude: pos.lng.toFixed(6),
      distanceM: result.distanceM != null ? String(result.distanceM) : '',
      accuracyM: pos.accuracyM != null ? String(pos.accuracyM) : '',
      geoLabel: schoolSetup.geoLabel || 'Campus',
      subtitle: result.enabled
        ? `Clock-in on campus · ${result.distanceM} m`
        : 'Clock-in (geofence off)',
    })
    toast.success(`Clocked in at ${formatClockTime(now)}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Clock-in failed')
  } finally {
    busy.value = false
  }
}

async function clockOut() {
  if (!canClock.value) {
    toast.error('Your role cannot clock staff attendance')
    return
  }
  const row = openShift.value
  if (!row) {
    toast.info('No open shift today — clock in first')
    return
  }

  busy.value = true
  try {
    const { pos, result } = await locateAndCheck()
    if (result.enabled && !result.inside) {
      toast.error(
        `Clock-out blocked — you are outside the school fence (${result.distanceM} m away)`,
      )
      return
    }
    const now = new Date()
    await updateRecord('staff-attendance', row.id, {
      name: row.name,
      status: String(row.status || 'Present'),
      checkOut: formatClockTime(now),
      checkOutLatitude: pos.lat.toFixed(6),
      checkOutLongitude: pos.lng.toFixed(6),
      checkOutDistanceM:
        result.distanceM != null ? String(result.distanceM) : '',
      subtitle: `Out ${formatClockTime(now)}${
        result.distanceM != null ? ` · ${result.distanceM} m` : ''
      }`,
    })
    toast.success(`Clocked out at ${formatClockTime(now)}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Clock-out failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section
    class="mb-4 space-y-3 rounded-6 border border-outline-gray-1 bg-surface-white p-5"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-ink-gray-9">Teacher / staff clock</h2>
        <p class="mt-1 text-sm text-ink-gray-5">
          Uses your phone GPS against the campus geofence from School Setup.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Badge
          :label="geoOn ? (geoReady ? 'Geofence on' : 'Geofence incomplete') : 'Geofence off'"
          :theme="geoOn ? (geoReady ? 'green' : 'amber') : 'gray'"
          variant="subtle"
        />
        <Badge
          v-if="openShift"
          label="Shift open"
          theme="blue"
          variant="subtle"
        />
      </div>
    </div>

    <p class="text-sm text-ink-gray-7">
      Signed in as
      <strong>{{ currentUser.name || '—' }}</strong>
      <span v-if="currentUser.email"> · {{ currentUser.email }}</span>
    </p>

    <p v-if="!geoOn" class="text-sm text-ink-amber-3">
      Geofence is off — clock-in works anywhere. Enable it under
      <button
        type="button"
        class="text-ink-blue-5 underline"
        @click="router.push({ path: '/school-setup', query: { tab: 'geofence' } })"
      >
        School Setup → Geofence
      </button>
      to require staff on campus.
    </p>
    <p v-else-if="!geoReady" class="text-sm text-ink-red-4">
      Geofence is enabled but missing centre or radius.
      <button
        type="button"
        class="text-ink-blue-5 underline"
        @click="router.push({ path: '/school-setup', query: { tab: 'geofence' } })"
      >
        Finish setup
      </button>
      before teachers can clock in.
    </p>
    <p v-else class="text-sm text-ink-gray-6">
      Fence: {{ schoolSetup.geoLabel || 'Campus' }} ·
      {{ schoolGeoRadiusMeters() }} m
      <a
        v-if="mapsLinkForGeofence()"
        class="ml-1 text-ink-blue-5 underline"
        :href="mapsLinkForGeofence()"
        target="_blank"
        rel="noopener"
      >map</a>
    </p>

    <div class="flex flex-wrap gap-2">
      <Button
        variant="solid"
        theme="blue"
        icon-left="lucide-log-in"
        label="Clock in"
        :loading="busy"
        :disabled="!canClock || Boolean(openShift) || (geoOn && !geoReady)"
        @click="clockIn"
      />
      <Button
        variant="subtle"
        icon-left="lucide-log-out"
        label="Clock out"
        :loading="busy"
        :disabled="!canClock || !openShift"
        @click="clockOut"
      />
      <Button
        variant="ghost"
        icon-left="lucide-map-pin"
        label="Check my location"
        :loading="locating"
        @click="locateAndCheck().catch((e) => toast.error(e instanceof Error ? e.message : 'Location failed'))"
      />
    </div>

    <p v-if="lastCheck" class="text-xs text-ink-gray-5">{{ lastCheck }}</p>

    <div v-if="todayRows.length" class="border-t border-outline-gray-1 pt-3">
      <p class="mb-2 text-xs font-medium uppercase tracking-wide text-ink-gray-5">
        Today
      </p>
      <ul class="space-y-1 text-sm text-ink-gray-8">
        <li v-for="r in todayRows" :key="r.id">
          In {{ r.checkIn || '—' }}
          <span v-if="r.checkOut"> · Out {{ r.checkOut }}</span>
          <span v-else> · still on shift</span>
          <span v-if="r.onCampus"> · {{ r.onCampus === 'Yes' ? 'on campus' : r.onCampus }}</span>
          <span v-if="r.distanceM"> · {{ r.distanceM }} m</span>
        </li>
      </ul>
    </div>
  </section>
</template>
