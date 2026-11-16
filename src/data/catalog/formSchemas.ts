import type { ModuleFormSpec } from '@/lib/forms/types'
import { resolveFieldHelp } from '@/lib/forms/fieldHelp'
import {
  gradeSelectOptions,
  sectionSelectOptions,
  STREAM_OPTIONS,
  ugandaClassLevelOptions,
} from '@/data/school/grades'

const sectionOpts = [...sectionSelectOptions]
const classOpts = [...gradeSelectOptions]
const ugandaClassOpts = [...ugandaClassLevelOptions]
const streamOpts = [...STREAM_OPTIONS]
const relationOpts = [
  { label: 'Mother', value: 'Mother' },
  { label: 'Father', value: 'Father' },
  { label: 'Guardian', value: 'Guardian' },
  { label: 'Other', value: 'Other' },
]
const genderOpts = [
  { label: 'Female', value: 'Female' },
  { label: 'Male', value: 'Male' },
  { label: 'Other', value: 'Other' },
]
const religionOpts = [
  { label: 'Christian', value: 'Christian' },
  { label: 'Catholic', value: 'Catholic' },
  { label: 'Anglican / Protestant', value: 'Anglican' },
  { label: 'Pentecostal', value: 'Pentecostal' },
  { label: 'Muslim', value: 'Muslim' },
  { label: 'Seventh-day Adventist', value: 'SDA' },
  { label: 'Traditional', value: 'Traditional' },
  { label: 'Other', value: 'Other' },
]
const tribeOpts = [
  { label: 'Baganda', value: 'Baganda' },
  { label: 'Basoga', value: 'Basoga' },
  { label: 'Banyankole', value: 'Banyankole' },
  { label: 'Bakiga', value: 'Bakiga' },
  { label: 'Batooro', value: 'Batooro' },
  { label: 'Banyoro', value: 'Banyoro' },
  { label: 'Acholi', value: 'Acholi' },
  { label: 'Lango', value: 'Lango' },
  { label: 'Iteso', value: 'Iteso' },
  { label: 'Lugbara', value: 'Lugbara' },
  { label: 'Jopadhola', value: 'Jopadhola' },
  { label: 'Bagisu', value: 'Bagisu' },
  { label: 'Bafumbira', value: 'Bafumbira' },
  { label: 'Alur', value: 'Alur' },
  { label: 'Other', value: 'Other' },
]
const yesNo = [
  { label: 'Yes', value: 'Yes' },
  { label: 'No', value: 'No' },
]

/** Spec-aligned create/edit forms. Shared create+edit. */
export const formSchemas: Record<string, ModuleFormSpec> = {
  students: {
    module: 'students',
    title: 'Register Student',
    singular: 'Student',
    draft: true,
    sections: [
      {
        title: 'Personal information',
        fields: [
          { name: 'firstName', label: 'First name', type: 'text', required: true },
          { name: 'lastName', label: 'Last name', type: 'text', required: true },
          { name: 'otherNames', label: 'Other names', type: 'text' },
          { name: 'name', label: 'Full name', type: 'readonly', auto: true, help: 'Built from first and last name' },
          { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', required: true, options: genderOpts },
          { name: 'placeOfBirth', label: 'Place of birth', type: 'text' },
          { name: 'nationality', label: 'Nationality', type: 'text', placeholder: 'Ugandan' },
          {
            name: 'tribe',
            label: 'Tribe',
            type: 'select',
            options: tribeOpts,
          },
          {
            name: 'religion',
            label: 'Religion',
            type: 'select',
            options: religionOpts,
          },
          { name: 'homeLanguage', label: 'Home language', type: 'text' },
          { name: 'address', label: 'Residential address', type: 'textarea' },
          {
            name: 'photo',
            label: 'Photograph (ID)',
            type: 'file',
            help: 'Face photo for identification — compressed to WebP and stored on school Drive',
          },
        ],
      },
      {
        title: 'Contact',
        fields: [
          { name: 'phone', label: 'Home phone', type: 'phone' },
          { name: 'email', label: 'Learner email', type: 'email' },
          { name: 'emergencyContact', label: 'Emergency contact', type: 'text', placeholder: 'Name · phone' },
        ],
      },
      {
        title: 'School placement',
        fields: [
          { name: 'program', label: 'Section', type: 'select', required: true, options: sectionOpts },
          { name: 'className', label: 'Class', type: 'select', required: true, options: classOpts },
          { name: 'stream', label: 'Stream', type: 'text', placeholder: 'A / Blue' },
          { name: 'admissionDate', label: 'Admission date', type: 'date', required: true },
          {
            name: 'learnerNumber',
            label: 'Learner number',
            type: 'text',
            placeholder: 'LN-LR26001',
            help: 'EMIS / national learner number',
          },
          {
            name: 'id',
            label: 'Student number',
            type: 'readonly',
            auto: true,
            help: 'School admission number (e.g. LR26001)',
          },
          {
            name: 'schoolPayAccount',
            label: 'School Pay account',
            type: 'text',
            placeholder: 'LR-0001',
            help: 'School Pay code for fee payments (MTN / Airtel)',
          },
          { name: 'status', label: 'Status', type: 'readonly', auto: true },
        ],
      },
      {
        title: 'Parent / Guardian',
        fields: [
          {
            name: 'parentId',
            label: 'Existing parent',
            type: 'select',
            optionsFrom: 'guardians',
            optionsValue: 'id',
            help: 'Select a registered parent — do not retype family details',
          },
          { name: 'relationship', label: 'Relationship', type: 'select', options: relationOpts },
        ],
      },
      {
        title: 'Health & notes',
        fields: [
          { name: 'bloodGroup', label: 'Blood group', type: 'text' },
          { name: 'medicalAlerts', label: 'Medical alerts', type: 'textarea', placeholder: 'Allergies or health alerts' },
          { name: 'specialNeeds', label: 'Special needs', type: 'textarea' },
          { name: 'dietaryNotes', label: 'Dietary notes', type: 'textarea' },
          { name: 'previousSchool', label: 'Previous school', type: 'text' },
          { name: 'documents', label: 'Supporting documents', type: 'file' },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
        ],
      },
    ],
  },

  guardians: {
    module: 'guardians',
    title: 'Register Parent',
    singular: 'Parent',
    sections: [
      {
        title: 'Profile',
        fields: [
          { name: 'name', label: 'Full name', type: 'text', required: true },
          { name: 'photo', label: 'Photograph (ID)', type: 'file', help: 'Face photo for identification' },
          { name: 'relationship', label: 'Relationship', type: 'select', required: true, options: relationOpts },
          { name: 'phone', label: 'Phone number', type: 'phone', required: true },
          { name: 'altPhone', label: 'Alternative phone', type: 'phone' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'occupation', label: 'Occupation', type: 'text' },
          { name: 'address', label: 'Address', type: 'textarea' },
          { name: 'authorizedPickup', label: 'Authorized pickup', type: 'checkbox' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  parents: {
    module: 'parents',
    title: 'Register Parent',
    singular: 'Parent',
    sections: [
      {
        title: 'Profile',
        fields: [
          { name: 'name', label: 'Full name', type: 'text', required: true },
          { name: 'photo', label: 'Photograph (ID)', type: 'file', help: 'Face photo for identification' },
          { name: 'relationship', label: 'Relationship', type: 'select', options: relationOpts },
          { name: 'phone', label: 'Phone number', type: 'phone', required: true },
          { name: 'altPhone', label: 'Alternative phone', type: 'phone' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'occupation', label: 'Occupation', type: 'text' },
          { name: 'address', label: 'Address', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  users: {
    module: 'users',
    title: 'Add desk user',
    singular: 'User',
    sections: [
      {
        title: 'Profile',
        fields: [
          { name: 'name', label: 'Full name', type: 'text', required: true },
          { name: 'photo', label: 'Photograph (ID)', type: 'file', help: 'Face photo for identification' },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone', type: 'phone' },
          { name: 'title', label: 'Job title', type: 'text' },
          { name: 'department', label: 'Department', type: 'text' },
          { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Active', value: 'Active' },
            { label: 'Invited', value: 'Invited' },
            { label: 'Disabled', value: 'Disabled' },
          ] },
        ],
      },
    ],
  },

  staff: {
    module: 'staff',
    title: 'Add Staff',
    singular: 'Staff member',
    draft: true,
    sections: [
      {
        title: 'Personal biodata',
        fields: [
          { name: 'firstName', label: 'First name', type: 'text', required: true },
          { name: 'lastName', label: 'Last name', type: 'text', required: true },
          { name: 'otherNames', label: 'Other names', type: 'text' },
          { name: 'name', label: 'Full name', type: 'readonly', auto: true, help: 'Built from first and last name' },
          { name: 'gender', label: 'Gender', type: 'select', required: true, options: genderOpts },
          { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
          { name: 'nationality', label: 'Nationality', type: 'text', placeholder: 'Ugandan' },
          { name: 'nationalId', label: 'National ID / NIN', type: 'text' },
          {
            name: 'maritalStatus',
            label: 'Marital status',
            type: 'select',
            options: [
              { label: 'Single', value: 'Single' },
              { label: 'Married', value: 'Married' },
              { label: 'Other', value: 'Other' },
            ],
          },
          { name: 'languages', label: 'Languages spoken', type: 'text' },
          { name: 'address', label: 'Residential address', type: 'textarea' },
          {
            name: 'photo',
            label: 'Photograph (ID)',
            type: 'file',
            help: 'Face photo for identification',
          },
        ],
      },
      {
        title: 'Contact',
        fields: [
          { name: 'phone', label: 'Phone', type: 'phone', required: true },
          { name: 'altPhone', label: 'Alternative phone', type: 'phone' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'emergencyContact', label: 'Emergency contact', type: 'text', placeholder: 'Name · phone' },
        ],
      },
      {
        title: 'Employment',
        fields: [
          { name: 'id', label: 'Employee number', type: 'readonly', auto: true },
          { name: 'jobTitle', label: 'Job title', type: 'text', required: true },
          { name: 'department', label: 'Department', type: 'select', required: true, optionsFrom: 'departments' },
          {
            name: 'employmentType',
            label: 'Employment type',
            type: 'select',
            options: [
              { label: 'Permanent', value: 'Permanent' },
              { label: 'Contract', value: 'Contract' },
              { label: 'Temporary', value: 'Temporary' },
            ],
          },
          { name: 'startDate', label: 'Start date', type: 'date', required: true },
          { name: 'yearsExperience', label: 'Years of experience', type: 'number' },
          { name: 'qualification', label: 'Highest qualification', type: 'text', required: true },
          { name: 'additionalQualifications', label: 'Additional qualifications', type: 'textarea' },
          { name: 'salary', label: 'Salary', type: 'currency', help: 'Restricted — payroll only' },
          { name: 'documents', label: 'Documents', type: 'file' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'On Leave', value: 'On Leave' },
              { label: 'Inactive', value: 'Inactive' },
            ],
          },
        ],
      },
      {
        title: 'Health',
        fields: [
          { name: 'bloodGroup', label: 'Blood group', type: 'text' },
          { name: 'medicalAlerts', label: 'Medical alerts', type: 'textarea' },
          { name: 'bio', label: 'Short bio', type: 'textarea' },
        ],
      },
    ],
  },

  teachers: {
    module: 'teachers',
    title: 'Register Teacher',
    singular: 'Teacher',
    draft: true,
    sections: [
      {
        title: 'Personal biodata',
        fields: [
          { name: 'firstName', label: 'First name', type: 'text', required: true },
          { name: 'lastName', label: 'Last name', type: 'text', required: true },
          { name: 'otherNames', label: 'Other names', type: 'text' },
          { name: 'name', label: 'Full name', type: 'readonly', auto: true, help: 'Built from first and last name' },
          { name: 'gender', label: 'Gender', type: 'select', required: true, options: genderOpts },
          { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
          { name: 'nationality', label: 'Nationality', type: 'text', placeholder: 'Ugandan' },
          { name: 'nationalId', label: 'National ID / NIN', type: 'text' },
          { name: 'maritalStatus', label: 'Marital status', type: 'select', options: [
            { label: 'Single', value: 'Single' },
            { label: 'Married', value: 'Married' },
            { label: 'Other', value: 'Other' },
          ] },
          { name: 'languages', label: 'Languages spoken', type: 'text' },
          { name: 'address', label: 'Residential address', type: 'textarea' },
          {
            name: 'photo',
            label: 'Photograph (ID)',
            type: 'file',
            help: 'Face photo for identification',
          },
        ],
      },
      {
        title: 'Contact',
        fields: [
          { name: 'phone', label: 'Phone', type: 'phone', required: true },
          { name: 'altPhone', label: 'Alternative phone', type: 'phone' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'emergencyContact', label: 'Emergency contact', type: 'text', placeholder: 'Name · phone' },
        ],
      },
      {
        title: 'Employment & teaching',
        fields: [
          { name: 'employeeNumber', label: 'Staff number', type: 'readonly', auto: true },
          { name: 'jobTitle', label: 'Job title', type: 'text', required: true },
          { name: 'department', label: 'Section', type: 'select', required: true, options: sectionOpts },
          { name: 'subject', label: 'Main subject / learning area', type: 'text', required: true },
          {
            name: 'employmentType',
            label: 'Employment type',
            type: 'select',
            options: [
              { label: 'Permanent', value: 'Permanent' },
              { label: 'Contract', value: 'Contract' },
              { label: 'Temporary', value: 'Temporary' },
            ],
          },
          { name: 'startDate', label: 'Start date', type: 'date', required: true },
          { name: 'yearsExperience', label: 'Years of experience', type: 'number' },
          { name: 'qualification', label: 'Highest qualification', type: 'text', required: true },
          { name: 'additionalQualifications', label: 'Additional qualifications', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Active', value: 'Active' },
            { label: 'On Leave', value: 'On Leave' },
            { label: 'Inactive', value: 'Inactive' },
          ] },
        ],
      },
      {
        title: 'Health & notes',
        fields: [
          { name: 'bloodGroup', label: 'Blood group', type: 'text' },
          { name: 'medicalAlerts', label: 'Medical alerts', type: 'textarea' },
          { name: 'bio', label: 'Professional summary', type: 'textarea' },
          { name: 'documents', label: 'Supporting documents', type: 'file' },
          { name: 'subtitle', label: 'Internal notes', type: 'textarea' },
        ],
      },
    ],
  },

  applicants: {
    module: 'applicants',
    title: 'New Application',
    singular: 'Application',
    draft: true,
    sections: [
      {
        title: 'Applicant',
        fields: [
          { name: 'firstName', label: 'Applicant first name', type: 'text', required: true },
          { name: 'lastName', label: 'Applicant last name', type: 'text', required: true },
          { name: 'name', label: 'Full name', type: 'readonly', auto: true },
          { name: 'photo', label: 'Photograph (ID)', type: 'file', help: 'Face photo for identification' },
          { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', required: true, options: genderOpts },
          { name: 'program', label: 'Applying section', type: 'select', required: true, options: sectionOpts },
          { name: 'className', label: 'Applying class', type: 'select', required: true, options: classOpts },
          { name: 'previousSchool', label: 'Previous school', type: 'text' },
        ],
      },
      {
        title: 'Parent contact',
        fields: [
          { name: 'parentName', label: 'Parent name', type: 'text', required: true },
          { name: 'parentPhone', label: 'Parent phone', type: 'phone', required: true },
          { name: 'parentEmail', label: 'Parent email', type: 'email' },
          { name: 'documents', label: 'Documents', type: 'file' },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'readonly', auto: true },
        ],
      },
    ],
  },

  admissions: {
    module: 'admissions',
    title: 'New Admission',
    singular: 'Admission',
    sections: [
      {
        title: 'Learner',
        fields: [
          { name: 'name', label: 'Learner full name', type: 'text', required: true },
          { name: 'photo', label: 'Photograph (ID)', type: 'file', help: 'Face photo for identification' },
          { name: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
          { name: 'gender', label: 'Gender', type: 'select', required: true, options: genderOpts },
          { name: 'program', label: 'Section', type: 'select', required: true, options: sectionOpts },
          { name: 'className', label: 'Class', type: 'select', required: true, options: classOpts },
          { name: 'previousSchool', label: 'Previous school', type: 'text' },
          { name: 'application', label: 'Application ref', type: 'text' },
        ],
      },
      {
        title: 'Parent / guardian',
        fields: [
          { name: 'parentName', label: 'Parent name', type: 'text', required: true },
          { name: 'parentPhone', label: 'Parent phone', type: 'phone', required: true },
          { name: 'parentEmail', label: 'Parent email', type: 'email' },
        ],
      },
      {
        title: 'Admission',
        fields: [
          { name: 'term', label: 'Term', type: 'text', required: true },
          { name: 'admissionDate', label: 'Admission date', type: 'date', required: true },
          { name: 'reportingDate', label: 'Reporting date', type: 'date' },
          {
            name: 'fee',
            label: 'Admission fee',
            type: 'select',
            required: true,
            options: [
              { label: 'Unpaid', value: 'Unpaid' },
              { label: 'Partial', value: 'Partial' },
              { label: 'Paid', value: 'Paid' },
            ],
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            options: [
              { label: 'Pending', value: 'Pending' },
              { label: 'Admitted', value: 'Admitted' },
              { label: 'Withdrawn', value: 'Withdrawn' },
            ],
          },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
        ],
      },
    ],
  },

  'academic-years': {
    module: 'academic-years',
    title: 'Create Academic Year',
    singular: 'Academic year',
    sections: [
      {
        title: 'Year',
        fields: [
          { name: 'name', label: 'Year name', type: 'text', required: true, placeholder: '2027' },
          { name: 'startDate', label: 'Start date', type: 'date', required: true },
          { name: 'endDate', label: 'End date', type: 'date', required: true },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            options: [
              { label: 'Planned', value: 'Planned' },
              { label: 'Active', value: 'Active' },
              { label: 'Closed', value: 'Closed' },
            ],
          },
          { name: 'subtitle', label: 'Description', type: 'textarea' },
        ],
      },
    ],
  },

  'nursery-activities': {
    module: 'nursery-activities',
    title: 'Create Activity',
    singular: 'Activity',
    sections: [
      {
        title: 'Activity',
        fields: [
          { name: 'name', label: 'Activity title', type: 'text', required: true },
          {
            name: 'learningArea',
            label: 'Learning area',
            type: 'select',
            required: true,
            options: [
              { label: 'Language', value: 'Language' },
              { label: 'Numeracy', value: 'Numeracy' },
              { label: 'Physical', value: 'Physical' },
              { label: 'Social and Emotional', value: 'Social and Emotional' },
              { label: 'Creative', value: 'Creative' },
              { label: 'Environmental Awareness', value: 'Environmental Awareness' },
              { label: 'Life Skills', value: 'Life Skills' },
            ],
          },
          { name: 'className', label: 'Applicable class', type: 'select', required: true, options: classOpts.filter((o) => ['Baby Class', 'Middle Class', 'Top Class'].includes(o.value)) },
          { name: 'subtitle', label: 'Description', type: 'textarea', required: true },
          { name: 'materials', label: 'Materials needed', type: 'textarea' },
          { name: 'duration', label: 'Duration (minutes)', type: 'number' },
          { name: 'activityDate', label: 'Activity date', type: 'date' },
          { name: 'teacher', label: 'Teacher', type: 'select', optionsFrom: 'teachers' },
          { name: 'expectedOutcome', label: 'Expected outcome', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Planned', value: 'Planned' }, { label: 'Completed', value: 'Completed' }] },
        ],
      },
    ],
  },

  'nursery-observations': {
    module: 'nursery-observations',
    title: 'Teacher Observation',
    singular: 'Observation',
    sections: [
      {
        title: 'Observation',
        fields: [
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'name', label: 'Summary title', type: 'text', required: true },
          {
            name: 'learningArea',
            label: 'Learning area',
            type: 'select',
            required: true,
            options: [
              { label: 'Language', value: 'Language' },
              { label: 'Numeracy', value: 'Numeracy' },
              { label: 'Physical', value: 'Physical' },
              { label: 'Social and Emotional', value: 'Social and Emotional' },
              { label: 'Creative', value: 'Creative' },
            ],
          },
          { name: 'observationDate', label: 'Observation date', type: 'date', required: true },
          { name: 'subtitle', label: 'Observation', type: 'textarea', required: true },
          {
            name: 'progressLevel',
            label: 'Progress level',
            type: 'select',
            required: true,
            options: [
              { label: 'Emerging', value: 'Emerging' },
              { label: 'Developing', value: 'Developing' },
              { label: 'Achieved', value: 'Achieved' },
            ],
          },
          { name: 'recommendation', label: 'Teacher recommendation', type: 'textarea' },
          { name: 'evidence', label: 'Evidence', type: 'file' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Recorded', value: 'Recorded' }, { label: 'Reviewed', value: 'Reviewed' }] },
        ],
      },
    ],
  },

  'meals-menus': {
    module: 'meals-menus',
    title: 'Create Weekly Menu',
    singular: 'Menu',
    sections: [
      {
        title: 'Menu',
        fields: [
          { name: 'name', label: 'Menu name', type: 'text', required: true },
          { name: 'weekStarting', label: 'Week starting', type: 'date', required: true },
          { name: 'program', label: 'Applicable section', type: 'select', options: [...sectionOpts, { label: 'All', value: 'All' }] },
          {
            name: 'day',
            label: 'Day',
            type: 'select',
            required: true,
            options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => ({ label: d, value: d })),
          },
          {
            name: 'mealType',
            label: 'Meal type',
            type: 'select',
            required: true,
            options: [
              { label: 'Breakfast', value: 'Breakfast' },
              { label: 'Lunch', value: 'Lunch' },
              { label: 'Snack', value: 'Snack' },
            ],
          },
          { name: 'subtitle', label: 'Meal description', type: 'textarea', required: true },
          { name: 'ingredients', label: 'Ingredients', type: 'textarea' },
          { name: 'dietaryNotes', label: 'Dietary notes', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Draft', value: 'Draft' }] },
        ],
      },
    ],
  },

  invoices: {
    module: 'invoices',
    title: 'Create Invoice',
    singular: 'Invoice',
    sections: [
      {
        title: 'Invoice',
        fields: [
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'name', label: 'Invoice title', type: 'text', required: true },
          { name: 'feeStructure', label: 'Fee structure', type: 'select', required: true, optionsFrom: 'fee-structures' },
          { name: 'invoiceDate', label: 'Invoice date', type: 'date' },
          { name: 'dueDate', label: 'Due date', type: 'date', required: true },
          { name: 'amount', label: 'Amount payable', type: 'currency', help: 'Calculated from fee structure when wired' },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Unpaid', value: 'Unpaid' }, { label: 'Partial', value: 'Partial' }, { label: 'Paid', value: 'Paid' }] },
        ],
      },
    ],
  },

  'academic-terms': {
    module: 'academic-terms',
    title: 'Create Term',
    singular: 'Term',
    sections: [
      {
        title: 'Term',
        description: 'Always link a term to its academic year (prefer Years & terms desk).',
        fields: [
          { name: 'year', label: 'Academic year', type: 'select', required: true, optionsFrom: 'academic-years' },
          {
            name: 'name',
            label: 'Term name',
            type: 'select',
            required: true,
            options: [
              { label: 'Term I', value: 'Term I' },
              { label: 'Term II', value: 'Term II' },
              { label: 'Term III', value: 'Term III' },
            ],
          },
          { name: 'start', label: 'Start date', type: 'date', required: true },
          { name: 'end', label: 'End date', type: 'date', required: true },
          { name: 'openingDay', label: 'Opening day', type: 'date' },
          { name: 'closingDay', label: 'Closing day', type: 'date' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Planned', value: 'Planned' },
              { label: 'Open', value: 'Open' },
              { label: 'Closed', value: 'Closed' },
            ],
          },
        ],
      },
    ],
  },

  classes: {
    module: 'classes',
    title: 'Create Class',
    singular: 'Class',
    sections: [
      {
        title: 'Class',
        description:
          'Uganda education ladder — Nursery (Baby · Middle · Top) and Primary (P.1–P.7).',
        fields: [
          {
            name: 'grade',
            label: 'Class level',
            type: 'select',
            required: true,
            options: ugandaClassOpts,
            help: 'Baby Class → Top Class, then P.1 through P.7',
          },
          {
            name: 'stream',
            label: 'Stream (optional)',
            type: 'select',
            options: streamOpts,
            help: 'e.g. A / B or colour stream for parallel classes',
          },
          {
            name: 'name',
            label: 'Class name',
            type: 'readonly',
            auto: true,
            help: 'Built from class level + stream',
          },
          {
            name: 'program',
            label: 'Section',
            type: 'readonly',
            auto: true,
            help: 'Nursery or Primary — set from the class level',
          },
          { name: 'capacity', label: 'Capacity', type: 'number' },
          { name: 'teacher', label: 'Class teacher', type: 'select', optionsFrom: 'staff' },
          { name: 'year', label: 'Academic year', type: 'select', optionsFrom: 'academic-years' },
          {
            name: 'room',
            label: 'Classroom',
            type: 'text',
            placeholder: 'e.g. Block A · 1, Nursery 1',
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Inactive', value: 'Inactive' },
            ],
          },
        ],
      },
    ],
  },

  courses: {
    module: 'courses',
    title: 'Create Subject',
    singular: 'Subject',
    sections: [
      {
        title: 'Subject',
        fields: [
          { name: 'name', label: 'Subject name', type: 'text', required: true },
          { name: 'code', label: 'Subject code', type: 'text' },
          { name: 'program', label: 'Section', type: 'select', required: true, options: sectionOpts },
          { name: 'subtitle', label: 'Description', type: 'textarea' },
          {
            name: 'assessmentType',
            label: 'Assessment type',
            type: 'select',
            options: [
              { label: 'Marks', value: 'Marks' },
              { label: 'Competency', value: 'Competency' },
              { label: 'Observation', value: 'Observation' },
            ],
          },
          { name: 'instructor', label: 'Teacher', type: 'select', optionsFrom: 'staff' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  periods: {
    module: 'periods',
    title: 'Create Period',
    singular: 'Period',
    sections: [
      {
        title: 'Period',
        fields: [
          { name: 'name', label: 'Period name', type: 'text', required: true },
          { name: 'startTime', label: 'Start time', type: 'time', required: true },
          { name: 'endTime', label: 'End time', type: 'time', required: true },
          {
            name: 'periodType',
            label: 'Period type',
            type: 'select',
            required: true,
            options: [
              { label: 'Lesson', value: 'Lesson' },
              { label: 'Break', value: 'Break' },
              { label: 'Lunch', value: 'Lunch' },
              { label: 'Assembly', value: 'Assembly' },
            ],
          },
          { name: 'sequence', label: 'Sequence', type: 'number', required: true },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  timetable: {
    module: 'timetable',
    title: 'Allocate Lesson',
    singular: 'Timetable slot',
    sections: [
      {
        title: 'Lesson allocation',
        fields: [
          {
            name: 'year',
            label: 'Academic year',
            type: 'select',
            optionsFrom: 'academic-years',
          },
          {
            name: 'term',
            label: 'Term',
            type: 'select',
            optionsFrom: 'academic-terms',
          },
          {
            name: 'group',
            label: 'Class',
            type: 'select',
            required: true,
            optionsFrom: 'classes',
            help: 'From Classes list',
          },
          { name: 'stream', label: 'Stream', type: 'text' },
          {
            name: 'day',
            label: 'Day',
            type: 'select',
            required: true,
            options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(
              (d) => ({
                label: d,
                value: d,
              }),
            ),
          },
          {
            name: 'name',
            label: 'Period',
            type: 'select',
            required: true,
            optionsFrom: 'periods',
          },
          {
            name: 'course',
            label: 'Subject',
            type: 'select',
            required: true,
            optionsFrom: 'courses',
            help: 'From Subjects list',
          },
          {
            name: 'teacher',
            label: 'Teacher',
            type: 'select',
            required: true,
            optionsFrom: 'teachers',
          },
          {
            name: 'room',
            label: 'Room',
            type: 'text',
            placeholder: 'e.g. Block B · 5, Lab, Hall',
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Scheduled', value: 'Scheduled' },
              { label: 'Draft', value: 'Draft' },
            ],
          },
        ],
      },
    ],
  },

  exams: {
    module: 'exams',
    title: 'Create class examination',
    singular: 'Examination',
    sections: [
      {
        title: 'Examination',
        fields: [
          {
            name: 'name',
            label: 'Examination name',
            type: 'text',
            required: true,
            placeholder: 'e.g. Term III MOT · Mathematics',
          },
          {
            name: 'className',
            label: 'Class',
            type: 'select',
            optionsFrom: 'classes',
            required: true,
            help: 'From Classes list',
          },
          {
            name: 'course',
            label: 'Subject',
            type: 'select',
            optionsFrom: 'courses',
            required: true,
            help: 'From Subjects list',
          },
          {
            name: 'type',
            label: 'Assessment type',
            type: 'select',
            required: true,
            options: [
              { label: 'BOT · Beginning of term', value: 'BOT' },
              { label: 'MOT · Mid of term', value: 'MOT' },
              { label: 'EOT · End of term', value: 'EOT' },
              { label: 'Weekly CA', value: 'Weekly CA' },
              { label: 'Class test', value: 'Class test' },
              { label: 'PLE mock', value: 'PLE mock' },
            ],
          },
          {
            name: 'program',
            label: 'Section',
            type: 'select',
            required: true,
            options: sectionOpts,
          },
          {
            name: 'maxScore',
            label: 'Maximum marks',
            type: 'number',
            required: true,
            help: 'Usually 100 for primary; lower for nursery checklists',
          },
          { name: 'date', label: 'Exam date', type: 'date', required: true },
          {
            name: 'year',
            label: 'Academic year',
            type: 'select',
            optionsFrom: 'academic-years',
          },
          {
            name: 'term',
            label: 'Term',
            type: 'select',
            optionsFrom: 'academic-terms',
          },
          { name: 'subtitle', label: 'Notes for teachers', type: 'textarea' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Scheduled', value: 'Scheduled' },
              { label: 'Open (ready for marks)', value: 'Open' },
              { label: 'Closed', value: 'Closed' },
            ],
          },
        ],
      },
    ],
  },

  homework: {
    module: 'homework',
    title: 'Create Assignment',
    singular: 'Assignment',
    draft: true,
    sections: [
      {
        title: 'Assignment',
        fields: [
          { name: 'name', label: 'Title', type: 'text', required: true },
          { name: 'program', label: 'Section', type: 'select', required: true, options: sectionOpts },
          { name: 'className', label: 'Class', type: 'select', required: true, options: classOpts },
          { name: 'course', label: 'Subject / Learning area', type: 'select', optionsFrom: 'courses' },
          { name: 'subtitle', label: 'Instructions', type: 'textarea', required: true },
          { name: 'attachment', label: 'Attachment', type: 'file' },
          { name: 'assignedDate', label: 'Assigned date', type: 'date', required: true },
          { name: 'dueDate', label: 'Due date', type: 'date' },
          { name: 'maxScore', label: 'Maximum marks', type: 'number', help: 'Primary assessment only' },
          {
            name: 'submissionType',
            label: 'Submission type',
            type: 'select',
            options: [
              { label: 'Physical', value: 'Physical' },
              { label: 'Online', value: 'Online' },
              { label: 'Activity', value: 'Activity' },
            ],
          },
          { name: 'parentVisibility', label: 'Parent visibility', type: 'toggle' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Draft', value: 'Draft' }, { label: 'Assigned', value: 'Assigned' }, { label: 'Closed', value: 'Closed' }] },
        ],
      },
    ],
  },

  'lesson-plans': {
    module: 'lesson-plans',
    title: 'Create Lesson Plan',
    singular: 'Lesson plan',
    sections: [
      {
        title: 'Lesson plan',
        fields: [
          { name: 'name', label: 'Lesson title', type: 'text', required: true },
          { name: 'className', label: 'Class', type: 'select', required: true, options: classOpts },
          {
            name: 'program',
            label: 'Section',
            type: 'select',
            options: [
              { label: 'Nursery', value: 'Nursery' },
              { label: 'Primary', value: 'Primary' },
            ],
          },
          { name: 'subject', label: 'Subject', type: 'text', required: true },
          { name: 'teacher', label: 'Teacher', type: 'select', required: true, optionsFrom: 'teachers' },
          { name: 'week', label: 'Week', type: 'text', required: true, help: 'e.g. Week 8' },
          { name: 'lessonDate', label: 'Lesson date', type: 'date', required: true },
          { name: 'scheme', label: 'Scheme of work', type: 'select', optionsFrom: 'schemes-of-work' },
          { name: 'period', label: 'Period', type: 'select', optionsFrom: 'periods' },
          { name: 'duration', label: 'Lesson duration (minutes)', type: 'number' },
          { name: 'objectives', label: 'Lesson objectives', type: 'textarea', required: true },
          { name: 'subtitle', label: 'Teaching activities', type: 'textarea', required: true },
          { name: 'materials', label: 'Teaching materials', type: 'textarea' },
          { name: 'assessment', label: 'Assessment approach', type: 'textarea' },
          { name: 'reflection', label: 'Teacher reflection', type: 'textarea', help: 'Complete after the lesson' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Submitted', value: 'Submitted' },
              { label: 'Approved', value: 'Approved' },
              { label: 'Taught', value: 'Taught' },
            ],
          },
        ],
      },
    ],
  },

  'schemes-of-work': {
    module: 'schemes-of-work',
    title: 'Create Scheme of Work',
    singular: 'Scheme of work',
    sections: [
      {
        title: 'Scheme of work',
        fields: [
          { name: 'year', label: 'Academic year', type: 'select', required: true, optionsFrom: 'academic-years' },
          { name: 'term', label: 'Term', type: 'select', required: true, optionsFrom: 'academic-terms' },
          { name: 'className', label: 'Class', type: 'select', required: true, options: classOpts },
          { name: 'course', label: 'Subject', type: 'select', required: true, optionsFrom: 'courses' },
          { name: 'teacher', label: 'Teacher', type: 'select', required: true, optionsFrom: 'staff' },
          {
            name: 'topic',
            label: 'Study coverage unit',
            type: 'select',
            required: true,
            optionsFrom: 'study-coverage',
          },
          { name: 'subtopic', label: 'Subtopic / week focus', type: 'text' },
          { name: 'week', label: 'Week number', type: 'number', required: true },
          { name: 'name', label: 'Title', type: 'text', required: true },
          { name: 'objectives', label: 'Objectives', type: 'textarea', required: true },
          { name: 'resources', label: 'Resources', type: 'textarea' },
          {
            name: 'assessmentMethod',
            label: 'Assessment method',
            type: 'select',
            options: [
              { label: 'Oral', value: 'Oral' },
              { label: 'Written', value: 'Written' },
              { label: 'Practical', value: 'Practical' },
              { label: 'Observation', value: 'Observation' },
            ],
          },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Draft', value: 'Draft' }, { label: 'Approved', value: 'Approved' }] },
        ],
      },
    ],
  },

  'fee-structures': {
    module: 'fee-structures',
    title: 'Create Fee Structure',
    singular: 'Fee structure',
    sections: [
      {
        title: 'Fee structure',
        fields: [
          { name: 'name', label: 'Structure name', type: 'text', required: true },
          { name: 'program', label: 'Section', type: 'select', required: true, options: sectionOpts },
          { name: 'year', label: 'Academic year', type: 'select', required: true, optionsFrom: 'academic-years' },
          { name: 'term', label: 'Term', type: 'select', optionsFrom: 'academic-terms' },
          { name: 'amount', label: 'Base amount', type: 'currency', required: true },
          { name: 'deadline', label: 'Payment deadline', type: 'date' },
          { name: 'subtitle', label: 'Fee items notes', type: 'textarea', help: 'Tuition, registration, meals, transport…' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  payments: {
    module: 'payments',
    title: 'Record Payment',
    singular: 'Payment',
    sections: [
      {
        title: 'Payment',
        fields: [
          { name: 'invoice', label: 'Invoice', type: 'select', required: true, optionsFrom: 'invoices' },
          { name: 'name', label: 'Payment label', type: 'text', required: true },
          { name: 'amount', label: 'Amount', type: 'currency', required: true },
          { name: 'paidOn', label: 'Payment date', type: 'date', required: true },
          {
            name: 'method',
            label: 'Payment method',
            type: 'select',
            required: true,
            options: [
              { label: 'Cash', value: 'Cash' },
              { label: 'Bank', value: 'Bank' },
              { label: 'Mobile money', value: 'Mobile money' },
            ],
          },
          { name: 'reference', label: 'Transaction reference', type: 'text' },
          { name: 'receivedBy', label: 'Received by', type: 'readonly', auto: true },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Recorded', value: 'Recorded' }, { label: 'Reversed', value: 'Reversed' }] },
        ],
      },
    ],
  },

  refunds: {
    module: 'refunds',
    title: 'Record Refund',
    singular: 'Refund',
    sections: [
      {
        title: 'Refund',
        fields: [
          { name: 'payment', label: 'Original payment', type: 'select', required: true, optionsFrom: 'payments' },
          { name: 'name', label: 'Refund title', type: 'text', required: true },
          { name: 'amount', label: 'Refund amount', type: 'currency', required: true },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Pending', value: 'Pending' }, { label: 'Approved', value: 'Approved' }, { label: 'Paid', value: 'Paid' }] },
        ],
      },
    ],
  },

  'fee-offsets': {
    module: 'fee-offsets',
    title: 'Record Fee Offset',
    singular: 'Fee offset',
    sections: [
      {
        title: 'Fee offset',
        fields: [
          { name: 'name', label: 'Offset title', type: 'text', required: true },
          { name: 'learner', label: 'Learner', type: 'text', required: true },
          { name: 'className', label: 'Last class', type: 'select', options: classOpts },
          { name: 'invoice', label: 'Invoice', type: 'text' },
          { name: 'amount', label: 'Offset amount', type: 'text', required: true },
          {
            name: 'exitReason',
            label: 'Exit reason',
            type: 'select',
            options: [
              { label: 'Withdrawn', value: 'Withdrawn' },
              { label: 'Transferred', value: 'Transferred' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Other', value: 'Other' },
            ],
          },
          { name: 'offsetDate', label: 'Offset date', type: 'date', required: true },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Posted', value: 'Posted' },
              { label: 'Pending', value: 'Pending' },
            ],
          },
        ],
      },
    ],
  },

  scholarships: {
    module: 'scholarships',
    title: 'Create Scholarship',
    singular: 'Scholarship',
    sections: [
      {
        title: 'Scholarship',
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'amount', label: 'Amount / percentage', type: 'text', required: true },
          { name: 'period', label: 'Period', type: 'text' },
          { name: 'subtitle', label: 'Reason', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Ended', value: 'Ended' }] },
        ],
      },
    ],
  },

  discounts: {
    module: 'discounts',
    title: 'Create Discount',
    singular: 'Discount',
    sections: [
      {
        title: 'Discount',
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
          {
            name: 'type',
            label: 'Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Percentage', value: 'Percentage' },
              { label: 'Fixed', value: 'Fixed' },
            ],
          },
          { name: 'value', label: 'Value', type: 'number', required: true },
          { name: 'eligibility', label: 'Eligibility', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Pending', value: 'Pending' }, { label: 'Approved', value: 'Approved' }] },
        ],
      },
    ],
  },

  bursaries: {
    module: 'bursaries',
    title: 'Create Bursary',
    singular: 'Bursary',
    sections: [
      {
        title: 'Bursary',
        fields: [
          { name: 'name', label: 'Title', type: 'text', required: true },
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'fundingSource', label: 'Funding source', type: 'text', required: true },
          { name: 'amount', label: 'Approved amount', type: 'currency', required: true },
          { name: 'period', label: 'Period', type: 'text' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Ended', value: 'Ended' }] },
        ],
      },
    ],
  },

  'library-books': {
    module: 'library-books',
    title: 'Register Book',
    singular: 'Book',
    sections: [
      {
        title: 'Book',
        fields: [
          { name: 'name', label: 'Book title', type: 'text', required: true },
          { name: 'isbn', label: 'ISBN', type: 'text' },
          { name: 'author', label: 'Author', type: 'text' },
          { name: 'publisher', label: 'Publisher', type: 'text' },
          { name: 'category', label: 'Category', type: 'text', required: true },
          { name: 'readingLevel', label: 'Reading level', type: 'text' },
          { name: 'language', label: 'Language', type: 'text' },
          { name: 'copies', label: 'Total copies', type: 'number', required: true },
          { name: 'shelf', label: 'Shelf location', type: 'text' },
          { name: 'cover', label: 'Book cover', type: 'file' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Available', value: 'Available' }, { label: 'Archived', value: 'Archived' }] },
        ],
      },
    ],
  },

  'library-issues': {
    module: 'library-issues',
    title: 'Issue Book',
    singular: 'Issue',
    sections: [
      {
        title: 'Issue',
        fields: [
          { name: 'book', label: 'Book copy', type: 'select', required: true, optionsFrom: 'library-books' },
          {
            name: 'borrowerType',
            label: 'Borrower type',
            type: 'select',
            required: true,
            options: [
              { label: 'Student', value: 'Student' },
              { label: 'Staff', value: 'Staff' },
            ],
          },
          { name: 'borrower', label: 'Borrower', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'name', label: 'Issue label', type: 'text', required: true },
          { name: 'issueDate', label: 'Issue date', type: 'date', required: true },
          { name: 'dueDate', label: 'Due date', type: 'date', required: true },
          { name: 'issuedBy', label: 'Issued by', type: 'readonly', auto: true },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Issued', value: 'Issued' }, { label: 'Returned', value: 'Returned' }, { label: 'Overdue', value: 'Overdue' }] },
        ],
      },
    ],
  },

  'transport-vehicles': {
    module: 'transport-vehicles',
    title: 'Register Vehicle',
    singular: 'Vehicle',
    sections: [
      {
        title: 'Vehicle',
        fields: [
          { name: 'plate', label: 'Registration number', type: 'text', required: true },
          { name: 'name', label: 'Vehicle label', type: 'text', required: true },
          {
            name: 'type',
            label: 'Vehicle type',
            type: 'select',
            required: true,
            options: [
              { label: 'Bus', value: 'Bus' },
              { label: 'Van', value: 'Van' },
              { label: 'Minibus', value: 'Minibus' },
            ],
          },
          { name: 'model', label: 'Make and model', type: 'text' },
          { name: 'capacity', label: 'Capacity', type: 'number', required: true },
          { name: 'driver', label: 'Driver', type: 'select', optionsFrom: 'staff' },
          { name: 'insuranceExpiry', label: 'Insurance expiry', type: 'date' },
          { name: 'inspectionExpiry', label: 'Inspection expiry', type: 'date' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Maintenance', value: 'Maintenance' },
              { label: 'Inactive', value: 'Inactive' },
            ],
          },
        ],
      },
    ],
  },

  'transport-routes': {
    module: 'transport-routes',
    title: 'Create Route',
    singular: 'Route',
    sections: [
      {
        title: 'Route',
        fields: [
          { name: 'name', label: 'Route name', type: 'text', required: true },
          { name: 'start', label: 'Starting location', type: 'text', required: true },
          { name: 'end', label: 'Destination', type: 'text', required: true },
          { name: 'stops', label: 'Stops (ordered)', type: 'textarea' },
          { name: 'vehicle', label: 'Assigned vehicle', type: 'select', optionsFrom: 'transport-vehicles' },
          { name: 'driver', label: 'Assigned driver', type: 'select', optionsFrom: 'staff' },
          { name: 'pickupTime', label: 'Pickup time', type: 'time' },
          { name: 'returnTime', label: 'Return time', type: 'time' },
          { name: 'days', label: 'Applicable days', type: 'text' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  'health-records': {
    module: 'health-records',
    title: 'Learner Health Profile',
    singular: 'Health record',
    sections: [
      {
        title: 'Health profile',
        fields: [
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'name', label: 'Record title', type: 'text', required: true },
          { name: 'allergies', label: 'Allergies / alerts', type: 'textarea' },
          { name: 'conditions', label: 'Medical conditions', type: 'textarea' },
          { name: 'medication', label: 'Regular medication', type: 'textarea' },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Archived', value: 'Archived' }] },
        ],
      },
    ],
  },

  'clinic-visits': {
    module: 'clinic-visits',
    title: 'Record Clinic Visit',
    singular: 'Clinic visit',
    sections: [
      {
        title: 'Clinic visit',
        fields: [
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'name', label: 'Visit summary', type: 'text', required: true },
          { name: 'visitAt', label: 'Visit date/time', type: 'readonly', auto: true },
          { name: 'concern', label: 'Reported concern', type: 'textarea', required: true },
          { name: 'observations', label: 'Observations', type: 'textarea' },
          { name: 'actionTaken', label: 'Action taken', type: 'textarea', required: true },
          { name: 'parentNotified', label: 'Parent notified', type: 'checkbox' },
          { name: 'referralRequired', label: 'Referral required', type: 'checkbox' },
          { name: 'referralDetails', label: 'Referral details', type: 'textarea', when: { field: 'referralRequired', in: ['true', 'Yes', '1'] } },
          { name: 'recordedBy', label: 'Recorded by', type: 'readonly', auto: true },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Recorded', value: 'Recorded' }, { label: 'Referred', value: 'Referred' }] },
        ],
      },
    ],
  },

  'safeguarding-incidents': {
    module: 'safeguarding-incidents',
    title: 'Safeguarding Incident',
    singular: 'Safeguarding incident',
    sections: [
      {
        title: 'Restricted incident record',
        description: 'Visible only to designated safeguarding personnel.',
        fields: [
          { name: 'incidentAt', label: 'Incident date/time', type: 'date', required: true },
          { name: 'location', label: 'Location', type: 'text', required: true },
          { name: 'learner', label: 'Learner involved', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'category', label: 'Incident category', type: 'text', required: true },
          { name: 'name', label: 'Short title', type: 'text', required: true },
          { name: 'account', label: 'Factual account', type: 'textarea', required: true },
          { name: 'protectiveAction', label: 'Immediate protective action', type: 'textarea', required: true },
          { name: 'receivedBy', label: 'Person receiving report', type: 'select', optionsFrom: 'staff' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Open', value: 'Open' }, { label: 'Under review', value: 'Under review' }, { label: 'Closed', value: 'Closed' }] },
        ],
      },
    ],
  },

  'disciplinary-cases': {
    module: 'disciplinary-cases',
    title: 'Report Incident',
    singular: 'Behaviour incident',
    sections: [
      {
        title: 'Incident',
        fields: [
          { name: 'student', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'date', label: 'Incident date', type: 'date', required: true },
          { name: 'location', label: 'Location', type: 'text' },
          { name: 'category', label: 'Category', type: 'text', required: true },
          { name: 'name', label: 'Summary', type: 'text', required: true },
          { name: 'subtitle', label: 'Description', type: 'textarea', required: true },
          { name: 'reportedBy', label: 'Reported by', type: 'readonly', auto: true },
          { name: 'immediateAction', label: 'Immediate action', type: 'textarea' },
          { name: 'parentNotified', label: 'Parent notified', type: 'checkbox' },
          { name: 'followUpDate', label: 'Follow-up date', type: 'date' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Open', value: 'Open' }, { label: 'Investigating', value: 'Investigating' }, { label: 'Closed', value: 'Closed' }] },
        ],
      },
    ],
  },

  'positive-recognition': {
    module: 'positive-recognition',
    title: 'Record Recognition',
    singular: 'Recognition',
    sections: [
      {
        title: 'Positive recognition',
        fields: [
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'type', label: 'Recognition type', type: 'text', required: true },
          { name: 'name', label: 'Title', type: 'text', required: true },
          { name: 'subtitle', label: 'Description', type: 'textarea', required: true },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'recordedBy', label: 'Recorded by', type: 'readonly', auto: true },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Recorded', value: 'Recorded' }] },
        ],
      },
    ],
  },

  'school-events': {
    module: 'school-events',
    title: 'Create Event',
    singular: 'Event',
    sections: [
      {
        title: 'Event',
        fields: [
          { name: 'name', label: 'Event name', type: 'text', required: true },
          {
            name: 'type',
            label: 'Event type',
            type: 'select',
            required: true,
            options: [
              { label: 'Sports', value: 'Sports' },
              { label: 'Trip', value: 'Trip' },
              { label: 'Celebration', value: 'Celebration' },
              { label: 'Club', value: 'Club' },
            ],
          },
          { name: 'subtitle', label: 'Description', type: 'textarea' },
          { name: 'startDate', label: 'Start date/time', type: 'date', required: true },
          { name: 'endDate', label: 'End date/time', type: 'date' },
          { name: 'location', label: 'Location', type: 'text', required: true },
          { name: 'program', label: 'Applicable section', type: 'select', options: [...sectionOpts, { label: 'Both', value: 'Both' }] },
          { name: 'host', label: 'Responsible staff', type: 'select', optionsFrom: 'staff' },
          { name: 'cost', label: 'Estimated cost', type: 'currency' },
          { name: 'consentRequired', label: 'Parent consent required', type: 'toggle' },
          { name: 'attachment', label: 'Attachments', type: 'file' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Planned', value: 'Planned' }, { label: 'Published', value: 'Published' }, { label: 'Completed', value: 'Completed' }] },
        ],
      },
    ],
  },

  clubs: {
    module: 'clubs',
    title: 'Create Club',
    singular: 'Club',
    sections: [
      {
        title: 'Club',
        fields: [
          { name: 'name', label: 'Club name', type: 'text', required: true },
          { name: 'program', label: 'Section', type: 'select', options: sectionOpts },
          { name: 'teacher', label: 'Responsible staff', type: 'select', optionsFrom: 'staff' },
          { name: 'subtitle', label: 'Description', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  'visitor-log': {
    module: 'visitor-log',
    title: 'Register Visitor',
    singular: 'Visitor',
    sections: [
      {
        title: 'Visitor',
        fields: [
          { name: 'name', label: 'Visitor full name', type: 'text', required: true },
          { name: 'phone', label: 'Phone', type: 'phone', required: true },
          { name: 'idType', label: 'Identification type', type: 'text' },
          { name: 'purpose', label: 'Purpose of visit', type: 'textarea', required: true },
          { name: 'host', label: 'Person being visited', type: 'select', optionsFrom: 'staff' },
          { name: 'timeIn', label: 'Arrival time', type: 'time' },
          { name: 'timeOut', label: 'Departure time', type: 'time' },
          { name: 'authorizedBy', label: 'Authorized staff', type: 'select', optionsFrom: 'staff' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'On site', value: 'On site' }, { label: 'Departed', value: 'Departed' }] },
        ],
      },
    ],
  },

  'staff-leave': {
    module: 'staff-leave',
    title: 'Leave Application',
    singular: 'Leave',
    sections: [
      {
        title: 'Leave application',
        fields: [
          { name: 'employee', label: 'Employee', type: 'select', optionsFrom: 'staff', help: 'Auto-filled for self-service when wired' },
          {
            name: 'leaveType',
            label: 'Leave type',
            type: 'select',
            required: true,
            options: [
              { label: 'Annual', value: 'Annual' },
              { label: 'Sick', value: 'Sick' },
              { label: 'Maternity', value: 'Maternity' },
              { label: 'Other', value: 'Other' },
            ],
          },
          { name: 'name', label: 'Summary', type: 'text', required: true },
          { name: 'fromDate', label: 'Start date', type: 'date', required: true },
          { name: 'toDate', label: 'End date', type: 'date', required: true },
          { name: 'subtitle', label: 'Reason', type: 'textarea', required: true },
          { name: 'document', label: 'Supporting document', type: 'file' },
          { name: 'handover', label: 'Handover notes', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Pending', value: 'Pending' }, { label: 'Approved', value: 'Approved' }, { label: 'Rejected', value: 'Rejected' }] },
        ],
      },
    ],
  },

  'staff-attendance': {
    module: 'staff-attendance',
    title: 'Staff Clock Record',
    singular: 'Staff day',
    sections: [
      {
        title: 'Staff day',
        description:
          'Prefer Attendance → Staff → Clock in (GPS + geofence). Manual rows are for corrections.',
        fields: [
          {
            name: 'name',
            label: 'Staff name',
            type: 'text',
            required: true,
            help: 'Teacher or staff member clocking this day. Required.',
          },
          {
            name: 'staffEmail',
            label: 'Staff email',
            type: 'email',
            help: 'Login email — used to match open shifts for clock-out.',
          },
          {
            name: 'date',
            label: 'Date',
            type: 'date',
            required: true,
            help: 'Calendar day of this shift. Required.',
          },
          {
            name: 'checkIn',
            label: 'Clock in',
            type: 'text',
            placeholder: '07:45',
            help: 'Arrival time (24h). Prefer the Clock in button so GPS is recorded.',
          },
          {
            name: 'checkOut',
            label: 'Clock out',
            type: 'text',
            placeholder: '16:30',
            help: 'Departure time (24h). Leave blank while still on shift.',
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            options: [
              { label: 'Present', value: 'Present' },
              { label: 'Late', value: 'Late' },
              { label: 'Absent', value: 'Absent' },
              { label: 'Leave', value: 'Leave' },
            ],
          },
          {
            name: 'onCampus',
            label: 'On campus',
            type: 'select',
            options: [
              { label: 'Yes', value: 'Yes' },
              { label: 'No', value: 'No' },
              { label: 'N/A', value: 'N/A' },
            ],
            help: 'Filled automatically by GPS clock when geofence is on.',
          },
          {
            name: 'distanceM',
            label: 'Distance (m)',
            type: 'number',
            help: 'Metres from campus centre at clock-in (auto from GPS).',
          },
          {
            name: 'latitude',
            label: 'Latitude',
            type: 'text',
            help: 'GPS latitude at clock-in.',
          },
          {
            name: 'longitude',
            label: 'Longitude',
            type: 'text',
            help: 'GPS longitude at clock-in.',
          },
          {
            name: 'subtitle',
            label: 'Notes',
            type: 'textarea',
            help: 'Optional note for this shift.',
          },
        ],
      },
    ],
  },

  payroll: {
    module: 'payroll',
    title: 'Payroll Run',
    singular: 'Payroll entry',
    sections: [
      {
        title: 'Payroll',
        fields: [
          { name: 'employee', label: 'Employee', type: 'select', required: true, optionsFrom: 'staff' },
          { name: 'name', label: 'Pay slip label', type: 'text', required: true },
          { name: 'month', label: 'Pay period', type: 'text', required: true, placeholder: '2026-03' },
          { name: 'basic', label: 'Basic salary', type: 'currency', required: true },
          { name: 'allowances', label: 'Allowances total', type: 'currency' },
          { name: 'deductions', label: 'Deductions total', type: 'currency' },
          { name: 'paymentDate', label: 'Payment date', type: 'date' },
          {
            name: 'method',
            label: 'Payment method',
            type: 'select',
            options: [
              { label: 'Bank', value: 'Bank' },
              { label: 'Cash', value: 'Cash' },
              { label: 'Mobile money', value: 'Mobile money' },
            ],
          },
          { name: 'net', label: 'Net pay', type: 'readonly', auto: true, help: 'Calculated from salary, allowances and deductions' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Draft', value: 'Draft' }, { label: 'Paid', value: 'Paid' }] },
        ],
      },
    ],
  },

  expenses: {
    module: 'expenses',
    title: 'Record Expense',
    singular: 'Expense',
    sections: [
      {
        title: 'Expense',
        fields: [
          { name: 'category', label: 'Category', type: 'text', required: true },
          { name: 'name', label: 'Description', type: 'text', required: true },
          { name: 'amount', label: 'Amount', type: 'currency', required: true },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'supplier', label: 'Supplier', type: 'text' },
          { name: 'receipt', label: 'Receipt', type: 'file' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Recorded', value: 'Recorded' }, { label: 'Approved', value: 'Approved' }] },
        ],
      },
    ],
  },

  assets: {
    module: 'assets',
    title: 'Register Asset',
    singular: 'Asset',
    sections: [
      {
        title: 'Asset',
        fields: [
          { name: 'name', label: 'Asset name', type: 'text', required: true },
          { name: 'tag', label: 'Asset tag', type: 'text' },
          { name: 'category', label: 'Category', type: 'text' },
          { name: 'department', label: 'Department', type: 'select', optionsFrom: 'departments' },
          { name: 'className', label: 'Class', type: 'select', options: classOpts },
          {
            name: 'location',
            label: 'Location',
            type: 'text',
            placeholder: 'e.g. Block A · 1, Staff room',
          },
          {
            name: 'condition',
            label: 'Condition',
            type: 'select',
            options: [
              { label: 'New', value: 'New' },
              { label: 'Good', value: 'Good' },
              { label: 'Fair', value: 'Fair' },
              { label: 'Needs service', value: 'Needs service' },
              { label: 'Damaged', value: 'Damaged' },
            ],
          },
          { name: 'purchaseDate', label: 'Purchase date', type: 'date' },
          { name: 'cost', label: 'Purchase cost', type: 'currency' },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Maintenance', value: 'Maintenance' },
              { label: 'Disposed', value: 'Disposed' },
            ],
          },
        ],
      },
    ],
  },

  'inventory-items': {
    module: 'inventory-items',
    title: 'Register school store item',
    singular: 'Item',
    sections: [
      {
        title: 'Catalogue item',
        fields: [
          { name: 'sku', label: 'SKU / code', type: 'text', required: true, placeholder: 'e.g. UNI-SHIRT-P' },
          { name: 'name', label: 'Item name', type: 'text', required: true, placeholder: 'e.g. Exercise book A4 (96pg)' },
          {
            name: 'category',
            label: 'School category',
            type: 'select',
            required: true,
            options: [
              { label: 'Uniform', value: 'Uniform' },
              { label: 'Stationery', value: 'Stationery' },
              { label: 'Textbooks', value: 'Textbooks' },
              { label: 'Lab', value: 'Lab' },
              { label: 'Medical / sick bay', value: 'Medical' },
              { label: 'Sports / PE', value: 'Sports' },
              { label: 'Cleaning', value: 'Cleaning' },
              { label: 'ICT', value: 'ICT' },
              { label: 'Furniture', value: 'Furniture' },
              { label: 'Feeding / kitchen', value: 'Feeding' },
            ],
          },
          { name: 'department', label: 'Section / department', type: 'select', optionsFrom: 'departments' },
          { name: 'className', label: 'Class (if class-specific)', type: 'select', options: [...classOpts, { label: 'All classes', value: 'All classes' }, { label: 'P.1–P.7', value: 'P.1–P.7' }] },
          {
            name: 'unit',
            label: 'Unit',
            type: 'select',
            options: [
              { label: 'Pcs', value: 'Pcs' },
              { label: 'Pack', value: 'Pack' },
              { label: 'Box', value: 'Box' },
              { label: 'Set', value: 'Set' },
              { label: 'Ream', value: 'Ream' },
              { label: 'Litre', value: 'Litre' },
              { label: 'Kg', value: 'Kg' },
            ],
          },
          { name: 'subtitle', label: 'Notes (sizes, brand, supplier tip)', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  'inventory-stock': {
    module: 'inventory-stock',
    title: 'Record school stock level',
    singular: 'Stock',
    sections: [
      {
        title: 'On-hand stock',
        fields: [
          { name: 'name', label: 'Item', type: 'select', required: true, optionsFrom: 'inventory-items' },
          {
            name: 'store',
            label: 'Store / cupboard',
            type: 'select',
            required: true,
            options: [
              { label: 'Main store', value: 'Main store' },
              { label: 'Nursery store', value: 'Nursery store' },
              { label: 'Staff room', value: 'Staff room' },
              { label: 'Lab cupboard', value: 'Lab cupboard' },
              { label: 'Sick bay', value: 'Sick bay' },
              { label: 'Library store', value: 'Library store' },
              { label: 'Kitchen store', value: 'Kitchen store' },
            ],
          },
          { name: 'department', label: 'Section / department', type: 'select', optionsFrom: 'departments' },
          { name: 'className', label: 'Class', type: 'select', options: [...classOpts, { label: 'All classes', value: 'All classes' }, { label: 'P.1–P.7', value: 'P.1–P.7' }] },
          { name: 'qty', label: 'Quantity on hand', type: 'number', required: true },
          {
            name: 'critical',
            label: 'Critical at (qty)',
            type: 'number',
            help: 'At or below — stop issuing; buy urgently',
          },
          {
            name: 'reorder',
            label: 'Reorder at (qty)',
            type: 'number',
            help: 'At or below — raise a purchase request for the term',
          },
          {
            name: 'maxStock',
            label: 'Max shelf level',
            type: 'number',
            help: 'Target when filling from supplier',
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Available', value: 'Available' },
              { label: 'Low stock', value: 'Low stock' },
              { label: 'Critical', value: 'Critical' },
              { label: 'Out of stock', value: 'Out of stock' },
            ],
          },
        ],
      },
    ],
  },

  'purchase-requests': {
    module: 'purchase-requests',
    title: 'Request Purchase',
    singular: 'Purchase request',
    sections: [
      {
        title: 'Request',
        fields: [
          {
            name: 'name',
            label: 'Item',
            type: 'select',
            required: true,
            optionsFrom: 'inventory-items',
          },
          { name: 'qty', label: 'Quantity to buy', type: 'number', required: true },
          { name: 'store', label: 'Store / location', type: 'text' },
          {
            name: 'department',
            label: 'Department',
            type: 'select',
            optionsFrom: 'departments',
          },
          {
            name: 'className',
            label: 'Class',
            type: 'select',
            options: [...classOpts, { label: 'All classes', value: 'All classes' }],
          },
          { name: 'requestedBy', label: 'Requested by', type: 'text', required: true },
          { name: 'neededBy', label: 'Needed by', type: 'date' },
          {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            options: [
              { label: 'Normal', value: 'Normal' },
              { label: 'High', value: 'High' },
              { label: 'Urgent', value: 'Urgent' },
            ],
          },
          { name: 'estimatedCost', label: 'Estimated cost (UGX)', type: 'currency' },
          { name: 'reason', label: 'Reason', type: 'textarea' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Submitted', value: 'Submitted' },
              { label: 'Approved', value: 'Approved' },
              { label: 'Ordered', value: 'Ordered' },
              { label: 'Received', value: 'Received' },
              { label: 'Rejected', value: 'Rejected' },
            ],
          },
        ],
      },
    ],
  },

  'inventory-issues': {
    module: 'inventory-issues',
    title: 'Issue to class / teacher',
    singular: 'Issue',
    sections: [
      {
        title: 'Classroom / staff issue',
        fields: [
          { name: 'name', label: 'Issue reference', type: 'text', required: true, placeholder: 'e.g. Issue · Chalk · P.5 Blue' },
          { name: 'item', label: 'Item', type: 'select', required: true, optionsFrom: 'inventory-items' },
          { name: 'qty', label: 'Quantity issued', type: 'number', required: true },
          { name: 'department', label: 'Section / department', type: 'select', optionsFrom: 'departments' },
          { name: 'className', label: 'Class receiving', type: 'select', options: [...classOpts, { label: 'All classes', value: 'All classes' }] },
          { name: 'issuedTo', label: 'Issued to (teacher / staff)', type: 'select', required: true, optionsFrom: 'teachers' },
          { name: 'date', label: 'Issue date', type: 'date', required: true },
          { name: 'subtitle', label: 'Purpose / notes', type: 'textarea', placeholder: 'e.g. Term III MOT exam papers' },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Pending', value: 'Pending' },
              { label: 'Issued', value: 'Issued' },
              { label: 'Returned', value: 'Returned' },
            ],
          },
        ],
      },
    ],
  },

  curriculum: {
    module: 'curriculum',
    title: 'Create Curriculum',
    singular: 'Curriculum',
    sections: [
      {
        title: 'Curriculum',
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'program', label: 'Section', type: 'select', required: true, options: sectionOpts },
          { name: 'academicYear', label: 'Academic year', type: 'select', optionsFrom: 'academic-years' },
          { name: 'className', label: 'Class', type: 'select', options: classOpts },
          { name: 'course', label: 'Subject / learning area', type: 'select', optionsFrom: 'courses' },
          { name: 'subtitle', label: 'Description', type: 'textarea' },
          { name: 'effectiveDate', label: 'Effective date', type: 'date' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Draft', value: 'Draft' }] },
        ],
      },
    ],
  },

  'study-coverage': {
    module: 'study-coverage',
    title: 'Add Study Coverage',
    singular: 'Study coverage',
    sections: [
      {
        title: 'What to study',
        description:
          'Plan what this class covers in a given term (Uganda Baby Class–P.7).',
        fields: [
          {
            name: 'className',
            label: 'Class level',
            type: 'select',
            required: true,
            options: ugandaClassOpts,
          },
          {
            name: 'term',
            label: 'Term',
            type: 'select',
            required: true,
            options: [
              { label: 'Term I', value: 'Term I' },
              { label: 'Term II', value: 'Term II' },
              { label: 'Term III', value: 'Term III' },
            ],
          },
          {
            name: 'course',
            label: 'Subject / learning area',
            type: 'text',
            required: true,
            placeholder: 'e.g. English, Mathematics, Numeracy Play',
          },
          {
            name: 'coverage',
            label: 'Coverage (what is meant to be studied)',
            type: 'textarea',
            required: true,
            help: 'List the skills, topics and outcomes for this class and term.',
          },
          { name: 'weeks', label: 'Weeks planned', type: 'number' },
          {
            name: 'academicYear',
            label: 'Academic year',
            type: 'select',
            optionsFrom: 'academic-years',
          },
          {
            name: 'name',
            label: 'Title',
            type: 'readonly',
            auto: true,
            help: 'Built from class · term · subject',
          },
          {
            name: 'program',
            label: 'Section',
            type: 'readonly',
            auto: true,
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Draft', value: 'Draft' },
            ],
          },
        ],
      },
    ],
  },

  departments: {
    module: 'departments',
    title: 'Create Department',
    singular: 'Department',
    sections: [
      {
        title: 'Department',
        fields: [
          { name: 'name', label: 'Department name', type: 'text', required: true },
          { name: 'subtitle', label: 'Description', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  alumni: {
    module: 'alumni',
    title: 'Alumni Record',
    singular: 'Alumnus',
    sections: [
      {
        title: 'Alumni',
        fields: [
          { name: 'name', label: 'Full name', type: 'text', required: true },
          { name: 'exitYear', label: 'Exit year', type: 'text', required: true },
          { name: 'className', label: 'Last class', type: 'select', options: classOpts },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Alumni', value: 'Alumni' }] },
        ],
      },
    ],
  },

  'waiting-list': {
    module: 'waiting-list',
    title: 'Add to Waiting List',
    singular: 'Waitlisted applicant',
    sections: [
      {
        title: 'Waiting list',
        fields: [
          { name: 'application', label: 'Application', type: 'select', optionsFrom: 'applicants' },
          { name: 'name', label: 'Applicant name', type: 'text', required: true },
          { name: 'program', label: 'Section', type: 'select', options: sectionOpts },
          { name: 'className', label: 'Class', type: 'select', options: classOpts },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Waitlisted', value: 'Waitlisted' }, { label: 'Offered', value: 'Offered' }] },
        ],
      },
    ],
  },

  'nursery-development': {
    module: 'nursery-development',
    title: 'Development Record',
    singular: 'Development record',
    sections: [
      {
        title: 'Development summary',
        description: 'Built from existing observations — do not re-enter the same notes.',
        fields: [
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'name', label: 'Report title', type: 'text', required: true },
          { name: 'period', label: 'Reporting period', type: 'text', required: true },
          { name: 'observations', label: 'Reviewed observations', type: 'textarea', help: 'Reference observation IDs or summaries' },
          { name: 'teacherComment', label: 'Overall teacher comment', type: 'textarea', required: true },
          { name: 'parentFeedback', label: 'Parent feedback', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Draft', value: 'Draft' }, { label: 'Approved', value: 'Approved' }] },
        ],
      },
    ],
  },

  'dietary-requirements': {
    module: 'dietary-requirements',
    title: 'Dietary Requirement',
    singular: 'Dietary requirement',
    sections: [
      {
        title: 'Dietary requirement',
        fields: [
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'name', label: 'Restriction / allergy', type: 'text', required: true },
          { name: 'subtitle', label: 'Description', type: 'textarea', required: true },
          { name: 'parentConfirmed', label: 'Parent confirmation', type: 'checkbox' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Resolved', value: 'Resolved' }] },
        ],
      },
    ],
  },

  'early-departures': {
    module: 'early-departures',
    title: 'Early Departure',
    singular: 'Early departure',
    sections: [
      {
        title: 'Early departure',
        fields: [
          { name: 'learner', label: 'Learner', type: 'select', required: true, optionsFrom: 'students' },
          { name: 'name', label: 'Summary', type: 'text', required: true },
          { name: 'departureTime', label: 'Departure time', type: 'time', required: true },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true },
          { name: 'collector', label: 'Authorized collector', type: 'select', optionsFrom: 'guardians' },
          { name: 'verifiedBy', label: 'Staff verification', type: 'select', optionsFrom: 'staff' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Recorded', value: 'Recorded' }] },
        ],
      },
    ],
  },

  'meal-attendance': {
    module: 'meal-attendance',
    title: 'Meal Attendance Register',
    singular: 'Meal register',
    sections: [
      {
        title: 'Meal attendance',
        fields: [
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'className', label: 'Class', type: 'select', required: true, options: classOpts },
          {
            name: 'mealType',
            label: 'Meal type',
            type: 'select',
            required: true,
            options: [
              { label: 'Breakfast', value: 'Breakfast' },
              { label: 'Lunch', value: 'Lunch' },
              { label: 'Snack', value: 'Snack' },
            ],
          },
          { name: 'name', label: 'Register title', type: 'text', required: true },
          { name: 'subtitle', label: 'Notes', type: 'textarea' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Draft', value: 'Draft' }, { label: 'Submitted', value: 'Submitted' }] },
        ],
      },
    ],
  },

  campuses: {
    module: 'campuses',
    title: 'Create Campus',
    singular: 'Campus',
    sections: [
      {
        title: 'Campus',
        fields: [
          { name: 'name', label: 'Campus name', type: 'text', required: true },
          { name: 'code', label: 'Campus code', type: 'text' },
          { name: 'address', label: 'Physical address', type: 'textarea', required: true },
          { name: 'phone', label: 'Contact number', type: 'phone' },
          { name: 'manager', label: 'Campus manager', type: 'select', optionsFrom: 'staff' },
          { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
        ],
      },
    ],
  },

  'audit-logs': {
    module: 'audit-logs',
    title: 'Audit entry',
    singular: 'Audit log',
    sections: [
      {
        title: 'Entry (read-only system log)',
        fields: [
          { name: 'name', label: 'Action', type: 'readonly' },
          { name: 'user', label: 'User', type: 'readonly' },
          { name: 'module', label: 'Module', type: 'readonly' },
          { name: 'recordId', label: 'Record', type: 'readonly' },
          { name: 'subtitle', label: 'Change summary', type: 'readonly' },
          { name: 'status', label: 'Result', type: 'readonly' },
        ],
      },
    ],
  },
}

/** Map common FK-like column names → catalog module for dropdown options. */
const FALLBACK_OPTIONS_FROM: Record<string, string> = {
  classname: 'classes',
  class: 'classes',
  group: 'classes',
  course: 'courses',
  subject: 'courses',
  teacher: 'teachers',
  instructor: 'teachers',
  classteacher: 'teachers',
  student: 'students',
  learner: 'students',
  pupil: 'students',
  department: 'departments',
  year: 'academic-years',
  academicyear: 'academic-years',
  term: 'academic-terms',
  period: 'periods',
  employee: 'staff',
  host: 'staff',
  staff: 'staff',
  receivedby: 'staff',
  verifiedby: 'staff',
  authorizedby: 'staff',
  driver: 'staff',
  manager: 'staff',
  guardian: 'guardians',
  parent: 'guardians',
  collector: 'guardians',
  parentid: 'guardians',
  invoice: 'invoices',
  payment: 'payments',
  item: 'inventory-items',
  vehicle: 'transport-vehicles',
  book: 'library-books',
  topic: 'study-coverage',
  coverage: 'study-coverage',
  scheme: 'schemes-of-work',
  application: 'applicants',
  feestructure: 'fee-structures',
  program: 'programs',
  day: '__weekdays__',
}

const WEEKDAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
].map((d) => ({ label: d, value: d }))

function fieldTypeForColumn(key: string): ModuleFormSpec['sections'][0]['fields'][0]['type'] {
  const k = key.toLowerCase()
  if (FALLBACK_OPTIONS_FROM[k.replace(/[^a-z]/g, '')]) return 'select'
  if (k.includes('date') || k === 'start' || k === 'end') return 'date'
  if (k.includes('time')) return 'time'
  if (k.includes('email')) return 'email'
  if (k.includes('phone')) return 'phone'
  if (['amount', 'cost', 'fee', 'salary', 'gross', 'net', 'paid'].some((x) => k.includes(x)))
    return 'currency'
  if (['qty', 'copies', 'capacity', 'score', 'hours', 'week', 'order', 'average'].some((x) => k.includes(x)))
    return 'number'
  if (k === 'status') return 'select'
  if (k === 'subtitle' || k.includes('note') || k.includes('desc')) return 'textarea'
  return 'text'
}

/** Build a simple create/edit form from list columns when no custom schema exists. */
export function buildFallbackForm(
  moduleKey: string,
  title: string,
  singular: string,
  columns: { key: string; label: string; primary?: boolean; badge?: boolean }[],
): ModuleFormSpec {
  const fields = columns
    .filter((c) => c.key !== 'id')
    .map((c) => {
      const type = fieldTypeForColumn(c.key)
      const field: ModuleFormSpec['sections'][0]['fields'][0] = {
        name: c.key,
        label: c.label,
        type,
        required: c.primary || c.key === 'name',
      }
      if (c.key === 'status') {
        field.options = [
          { label: 'Active', value: 'Active' },
          { label: 'Draft', value: 'Draft' },
          { label: 'Inactive', value: 'Inactive' },
        ]
      } else {
        const lookup = FALLBACK_OPTIONS_FROM[c.key.toLowerCase().replace(/[^a-z]/g, '')]
        if (lookup === '__weekdays__') {
          field.type = 'select'
          field.options = WEEKDAY_OPTIONS
        } else if (lookup) {
          field.type = 'select'
          field.optionsFrom = lookup
          if (lookup === 'guardians' && c.key.toLowerCase().includes('id')) {
            field.optionsValue = 'id'
          }
        }
      }
      field.help = resolveFieldHelp(field)
      return field
    })

  if (!fields.some((f) => f.name === 'name')) {
    const nameField: ModuleFormSpec['sections'][0]['fields'][0] = {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    }
    nameField.help = resolveFieldHelp(nameField)
    fields.unshift(nameField)
  }

  return {
    module: moduleKey,
    title: `New ${singular}`,
    singular,
    sections: [
      {
        title: title || singular,
        description: `Fill in each field. Items marked * are required. Hover or read the grey text under a field for what to enter.`,
        fields,
      },
    ],
  }
}

export function getFormSchema(moduleKey: string): ModuleFormSpec | undefined {
  return formSchemas[moduleKey]
}
