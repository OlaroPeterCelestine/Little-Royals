import type { FormFieldSpec } from '@/lib/forms/types'

/**
 * Mini explanations shown under every create/edit input.
 * Explicit field.help always wins; otherwise we resolve by field name,
 * then by type / required / options.
 */

const BY_NAME: Record<string, string> = {
  // People
  firstName: 'Given name as on birth certificate or admission letter.',
  lastName: 'Family / surname as on official documents.',
  otherNames: 'Middle or additional names (optional).',
  name: 'Display name for lists and reports.',
  dateOfBirth: 'Birth date (day/month/year) used for age and class placement.',
  gender: 'Select Female, Male, or Other.',
  placeOfBirth: 'Town, district, or hospital of birth.',
  nationality: 'Country of citizenship (e.g. Ugandan).',
  tribe: 'Ethnic community if recorded by the school (optional).',
  religion: 'Faith affiliation for pastoral / dietary context (optional).',
  homeLanguage: 'Main language spoken at home.',
  address: 'Physical home or school contact address.',
  phone: 'Primary mobile number with country code if needed (e.g. 07…).',
  altPhone: 'Second phone for SMS or emergencies (optional).',
  email: 'Valid email for login notices and fee receipts.',
  emergencyContact: 'Who to call in an emergency — name and phone.',
  bloodGroup: 'Blood group if known (e.g. O+, A−). Optional.',
  medicalAlerts: 'Allergies, asthma, or conditions teachers/clinic must know.',
  dietaryNotes: 'Food allergies or special diet (boarding / meals).',
  previousSchool: 'Last school attended before joining Little Royals.',
  photo: 'Clear face photo for ID cards and desk profiles (JPG/PNG).',
  documents: 'Supporting files (birth cert, report, transfer letter).',

  // Placement / academics
  program: 'Nursery or Primary section.',
  className: 'Current class level (e.g. Baby Class, P.3).',
  stream: 'Class stream or colour group (e.g. A, Blue).',
  admissionDate: 'Date the learner was admitted or started.',
  learnerNumber: 'National / EMIS learner number if issued.',
  schoolPayAccount: 'School Pay / MoMo pay code for fee payments.',
  id: 'School system ID — usually auto-generated.',
  status: 'Record state: Active, Draft, or Inactive.',
  subtitle: 'Short extra line shown under the name in lists.',
  relationship: 'How the adult relates to the learner (Mother, Father…).',
  parentId: 'Link an already-registered parent instead of retyping details.',
  learner: 'Select the pupil this record belongs to.',
  student: 'Select the pupil this record belongs to.',
  studentId: 'Select the pupil this record belongs to.',
  teacher: 'Select the teacher responsible.',
  staff: 'Select the staff member.',
  guardian: 'Select the parent or guardian.',
  department: 'School department or office (e.g. Primary, Finance).',
  course: 'Subject / course name from the curriculum list.',
  subject: 'Subject / course name from the curriculum list.',
  term: 'Academic term (Term I, Term II, or Term III).',
  year: 'Academic year (e.g. 2026).',
  academicYear: 'Academic year label (e.g. 2026).',
  period: 'Timetable period or lesson slot.',
  day: 'Weekday for the timetable entry.',
  startDate: 'First day this record applies.',
  endDate: 'Last day this record applies (optional if ongoing).',
  dueDate: 'Deadline for payment, submission, or action.',
  date: 'Calendar date for this record.',
  time: 'Clock time (24h or school timetable time).',
  startTime: 'When the activity or lesson starts.',
  endTime: 'When the activity or lesson ends.',
  location: 'Room, block, or place (e.g. Hall, Lab 1).',
  room: 'Classroom or venue name.',
  capacity: 'Maximum seats, beds, or places allowed.',
  category: 'Grouping used for filters and reports.',
  type: 'Kind / classification of this record.',
  reason: 'Short explanation of why this action was taken.',
  notes: 'Optional staff notes — keep factual and brief.',
  description: 'Plain-language details for staff who open this record.',
  title: 'Short title shown in lists and printouts.',
  code: 'Short unique code (letters/numbers) used in reports.',

  // Fees / finance
  amount: 'Amount in Ugandan shillings (UGX), numbers only.',
  balance: 'Outstanding balance in UGX.',
  paid: 'Amount already paid in UGX.',
  fee: 'Fee amount in UGX.',
  cost: 'Unit or total cost in UGX.',
  salary: 'Gross pay amount in UGX.',
  gross: 'Gross amount before deductions (UGX).',
  net: 'Net amount after deductions (UGX).',
  invoice: 'Link to the pupil fee invoice.',
  payment: 'Link to a payment receipt.',
  method: 'How money was received (MoMo, Airtel, cash, bank).',
  reference: 'Bank / MoMo transaction reference if available.',
  currency: 'Currency code — usually UGX.',
  qty: 'Quantity as a whole number.',
  quantity: 'Quantity as a whole number.',
  unit: 'Unit of measure (pcs, litres, packs).',
  price: 'Unit price in UGX.',
  total: 'Line or document total in UGX.',

  // Employment
  employeeNumber: 'Staff payroll / HR number.',
  position: 'Job title (e.g. Class teacher, Accountant).',
  employmentDate: 'Date employment started.',
  contractType: 'Permanent, contract, or part-time.',
  nssf: 'NSSF number if registered.',
  tin: 'TIN for PAYE if applicable.',
  bankName: 'Bank used for salary (optional).',
  bankAccount: 'Salary account number (keep confidential).',
  qualifications: 'Degrees, diplomas, or teaching certificates.',
  subjectsTaught: 'Subjects this teacher covers.',
  classesAssigned: 'Classes this teacher is assigned to.',

  // Inventory / ops
  item: 'Stock item from the school store catalogue.',
  sku: 'Stock keeping code if used.',
  supplier: 'Vendor or supplier name.',
  reorderLevel: 'Quantity that triggers a purchase request.',
  maxStock: 'Maximum on-hand quantity to hold.',
  vehicle: 'School bus or van from the fleet list.',
  route: 'Transport route name or number.',
  book: 'Library title from the catalogue.',
  isbn: 'ISBN if known (optional).',
  author: 'Book author name.',
  publisher: 'Publisher name (optional).',
  borrower: 'Pupil or staff borrowing the book.',
  returnDate: 'Expected return date.',
  visitorName: 'Visitor’s full name as on ID.',
  purpose: 'Reason for the visit.',
  host: 'Staff member being visited.',
  plate: 'Vehicle number plate.',
  driver: 'Driver’s full name.',

  // Comms / users
  role: 'Desk permission role (what menus they can open).',
  password: 'Temporary password — share securely; user should change it.',
  message: 'Message body parents or staff will receive.',
  channel: 'Delivery channel: SMS, email, or WhatsApp.',
  template: 'Reusable message template.',
  recipient: 'Who receives this message.',
  subject_line: 'Email subject line.',

  // Health / behaviour
  diagnosis: 'Clinic finding or complaint in plain language.',
  treatment: 'Treatment or medication given.',
  incident: 'What happened — factual summary.',
  severity: 'How serious (Low / Medium / High).',
  actionTaken: 'What staff did in response.',
  reportedBy: 'Staff member who reported this.',

  // Attendance / exams
  present: 'Mark present or absent for the session.',
  attendance: 'Presence status for the day or lesson.',
  score: 'Marks scored (number).',
  maxScore: 'Maximum possible marks.',
  grade: 'Class level or letter grade, depending on the form.',
  exam: 'Assessment this mark belongs to.',
  weighting: 'How much this assessment counts toward the term.',
  passMark: 'Minimum score to pass.',
}

const TYPE_HINT: Partial<Record<FormFieldSpec['type'], string>> = {
  text: 'Enter short text.',
  textarea: 'Enter longer notes. Keep it clear for other staff.',
  number: 'Enter a number only.',
  currency: 'Enter amount in UGX (numbers only, no commas needed).',
  date: 'Pick or type the date.',
  time: 'Enter the time.',
  email: 'Enter a valid email address (name@school.edu).',
  phone: 'Enter a phone number staff can call or SMS.',
  select: 'Choose one option from the list.',
  search: 'Search and select one matching record.',
  multiselect: 'Hold Ctrl/Cmd to select more than one.',
  radio: 'Choose one of the options.',
  checkbox: 'Tick if yes / applies.',
  toggle: 'Switch on or off.',
  file: 'Choose a file from your device.',
  readonly: 'Filled automatically — you cannot edit this.',
  daterange: 'Choose start and end dates.',
}

function requiredSuffix(field: FormFieldSpec): string {
  if (field.auto || field.type === 'readonly' || field.readOnly) {
    return ' Auto-filled.'
  }
  return field.required ? ' Required.' : ' Optional.'
}

function fromName(name: string): string | undefined {
  if (BY_NAME[name]) return BY_NAME[name]
  const lower = name.toLowerCase()
  if (BY_NAME[lower]) return BY_NAME[lower]
  // camelCase endings
  if (lower.endsWith('phone')) return BY_NAME.phone
  if (lower.endsWith('email')) return BY_NAME.email
  if (lower.endsWith('address')) return BY_NAME.address
  if (lower.endsWith('date') && !lower.includes('update')) return BY_NAME.date
  if (lower.endsWith('amount') || lower.endsWith('fee')) return BY_NAME.amount
  if (lower.endsWith('notes') || lower.endsWith('note')) return BY_NAME.notes
  if (lower.endsWith('id') && lower !== 'id') {
    return 'Select the linked record from the list.'
  }
  return undefined
}

function fromLabel(label: string): string {
  const clean = label.replace(/\s*\*$/, '').trim()
  return `Enter the ${clean.toLowerCase()}.`
}

/**
 * Resolve the mini explanation under an input.
 * Prefers authored `field.help`, then known field names, then type + required.
 */
export function resolveFieldHelp(field: FormFieldSpec): string {
  const authored = field.help?.trim()
  if (authored) {
    if (/required|optional|auto-?filled/i.test(authored)) return authored
    return `${authored}${requiredSuffix(field)}`
  }

  const named = fromName(field.name)
  if (named) return `${named}${requiredSuffix(field)}`

  if (field.optionsFrom) {
    return `Select from existing ${field.optionsFrom.replace(/-/g, ' ')} records.${requiredSuffix(field)}`
  }
  if (field.options?.length) {
    return `Choose one of the listed options.${requiredSuffix(field)}`
  }

  const typeHint = TYPE_HINT[field.type] || fromLabel(field.label)
  return `${typeHint}${requiredSuffix(field)}`
}

/** Placeholder when the schema did not set one. */
export function resolveFieldPlaceholder(field: FormFieldSpec): string {
  if (field.placeholder?.trim()) return field.placeholder
  if (field.type === 'email') return 'name@school.edu'
  if (field.type === 'phone') return '07XX XXX XXX'
  if (field.type === 'currency' || field.type === 'number') return '0'
  if (field.type === 'date') return 'YYYY-MM-DD'
  if (field.type === 'select' || field.type === 'search') {
    return `Select ${field.label.toLowerCase()}…`
  }
  if (field.required) return `Enter ${field.label.toLowerCase()}`
  return `Optional — ${field.label.toLowerCase()}`
}
