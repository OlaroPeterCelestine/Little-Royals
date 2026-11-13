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

function statusTheme(status: string): BadgeTheme {
  const s = status.toLowerCase()
  if (
    [
      'active',
      'present',
      'paid',
      'approved',
      'published',
      'pass',
      'available',
      'distinction',
      'credit',
      'issued',
      'returned',
      'sent',
      'completed',
    ].some((x) => s.includes(x))
  )
    return 'green'
  if (
    [
      'unpaid',
      'absent',
      'rejected',
      'overdue',
      'fail',
      'low stock',
    ].some((x) => s.includes(x))
  )
    return 'red'
  if (
    [
      'draft',
      'pending',
      'late',
      'partial',
      'waitlist',
      'maintenance',
      'monitoring',
      'on loan',
      'submitted',
    ].some((x) => s.includes(x))
  )
    return 'amber'
  if (
    ['excused', 'scheduled', 'enrolled', 'open', 'term'].some((x) =>
      s.includes(x),
    )
  )
    return 'blue'
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

/** Little Royals Kindergarten and Primary School — Nursery & Primary · Kampala, Uganda (NCDC / UNEB) */
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
      { key: 'id', label: 'ID' },
      { key: 'className', label: 'Class' },
      { key: 'program', label: 'Section' },
      { key: 'average', label: 'Average %' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'STU-1001',
        'Amina Namukasa',
        {
          className: 'P.5 Blue',
          program: 'Primary',
          average: 78,
          email: 'amina@littleroyals.ug',
        },
        'Active',
        'Primary · P.5',
      ),
      row(
        'STU-1002',
        'James Okello',
        {
          className: 'P.6 Green',
          program: 'Primary',
          average: 71,
          email: 'james@littleroyals.ug',
        },
        'Active',
        'Primary · P.6',
      ),
      row(
        'STU-1003',
        'Sarah Nabukeera',
        {
          className: 'Top Class A',
          program: 'Nursery',
          average: 88,
          email: 'sarah@littleroyals.ug',
        },
        'Active',
        'Nursery · Top Class',
      ),
      row(
        'STU-1004',
        'Daniel Ssekandi',
        {
          className: 'P.7 Gold',
          program: 'Primary',
          average: 82,
          email: 'daniel@littleroyals.ug',
        },
        'Active',
        'Primary · P.7 · PLE year',
      ),
      row(
        'STU-1005',
        'Fatuma Nalwoga',
        {
          className: 'P.3 Red',
          program: 'Primary',
          average: 75,
          email: 'fatuma@littleroyals.ug',
        },
        'Active',
        'Primary · P.3',
      ),
      row(
        'STU-1006',
        'Ethan Wasswa',
        {
          className: 'Middle Class B',
          program: 'Nursery',
          average: 80,
          email: 'ethan@littleroyals.ug',
        },
        'Active',
        'Nursery · Middle Class',
      ),
      row(
        'STU-1007',
        'Nora Achieng',
        {
          className: 'P.1 Yellow',
          program: 'Primary',
          average: 69,
          email: 'nora@littleroyals.ug',
        },
        'Active',
        'Primary · P.1',
      ),
      row(
        'STU-1008',
        'Omar Kato',
        {
          className: 'P.4 Blue',
          program: 'Primary',
          average: 64,
          email: 'omar@littleroyals.ug',
        },
        'On Leave',
        'Primary · P.4',
      ),
      row(
        'STU-1009',
        'Grace Nakato',
        {
          className: 'Baby Class A',
          program: 'Nursery',
          average: 90,
          email: 'grace@littleroyals.ug',
        },
        'Active',
        'Nursery · Baby Class',
      ),
      row(
        'STU-1010',
        'Brian Mugisha',
        {
          className: 'P.2 Green',
          program: 'Primary',
          average: 73,
          email: 'brian@littleroyals.ug',
        },
        'Active',
        'Primary · P.2',
      ),
      row(
        'STU-1011',
        'Patricia Atim',
        {
          className: 'P.7 Gold',
          program: 'Primary',
          average: 91,
          email: 'patricia@littleroyals.ug',
        },
        'Active',
        'Primary · P.7 · PLE year',
      ),
      row(
        'STU-1012',
        'Moses Byaruhanga',
        {
          className: 'P.5 Blue',
          program: 'Primary',
          average: 58,
          email: 'moses@littleroyals.ug',
        },
        'Active',
        'Primary · P.5',
      ),
    ],
  },

  teachers: {
    key: 'teachers',
    title: 'Teachers',
    singular: 'Teacher',
    icon: 'lucide-briefcase',
    description: 'Class teachers and subject teachers',
    group: 'Student',
    columns: [
      { key: 'name', label: 'Teacher', primary: true },
      { key: 'subject', label: 'Subject' },
      { key: 'department', label: 'Section' },
      { key: 'classes', label: 'Classes' },
      { key: 'students', label: 'Pupils' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'TCH-201',
        'Grace Namuli',
        {
          subject: 'Mathematics',
          department: 'Primary',
          classes: 3,
          students: 96,
        },
        'Active',
        'HoD · Numeracy',
      ),
      row(
        'TCH-202',
        'Peter Okello',
        {
          subject: 'Science',
          department: 'Primary',
          classes: 2,
          students: 68,
        },
        'Active',
      ),
      row(
        'TCH-203',
        'Lillian Nalubega',
        {
          subject: 'English',
          department: 'Primary',
          classes: 3,
          students: 102,
        },
        'Active',
      ),
      row(
        'TCH-204',
        'Michael Ssempijja',
        {
          subject: 'Social Studies',
          department: 'Primary',
          classes: 2,
          students: 70,
        },
        'Active',
      ),
      row(
        'TCH-205',
        'Joy Akello',
        {
          subject: 'Literacy & Play',
          department: 'Nursery',
          classes: 2,
          students: 48,
        },
        'Active',
        'Nursery lead',
      ),
      row(
        'TCH-206',
        'Samuel Kizito',
        {
          subject: 'Physical Education',
          department: 'Primary',
          classes: 4,
          students: 140,
        },
        'On Leave',
      ),
      row(
        'TCH-207',
        'Harriet Nabirye',
        {
          subject: 'Luganda',
          department: 'Primary',
          classes: 2,
          students: 64,
        },
        'Active',
      ),
    ],
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
    rows: [
      row(
        'GRD-01',
        'Hassan Namukasa',
        {
          relation: 'Father',
          student: 'Amina Namukasa',
          studentId: 'STU-1001',
          phone: '+256 772 100 101',
          email: 'hassan.namukasa@gmail.com',
          primary: 'Yes',
        },
        'Active',
        'Primary contact · Kampala',
      ),
      row(
        'GRD-01B',
        'Aisha Namukasa',
        {
          relation: 'Mother',
          student: 'Amina Namukasa',
          studentId: 'STU-1001',
          phone: '+256 772 100 102',
          email: 'aisha.namukasa@gmail.com',
          primary: 'No',
        },
        'Active',
        'Emergency contact',
      ),
      row(
        'GRD-02',
        'Mary Okello',
        {
          relation: 'Mother',
          student: 'James Okello',
          studentId: 'STU-1002',
          phone: '+256 701 200 202',
          email: 'mary.okello@gmail.com',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-02B',
        'Daniel Okello',
        {
          relation: 'Father',
          student: 'James Okello',
          studentId: 'STU-1002',
          phone: '+256 780 334 455',
          email: 'daniel.parent@gmail.com',
          primary: 'No',
        },
        'Active',
        'Portal account',
      ),
      row(
        'GRD-03',
        'Paul Nabukeera',
        {
          relation: 'Father',
          student: 'Sarah Nabukeera',
          studentId: 'STU-1003',
          phone: '+256 753 300 303',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-04',
        'Jane Ssekandi',
        {
          relation: 'Mother',
          student: 'Daniel Ssekandi',
          studentId: 'STU-1004',
          phone: '+256 784 400 404',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-05',
        'Ali Kato',
        {
          relation: 'Uncle',
          student: 'Omar Kato',
          studentId: 'STU-1008',
          phone: '+256 706 500 505',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-06',
        'Ruth Achieng',
        {
          relation: 'Mother',
          student: 'Nora Achieng',
          studentId: 'STU-1007',
          phone: '+256 775 600 606',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-07',
        'Prossy Nakato',
        {
          relation: 'Mother',
          student: 'Grace Nakato',
          studentId: 'STU-1009',
          phone: '+256 788 700 707',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-08',
        'David Nalwoga',
        {
          relation: 'Father',
          student: 'Fatuma Nalwoga',
          studentId: 'STU-1005',
          phone: '+256 700 811 811',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-09',
        'Susan Wasswa',
        {
          relation: 'Mother',
          student: 'Ethan Wasswa',
          studentId: 'STU-1006',
          phone: '+256 702 912 912',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-10',
        'Joseph Mugisha',
        {
          relation: 'Father',
          student: 'Brian Mugisha',
          studentId: 'STU-1010',
          phone: '+256 703 013 013',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-11',
        'Christine Atim',
        {
          relation: 'Mother',
          student: 'Patricia Atim',
          studentId: 'STU-1011',
          phone: '+256 704 114 114',
          primary: 'Yes',
        },
        'Active',
      ),
      row(
        'GRD-12',
        'Robert Byaruhanga',
        {
          relation: 'Father',
          student: 'Moses Byaruhanga',
          studentId: 'STU-1012',
          phone: '+256 705 215 215',
          primary: 'Yes',
        },
        'Active',
      ),
    ],
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
    rows: [
      row(
        'CLS-01',
        'Baby Class A',
        {
          grade: 'Baby Class',
          teacher: 'Joy Akello',
          room: 'Nursery 1',
          students: 24,
          schedule: 'Mon–Fri 08:00',
        },
        'Active',
      ),
      row(
        'CLS-02',
        'Middle Class B',
        {
          grade: 'Middle Class',
          teacher: 'Joy Akello',
          room: 'Nursery 2',
          students: 22,
          schedule: 'Mon–Fri 08:00',
        },
        'Active',
      ),
      row(
        'CLS-03',
        'Top Class A',
        {
          grade: 'Top Class',
          teacher: 'Lillian Nalubega',
          room: 'Nursery 3',
          students: 26,
          schedule: 'Mon–Fri 08:00',
        },
        'Active',
      ),
      row(
        'CLS-04',
        'P.1 Yellow',
        {
          grade: 'P.1',
          teacher: 'Grace Namuli',
          room: 'Block A · 1',
          students: 34,
          schedule: 'Mon–Fri 07:45',
        },
        'Active',
      ),
      row(
        'CLS-05',
        'P.2 Blue',
        {
          grade: 'P.2',
          teacher: 'Harriet Nabirye',
          room: 'Block A · 2',
          students: 32,
          schedule: 'Mon–Fri 07:45',
        },
        'Active',
      ),
      row(
        'CLS-06',
        'P.3 Red',
        {
          grade: 'P.3',
          teacher: 'Peter Okello',
          room: 'Block A · 3',
          students: 36,
          schedule: 'Mon–Fri 07:45',
        },
        'Active',
      ),
      row(
        'CLS-07',
        'P.4 Green',
        {
          grade: 'P.4',
          teacher: 'Lillian Nalubega',
          room: 'Block A · 4',
          students: 35,
          schedule: 'Mon–Fri 07:45',
        },
        'Active',
      ),
      row(
        'CLS-08',
        'P.5 Blue',
        {
          grade: 'P.5',
          teacher: 'Michael Ssempijja',
          room: 'Block B · 5',
          students: 38,
          schedule: 'Mon–Fri 07:45',
        },
        'Active',
      ),
      row(
        'CLS-09',
        'P.6 Green',
        {
          grade: 'P.6',
          teacher: 'Peter Okello',
          room: 'Block B · 6',
          students: 37,
          schedule: 'Mon–Fri 07:45',
        },
        'Active',
      ),
      row(
        'CLS-10',
        'P.7 Gold',
        {
          grade: 'P.7',
          teacher: 'Grace Namuli',
          room: 'Block B · 7',
          students: 40,
          schedule: 'Mon–Sat 07:30',
        },
        'Active',
      ),
    ],
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
    rows: [
      row(
        'LOG-01',
        'Inter-house sports day medal',
        {
          student: 'Amina Namukasa',
          studentId: 'STU-1001',
          type: 'Achievement',
          date: '2026-11-10',
        },
        'Published',
      ),
      row(
        'LOG-02',
        'Late arrival warning',
        {
          student: 'James Okello',
          studentId: 'STU-1002',
          type: 'Discipline',
          date: '2026-11-08',
        },
        'Open',
      ),
      row(
        'LOG-03',
        'Settling-in note (nursery)',
        {
          student: 'Grace Nakato',
          studentId: 'STU-1009',
          type: 'Counselling',
          date: '2026-11-05',
        },
        'Closed',
      ),
      row(
        'LOG-04',
        'Choir practice lead',
        {
          student: 'Patricia Atim',
          studentId: 'STU-1011',
          type: 'Activity',
          date: '2026-11-01',
        },
        'Published',
      ),
      row(
        'LOG-05',
        'Parent–teacher meeting',
        {
          student: 'Brian Mugisha',
          studentId: 'STU-1010',
          type: 'Meeting',
          date: '2026-10-28',
        },
        'Open',
      ),
      row(
        'LOG-06',
        'Science club contribution',
        {
          student: 'Amina Namukasa',
          studentId: 'STU-1001',
          type: 'Activity',
          date: '2026-10-20',
        },
        'Published',
      ),
      row(
        'LOG-07',
        'Homework catch-up plan',
        {
          student: 'Moses Byaruhanga',
          studentId: 'STU-1012',
          type: 'Counselling',
          date: '2026-11-04',
        },
        'Open',
      ),
    ],
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
    rows: [
      row(
        'DIS-01',
        'Classroom disruption · Maths',
        {
          student: 'Moses Byaruhanga',
          studentId: 'STU-1012',
          teacherId: 'TCH-201',
          severity: 'Medium',
          date: '2026-11-06',
          action: 'Detention · parent call',
          reportedBy: 'Grace Namuli',
        },
        'Open',
        'Under class teacher review',
      ),
      row(
        'DIS-02',
        'Late arrival pattern',
        {
          student: 'James Okello',
          studentId: 'STU-1002',
          teacherId: 'TCH-204',
          severity: 'Low',
          date: '2026-11-08',
          action: 'Written warning',
          reportedBy: 'Michael Ssempijja',
        },
        'Open',
        'Third late mark this term',
      ),
      row(
        'DIS-03',
        'Uniform non-compliance',
        {
          student: 'Omar Kato',
          studentId: 'STU-1008',
          teacherId: 'TCH-202',
          severity: 'Low',
          date: '2026-10-15',
          action: 'Verbal reminder',
          reportedBy: 'Peter Okello',
        },
        'Closed',
        'Resolved with guardian',
      ),
      row(
        'DIS-04',
        'Fighting during break',
        {
          student: 'Brian Mugisha',
          studentId: 'STU-1010',
          teacherId: 'TCH-206',
          severity: 'High',
          date: '2026-09-22',
          action: 'Suspension 1 day · counselling',
          reportedBy: 'Samuel Kizito',
        },
        'Closed',
        'Hearing completed',
      ),
      row(
        'DIS-05',
        'Homework refusal',
        {
          student: 'Moses Byaruhanga',
          studentId: 'STU-1012',
          teacherId: 'TCH-203',
          severity: 'Low',
          date: '2026-10-30',
          action: 'Catch-up plan',
          reportedBy: 'Lillian Nalubega',
        },
        'Monitoring',
        'Linked to counselling note',
      ),
      row(
        'DIS-06',
        'Phone in class',
        {
          student: 'Fatuma Nalwoga',
          studentId: 'STU-1005',
          teacherId: 'TCH-202',
          severity: 'Low',
          date: '2026-11-02',
          action: 'Confiscation until day end',
          reportedBy: 'Peter Okello',
        },
        'Closed',
      ),
      row(
        'DIS-07',
        'Disruptive play · Baby Class',
        {
          student: 'Sarah Nabukeera',
          studentId: 'STU-1003',
          teacherId: 'TCH-205',
          severity: 'Low',
          date: '2026-11-09',
          action: 'Time-out · parent note',
          reportedBy: 'Joy Akello',
        },
        'Open',
        'Nursery lead following up',
      ),
      row(
        'DIS-08',
        'Disrespect to teacher',
        {
          student: 'Amina Namukasa',
          studentId: 'STU-1001',
          teacherId: 'TCH-207',
          severity: 'Medium',
          date: '2026-11-04',
          action: 'Apology letter · counselling',
          reportedBy: 'Harriet Nabirye',
        },
        'Monitoring',
        'Class teacher and HoD informed',
      ),
      row(
        'DIS-09',
        'Missing PE kit repeatedly',
        {
          student: 'Daniel Ssekandi',
          studentId: 'STU-1004',
          teacherId: 'TCH-206',
          severity: 'Low',
          date: '2026-11-07',
          action: 'Written reminder to guardian',
          reportedBy: 'Samuel Kizito',
        },
        'Open',
      ),
      row(
        'DIS-10',
        'Noise during assembly',
        {
          student: 'Nora Achieng',
          studentId: 'STU-1009',
          teacherId: 'TCH-201',
          severity: 'Low',
          date: '2026-10-28',
          action: 'Verbal warning',
          reportedBy: 'Grace Namuli',
        },
        'Closed',
        'No further incidents',
      ),
    ],
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
    rows: [
      row(
        'PRG-01',
        'Nursery Section',
        { code: 'NUR', duration: '3 years', students: 72 },
        'Open',
      ),
      row(
        'PRG-02',
        'Primary Section',
        { code: 'PRI', duration: '7 years', students: 420 },
        'Open',
      ),
      row(
        'PRG-03',
        'PLE Candidate Prep',
        { code: 'PLE', duration: '1 year', students: 40 },
        'Open',
      ),
    ],
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
    rows: [
      row(
        'CRS-01',
        'English',
        {
          code: 'ENG',
          program: 'Primary',
          periods: 8,
          instructor: 'Lillian Nalubega',
        },
        'Live',
      ),
      row(
        'CRS-02',
        'Mathematics',
        {
          code: 'MATH',
          program: 'Primary',
          periods: 8,
          instructor: 'Grace Namuli',
        },
        'Live',
      ),
      row(
        'CRS-03',
        'Science',
        {
          code: 'SCI',
          program: 'Primary',
          periods: 6,
          instructor: 'Peter Okello',
        },
        'Live',
      ),
      row(
        'CRS-04',
        'Social Studies',
        {
          code: 'SST',
          program: 'Primary',
          periods: 5,
          instructor: 'Michael Ssempijja',
        },
        'Live',
      ),
      row(
        'CRS-05',
        'Luganda',
        {
          code: 'LUG',
          program: 'Primary',
          periods: 3,
          instructor: 'Harriet Nabirye',
        },
        'Live',
      ),
      row(
        'CRS-06',
        'Religious Education',
        {
          code: 'RE',
          program: 'Primary',
          periods: 2,
          instructor: 'Michael Ssempijja',
        },
        'Live',
      ),
      row(
        'CRS-07',
        'Literacy Readiness',
        {
          code: 'LIT',
          program: 'Nursery',
          periods: 5,
          instructor: 'Joy Akello',
        },
        'Live',
      ),
      row(
        'CRS-08',
        'Numeracy Play',
        {
          code: 'NUM',
          program: 'Nursery',
          periods: 5,
          instructor: 'Joy Akello',
        },
        'Live',
      ),
      row(
        'CRS-09',
        'Physical Education',
        {
          code: 'PE',
          program: 'Primary',
          periods: 2,
          instructor: 'Samuel Kizito',
        },
        'Draft',
      ),
    ],
  },

  topics: {
    key: 'topics',
    title: 'Topics',
    singular: 'Topic',
    icon: 'lucide-list-tree',
    description: 'Units and themes inside each subject',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Topic', primary: true },
      { key: 'course', label: 'Subject' },
      { key: 'order', label: 'Order' },
      { key: 'hours', label: 'Hours' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'TOP-01',
        'Fractions and decimals',
        { course: 'Mathematics', order: 1, hours: 8 },
        'Published',
      ),
      row(
        'TOP-02',
        'Our environment',
        { course: 'Science', order: 2, hours: 6 },
        'Published',
      ),
      row(
        'TOP-03',
        'Letter sounds & blending',
        { course: 'Literacy Readiness', order: 1, hours: 10 },
        'Published',
      ),
      row(
        'TOP-04',
        'Uganda our country',
        { course: 'Social Studies', order: 3, hours: 7 },
        'Published',
      ),
      row(
        'TOP-05',
        'Counting to 20',
        { course: 'Numeracy Play', order: 1, hours: 8 },
        'Published',
      ),
      row(
        'TOP-06',
        'Comprehension passages',
        { course: 'English', order: 2, hours: 6 },
        'Draft',
      ),
    ],
  },

  rooms: {
    key: 'rooms',
    title: 'Rooms',
    singular: 'Room',
    icon: 'lucide-door-open',
    description: 'Classrooms, nursery rooms and halls',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Room', primary: true },
      { key: 'building', label: 'Block' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'RM-N1',
        'Nursery 1',
        { building: 'Nursery Wing', capacity: 28, type: 'Nursery' },
        'Available',
      ),
      row(
        'RM-N2',
        'Nursery 2',
        { building: 'Nursery Wing', capacity: 28, type: 'Nursery' },
        'Available',
      ),
      row(
        'RM-A1',
        'Block A · 1',
        { building: 'Block A', capacity: 40, type: 'Classroom' },
        'Available',
      ),
      row(
        'RM-B5',
        'Block B · 5',
        { building: 'Block B', capacity: 42, type: 'Classroom' },
        'Available',
      ),
      row(
        'RM-B7',
        'Block B · 7',
        { building: 'Block B', capacity: 45, type: 'Classroom' },
        'Available',
      ),
      row(
        'RM-HALL',
        'Assembly Hall',
        { building: 'Admin', capacity: 500, type: 'Hall' },
        'Scheduled',
      ),
      row(
        'RM-FIELD',
        'Play field',
        { building: 'Sports', capacity: 200, type: 'Field' },
        'Available',
      ),
    ],
  },

  'academic-terms': {
    key: 'academic-terms',
    title: 'Academic Terms',
    singular: 'Academic Term',
    icon: 'lucide-calendar-range',
    description: 'Ugandan school year — three terms',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Term', primary: true },
      { key: 'year', label: 'Year' },
      { key: 'start', label: 'Start' },
      { key: 'end', label: 'End' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'TRM-1',
        'Term I',
        {
          year: '2026',
          start: '2026-02-03',
          end: '2026-05-08',
        },
        'Closed',
      ),
      row(
        'TRM-2',
        'Term II',
        {
          year: '2026',
          start: '2026-05-25',
          end: '2026-08-21',
        },
        'Closed',
      ),
      row(
        'TRM-3',
        'Term III',
        {
          year: '2026',
          start: '2026-09-14',
          end: '2026-12-04',
        },
        'Open',
      ),
    ],
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
    rows: [
      row(
        'BAT-26N',
        'Nursery 2026',
        { year: '2026', program: 'Nursery', students: 72 },
        'Active',
      ),
      row(
        'BAT-26P',
        'Primary 2026',
        { year: '2026', program: 'Primary', students: 420 },
        'Active',
      ),
      row(
        'BAT-25P',
        'Primary 2025',
        { year: '2025', program: 'Primary', students: 408 },
        'Active',
      ),
      row(
        'BAT-19PLE',
        'PLE Class of 2025',
        { year: '2025', program: 'Primary', students: 38 },
        'Alumni',
      ),
    ],
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
    rows: [
      row('CAT-REG', 'Day scholar', { discount: '0%', students: 380 }, 'Active'),
      row(
        'CAT-SIB',
        'Sibling discount',
        { discount: '10%', students: 86 },
        'Active',
      ),
      row(
        'CAT-STF',
        'Staff child',
        { discount: '50%', students: 18 },
        'Active',
      ),
      row(
        'CAT-SCH',
        'Bursary / scholarship',
        { discount: '100%', students: 12 },
        'Active',
      ),
      row(
        'CAT-BRD',
        'Boarder',
        { discount: '0%', students: 24 },
        'Active',
      ),
    ],
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
    rows: [
      row(
        'GRD-PCT',
        'Percentage (0–100)',
        { range: '0–100', passMark: '50%' },
        'Active',
      ),
      row(
        'GRD-DIV',
        'UNEB Divisions (PLE)',
        { range: 'Div 1–U', passMark: 'Div 4' },
        'Active',
      ),
      row(
        'GRD-LIT',
        'Nursery descriptors',
        { range: 'Emerging–Secure', passMark: 'Developing' },
        'Active',
      ),
      row(
        'GRD-AGG',
        'PLE Aggregate',
        { range: '4–36', passMark: '28' },
        'Draft',
      ),
    ],
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
    rows: [
      row(
        'ATT-1',
        'Amina Namukasa',
        { className: 'P.5 Blue', date: '2026-11-13' },
        'Present',
      ),
      row(
        'ATT-2',
        'James Okello',
        { className: 'P.6 Green', date: '2026-11-13' },
        'Late',
      ),
      row(
        'ATT-3',
        'Sarah Nabukeera',
        { className: 'Top Class A', date: '2026-11-13' },
        'Present',
      ),
      row(
        'ATT-4',
        'Daniel Ssekandi',
        { className: 'P.7 Gold', date: '2026-11-13' },
        'Absent',
      ),
      row(
        'ATT-5',
        'Fatuma Nalwoga',
        { className: 'P.3 Red', date: '2026-11-13' },
        'Present',
      ),
      row(
        'ATT-6',
        'Nora Achieng',
        { className: 'P.1 Yellow', date: '2026-11-13' },
        'Present',
      ),
      row(
        'ATT-7',
        'Omar Kato',
        { className: 'P.4 Blue', date: '2026-11-13' },
        'Excused',
      ),
      row(
        'ATT-8',
        'Grace Nakato',
        { className: 'Baby Class A', date: '2026-11-13' },
        'Present',
      ),
    ],
  },

  timetable: {
    key: 'timetable',
    title: 'Timetable',
    singular: 'Period',
    icon: 'lucide-calendar-clock',
    description: 'Weekly timetable by class',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Period', primary: true },
      { key: 'day', label: 'Day' },
      { key: 'group', label: 'Class' },
      { key: 'course', label: 'Subject' },
      { key: 'room', label: 'Room' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'TT-01',
        'Period 1 · 07:45',
        {
          day: 'Mon',
          group: 'P.5 Blue',
          course: 'Mathematics',
          room: 'Block B · 5',
        },
        'Scheduled',
      ),
      row(
        'TT-02',
        'Period 2 · 08:40',
        {
          day: 'Mon',
          group: 'P.5 Blue',
          course: 'English',
          room: 'Block B · 5',
        },
        'Scheduled',
      ),
      row(
        'TT-03',
        'Period 1 · 08:00',
        {
          day: 'Tue',
          group: 'Top Class A',
          course: 'Literacy Readiness',
          room: 'Nursery 3',
        },
        'Scheduled',
      ),
      row(
        'TT-04',
        'Period 3 · 10:00',
        {
          day: 'Wed',
          group: 'P.7 Gold',
          course: 'Science',
          room: 'Block B · 7',
        },
        'Scheduled',
      ),
      row(
        'TT-05',
        'Period 4 · 11:00',
        {
          day: 'Thu',
          group: 'P.3 Red',
          course: 'Social Studies',
          room: 'Block A · 3',
        },
        'Scheduled',
      ),
      row(
        'TT-06',
        'Period 2 · 08:40',
        {
          day: 'Fri',
          group: 'P.1 Yellow',
          course: 'Luganda',
          room: 'Block A · 1',
        },
        'Draft',
      ),
    ],
  },

  exams: {
    key: 'exams',
    title: 'Assessment Plan',
    singular: 'Assessment',
    icon: 'lucide-file-check-2',
    description: 'BOT, MOT, EOT tests and PLE mocks',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Assessment', primary: true },
      { key: 'course', label: 'Subject' },
      { key: 'date', label: 'Date' },
      { key: 'maxScore', label: 'Max' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'EX-01',
        'Term III MOT · Mathematics',
        { course: 'Mathematics', date: '2026-10-20', maxScore: 100 },
        'Scheduled',
      ),
      row(
        'EX-02',
        'Term III MOT · English',
        { course: 'English', date: '2026-10-21', maxScore: 100 },
        'Scheduled',
      ),
      row(
        'EX-03',
        'P.7 PLE Mock 2',
        { course: 'Integrated', date: '2026-11-05', maxScore: 100 },
        'Open',
      ),
      row(
        'EX-04',
        'Nursery Top Class checklist',
        { course: 'Literacy Readiness', date: '2026-11-18', maxScore: 20 },
        'Draft',
      ),
      row(
        'EX-05',
        'Term II EOT · Science',
        { course: 'Science', date: '2026-08-12', maxScore: 100 },
        'Closed',
      ),
    ],
  },

  'exam-results': {
    key: 'exam-results',
    title: 'Assessment Results',
    singular: 'Result',
    icon: 'lucide-award',
    description: 'Marks posted for completed assessments',
    group: 'Assessment',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'exam', label: 'Assessment' },
      { key: 'score', label: 'Score' },
      { key: 'grade', label: 'Grade' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'RES-01',
        'Amina Namukasa',
        { exam: 'Term II EOT · Science', score: 78, grade: 'C3' },
        'Posted',
      ),
      row(
        'RES-02',
        'James Okello',
        { exam: 'Term II EOT · Science', score: 64, grade: 'C5' },
        'Posted',
      ),
      row(
        'RES-03',
        'Patricia Atim',
        { exam: 'P.7 PLE Mock 2', score: 91, grade: 'D1' },
        'Posted',
      ),
      row(
        'RES-04',
        'Moses Byaruhanga',
        { exam: 'Term II EOT · Science', score: 42, grade: 'P7' },
        'Remedial',
      ),
      row(
        'RES-05',
        'Daniel Ssekandi',
        { exam: 'P.7 PLE Mock 2', score: 82, grade: 'D2' },
        'Posted',
      ),
      row(
        'RES-06',
        'Sarah Nabukeera',
        {
          exam: 'Term II · Literacy readiness',
          score: 88,
          grade: 'Secure',
        },
        'Posted',
      ),
    ],
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
    rows: [
      row(
        'APP-01',
        'Ivy Chelangat',
        { program: 'Nursery', grade: 'Baby Class', applied: '2026-10-02' },
        'Pending',
      ),
      row(
        'APP-02',
        'Leo Mutiso',
        { program: 'Primary', grade: 'P.1', applied: '2026-10-05' },
        'Approved',
      ),
      row(
        'APP-03',
        'Zara Namazzi',
        { program: 'Primary', grade: 'P.4', applied: '2026-10-08' },
        'Waitlist',
      ),
      row(
        'APP-04',
        'Chris Barasa',
        { program: 'Nursery', grade: 'Middle Class', applied: '2026-10-11' },
        'Pending',
      ),
      row(
        'APP-05',
        'Mia Wekesa',
        { program: 'Primary', grade: 'P.1', applied: '2026-10-14' },
        'Rejected',
      ),
      row(
        'APP-06',
        'Noah Kiprop',
        { program: 'Primary', grade: 'P.5', applied: '2026-10-18' },
        'Approved',
      ),
    ],
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
    rows: [
      row(
        'ADM-01',
        'Leo Mutiso',
        { program: 'Primary', term: 'Term III', fee: 'Paid' },
        'Approved',
      ),
      row(
        'ADM-02',
        'Noah Kiprop',
        { program: 'Primary', term: 'Term III', fee: 'Paid' },
        'Approved',
      ),
      row(
        'ADM-03',
        'Ivy Chelangat',
        { program: 'Nursery', term: 'Term III', fee: 'Unpaid' },
        'Pending',
      ),
      row(
        'ADM-04',
        'Chris Barasa',
        { program: 'Nursery', term: 'Term III', fee: 'Partial' },
        'Pending',
      ),
    ],
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
    rows: [
      row(
        'PEN-01',
        'Amina Namukasa',
        {
          program: 'Primary',
          batch: 'Primary 2026',
          term: 'Term III',
        },
        'Enrolled',
      ),
      row(
        'PEN-02',
        'James Okello',
        {
          program: 'Primary',
          batch: 'Primary 2025',
          term: 'Term III',
        },
        'Enrolled',
      ),
      row(
        'PEN-03',
        'Sarah Nabukeera',
        {
          program: 'Nursery',
          batch: 'Nursery 2026',
          term: 'Term III',
        },
        'Enrolled',
      ),
      row(
        'PEN-04',
        'Leo Mutiso',
        {
          program: 'Primary',
          batch: 'Primary 2026',
          term: 'Term III',
        },
        'Enrolled',
      ),
      row(
        'PEN-05',
        'Grace Nakato',
        {
          program: 'Nursery',
          batch: 'Nursery 2026',
          term: 'Term III',
        },
        'Enrolled',
      ),
    ],
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
    rows: [
      row(
        'CEN-01',
        'Amina Namukasa',
        { course: 'Mathematics', group: 'P.5 Blue', periods: 8 },
        'Enrolled',
      ),
      row(
        'CEN-02',
        'Amina Namukasa',
        { course: 'English', group: 'P.5 Blue', periods: 8 },
        'Enrolled',
      ),
      row(
        'CEN-03',
        'James Okello',
        { course: 'Science', group: 'P.6 Green', periods: 6 },
        'Enrolled',
      ),
      row(
        'CEN-04',
        'Sarah Nabukeera',
        { course: 'Literacy Readiness', group: 'Top Class A', periods: 5 },
        'Enrolled',
      ),
      row(
        'CEN-05',
        'Daniel Ssekandi',
        { course: 'Social Studies', group: 'P.7 Gold', periods: 5 },
        'Enrolled',
      ),
      row(
        'CEN-06',
        'Grace Nakato',
        { course: 'Numeracy Play', group: 'Baby Class A', periods: 5 },
        'Enrolled',
      ),
    ],
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
    rows: [
      row(
        'FS-01',
        'Nursery Term Fees',
        {
          program: 'Nursery',
          term: 'Term III',
          amount: 'UGX 450,000',
        },
        'Active',
      ),
      row(
        'FS-02',
        'Primary (P.1–P.3) Term Fees',
        {
          program: 'Primary',
          term: 'Term III',
          amount: 'UGX 550,000',
        },
        'Active',
      ),
      row(
        'FS-03',
        'Primary (P.4–P.6) Term Fees',
        {
          program: 'Primary',
          term: 'Term III',
          amount: 'UGX 650,000',
        },
        'Active',
      ),
      row(
        'FS-04',
        'P.7 / PLE Term Fees',
        {
          program: 'Primary',
          term: 'Term III',
          amount: 'UGX 780,000',
        },
        'Active',
      ),
      row(
        'FS-05',
        'Boarding Top-up',
        {
          program: 'Primary',
          term: 'Term III',
          amount: 'UGX 900,000',
        },
        'Draft',
      ),
    ],
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
    rows: [
      row(
        'FC-01',
        'Tuition',
        { type: 'Mandatory', defaultAmount: 'UGX 400,000' },
        'Active',
      ),
      row(
        'FC-02',
        'Development fund',
        { type: 'Mandatory', defaultAmount: 'UGX 50,000' },
        'Active',
      ),
      row(
        'FC-03',
        'Lunch',
        { type: 'Mandatory', defaultAmount: 'UGX 80,000' },
        'Active',
      ),
      row(
        'FC-04',
        'Transport (van)',
        { type: 'Optional', defaultAmount: 'UGX 250,000' },
        'Active',
      ),
      row(
        'FC-05',
        'Boarding',
        { type: 'Optional', defaultAmount: 'UGX 900,000' },
        'Active',
      ),
      row(
        'FC-06',
        'UNEB / exam levy',
        { type: 'Mandatory', defaultAmount: 'UGX 35,000' },
        'Active',
      ),
    ],
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
    rows: [
      row(
        'FSC-01',
        'Term III Nursery billing',
        {
          structure: 'Nursery Term Fees',
          dueDate: '2026-09-30',
          invoices: 72,
        },
        'Open',
      ),
      row(
        'FSC-02',
        'Term III Lower Primary billing',
        {
          structure: 'Primary (P.1–P.3) Term Fees',
          dueDate: '2026-09-30',
          invoices: 180,
        },
        'Open',
      ),
      row(
        'FSC-03',
        'Term III Upper Primary billing',
        {
          structure: 'Primary (P.4–P.6) Term Fees',
          dueDate: '2026-09-30',
          invoices: 200,
        },
        'Open',
      ),
      row(
        'FSC-04',
        'Term II Nursery billing',
        {
          structure: 'Nursery Term Fees',
          dueDate: '2026-05-31',
          invoices: 70,
        },
        'Closed',
      ),
    ],
  },

  fees: {
    key: 'fees',
    title: 'Fees',
    singular: 'Fee Invoice',
    icon: 'lucide-receipt',
    description: 'Pupil fee invoices and balances (UGX)',
    group: 'Fees',
    columns: [
      { key: 'name', label: 'Student', primary: true },
      { key: 'invoice', label: 'Invoice' },
      { key: 'amount', label: 'Amount' },
      { key: 'paid', label: 'Paid' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'FEE-01',
        'Amina Namukasa',
        {
          invoice: 'INV-2601',
          amount: 'UGX 650,000',
          paid: 'UGX 650,000',
        },
        'Paid',
      ),
      row(
        'FEE-02',
        'James Okello',
        {
          invoice: 'INV-2602',
          amount: 'UGX 650,000',
          paid: 'UGX 300,000',
        },
        'Partial',
      ),
      row(
        'FEE-03',
        'Sarah Nabukeera',
        {
          invoice: 'INV-2603',
          amount: 'UGX 450,000',
          paid: 'UGX 0',
        },
        'Unpaid',
      ),
      row(
        'FEE-04',
        'Daniel Ssekandi',
        {
          invoice: 'INV-2604',
          amount: 'UGX 780,000',
          paid: 'UGX 780,000',
        },
        'Paid',
      ),
      row(
        'FEE-05',
        'Fatuma Nalwoga',
        {
          invoice: 'INV-2605',
          amount: 'UGX 550,000',
          paid: 'UGX 200,000',
        },
        'Partial',
      ),
      row(
        'FEE-06',
        'Omar Kato',
        {
          invoice: 'INV-2606',
          amount: 'UGX 650,000',
          paid: 'UGX 0',
        },
        'Overdue',
      ),
      row(
        'FEE-07',
        'Nora Achieng',
        {
          invoice: 'INV-2607',
          amount: 'UGX 550,000',
          paid: 'UGX 550,000',
        },
        'Paid',
      ),
      row(
        'FEE-08',
        'Brian Mugisha',
        {
          invoice: 'INV-2608',
          amount: 'UGX 550,000',
          paid: 'UGX 100,000',
        },
        'Overdue',
      ),
    ],
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
    rows: [
      row(
        'EXS-01',
        'Primary BOT / MOT / EOT',
        {
          program: 'Primary',
          passMark: 50,
          weight: '20 / 30 / 50',
          terms: 'Term I–III',
        },
        'Active',
        'NCDC continuous assessment',
      ),
      row(
        'EXS-02',
        'Nursery readiness checklist',
        {
          program: 'Nursery',
          passMark: 10,
          weight: 'Checklist',
          terms: 'Termly',
        },
        'Active',
      ),
      row(
        'EXS-03',
        'P.7 PLE mock rules',
        {
          program: 'Primary',
          passMark: 50,
          weight: 'Mock average',
          terms: 'Term II–III',
        },
        'Active',
        'UNEB-aligned',
      ),
      row(
        'EXS-04',
        'Promotion criteria · P.1–P.6',
        {
          program: 'Primary',
          passMark: 50,
          weight: 'Year average',
          terms: 'Annual',
        },
        'Draft',
      ),
    ],
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
    rows: [
      row(
        'AG-01',
        'Term III MOT',
        { type: 'Mid-term', term: 'Term III 2026' },
        'Active',
      ),
      row(
        'AG-02',
        'Term III EOT',
        { type: 'End of term', term: 'Term III 2026' },
        'Scheduled',
      ),
      row(
        'AG-03',
        'PLE Mock Series',
        { type: 'Mock', term: 'Term III 2026' },
        'Active',
      ),
      row(
        'AG-04',
        'Nursery observation',
        { type: 'Continuous', term: 'Term III 2026' },
        'Active',
      ),
    ],
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
    rows: [
      row(
        'AC-01',
        'Problem solving',
        { subject: 'Mathematics', maxScore: 40 },
        'Active',
      ),
      row(
        'AC-02',
        'Reading comprehension',
        { subject: 'English', maxScore: 30 },
        'Active',
      ),
      row(
        'AC-03',
        'Scientific method',
        { subject: 'Science', maxScore: 25 },
        'Active',
      ),
      row(
        'AC-04',
        'Fine motor readiness',
        { subject: 'Literacy & Play', maxScore: 20 },
        'Active',
      ),
    ],
  },

  'inventory-items': {
    key: 'inventory-items',
    title: 'Inventory Items',
    singular: 'Item',
    icon: 'lucide-package',
    description: 'Uniforms, books, stationery and store items',
    group: 'Inventory',
    columns: [
      { key: 'name', label: 'Item', primary: true },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'Category' },
      { key: 'unit', label: 'Unit' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'ITM-01',
        'School shirt · Primary',
        { sku: 'UNI-SHIRT-P', category: 'Uniform', unit: 'Pcs' },
        'Active',
      ),
      row(
        'ITM-02',
        'Exercise book A4 (96pg)',
        { sku: 'STA-EXB-96', category: 'Stationery', unit: 'Pcs' },
        'Active',
      ),
      row(
        'ITM-03',
        'Chalk box',
        { sku: 'STA-CHALK', category: 'Stationery', unit: 'Box' },
        'Active',
      ),
      row(
        'ITM-04',
        'Nursery apron',
        { sku: 'UNI-APR-N', category: 'Uniform', unit: 'Pcs' },
        'Active',
      ),
      row(
        'ITM-05',
        'Science kit · Primary',
        { sku: 'LAB-SCI-P', category: 'Lab', unit: 'Set' },
        'Active',
      ),
      row(
        'ITM-06',
        'First aid refill pack',
        { sku: 'MED-FA-01', category: 'Medical', unit: 'Pack' },
        'Active',
      ),
    ],
  },

  'inventory-stock': {
    key: 'inventory-stock',
    title: 'Stock Levels',
    singular: 'Stock',
    icon: 'lucide-warehouse',
    description: 'On-hand quantities by store location',
    group: 'Inventory',
    columns: [
      { key: 'name', label: 'Item', primary: true },
      { key: 'store', label: 'Store' },
      { key: 'qty', label: 'Qty' },
      { key: 'reorder', label: 'Reorder at' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'STK-01',
        'School shirt · Primary',
        { store: 'Main store', qty: 86, reorder: 20 },
        'Available',
      ),
      row(
        'STK-02',
        'Exercise book A4 (96pg)',
        { store: 'Main store', qty: 420, reorder: 100 },
        'Available',
      ),
      row(
        'STK-03',
        'Chalk box',
        { store: 'Staff room', qty: 8, reorder: 10 },
        'Low stock',
      ),
      row(
        'STK-04',
        'Nursery apron',
        { store: 'Nursery store', qty: 34, reorder: 15 },
        'Available',
      ),
      row(
        'STK-05',
        'Science kit · Primary',
        { store: 'Lab cupboard', qty: 3, reorder: 2 },
        'Available',
      ),
      row(
        'STK-06',
        'First aid refill pack',
        { store: 'Clinic', qty: 1, reorder: 3 },
        'Low stock',
      ),
    ],
  },

  'inventory-issues': {
    key: 'inventory-issues',
    title: 'Stock Issues',
    singular: 'Issue',
    icon: 'lucide-package-open',
    description: 'Items issued to classes, teachers or pupils',
    group: 'Inventory',
    columns: [
      { key: 'name', label: 'Issue', primary: true },
      { key: 'item', label: 'Item' },
      { key: 'qty', label: 'Qty' },
      { key: 'issuedTo', label: 'Issued to' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'ISS-01',
        'ISS-2026-1101',
        {
          item: 'Exercise book A4 (96pg)',
          qty: 40,
          issuedTo: 'P.4 Yellow · Grace Achieng',
          date: '2026-11-01',
        },
        'Issued',
      ),
      row(
        'ISS-02',
        'ISS-2026-1105',
        {
          item: 'Chalk box',
          qty: 2,
          issuedTo: 'Staff room',
          date: '2026-11-05',
        },
        'Issued',
      ),
      row(
        'ISS-03',
        'ISS-2026-1108',
        {
          item: 'Nursery apron',
          qty: 5,
          issuedTo: 'Baby Class · Joy Akello',
          date: '2026-11-08',
        },
        'Pending',
      ),
      row(
        'ISS-04',
        'ISS-2026-1020',
        {
          item: 'School shirt · Primary',
          qty: 1,
          issuedTo: 'Amina Namukasa',
          date: '2026-10-20',
        },
        'Issued',
      ),
    ],
  },

  assets: {
    key: 'assets',
    title: 'School Assets',
    singular: 'Asset',
    icon: 'lucide-monitor',
    description: 'Furniture, devices and fixed assets',
    group: 'Inventory',
    columns: [
      { key: 'name', label: 'Asset', primary: true },
      { key: 'tag', label: 'Tag' },
      { key: 'location', label: 'Location' },
      { key: 'condition', label: 'Condition' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'AST-01',
        'Projector · Assembly hall',
        { tag: 'LR-PRJ-01', location: 'Assembly hall', condition: 'Good' },
        'Active',
      ),
      row(
        'AST-02',
        'Desktop PC · Accounts',
        { tag: 'LR-PC-04', location: 'Accounts office', condition: 'Good' },
        'Active',
      ),
      row(
        'AST-03',
        'Pupil desks · P.5 Blue',
        { tag: 'LR-DSK-P5', location: 'P.5 Blue', condition: 'Fair' },
        'Active',
        '40 desks',
      ),
      row(
        'AST-04',
        'Printer · Admin',
        {
          tag: 'LR-PRT-02',
          location: 'Administration',
          condition: 'Needs service',
        },
        'Maintenance',
      ),
    ],
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
    rows: [
      row(
        'BK-01',
        'African Tales for Children',
        { author: 'Various', copies: 12, shelf: 'A-12' },
        'Available',
      ),
      row(
        'BK-02',
        'Primary Mathematics · P.4',
        { author: 'NCDC', copies: 30, shelf: 'M-04' },
        'Available',
      ),
      row(
        'BK-03',
        'Science Around Us',
        { author: 'Okello P.', copies: 8, shelf: 'S-02' },
        'Available',
      ),
      row(
        'BK-04',
        'English Reader · Top Class',
        { author: 'NCDC', copies: 18, shelf: 'N-01' },
        'Available',
      ),
      row(
        'BK-05',
        'Atlas of Uganda',
        { author: 'Survey Dept', copies: 4, shelf: 'G-01' },
        'Low stock',
      ),
    ],
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
    rows: [
      row(
        'LIB-01',
        'LIB-2601',
        {
          book: 'African Tales for Children',
          borrower: 'Sarah Nabukeera',
          dueDate: '2026-11-20',
        },
        'On loan',
      ),
      row(
        'LIB-02',
        'LIB-2602',
        {
          book: 'Primary Mathematics · P.4',
          borrower: 'Grace Namuli',
          dueDate: '2026-11-30',
        },
        'On loan',
      ),
      row(
        'LIB-03',
        'LIB-2590',
        {
          book: 'Science Around Us',
          borrower: 'James Okello',
          dueDate: '2026-11-05',
        },
        'Overdue',
      ),
      row(
        'LIB-04',
        'LIB-2588',
        {
          book: 'English Reader · Top Class',
          borrower: 'Nora Achieng',
          dueDate: '2026-10-28',
        },
        'Returned',
      ),
    ],
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
    rows: [
      row(
        'RTE-01',
        'Ntinda Loop',
        { area: 'Ntinda / Nakawa', stops: 6, pupils: 28 },
        'Active',
      ),
      row(
        'RTE-02',
        'Kololo Express',
        { area: 'Kololo / Kamwokya', stops: 5, pupils: 22 },
        'Active',
      ),
      row(
        'RTE-03',
        'Kira Morning',
        { area: 'Kira / Najjera', stops: 7, pupils: 31 },
        'Active',
      ),
      row(
        'RTE-04',
        'Weekend Activity',
        { area: 'Various', stops: 3, pupils: 0 },
        'Draft',
      ),
    ],
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
    rows: [
      row(
        'VEH-01',
        'Bus 1 · Blue Royals',
        {
          plate: 'UBG 452A',
          capacity: 35,
          driver: 'Paul Ssenyonjo',
        },
        'Active',
      ),
      row(
        'VEH-02',
        'Bus 2 · Red Crown',
        {
          plate: 'UBH 118C',
          capacity: 30,
          driver: 'James Mutebi',
        },
        'Active',
      ),
      row(
        'VEH-03',
        'Van · Admin',
        {
          plate: 'UAM 990X',
          capacity: 12,
          driver: 'Relief pool',
        },
        'Maintenance',
      ),
    ],
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
    rows: [
      row(
        'HW-01',
        'Fractions worksheet 3',
        {
          className: 'P.4 Yellow',
          subject: 'Mathematics',
          dueDate: '2026-11-14',
        },
        'Open',
      ),
      row(
        'HW-02',
        'Reading log · week 8',
        {
          className: 'Top Class',
          subject: 'Literacy',
          dueDate: '2026-11-15',
        },
        'Open',
      ),
      row(
        'HW-03',
        'Science plant observation',
        {
          className: 'P.5 Blue',
          subject: 'Science',
          dueDate: '2026-11-12',
        },
        'Closed',
      ),
      row(
        'HW-04',
        'PLE mock revision pack',
        {
          className: 'P.7 Green',
          subject: 'Integrated',
          dueDate: '2026-11-18',
        },
        'Open',
      ),
    ],
  },

  'lesson-plans': {
    key: 'lesson-plans',
    title: 'Lesson Plans',
    singular: 'Lesson Plan',
    icon: 'lucide-clipboard-pen',
    description: 'Weekly lesson plans by teacher and class',
    group: 'Academics',
    columns: [
      { key: 'name', label: 'Plan', primary: true },
      { key: 'teacher', label: 'Teacher' },
      { key: 'className', label: 'Class' },
      { key: 'week', label: 'Week' },
      { key: 'status', label: 'Status', badge: true },
    ],
    rows: [
      row(
        'LP-01',
        'Numeracy · Place value',
        {
          teacher: 'Grace Namuli',
          className: 'P.4 Yellow',
          week: 'Week 8',
        },
        'Approved',
      ),
      row(
        'LP-02',
        'Play & literacy corners',
        {
          teacher: 'Joy Akello',
          className: 'Baby Class',
          week: 'Week 8',
        },
        'Submitted',
      ),
      row(
        'LP-03',
        'Science · Simple machines',
        {
          teacher: 'Peter Okello',
          className: 'P.5 Blue',
          week: 'Week 7',
        },
        'Approved',
      ),
      row(
        'LP-04',
        'SST · Uganda districts',
        {
          teacher: 'Michael Ssempijja',
          className: 'P.6 Red',
          week: 'Week 8',
        },
        'Draft',
      ),
    ],
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
    rows: [
      row(
        'SA-01',
        'Grace Namuli',
        { date: '2026-11-12', checkIn: '07:25', checkOut: '16:10' },
        'Present',
      ),
      row(
        'SA-02',
        'Peter Okello',
        { date: '2026-11-12', checkIn: '07:40', checkOut: '16:05' },
        'Present',
      ),
      row(
        'SA-03',
        'Samuel Kizito',
        { date: '2026-11-12', checkIn: '—', checkOut: '—' },
        'On Leave',
      ),
      row(
        'SA-04',
        'Joy Akello',
        { date: '2026-11-12', checkIn: '07:55', checkOut: '16:00' },
        'Late',
      ),
      row(
        'SA-05',
        'Harriet Nabirye',
        { date: '2026-11-12', checkIn: '07:30', checkOut: '15:55' },
        'Present',
      ),
    ],
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
    rows: [
      row(
        'HL-01',
        'Omar Kato',
        {
          visitDate: '2026-11-10',
          issue: 'Mild fever',
          action: 'Rest + parent call',
        },
        'Closed',
      ),
      row(
        'HL-02',
        'Fatuma Nalwoga',
        {
          visitDate: '2026-11-08',
          issue: 'Allergy note on file',
          action: 'Avoid groundnuts',
        },
        'Active',
      ),
      row(
        'HL-03',
        'Brian Mugisha',
        {
          visitDate: '2026-11-06',
          issue: 'Playground scrape',
          action: 'First aid',
        },
        'Closed',
      ),
      row(
        'HL-04',
        'Sarah Nabukeera',
        {
          visitDate: '2026-11-11',
          issue: 'Stomach upset',
          action: 'Observed in clinic',
        },
        'Monitoring',
      ),
    ],
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
    rows: [
      row(
        'EVT-01',
        'Term III MOT week',
        {
          date: '2026-10-20',
          type: 'Exams',
          audience: 'Primary',
        },
        'Completed',
      ),
      row(
        'EVT-02',
        'Parents’ meeting · Nursery',
        {
          date: '2026-11-15',
          type: 'Parents',
          audience: 'Nursery',
        },
        'Scheduled',
      ),
      row(
        'EVT-03',
        'Sports day',
        {
          date: '2026-11-22',
          type: 'Activity',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-04',
        'End of term break',
        {
          date: '2026-12-05',
          type: 'Holiday',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-05',
        'PLE briefing · P.7',
        {
          date: '2026-11-18',
          type: 'Exams',
          audience: 'P.7',
        },
        'Scheduled',
      ),
      row(
        'EVT-06',
        'Monday assembly',
        {
          date: '2026-11-09',
          type: 'School day',
          audience: 'Whole school',
        },
        'Completed',
      ),
      row(
        'EVT-07',
        'School day · regular classes',
        {
          date: '2026-11-10',
          type: 'School day',
          audience: 'Whole school',
        },
        'Completed',
      ),
      row(
        'EVT-08',
        'School day · regular classes',
        {
          date: '2026-11-11',
          type: 'School day',
          audience: 'Whole school',
        },
        'Completed',
      ),
      row(
        'EVT-09',
        'School day · regular classes',
        {
          date: '2026-11-12',
          type: 'School day',
          audience: 'Whole school',
        },
        'Completed',
      ),
      row(
        'EVT-10',
        'School day · regular classes',
        {
          date: '2026-11-13',
          type: 'School day',
          audience: 'Whole school',
        },
        'Active',
      ),
      row(
        'EVT-11',
        'Club afternoon · Music & Debate',
        {
          date: '2026-11-14',
          type: 'Activity',
          audience: 'Primary',
        },
        'Scheduled',
      ),
      row(
        'EVT-12',
        'School day · regular classes',
        {
          date: '2026-11-16',
          type: 'School day',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-13',
        'School day · regular classes',
        {
          date: '2026-11-17',
          type: 'School day',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-14',
        'Inter-house quiz',
        {
          date: '2026-11-19',
          type: 'Activity',
          audience: 'Primary',
        },
        'Scheduled',
      ),
      row(
        'EVT-15',
        'School day · regular classes',
        {
          date: '2026-11-20',
          type: 'School day',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-16',
        'Career talk · Alumni',
        {
          date: '2026-11-21',
          type: 'Activity',
          audience: 'P.6–P.7',
        },
        'Scheduled',
      ),
      row(
        'EVT-17',
        'School day · regular classes',
        {
          date: '2026-11-23',
          type: 'School day',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-18',
        'School day · regular classes',
        {
          date: '2026-11-24',
          type: 'School day',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-19',
        'Public holiday · no classes',
        {
          date: '2026-11-25',
          type: 'Holiday',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-20',
        'School day · regular classes',
        {
          date: '2026-11-26',
          type: 'School day',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-21',
        'Library reading week kickoff',
        {
          date: '2026-11-27',
          type: 'Activity',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
      row(
        'EVT-22',
        'Fee payment clinic',
        {
          date: '2026-11-28',
          type: 'Parents',
          audience: 'Guardians',
        },
        'Scheduled',
      ),
      row(
        'EVT-23',
        'Term III report drafting',
        {
          date: '2026-12-01',
          type: 'School day',
          audience: 'Teachers',
        },
        'Scheduled',
      ),
      row(
        'EVT-24',
        'Class parties · Nursery',
        {
          date: '2026-12-03',
          type: 'Activity',
          audience: 'Nursery',
        },
        'Scheduled',
      ),
      row(
        'EVT-25',
        'Closing assembly',
        {
          date: '2026-12-04',
          type: 'School day',
          audience: 'Whole school',
        },
        'Scheduled',
      ),
    ],
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
    rows: [
      row(
        'MSG-01',
        'Fee reminder · Term III',
        {
          channel: 'SMS',
          audience: 'Parents with balance',
          recipients: 42,
          sentAt: '2026-11-08 09:15',
          body: 'Dear parent, Term III fees for your child remain outstanding. Please clear at the accounts office. Little Royals.',
        },
        'Sent',
      ),
      row(
        'MSG-02',
        'Parents’ meeting · Nursery',
        {
          channel: 'WhatsApp',
          audience: 'Nursery parents',
          recipients: 48,
          sentAt: '2026-11-10 16:40',
          body: 'Reminder: Nursery parents’ meeting is on 15 Nov at 9:00am in the hall. Please attend. In God We Trust — Little Royals.',
        },
        'Sent',
      ),
      row(
        'MSG-03',
        'Term report cards ready',
        {
          channel: 'Email',
          audience: 'All guardians',
          recipients: 186,
          sentAt: '2026-11-05 11:02',
          body: 'Dear guardian, Term II report cards are ready for collection from class teachers this Friday. Regards, Little Royals Kindergarten and Primary School.',
        },
        'Sent',
      ),
      row(
        'MSG-04',
        'Attendance alert · late leavers',
        {
          channel: 'SMS',
          audience: 'Selected guardians',
          recipients: 7,
          sentAt: '—',
          body: 'Your child was marked late today. Please encourage punctual arrival by 7:45am. Little Royals.',
        },
        'Draft',
      ),
      row(
        'MSG-05',
        'Sports day invitation',
        {
          channel: 'WhatsApp',
          audience: 'Whole school',
          recipients: 220,
          sentAt: '2026-11-18 08:00',
          body: 'You are invited to Sports Day on 22 Nov from 8:00am. Pupils should wear house colours. Little Royals.',
        },
        'Scheduled',
      ),
      row(
        'MSG-06',
        'Staff briefing · PLE mock',
        {
          channel: 'Email',
          audience: 'Teachers',
          recipients: 18,
          sentAt: '2026-11-11 07:30',
          body: 'Colleagues, P.7 PLE briefing is on 18 Nov. Please submit mock mark sheets by 17 Nov. Thank you.',
        },
        'Sent',
      ),
      row(
        'MSG-07',
        'Bus route change · Ntinda',
        {
          channel: 'SMS',
          audience: 'Ntinda Loop parents',
          recipients: 28,
          sentAt: '2026-11-12 18:20',
          body: 'Transport notice: Ntinda Loop pickup moves 10 minutes earlier from Monday. Call the office for details.',
        },
        'Sent',
      ),
      row(
        'MSG-08',
        'Holiday closing notice',
        {
          channel: 'Email',
          audience: 'All guardians',
          recipients: 220,
          sentAt: '—',
          body: 'School closes for end-of-term break on 5 Dec 2026. Reporting date for next term will follow by SMS and WhatsApp.',
        },
        'Draft',
      ),
      row(
        'MSG-09',
        'Homework reminder · P.4',
        {
          channel: 'WhatsApp',
          audience: 'P.4 Yellow parents',
          recipients: 34,
          sentAt: '2026-11-13 17:05',
          body: 'Please ensure Fractions worksheet 3 is completed for Friday. Thank you — Class teacher.',
        },
        'Sent',
      ),
      row(
        'MSG-10',
        'Clinic follow-up',
        {
          channel: 'SMS',
          audience: 'Selected guardians',
          recipients: 3,
          sentAt: '2026-11-11 14:10',
          body: 'Clinic note: please collect your child / follow up on today’s visit. Contact school nurse if needed.',
        },
        'Sent',
      ),
    ],
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
    rows: [
      row(
        'TPL-01',
        'Fee reminder',
        {
          channel: 'SMS',
          category: 'Fees',
          body: 'Dear parent, fees for {{student}} remain outstanding ({{balance}}). Please clear at accounts. Little Royals.',
        },
        'Active',
      ),
      row(
        'TPL-02',
        'Absence notice',
        {
          channel: 'SMS',
          category: 'Attendance',
          body: 'Your child {{student}} was marked absent today ({{date}}). Please inform the school if this was planned.',
        },
        'Active',
      ),
      row(
        'TPL-03',
        'Event invitation',
        {
          channel: 'WhatsApp',
          category: 'Events',
          body: 'You are invited to {{event}} on {{date}} at {{time}}. Little Royals — In God We Trust.',
        },
        'Active',
      ),
      row(
        'TPL-04',
        'Report card ready',
        {
          channel: 'Email',
          category: 'Academics',
          body: 'Dear guardian,\n\nReport cards for {{term}} are ready for collection.\n\nRegards,\n{{school}}',
        },
        'Active',
      ),
      row(
        'TPL-05',
        'Meeting reminder',
        {
          channel: 'WhatsApp',
          category: 'Parents',
          body: 'Reminder: {{meeting}} on {{date}}. Venue: {{venue}}. Please attend.',
        },
        'Active',
      ),
      row(
        'TPL-06',
        'Emergency alert',
        {
          channel: 'SMS',
          category: 'Emergency',
          body: 'URGENT from Little Royals: {{message}}. Contact the office on {{phone}}.',
        },
        'Active',
      ),
    ],
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
    rows: [
      row(
        'VIS-01',
        'Mrs Okello',
        {
          purpose: 'Fee payment',
          host: 'Accounts',
          timeIn: '2026-11-13 08:40',
        },
        'Checked out',
      ),
      row(
        'VIS-02',
        'UNEB inspector',
        {
          purpose: 'Centre visit',
          host: 'Head teacher',
          timeIn: '2026-11-12 10:15',
        },
        'Checked out',
      ),
      row(
        'VIS-03',
        'Supplier · Stationery',
        {
          purpose: 'Delivery',
          host: 'Store',
          timeIn: '2026-11-13 11:05',
        },
        'On site',
      ),
    ],
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
    rows: [
      row(
        'PAY-01',
        'MM251108·7741',
        {
          student: 'James Okello',
          studentId: 'STU-1002',
          channel: 'MTN MoMo',
          amount: 350000,
          paidAt: '2026-11-08 09:22',
          phone: '+256 701 200 202',
          feeRef: 'FEE-02',
        },
        'Reconciled',
      ),
      row(
        'PAY-02',
        'AM251110·8820',
        {
          student: 'Amina Namukasa',
          studentId: 'STU-1001',
          channel: 'Airtel Money',
          amount: 200000,
          paidAt: '2026-11-10 14:05',
          phone: '+256 772 100 101',
          feeRef: 'FEE-01',
        },
        'Reconciled',
      ),
      row(
        'PAY-03',
        'MM251112·9012',
        {
          student: 'Sarah Nabukeera',
          studentId: 'STU-1003',
          channel: 'MTN MoMo',
          amount: 150000,
          paidAt: '2026-11-12 18:40',
          phone: '+256 753 300 303',
          feeRef: 'FEE-03',
        },
        'Pending',
      ),
      row(
        'PAY-04',
        'BK251113·4411',
        {
          student: 'Daniel Ssekandi',
          studentId: 'STU-1004',
          channel: 'Bank transfer',
          amount: 500000,
          paidAt: '2026-11-13 08:10',
          phone: '—',
          feeRef: 'FEE-04',
        },
        'Pending',
      ),
      row(
        'PAY-05',
        'MM251105·2200',
        {
          student: 'Omar Kato',
          studentId: 'STU-1008',
          channel: 'MTN MoMo',
          amount: 80000,
          paidAt: '2026-11-05 11:30',
          phone: '+256 706 500 505',
          feeRef: 'FEE-05',
        },
        'Failed',
      ),
    ],
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
    rows: [
      row(
        'RC-01',
        'Amina Namukasa',
        {
          studentId: 'STU-1001',
          className: 'P.5 Blue',
          section: 'Primary',
          term: 'Term II 2026',
          average: 78,
          division: 'Div 2',
          aggregate: 18,
          position: '4 / 42',
          teacherComment: 'Amina works hard and participates well in class.',
          headComment: 'Promoted. Keep reading at home.',
        },
        'Published',
      ),
      row(
        'RC-02',
        'James Okello',
        {
          studentId: 'STU-1002',
          className: 'P.6 Green',
          section: 'Primary',
          term: 'Term II 2026',
          average: 71,
          division: 'Div 2',
          aggregate: 22,
          position: '11 / 38',
          teacherComment: 'Needs more practice in Mathematics word problems.',
          headComment: 'Fair progress. Join P.7 remedial / holiday revision.',
        },
        'Published',
      ),
      row(
        'RC-03',
        'Sarah Nabukeera',
        {
          studentId: 'STU-1003',
          className: 'Top Class A',
          section: 'Nursery',
          term: 'Term II 2026',
          average: 88,
          division: 'Secure',
          readinessBand: 'Secure',
          position: '2 / 30',
          teacherComment: 'Excellent literacy readiness and social skills.',
          headComment: 'Outstanding nursery progress — ready for P.1.',
        },
        'Draft',
      ),
      row(
        'RC-04',
        'Daniel Ssekandi',
        {
          studentId: 'STU-1004',
          className: 'P.7 Gold',
          section: 'Primary',
          term: 'Term II 2026',
          average: 82,
          division: 'Div 1',
          aggregate: 12,
          position: '6 / 45',
          teacherComment: 'Strong PLE candidate. Maintain focus.',
          headComment: 'Ready for PLE mock exams.',
        },
        'Published',
      ),
    ],
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
    rows: [
      row(
        'GB-01',
        'P.5 Blue · Mathematics · BOT',
        {
          className: 'P.5 Blue',
          subject: 'Mathematics',
          assessment: 'Beginning of Term',
          average: 64,
          teacher: 'Grace Achieng',
          maxScore: 100,
        },
        'Submitted',
      ),
      row(
        'GB-02',
        'P.5 Blue · English · MOT',
        {
          className: 'P.5 Blue',
          subject: 'English',
          assessment: 'Mid of Term',
          average: 72,
          teacher: 'Grace Achieng',
          maxScore: 100,
        },
        'Draft',
      ),
      row(
        'GB-03',
        'P.6 Green · Science · MOT',
        {
          className: 'P.6 Green',
          subject: 'Science',
          assessment: 'Mid of Term',
          average: 68,
          teacher: 'Peter Okello',
          maxScore: 100,
        },
        'Submitted',
      ),
      row(
        'GB-04',
        'P.7 Gold · SST · Weekly test',
        {
          className: 'P.7 Gold',
          subject: 'Social Studies',
          assessment: 'Weekly test 4',
          average: 75,
          teacher: 'Grace Achieng',
          maxScore: 40,
        },
        'Draft',
      ),
    ],
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
    rows: [
      row(
        'EXP-01',
        'Fuel · school van',
        { category: 'Transport', amount: 180000, paidOn: '2026-11-10', payee: 'Shell Ntinda' },
        'Paid',
      ),
      row(
        'EXP-02',
        'Chalk & exercise books',
        { category: 'Teaching materials', amount: 420000, paidOn: '2026-11-08', payee: 'Mukwano Stationery' },
        'Paid',
      ),
      row(
        'EXP-03',
        'Clinic supplies',
        { category: 'Health', amount: 95000, paidOn: '2026-11-12', payee: 'City Pharmacy' },
        'Pending',
      ),
      row(
        'EXP-04',
        'Electricity · Umeme',
        { category: 'Utilities', amount: 780000, paidOn: '2026-11-01', payee: 'Umeme' },
        'Paid',
      ),
    ],
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
    rows: [
      row(
        'HST-01',
        'Daniel Ssekandi',
        {
          studentId: 'STU-1004',
          dorm: 'Gold House',
          bed: 'B-12',
          houseParent: 'Mrs Nabirye',
          weekendLeave: 'None',
        },
        'Resident',
      ),
      row(
        'HST-02',
        'Omar Kato',
        {
          studentId: 'STU-1008',
          dorm: 'Blue House',
          bed: 'A-04',
          houseParent: 'Mr Ssempijja',
          weekendLeave: 'Weekend · approved',
        },
        'Weekend leave',
      ),
      row(
        'HST-03',
        'Nora Achieng',
        {
          studentId: 'STU-1007',
          dorm: 'Red House',
          bed: 'C-08',
          houseParent: 'Mrs Nabirye',
          weekendLeave: 'None',
        },
        'Resident',
      ),
    ],
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
    rows: [
      row(
        'PAYR-01',
        'Grace Achieng',
        {
          month: 'October 2026',
          gross: 1200000,
          paye: 120000,
          nssf: 60000,
          net: 1020000,
          title: 'Class teacher',
        },
        'Paid',
      ),
      row(
        'PAYR-02',
        'Peter Okello',
        {
          month: 'October 2026',
          gross: 1350000,
          paye: 145000,
          nssf: 67500,
          net: 1137500,
          title: 'Senior teacher',
        },
        'Paid',
      ),
      row(
        'PAYR-03',
        'Rebecca Namuli',
        {
          month: 'November 2026',
          gross: 1100000,
          paye: 100000,
          nssf: 55000,
          net: 945000,
          title: 'Accounts',
        },
        'Draft',
      ),
    ],
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
    rows: [
      row(
        'LV-01',
        'Grace Achieng',
        {
          leaveType: 'Annual',
          fromDate: '2026-12-08',
          toDate: '2026-12-12',
          days: 5,
          reason: 'Family travel',
        },
        'Approved',
      ),
      row(
        'LV-02',
        'Peter Okello',
        {
          leaveType: 'Sick',
          fromDate: '2026-11-14',
          toDate: '2026-11-15',
          days: 2,
          reason: 'Clinic appointment',
        },
        'Pending',
      ),
      row(
        'LV-03',
        'Mary Nabirye',
        {
          leaveType: 'Maternity',
          fromDate: '2026-12-01',
          toDate: '2027-02-28',
          days: 60,
          reason: 'Maternity leave',
        },
        'Pending',
      ),
    ],
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
