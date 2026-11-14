import { reactive, watch } from 'vue'
import { logActivity } from './activity'

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
}

const defaults: SchoolSetup = {
  name: 'Little Royals Kindergarten and Primary School',
  shortName: 'Little Royals',
  motto: 'In God We Trust',
  addressLine1: 'Plot 14, Royal Gardens Road',
  addressLine2: 'Near Ntinda Trading Centre',
  city: 'Kampala',
  district: 'Kampala',
  country: 'Uganda',
  phone: '+256 414 000 111',
  phoneAlt: '+256 700 222 333',
  email: 'info@littleroyals.ug',
  website: 'https://littleroyals.ug',
  registrationNo: 'MOES/KLA/PRI/2020/118',
  unebCentre: 'U1234',
  headTeacher: 'Sarah Nalwanga',
  established: '2018',
  currentTerm: 'Term III',
  academicYear: '2026',
  currency: 'UGX',
  initials: 'LR',
  about:
    'Little Royals Kindergarten and Primary School serves Baby Class through P.7 under the NCDC curriculum, preparing learners for UNEB PLE.',
  geoEnabled: true,
  geoLabel: 'Main campus',
  // Approximate Ntinda / Kampala campus pin for demo
  geoLatitude: '0.347596',
  geoLongitude: '32.582520',
  geoRadiusMeters: '250',
  geoNotes:
    'Used for staff check-in and gated attendance. Learners/staff outside this radius are flagged as off-campus.',
}

function load(): SchoolSetup {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return { ...defaults }
    const incoming = parsed as Record<string, unknown>
    const next: SchoolSetup = { ...defaults }
    for (const key of Object.keys(defaults) as (keyof SchoolSetup)[]) {
      const value = incoming[key]
      if (typeof defaults[key] === 'boolean') {
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
    return { ...defaults }
  }
}

export const schoolSetup = reactive<SchoolSetup>(load())

watch(
  schoolSetup,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value }))
    } catch {
      /* ignore */
    }
  },
  { deep: true },
)

export function saveSchoolSetup(next: Partial<SchoolSetup>) {
  Object.assign(schoolSetup, next)
  logActivity({
    action: 'Updated',
    module: 'school-setup',
    moduleLabel: 'School Setup',
    recordName: schoolSetup.name,
    summary: `Updated school setup for ${schoolSetup.shortName}`,
    detail: schoolSetup.geoEnabled
      ? `${schoolSetup.city} · geofence ${schoolSetup.geoRadiusMeters}m @ ${schoolSetup.geoLatitude},${schoolSetup.geoLongitude}`
      : `${schoolSetup.city}, ${schoolSetup.country} · ${schoolSetup.phone}`,
    severity: 'info',
  })
}

export function resetSchoolSetup() {
  Object.assign(schoolSetup, defaults)
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
