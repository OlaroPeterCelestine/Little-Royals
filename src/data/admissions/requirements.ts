import { schoolSetup } from '@/data/school/schoolSetup'

export type AdmissionRequirement = {
  id: string
  label: string
  detail?: string
  required: boolean
}

/** Documents & registration items parents must bring after admission. */
export function admissionRequirements(program?: string): AdmissionRequirement[] {
  const section = String(program || '').toLowerCase()
  const isNursery =
    section.includes('nursery') ||
    section.includes('baby') ||
    section.includes('middle') ||
    section.includes('top')

  const shared: AdmissionRequirement[] = [
    {
      id: 'birth-cert',
      label: 'Birth certificate (original + photocopy)',
      required: true,
    },
    {
      id: 'photos',
      label: 'Passport photos of the learner (2 copies)',
      required: true,
    },
    {
      id: 'parent-id',
      label: 'Parent / guardian national ID (photocopy)',
      required: true,
    },
    {
      id: 'medical',
      label: 'Medical / immunisation card',
      detail: 'Include any known allergies or special care notes.',
      required: true,
    },
    {
      id: 'admission-fee',
      label: 'Admission / registration fee',
      detail: `Pay at the accounts office (${schoolSetup.currency}). Keep the official receipt.`,
      required: true,
    },
    {
      id: 'term-fees',
      label: 'First term school fees (or agreed instalment plan)',
      required: true,
    },
  ]

  if (isNursery) {
    return [
      ...shared,
      {
        id: 'change-clothes',
        label: 'Change of clothes labelled with the learner’s name',
        required: true,
      },
      {
        id: 'nursery-kit',
        label: 'Nursery kit (as listed by the class teacher)',
        detail: 'Tissue, wet wipes, water bottle, and any class-specific items.',
        required: true,
      },
    ]
  }

  return [
    ...shared,
    {
      id: 'transfer',
      label: 'Transfer letter / leaving certificate (if joining mid-stream)',
      required: false,
    },
    {
      id: 'report',
      label: 'Previous school report (latest term)',
      required: false,
    },
    {
      id: 'uniform',
      label: 'School uniform (as per uniform list)',
      required: true,
    },
    {
      id: 'stationery',
      label: 'Exercise books and stationery pack',
      required: true,
    },
  ]
}

export function formatRequirementsList(program?: string): string {
  return admissionRequirements(program)
    .map((r, i) => {
      const star = r.required ? '' : ' (if applicable)'
      const detail = r.detail ? ` — ${r.detail}` : ''
      return `${i + 1}. ${r.label}${star}${detail}`
    })
    .join('\n')
}
