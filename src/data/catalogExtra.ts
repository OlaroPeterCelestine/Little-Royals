import type { BadgeTheme, CatalogColumn, CatalogModule, CatalogRow } from './catalog'

function statusTheme(status: string): BadgeTheme {
  const s = status.toLowerCase()
  if (['active', 'present', 'paid', 'approved', 'achieved', 'recorded'].some((x) => s.includes(x)))
    return 'green'
  if (['unpaid', 'absent', 'rejected', 'overdue'].some((x) => s.includes(x))) return 'red'
  if (['draft', 'pending', 'planned', 'emerging', 'developing'].some((x) => s.includes(x)))
    return 'amber'
  return 'gray'
}

function row(
  id: string,
  name: string,
  fields: Record<string, string | number> = {},
  status?: string,
  subtitle?: string,
): CatalogRow {
  return {
    id,
    name,
    subtitle,
    status,
    statusTheme: status ? statusTheme(status) : undefined,
    ...fields,
  }
}

function mod(
  key: string,
  title: string,
  singular: string,
  icon: string,
  description: string,
  group: string,
  columns: CatalogColumn[],
  rows: CatalogRow[],
): CatalogModule {
  return { key, title, singular, icon, description, group, columns, rows }
}

/** Modules from the full UI spec that were not yet in the seed catalog. */
export const catalogExtra: Record<string, CatalogModule> = {
  'academic-years': mod(
    'academic-years',
    'Academic Years',
    'Academic year',
    'lucide-calendar-range',
    'School year definitions used by terms, classes, fees and exams',
    'Academics',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Year', primary: true },
      { key: 'startDate', label: 'Start' },
      { key: 'endDate', label: 'End' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('AY-2026', '2026', { startDate: '2026-01-15', endDate: '2026-12-05' }, 'Active'),
      row('AY-2027', '2027', { startDate: '2027-01-18', endDate: '2027-12-04' }, 'Planned'),
    ],
  ),

  staff: mod(
    'staff',
    'Staff Directory',
    'Staff member',
    'lucide-id-card',
    'Employment records (separate from login accounts)',
    'HR',
    [
      { key: 'id', label: 'Employee #' },
      { key: 'name', label: 'Name', primary: true },
      { key: 'department', label: 'Department' },
      { key: 'jobTitle', label: 'Job title' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('EMP-01', 'Grace Namuli', { department: 'Primary', jobTitle: 'Class Teacher', phone: '+256700111001' }, 'Active'),
      row('EMP-02', 'Peter Okello', { department: 'Primary', jobTitle: 'Subject Teacher', phone: '+256700111002' }, 'Active'),
      row('EMP-03', 'Finance Officer', { department: 'Finance', jobTitle: 'Bursar', phone: '+256700111003' }, 'Active'),
    ],
  ),

  departments: mod(
    'departments',
    'Departments',
    'Department',
    'lucide-building',
    'Organizational departments for staff assignment',
    'HR',
    [
      { key: 'id', label: 'Code' },
      { key: 'name', label: 'Department', primary: true },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('DEP-01', 'Nursery', {}, 'Active'),
      row('DEP-02', 'Primary', {}, 'Active'),
      row('DEP-03', 'Finance', {}, 'Active'),
      row('DEP-04', 'Administration', {}, 'Active'),
    ],
  ),

  'nursery-activities': mod(
    'nursery-activities',
    'Activity Library',
    'Activity',
    'lucide-puzzle',
    'Nursery learning activities by development area',
    'Nursery',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Activity', primary: true },
      { key: 'learningArea', label: 'Learning area' },
      { key: 'className', label: 'Class' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('NA-01', 'Letter sounds circle', { learningArea: 'Language', className: 'Baby Class', duration: 20 }, 'Planned'),
      row('NA-02', 'Counting stones', { learningArea: 'Numeracy', className: 'Middle Class', duration: 25 }, 'Completed'),
      row('NA-03', 'Outdoor free play', { learningArea: 'Physical', className: 'Top Class', duration: 30 }, 'Planned'),
    ],
  ),

  'nursery-observations': mod(
    'nursery-observations',
    'Teacher Observations',
    'Observation',
    'lucide-eye',
    'Nursery observation records — source for development reports',
    'Nursery',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Summary', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'learningArea', label: 'Area' },
      { key: 'progressLevel', label: 'Level' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'NO-01',
        'Joins songs with peers',
        { learner: 'Amina Namukasa', learningArea: 'Language', progressLevel: 'Developing', observationDate: '2026-03-10' },
        'Recorded',
      ),
      row(
        'NO-02',
        'Counts to 10 with objects',
        { learner: 'James Okello', learningArea: 'Numeracy', progressLevel: 'Achieved', observationDate: '2026-03-12' },
        'Reviewed',
      ),
    ],
  ),

  'meals-menus': mod(
    'meals-menus',
    'Weekly Menus',
    'Menu',
    'lucide-utensils',
    'Nursery and primary meal plans',
    'Meals',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Menu', primary: true },
      { key: 'day', label: 'Day' },
      { key: 'mealType', label: 'Meal' },
      { key: 'program', label: 'Section' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('MENU-01', 'Monday lunch — beans & posho', { day: 'Monday', mealType: 'Lunch', program: 'All', weekStarting: '2026-03-16' }, 'Active'),
      row('MENU-02', 'Wednesday snack — fruit', { day: 'Wednesday', mealType: 'Snack', program: 'Nursery', weekStarting: '2026-03-16' }, 'Active'),
    ],
  ),

  'meal-attendance': mod(
    'meal-attendance',
    'Meal Attendance',
    'Meal register',
    'lucide-clipboard-check',
    'Daily meal receipt registers by class',
    'Meals',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Register', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'mealType', label: 'Meal' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('MA-01', 'P.5 Blue lunch', { className: 'P.5', mealType: 'Lunch', date: '2026-03-16' }, 'Submitted'),
    ],
  ),

  invoices: mod(
    'invoices',
    'Invoices',
    'Invoice',
    'lucide-file-spreadsheet',
    'Fee invoices linked to learners and fee structures',
    'Fees',
    [
      { key: 'id', label: 'Invoice #' },
      { key: 'name', label: 'Title', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'amount', label: 'Amount' },
      { key: 'dueDate', label: 'Due' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('INV-1001', 'Term 1 tuition — Amina', { learner: 'Amina Namukasa', amount: 450000, dueDate: '2026-02-28', feeStructure: 'Primary Term Fees' }, 'Unpaid'),
      row('INV-1002', 'Term 1 tuition — James', { learner: 'James Okello', amount: 450000, dueDate: '2026-02-28', feeStructure: 'Primary Term Fees' }, 'Partial'),
    ],
  ),

  refunds: mod(
    'refunds',
    'Refunds',
    'Refund',
    'lucide-undo-2',
    'Authorized payment refunds (never edit payments in place)',
    'Fees',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Refund', primary: true },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [row('RF-01', 'Overpayment — Nabukeera', { amount: 50000, reason: 'Duplicate MoMo' }, 'Pending')],
  ),

  'fee-offsets': mod(
    'fee-offsets',
    'Fee Offsets',
    'Fee offset',
    'lucide-circle-off',
    'Written-off balances for children who left the school',
    'Fees',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Offset', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'className', label: 'Class' },
      { key: 'invoice', label: 'Invoice' },
      { key: 'amount', label: 'Offset amount' },
      { key: 'exitReason', label: 'Exit reason' },
      { key: 'offsetDate', label: 'Date' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'FO-01',
        'Offset · sample cleared',
        {
          learner: 'Sample Learner',
          className: 'P.4',
          invoice: 'INV-2500',
          amount: 'UGX 200,000',
          exitReason: 'Completed',
          offsetDate: '2025-12-01',
          feeRef: 'FEE-SAMPLE',
        },
        'Posted',
        'Demo history row',
      ),
    ],
  ),

  scholarships: mod(
    'scholarships',
    'Scholarships',
    'Scholarship',
    'lucide-award',
    'Approved fee support for learners',
    'Fees',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Scholarship', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [row('SCH-01', 'Staff child discount', { learner: 'Sarah Nabukeera', amount: '50%' }, 'Active')],
  ),

  alumni: mod(
    'alumni',
    'Alumni Records',
    'Alumnus',
    'lucide-graduation-cap',
    'Former learners after withdrawal or completion',
    'Pupils',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name', primary: true },
      { key: 'exitYear', label: 'Exit year' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('AL-01', 'David Ssekandi', { exitYear: '2025', className: 'P.5', exitReason: 'Transferred' }, 'Transferred'),
      row('AL-02', 'Mercy Atim', { exitYear: '2026', className: 'Top Class', exitReason: 'Withdrawn' }, 'Withdrawn'),
    ],
  ),

  'waiting-list': mod(
    'waiting-list',
    'Waiting List',
    'Waitlisted applicant',
    'lucide-list-ordered',
    'Approved applicants awaiting a class place',
    'Admissions',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Applicant', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [row('WL-01', 'Joan Akello', { className: 'Baby Class', program: 'Nursery' }, 'Waitlisted')],
  ),

  periods: mod(
    'periods',
    'Period Management',
    'Period',
    'lucide-clock-3',
    'Timetable period configuration (lessons, break, lunch)',
    'Timetable',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Period', primary: true },
      { key: 'startTime', label: 'Start' },
      { key: 'endTime', label: 'End' },
      { key: 'periodType', label: 'Type' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('PD-01', 'Lesson 1', { startTime: '08:00', endTime: '08:40', periodType: 'Lesson', sequence: 1 }, 'Active'),
      row('PD-02', 'Break', { startTime: '10:00', endTime: '10:20', periodType: 'Break', sequence: 3 }, 'Active'),
      row('PD-03', 'Lunch', { startTime: '12:40', endTime: '13:40', periodType: 'Lunch', sequence: 6 }, 'Active'),
    ],
  ),

  curriculum: mod(
    'curriculum',
    'Curriculum',
    'Curriculum',
    'lucide-book-copy',
    'Curriculum frameworks by section, year and class',
    'Academics',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Curriculum', primary: true },
      { key: 'program', label: 'Section' },
      { key: 'className', label: 'Class' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('CU-01', 'NCDC Primary English 2026', { program: 'Primary', className: 'P.5', academicYear: '2026' }, 'Active'),
      row('CU-02', 'Nursery Learning Framework', { program: 'Nursery', className: 'Top Class', academicYear: '2026' }, 'Active'),
    ],
  ),

  'audit-logs': mod(
    'audit-logs',
    'Audit Logs',
    'Audit entry',
    'lucide-shield',
    'Immutable security and change history (read-only)',
    'Security',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Action', primary: true },
      { key: 'user', label: 'User' },
      { key: 'module', label: 'Module' },
      { key: 'status', label: 'Result', badge: true },
    ],
    [
      row('AUD-01', 'Login', { user: 'admin@littleroyals.school', module: 'auth' }, 'Success', '13 Mar 2026, 08:01'),
      row('AUD-02', 'Update fee invoice', { user: 'accountant@littleroyals.school', module: 'invoices', recordId: 'INV-1001' }, 'Success', '13 Mar 2026, 09:14'),
      row('AUD-03', 'Permission change · Teacher', { user: 'admin@littleroyals.school', module: 'permissions', recordId: 'Teacher' }, 'Success', '13 Mar 2026, 10:02'),
      row('AUD-04', 'Failed login attempt', { user: 'unknown@external.com', module: 'auth' }, 'Denied', '13 Mar 2026, 11:40'),
      row('AUD-05', 'Export students CSV', { user: 'admin@littleroyals.school', module: 'students' }, 'Success', '14 Mar 2026, 07:22'),
      row('AUD-06', 'Delete applicant', { user: 'admissions@littleroyals.school', module: 'applicants', recordId: 'APP-04' }, 'Success', '14 Mar 2026, 08:05'),
    ],
  ),

  clubs: mod(
    'clubs',
    'Clubs & Activities',
    'Club',
    'lucide-trophy',
    'Extracurricular clubs and sports groups',
    'Events',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Club', primary: true },
      { key: 'program', label: 'Section' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row('CL-01', 'Football (Primary)', { program: 'Primary', teacher: 'Peter Okello' }, 'Active'),
      row('CL-02', 'Music circle (Nursery)', { program: 'Nursery', teacher: 'Joy Akello' }, 'Active'),
    ],
  ),

  'schemes-of-work': mod(
    'schemes-of-work',
    'Schemes of Work',
    'Scheme of work',
    'lucide-list-checks',
    'Primary term teaching schemes by class and subject',
    'Primary',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Scheme', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'course', label: 'Subject' },
      { key: 'week', label: 'Week' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'SOW-01',
        'P.5 English Week 4 — Paragraphs',
        { className: 'P.5', course: 'English', week: 4, term: 'Term 1', teacher: 'Grace Namuli' },
        'Approved',
      ),
    ],
  ),

  'nursery-development': mod(
    'nursery-development',
    'Development Records',
    'Development record',
    'lucide-baby',
    'Nursery development summaries sourced from observations',
    'Nursery',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Record', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'period', label: 'Period' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'ND-01',
        'Amina — Term 1 development',
        { learner: 'Amina Namukasa', period: 'Term 1 2026' },
        'Draft',
      ),
    ],
  ),

  'clinic-visits': mod(
    'clinic-visits',
    'Clinic Visits',
    'Clinic visit',
    'lucide-stethoscope',
    'School clinic visit records',
    'Health',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Visit', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'CV-01',
        'Mild fever — rest and fluids',
        { learner: 'James Okello', concern: 'Fever' },
        'Recorded',
      ),
    ],
  ),

  'safeguarding-incidents': mod(
    'safeguarding-incidents',
    'Safeguarding',
    'Safeguarding incident',
    'lucide-shield-alert',
    'Restricted safeguarding incident register',
    'Health',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Incident', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [],
  ),

  'positive-recognition': mod(
    'positive-recognition',
    'Positive Recognition',
    'Recognition',
    'lucide-star',
    'Age-appropriate positive behaviour recognition',
    'Discipline',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Recognition', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'PR-01',
        'Helping a classmate',
        { learner: 'Amina Namukasa', type: 'Kindness', date: '2026-03-10' },
        'Recorded',
      ),
    ],
  ),

  discounts: mod(
    'discounts',
    'Discounts',
    'Discount',
    'lucide-percent',
    'Approved fee discounts with eligibility rules',
    'Fees',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Discount', primary: true },
      { key: 'type', label: 'Type' },
      { key: 'value', label: 'Value' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [row('DSC-01', 'Sibling discount', { type: 'Percentage', value: 10 }, 'Approved')],
  ),

  bursaries: mod(
    'bursaries',
    'Bursaries',
    'Bursary',
    'lucide-hand-heart',
    'Externally or school-funded bursary awards',
    'Fees',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Bursary', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'BUR-01',
        'Community bursary — Term 1',
        { learner: 'Sarah Nabukeera', amount: 200000, fundingSource: 'PTA' },
        'Active',
      ),
    ],
  ),

  'dietary-requirements': mod(
    'dietary-requirements',
    'Dietary Requirements',
    'Dietary requirement',
    'lucide-salad',
    'Learner allergies and meal restrictions',
    'Meals',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Restriction', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'DR-01',
        'Peanut allergy',
        { learner: 'Amina Namukasa' },
        'Active',
        'No peanut products',
      ),
    ],
  ),

  'early-departures': mod(
    'early-departures',
    'Early Departures',
    'Early departure',
    'lucide-log-out',
    'Authorized early pickup from school',
    'Attendance',
    [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Departure', primary: true },
      { key: 'learner', label: 'Learner' },
      { key: 'departureTime', label: 'Time' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'ED-01',
        'Medical appointment',
        { learner: 'James Okello', departureTime: '11:30' },
        'Recorded',
      ),
    ],
  ),

  campuses: mod(
    'campuses',
    'Campuses',
    'Campus',
    'lucide-map-pin',
    'School campus / site configuration',
    'Administration',
    [
      { key: 'id', label: 'Code' },
      { key: 'name', label: 'Campus', primary: true },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', badge: true },
    ],
    [
      row(
        'CAM-01',
        'Main Campus',
        { phone: '+256414000111', address: 'Kampala' },
        'Active',
      ),
    ],
  ),
}
