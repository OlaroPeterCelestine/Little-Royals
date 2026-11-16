
export type BadgeTheme = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'violet'

export interface CatalogColumn {
  key: string
  label: string
  primary?: boolean
  badge?: boolean
}

export interface CatalogRow {
  id: string
  name: string
  status?: string
  statusTheme?: BadgeTheme
  subtitle?: string
  [key: string]: string | number | undefined
}

export interface CatalogModule {
  key: string
  title: string
  singular: string
  icon: string
  description: string
  group: string
  columns: CatalogColumn[]
  rows: CatalogRow[]
}

/** Module schemas only — live rows come from the Go API when enabled. */
export const catalog: Record<string, CatalogModule> = {
  students: {
    key: 'students',
    title: 'Pupils',
    singular: 'Pupil',
    icon: 'lucide-graduation-cap',
    description: 'Nursery and primary learners (Baby Class–P.7)',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'learnerNumber', label: 'Learner No.' },
      { key: 'studentNumber', label: 'Student No.' },
      { key: 'schoolPayAccount', label: 'School Pay' },
      { key: 'className', label: 'Class' },
      { key: 'tribe', label: 'Tribe' },
      { key: 'religion', label: 'Religion' },
      { key: 'program', label: 'Section' },
      { key: 'average', label: 'Average %' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  teachers: {
    key: 'teachers',
    title: 'Teachers',
    singular: 'Teacher',
    icon: 'lucide-briefcase',
    description: 'Full teacher biodata, employment and teaching load',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Teacher', primary: true },
      { key: 'employeeNumber', label: 'Staff #' },
      { key: 'subject', label: 'Subject' },
      { key: 'department', label: 'Section' },
      { key: 'phone', label: 'Phone' },
      { key: 'jobTitle', label: 'Role' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  guardians: {
    key: 'guardians',
    title: 'Guardians',
    singular: 'Guardian',
    icon: 'lucide-heart-handshake',
    description: 'Parents and emergency contacts',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Guardian', primary: true },
      { key: 'relation', label: 'Relation' },
      { key: 'student', label: 'Student' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  classes: {
    key: 'classes',
    title: 'Classes',
    singular: 'Class',
    icon: 'lucide-users',
    description: 'Nursery streams and primary streams (A/B/colour)',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Class', primary: true },
      { key: 'grade', label: 'Level' },
      { key: 'teacher', label: 'Class teacher' },
      { key: 'room', label: 'Room' },
      { key: 'students', label: 'Pupils' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'student-log': {
    key: 'student-log',
    title: 'Student Log',
    singular: 'Log Entry',
    icon: 'lucide-notebook-pen',
    description: 'Behaviour, counselling and activity notes',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Entry', primary: true },
      { key: 'student', label: 'Student' },
      { key: 'type', label: 'Type' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'disciplinary-cases': {
    key: 'disciplinary-cases',
    title: 'Disciplinary Cases',
    singular: 'Case',
    icon: 'lucide-shield-alert',
    description: 'Behaviour incidents linked to students and reporting teachers',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Case', primary: true },
      { key: 'student', label: 'Student' },
      { key: 'reportedBy', label: 'Teacher' },
      { key: 'severity', label: 'Severity' },
      { key: 'date', label: 'Opened' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  programs: {
    key: 'programs',
    title: 'Sections',
    singular: 'Section',
    icon: 'lucide-book-marked',
    description: 'Nursery and primary sections (NCDC Uganda)',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Section', primary: true },
      { key: 'code', label: 'Code' },
      { key: 'duration', label: 'Duration' },
      { key: 'students', label: 'Pupils' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  courses: {
    key: 'courses',
    title: 'Subjects',
    singular: 'Subject',
    icon: 'lucide-book-open',
    description: 'NCDC subjects for nursery and primary',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Subject', primary: true },
      { key: 'code', label: 'Code' },
      { key: 'program', label: 'Section' },
      { key: 'periods', label: 'Periods/wk' },
      { key: 'instructor', label: 'Teacher' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'study-coverage': {
    key: 'study-coverage',
    title: 'Study Coverage',
    singular: 'Study coverage',
    icon: 'lucide-list-tree',
    description:
      'What each class is meant to study each term (Baby Class–P.7)',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Coverage', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'term', label: 'Term' },
      { key: 'course', label: 'Subject' },
      { key: 'weeks', label: 'Weeks' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'academic-terms': {
    key: 'academic-terms',
    title: 'Academic Terms',
    singular: 'Academic Term',
    icon: 'lucide-calendar-range',
    description: 'Terms linked to an academic year (Term I–III)',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Term', primary: true },
      { key: 'year', label: 'Year' },
      { key: 'start', label: 'Start' },
      { key: 'end', label: 'End' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  batches: {
    key: 'batches',
    title: 'Intake cohorts',
    singular: 'Batch',
    icon: 'lucide-layers',
    description: 'Admission cohorts by year',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Batch', primary: true },
      { key: 'year', label: 'Year' },
      { key: 'program', label: 'Section' },
      { key: 'students', label: 'Pupils' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'student-categories': {
    key: 'student-categories',
    title: 'Student Categories',
    singular: 'Category',
    icon: 'lucide-tags',
    description: 'Fee and policy categories for pupils',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Category', primary: true },
      { key: 'discount', label: 'Discount' },
      { key: 'students', label: 'Pupils' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'grading-scales': {
    key: 'grading-scales',
    title: 'Grading Scales',
    singular: 'Grading Scale',
    icon: 'lucide-sliders-horizontal',
    description: 'Marks and UNEB-style divisions for primary',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Scale', primary: true },
      { key: 'range', label: 'Range' },
      { key: 'passMark', label: 'Pass mark' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  attendance: {
    key: 'attendance',
    title: 'Student Attendance',
    singular: 'Attendance',
    icon: 'lucide-clipboard-check',
    description: 'Daily presence for nursery and primary',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  timetable: {
    key: 'timetable',
    title: 'Timetable',
    singular: 'Lesson slot',
    icon: 'lucide-calendar-clock',
    description: 'Weekly class timetable — calendar by day, filter by class',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Period', primary: true },
      { key: 'day', label: 'Day' },
      { key: 'group', label: 'Class' },
      { key: 'course', label: 'Subject' },
      { key: 'room', label: 'Room' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  exams: {
    key: 'exams',
    title: 'Examinations',
    singular: 'Examination',
    icon: 'lucide-file-check-2',
    description: 'Class-specific exams teachers set and mark',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Examination', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'course', label: 'Subject' },
      { key: 'date', label: 'Date' },
      { key: 'maxScore', label: 'Max' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'exam-results': {
    key: 'exam-results',
    title: 'Assessment Results',
    singular: 'Result',
    icon: 'lucide-award',
    description: 'Marks posted per subject for completed assessments',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'subject', label: 'Subject' },
      { key: 'exam', label: 'Examination' },
      { key: 'className', label: 'Class' },
      { key: 'score', label: 'Score' },
      { key: 'grade', label: 'Grade' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  applicants: {
    key: 'applicants',
    title: 'Student Applicants',
    singular: 'Applicant',
    icon: 'lucide-user-plus',
    description: 'Nursery and primary admission applications',
    group: 'Admissions',
    columns: [
      { key: 'name', label: 'Applicant', primary: true },
      { key: 'program', label: 'Section' },
      { key: 'grade', label: 'Class' },
      { key: 'applied', label: 'Applied' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  admissions: {
    key: 'admissions',
    title: 'Student Admissions',
    singular: 'Admission',
    icon: 'lucide-clipboard-list',
    description: 'Accepted admissions for the term',
    group: 'Admissions',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'program', label: 'Section' },
      { key: 'term', label: 'Term' },
      { key: 'fee', label: 'Admission fee' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'program-enrollments': {
    key: 'program-enrollments',
    title: 'Program Enrollments',
    singular: 'Enrollment',
    icon: 'lucide-badge-check',
    description: 'Pupils enrolled in nursery or primary',
    group: 'Admissions',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'program', label: 'Section' },
      { key: 'batch', label: 'Batch' },
      { key: 'term', label: 'Term' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'course-enrollments': {
    key: 'course-enrollments',
    title: 'Subject Enrollments',
    singular: 'Enrollment',
    icon: 'lucide-list-checks',
    description: 'Subject registration for the term',
    group: 'Admissions',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'course', label: 'Subject' },
      { key: 'group', label: 'Class' },
      { key: 'periods', label: 'Periods' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'fee-structures': {
    key: 'fee-structures',
    title: 'Fee Structures',
    singular: 'Fee Structure',
    icon: 'lucide-table',
    description: 'Term fees by section (UGX)',
    group: 'Fees',
    columns: [
      { key: 'name', label: 'Structure', primary: true },
      { key: 'program', label: 'Section' },
      { key: 'term', label: 'Term' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'fee-categories': {
    key: 'fee-categories',
    title: 'Fee Categories',
    singular: 'Fee Category',
    icon: 'lucide-wallet',
    description: 'Components that make up school fees',
    group: 'Fees',
    columns: [
      { key: 'name', label: 'Category', primary: true },
      { key: 'type', label: 'Type' },
      { key: 'defaultAmount', label: 'Default' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'fee-schedules': {
    key: 'fee-schedules',
    title: 'Fee Schedules',
    singular: 'Fee Schedule',
    icon: 'lucide-calendar',
    description: 'When fee invoices are generated',
    group: 'Fees',
    columns: [
      { key: 'name', label: 'Schedule', primary: true },
      { key: 'structure', label: 'Structure' },
      { key: 'dueDate', label: 'Due date' },
      { key: 'invoices', label: 'Invoices' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  fees: {
    key: 'fees',
    title: 'Fees',
    singular: 'Fee Invoice',
    icon: 'lucide-receipt',
    description: 'Pupil fee invoices and balances (UGX). Offset dues for children who left school from Offset left dues.',
    group: 'Fees',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'invoice', label: 'Invoice' },
      { key: 'amount', label: 'Amount' },
      { key: 'paid', label: 'Paid' },
      { key: 'balance', label: 'Balance' },
      { key: 'leftSchool', label: 'Left school' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'exam-settings': {
    key: 'exam-settings',
    title: 'Exam Settings',
    singular: 'Exam Setting',
    icon: 'lucide-settings-2',
    description: 'Pass marks, weighting, BOT/MOT/EOT and PLE rules',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Setting', primary: true },
      { key: 'program', label: 'Section' },
      { key: 'passMark', label: 'Pass mark' },
      { key: 'weight', label: 'Weight %' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'assessment-groups': {
    key: 'assessment-groups',
    title: 'Assessment Groups',
    singular: 'Assessment Group',
    icon: 'lucide-folders',
    description: 'Groups for BOT, MOT, EOT, mocks and continuous work',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Group', primary: true },
      { key: 'type', label: 'Type' },
      { key: 'term', label: 'Term' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'assessment-criteria': {
    key: 'assessment-criteria',
    title: 'Assessment Criteria',
    singular: 'Criterion',
    icon: 'lucide-list-checks',
    description: 'Marking criteria and competencies per subject',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Criterion', primary: true },
      { key: 'subject', label: 'Subject' },
      { key: 'maxScore', label: 'Max' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'inventory-items': {
    key: 'inventory-items',
    title: 'Inventory Items',
    singular: 'Item',
    icon: 'lucide-package',
    description: 'School store catalogue — uniforms, stationery, lab, medical, PE by class',
    group: 'Inventory',
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Item', primary: true },
      { key: 'category', label: 'Category' },
      { key: 'department', label: 'Department' },
      { key: 'className', label: 'Class' },
      { key: 'unit', label: 'Unit' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'inventory-stock': {
    key: 'inventory-stock',
    title: 'Stock Levels',
    singular: 'Stock',
    icon: 'lucide-warehouse',
    description: 'School store on-hand qty with critical / reorder / max thresholds',
    group: 'Inventory',
    columns: [
      { key: 'name', label: 'Item', primary: true },
      { key: 'store', label: 'Store' },
      { key: 'department', label: 'Department' },
      { key: 'className', label: 'Class' },
      { key: 'qty', label: 'Qty' },
      { key: 'critical', label: 'Critical at' },
      { key: 'reorder', label: 'Reorder at' },
      { key: 'maxStock', label: 'Max level' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'purchase-requests': {
    key: 'purchase-requests',
    title: 'Purchase Requests',
    singular: 'Purchase request',
    icon: 'lucide-shopping-cart',
    description: 'Request purchases when stock hits reorder or critical thresholds',
    group: 'Inventory',
    columns: [
      { key: 'name', label: 'Item', primary: true },
      { key: 'qty', label: 'Qty to buy' },
      { key: 'store', label: 'Store' },
      { key: 'department', label: 'Department' },
      { key: 'requestedBy', label: 'Requested by' },
      { key: 'neededBy', label: 'Needed by' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'inventory-issues': {
    key: 'inventory-issues',
    title: 'Stock Issues',
    singular: 'Issue',
    icon: 'lucide-package-open',
    description: 'Items issued to classes, departments, teachers or pupils',
    group: 'Inventory',
    columns: [
      { key: 'name', label: 'Issue', primary: true },
      { key: 'item', label: 'Item' },
      { key: 'qty', label: 'Qty' },
      { key: 'department', label: 'Department' },
      { key: 'className', label: 'Class' },
      { key: 'issuedTo', label: 'Issued to' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  assets: {
    key: 'assets',
    title: 'School Assets',
    singular: 'Asset',
    icon: 'lucide-monitor',
    description: 'Furniture, devices and fixed assets by class and department',
    group: 'Inventory',
    columns: [
      { key: 'name', label: 'Asset', primary: true },
      { key: 'tag', label: 'Tag' },
      { key: 'department', label: 'Department' },
      { key: 'className', label: 'Class' },
      { key: 'location', label: 'Location' },
      { key: 'condition', label: 'Condition' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'library-books': {
    key: 'library-books',
    title: 'Library Books',
    singular: 'Book',
    icon: 'lucide-library',
    description: 'School library catalogue',
    group: 'Library',
    columns: [
      { key: 'name', label: 'Title', primary: true },
      { key: 'author', label: 'Author' },
      { key: 'copies', label: 'Copies' },
      { key: 'shelf', label: 'Shelf' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'library-issues': {
    key: 'library-issues',
    title: 'Library Issues',
    singular: 'Loan',
    icon: 'lucide-book-up',
    description: 'Books borrowed by pupils and teachers',
    group: 'Library',
    columns: [
      { key: 'name', label: 'Loan', primary: true },
      { key: 'book', label: 'Book' },
      { key: 'borrower', label: 'Borrower' },
      { key: 'dueDate', label: 'Due' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'transport-routes': {
    key: 'transport-routes',
    title: 'Transport Routes',
    singular: 'Route',
    icon: 'lucide-route',
    description: 'School bus routes and stops',
    group: 'Transport',
    columns: [
      { key: 'name', label: 'Route', primary: true },
      { key: 'area', label: 'Area' },
      { key: 'stops', label: 'Stops' },
      { key: 'pupils', label: 'Pupils' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'transport-vehicles': {
    key: 'transport-vehicles',
    title: 'Transport Vehicles',
    singular: 'Vehicle',
    icon: 'lucide-bus',
    description: 'School buses and vans',
    group: 'Transport',
    columns: [
      { key: 'name', label: 'Vehicle', primary: true },
      { key: 'plate', label: 'Plate' },
      { key: 'capacity', label: 'Seats' },
      { key: 'driver', label: 'Driver' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  homework: {
    key: 'homework',
    title: 'Homework',
    singular: 'Assignment',
    icon: 'lucide-pencil-line',
    description: 'Homework and take-home tasks by class',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Assignment', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'subject', label: 'Subject' },
      { key: 'dueDate', label: 'Due' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'lesson-plans': {
    key: 'lesson-plans',
    title: 'Lesson Plans',
    singular: 'Lesson Plan',
    icon: 'lucide-clipboard-pen',
    description: 'Lesson plans for every nursery and primary class — filter by class',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Plan', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'subject', label: 'Subject' },
      { key: 'teacher', label: 'Teacher' },
      { key: 'week', label: 'Week' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'staff-attendance': {
    key: 'staff-attendance',
    title: 'Staff Attendance',
    singular: 'Staff Day',
    icon: 'lucide-user-check',
    description: 'Daily attendance for teachers and staff',
    group: 'Attendance',
    columns: [
      { key: 'name', label: 'Staff', primary: true },
      { key: 'date', label: 'Date' },
      { key: 'checkIn', label: 'In' },
      { key: 'checkOut', label: 'Out' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'health-records': {
    key: 'health-records',
    title: 'Health Records',
    singular: 'Health Record',
    icon: 'lucide-heart-pulse',
    description: 'Clinic visits, allergies and medical notes',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'visitDate', label: 'Visit' },
      { key: 'issue', label: 'Issue' },
      { key: 'action', label: 'Action' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'school-events': {
    key: 'school-events',
    title: 'School Calendar',
    singular: 'Event',
    icon: 'lucide-calendar-days',
    description: 'Assemblies, parents’ days, exams and holidays',
    group: 'Communications',
    columns: [
      { key: 'name', label: 'Event', primary: true },
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'audience', label: 'Audience' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'sms-messages': {
    key: 'sms-messages',
    title: 'Communications',
    singular: 'Message',
    icon: 'lucide-messages-square',
    description: 'SMS, email and WhatsApp to parents and staff',
    group: 'Communications',
    columns: [
      { key: 'name', label: 'Subject', primary: true },
      { key: 'channel', label: 'Channel' },
      { key: 'audience', label: 'Audience' },
      { key: 'recipients', label: 'Recipients' },
      { key: 'sentAt', label: 'Sent' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'message-templates': {
    key: 'message-templates',
    title: 'Message Templates',
    singular: 'Template',
    icon: 'lucide-file-text',
    description: 'Reusable SMS, email and WhatsApp templates',
    group: 'Communications',
    columns: [
      { key: 'name', label: 'Template', primary: true },
      { key: 'channel', label: 'Channel' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'visitor-log': {
    key: 'visitor-log',
    title: 'Visitor Log',
    singular: 'Visit',
    icon: 'lucide-clipboard-pen-line',
    description: 'Gate / reception visitor records',
    group: 'System',
    columns: [
      { key: 'name', label: 'Visitor', primary: true },
      { key: 'purpose', label: 'Purpose' },
      { key: 'host', label: 'Host' },
      { key: 'timeIn', label: 'In' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  payments: {
    key: 'payments',
    title: 'Mobile Money Payments',
    singular: 'Payment',
    icon: 'lucide-smartphone-nfc',
    description: 'MTN MoMo, Airtel Money and bank fee receipts',
    group: 'Fees',
    columns: [
      { key: 'name', label: 'Reference', primary: true },
      { key: 'student', label: 'Student' },
      { key: 'channel', label: 'Channel' },
      { key: 'amount', label: 'Amount (UGX)' },
      { key: 'paidAt', label: 'Paid' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'report-cards': {
    key: 'report-cards',
    title: 'Report Cards',
    singular: 'Report card',
    icon: 'lucide-file-badge',
    description: 'NCDC nursery descriptors and UNEB primary / PLE report cards',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Learner', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'term', label: 'Term' },
      { key: 'average', label: 'Average %' },
      { key: 'division', label: 'Div / Band' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  gradebook: {
    key: 'gradebook',
    title: 'Gradebook',
    singular: 'Mark entry',
    icon: 'lucide-table-2',
    description: 'Teacher continuous assessment markbook',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Entry', primary: true },
      { key: 'className', label: 'Class' },
      { key: 'subject', label: 'Subject' },
      { key: 'assessment', label: 'Assessment' },
      { key: 'average', label: 'Class avg %' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  expenses: {
    key: 'expenses',
    title: 'School Expenses',
    singular: 'Expense',
    icon: 'lucide-banknote',
    description: 'Operating expenses and petty cash',
    group: 'Fees',
    columns: [
      { key: 'name', label: 'Expense', primary: true },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount (UGX)' },
      { key: 'paidOn', label: 'Date' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  hostel: {
    key: 'hostel',
    title: 'Boarding (optional)',
    singular: 'Boarder',
    icon: 'lucide-bed-double',
    description: 'Optional boarding for primary pupils (most learners are day scholars)',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Pupil', primary: true },
      { key: 'dorm', label: 'House / room' },
      { key: 'bed', label: 'Bed' },
      { key: 'houseParent', label: 'Matron / patron' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  payroll: {
    key: 'payroll',
    title: 'Payroll',
    singular: 'Payslip',
    icon: 'lucide-wallet-cards',
    description: 'Staff salaries, PAYE and NSSF (desk)',
    group: 'System',
    columns: [
      { key: 'name', label: 'Staff', primary: true },
      { key: 'month', label: 'Month' },
      { key: 'gross', label: 'Gross (UGX)' },
      { key: 'net', label: 'Net (UGX)' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },

  'staff-leave': {
    key: 'staff-leave',
    title: 'Staff Leave',
    singular: 'Leave request',
    icon: 'lucide-calendar-off',
    description: 'Teacher and staff leave requests',
    group: 'System',
    columns: [
      { key: 'name', label: 'Staff', primary: true },
      { key: 'leaveType', label: 'Type' },
      { key: 'fromDate', label: 'From' },
      { key: 'toDate', label: 'To' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [],
  },
}

export const moduleOrder = Object.keys(catalog)

export function getModule(key: string): CatalogModule | undefined {
  return catalog[key]
}

export function modulesByGroup() {
  const groups = new Map<string, CatalogModule[]>()
  for (const mod of Object.values(catalog)) {
    const list = groups.get(mod.group) || []
    list.push(mod)
    groups.set(mod.group, list)
  }
  return groups
}

export function countByStatus(
  key: string,
  matcher: (status?: string) => boolean,
) {
  const mod = catalog[key]
  if (!mod) return 0
  return mod.rows.filter((r) => matcher(r.status)).length
}
