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
}

function load(): SchoolSetup {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<SchoolSetup>
    return { ...defaults, ...parsed }
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
    detail: `${schoolSetup.city}, ${schoolSetup.country} · ${schoolSetup.phone}`,
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
