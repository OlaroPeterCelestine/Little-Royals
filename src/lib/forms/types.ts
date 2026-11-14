/** Shared form field types from the school UI specification. */

export type FormFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'daterange'
  | 'select'
  | 'multiselect'
  | 'search'
  | 'radio'
  | 'checkbox'
  | 'textarea'
  | 'file'
  | 'phone'
  | 'email'
  | 'currency'
  | 'time'
  | 'toggle'
  | 'readonly'

export interface FormFieldOption {
  label: string
  value: string
}

export interface FormFieldSpec {
  name: string
  label: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  help?: string
  options?: FormFieldOption[]
  /** Show when another field equals one of these values */
  when?: { field: string; in: string[] }
  /** Pull options from another catalog module (name field) */
  optionsFrom?: string
  readOnly?: boolean
  auto?: boolean
}

export interface FormSectionSpec {
  title: string
  description?: string
  fields: FormFieldSpec[]
}

export interface ModuleFormSpec {
  module: string
  title: string
  singular: string
  sections: FormSectionSpec[]
  /** Allow save as draft */
  draft?: boolean
}
