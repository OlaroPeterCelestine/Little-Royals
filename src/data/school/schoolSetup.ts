import { reactive, watch } from 'vue'
import { logActivity } from '@/data/activity/activity'
import { isApiEnabled } from '@/lib/apiMode'
import { apiRequest } from '@/services/http'

const STORAGE_KEY = 'little-royals-school-setup'

export interface SchoolSetup {
  name: string
  shortName: string
  motto: string
  addressLine1: string
  addressLine2: string
  city: string
  district: string
  country: string
  phone: string
  phoneAlt: string
  email: string
  website: string
  registrationNo: string
  unebCentre: string
  headTeacher: string
  established: string
  currentTerm: string
  academicYear: string
  currency: string
  initials: string
  about: string
  /** Campus geofence for attendance / check-in */
  geoEnabled: boolean
  geoLabel: string
  geoLatitude: string
  geoLongitude: string
  /** Radius in metres */
  geoRadiusMeters: string
  geoNotes: string
  /** Server school code (LRKPS, …) when API-backed */
  code?: string
}

/** Empty shell — filled from GET /api/v1/school when the API is on. */
const emptySetup = (): SchoolSetup => ({
  name: '',
  shortName: '',
  motto: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: '',
  country: '',
  phone: '',
  phoneAlt: '',
  email: '',
  website: '',
  registrationNo: '',
  unebCentre: '',
  headTeacher: '',
  established: '',
  currentTerm: '',
  academicYear: '',
  currency: '',
  initials: '',
  about: '',
  geoEnabled: false,
  geoLabel: '',
  geoLatitude: '',
  geoLongitude: '',
  geoRadiusMeters: '',
  geoNotes: '',
  code: '',
})

/** Offline-only fallback when VITE_USE_API is off. */
const offlineDefaults: SchoolSetup = {
  ...emptySetup(),
  name: 'School',
  shortName: 'School',
  motto: '',
  country: 'Uganda',
  currency: 'UGX',
  initials: 'SC',
  currentTerm: '',
  academicYear: String(new Date().getFullYear()),
}

type ApiSchool = Record<string, unknown>

function asStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return false
}

export function schoolFromApi(raw: ApiSchool): SchoolSetup {
  return {
    name: asStr(raw.name),
    shortName: asStr(raw.shortName) || asStr(raw.name),
    motto: asStr(raw.motto),
    addressLine1: asStr(raw.address) || asStr(raw.addressLine1),
    addressLine2: asStr(raw.addressLine2),
    city: asStr(raw.city),
    district: asStr(raw.district),
    country: asStr(raw.country),
    phone: asStr(raw.phone),
    phoneAlt: asStr(raw.phoneAlt),
    email: asStr(raw.email),
    website: asStr(raw.website),
    registrationNo: asStr(raw.registrationNo),
    unebCentre: asStr(raw.unebCentre),
    headTeacher: asStr(raw.headTeacher),
    established: asStr(raw.established),
    currentTerm: asStr(raw.currentTerm),
    academicYear: asStr(raw.academicYear),
    currency: asStr(raw.currency) || 'UGX',
    initials: asStr(raw.initials) || asStr(raw.code).slice(0, 4),
    about: asStr(raw.about),
    geoEnabled: asBool(raw.geoEnabled),
    geoLabel: asStr(raw.geoLabel),
    geoLatitude: asStr(raw.geoLatitude),
    geoLongitude: asStr(raw.geoLongitude),
    geoRadiusMeters: asStr(raw.geoRadiusMeters),
    geoNotes: asStr(raw.geoNotes),
    code: asStr(raw.code),
  }
}

export function schoolToApiBody(setup: SchoolSetup): Record<string, unknown> {
  return {
    name: setup.name,
    code: setup.code || setup.initials || 'SCHOOL',
    shortName: setup.shortName,
    motto: setup.motto,
    email: setup.email,
    phone: setup.phone,
    phoneAlt: setup.phoneAlt,
    address: setup.addressLine1,
    addressLine2: setup.addressLine2,
    city: setup.city,
    district: setup.district,
    country: setup.country,
    website: setup.website,
    registrationNo: setup.registrationNo,
    unebCentre: setup.unebCentre,
    headTeacher: setup.headTeacher,
    established: setup.established,
    currentTerm: setup.currentTerm,
    academicYear: setup.academicYear,
    currency: setup.currency,
    initials: setup.initials,
    about: setup.about,
    geoEnabled: setup.geoEnabled,
    geoLabel: setup.geoLabel,
    geoLatitude: setup.geoLatitude,
    geoLongitude: setup.geoLongitude,
    geoRadiusMeters: setup.geoRadiusMeters,
    geoNotes: setup.geoNotes,
  }
}

function loadLocal(): SchoolSetup {
  if (isApiEnabled()) {
    // API is source of truth — don't resurrect stale local demo branding.
    return emptySetup()
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...offlineDefaults }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return { ...offlineDefaults }
    const incoming = parsed as Record<string, unknown>
    const next: SchoolSetup = { ...offlineDefaults }
    for (const key of Object.keys(offlineDefaults) as (keyof SchoolSetup)[]) {
      const value = incoming[key]
      if (typeof offlineDefaults[key] === 'boolean') {
        if (typeof value === 'boolean') next[key] = value as never
        else if (value === 'true' || value === '1') next[key] = true as never
        else if (value === 'false' || value === '0') next[key] = false as never
        continue
      }
      if (typeof value === 'string') {
        next[key] = value.slice(0, 500) as never
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        next[key] = String(value) as never
      }
    }
    return next
  } catch {
    return { ...offlineDefaults }
  }
}

export const schoolSetup = reactive<SchoolSetup>(loadLocal())
export const schoolProfileLoaded = reactive({ value: !isApiEnabled() })
export const schoolProfileError = reactive({ value: '' })

watch(
  schoolSetup,
  (value) => {
    if (isApiEnabled()) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value }))
    } catch {
      /* ignore */
    }
  },
  { deep: true },
)

/** Public branding for the login screen (no auth). */
export async function hydrateSchoolPublic(): Promise<boolean> {
  if (!isApiEnabled()) {
    schoolProfileLoaded.value = true
    return false
  }
  try {
    const { data } = await apiRequest<ApiSchool>('/api/v1/school/public', {
      auth: false,
    })
    if (data && typeof data === 'object') {
      const next = schoolFromApi(data)
      // Only fill identity fields before login — full profile loads after auth.
      schoolSetup.name = next.name
      schoolSetup.shortName = next.shortName
      schoolSetup.motto = next.motto
      schoolSetup.code = next.code
      schoolSetup.initials = next.initials
      schoolSetup.city = next.city
      schoolSetup.country = next.country
      return true
    }
  } catch {
    /* login screen can still render */
  }
  return false
}

/** Pull singleton school profile from the Go API (authenticated). */
export async function hydrateSchoolFromApi(): Promise<boolean> {
  if (!isApiEnabled()) {
    schoolProfileLoaded.value = true
    return false
  }
  schoolProfileError.value = ''
  try {
    const { data } = await apiRequest<ApiSchool>('/api/v1/school')
    if (data && typeof data === 'object') {
      Object.assign(schoolSetup, schoolFromApi(data))
      schoolProfileLoaded.value = true
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      return true
    }
    schoolProfileError.value = 'School profile empty'
    schoolProfileLoaded.value = true
    return false
  } catch (err) {
    // Fall back to public branding if the full profile is forbidden/unavailable.
    await hydrateSchoolPublic()
    schoolProfileError.value =
      err instanceof Error ? err.message : 'Could not load school profile'
    schoolProfileLoaded.value = true
    return false
  }
}

export async function saveSchoolSetup(next: Partial<SchoolSetup>) {
  Object.assign(schoolSetup, next)
  if (isApiEnabled()) {
    try {
      const { data } = await apiRequest<ApiSchool>('/api/v1/school', {
        method: 'PUT',
        body: schoolToApiBody(schoolSetup),
        bustCache: true,
      })
      if (data && typeof data === 'object') {
        Object.assign(schoolSetup, schoolFromApi(data))
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('School update failed')
    }
  }
  logActivity({
    action: 'Updated',
    module: 'school-setup',
    moduleLabel: 'School Setup',
    recordName: schoolSetup.name || schoolSetup.shortName || 'School',
    summary: `Updated school setup for ${schoolSetup.shortName || schoolSetup.name || 'school'}`,
    detail: schoolSetup.geoEnabled
      ? `${schoolSetup.city} · geofence ${schoolSetup.geoRadiusMeters}m @ ${schoolSetup.geoLatitude},${schoolSetup.geoLongitude}`
      : `${schoolSetup.city}, ${schoolSetup.country} · ${schoolSetup.phone}`,
    severity: 'info',
  })
}

export async function resetSchoolSetup() {
  if (isApiEnabled()) {
    await hydrateSchoolFromApi()
    logActivity({
      action: 'Updated',
      module: 'school-setup',
      moduleLabel: 'School Setup',
      recordName: schoolSetup.name || 'School',
      summary: 'Reloaded school setup from server',
      severity: 'warning',
    })
    return
  }
  Object.assign(schoolSetup, offlineDefaults)
  logActivity({
    action: 'Updated',
    module: 'school-setup',
    moduleLabel: 'School Setup',
    recordName: schoolSetup.name,
    summary: 'Reset school setup to defaults',
    severity: 'warning',
  })
}

export function formatSchoolAddress(setup: SchoolSetup = schoolSetup) {
  return [
    setup.addressLine1,
    setup.addressLine2,
    [setup.city, setup.district].filter(Boolean).join(', '),
    setup.country,
  ]
    .filter((line) => Boolean(String(line || '').trim()))
    .join('\n')
}

export function schoolGeoCenter(setup: SchoolSetup = schoolSetup): {
  lat: number
  lng: number
} | null {
  const lat = Number(setup.geoLatitude)
  const lng = Number(setup.geoLongitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export function schoolGeoRadiusMeters(setup: SchoolSetup = schoolSetup): number {
  const n = Number(setup.geoRadiusMeters)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(5000, Math.max(25, Math.round(n)))
}

/** Haversine distance in metres between two WGS84 points. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function isInsideSchoolGeofence(
  lat: number,
  lng: number,
  setup: SchoolSetup = schoolSetup,
): { inside: boolean; distanceM: number | null; enabled: boolean } {
  if (!setup.geoEnabled) {
    return { inside: true, distanceM: null, enabled: false }
  }
  const center = schoolGeoCenter(setup)
  const radius = schoolGeoRadiusMeters(setup)
  if (!center || !radius) {
    return { inside: true, distanceM: null, enabled: false }
  }
  const distanceM = Math.round(distanceMeters(lat, lng, center.lat, center.lng))
  return { inside: distanceM <= radius, distanceM, enabled: true }
}

export function mapsLinkForGeofence(setup: SchoolSetup = schoolSetup): string {
  const center = schoolGeoCenter(setup)
  if (!center) return ''
  return `https://www.google.com/maps?q=${center.lat},${center.lng}`
}
