import { reactive, watch } from 'vue'
import { schoolSetup } from '@/data/school/schoolSetup'

/** Visual tokens stay local; names/motto mirror the API school profile. */
export const brandColors = {
  blue: '#2E3192',
  blueDark: '#23266F',
  blueSoft: '#E8E9F6',
  red: '#ED1C24',
  redDark: '#C41218',
  redSoft: '#FDE8E9',
  white: '#FFFFFF',
} as const

/**
 * Desk brand — kept in sync with `schoolSetup` (which loads from GET /api/v1/school).
 * Do not hardcode school names here.
 */
export const brand = reactive({
  name: '',
  shortName: '',
  motto: '',
  logoUrl: '/little-royals-logo.png',
  colors: brandColors,
})

watch(
  schoolSetup,
  () => {
    brand.name = schoolSetup.name || schoolSetup.shortName || 'School'
    brand.shortName = schoolSetup.shortName || schoolSetup.name || 'School'
    brand.motto = schoolSetup.motto || ''
  },
  { deep: true, immediate: true },
)
