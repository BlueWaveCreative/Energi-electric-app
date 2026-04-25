export type UserRole = 'admin' | 'field_worker'
export type UserStatus = 'active' | 'inactive'
export type ProjectStatus = 'active' | 'completed' | 'archived'
export type PhaseStatus = 'not_started' | 'in_progress' | 'complete'
export type TaskStatus = 'pending' | 'in_progress' | 'complete'
export type TimeEntryMethod = 'clock' | 'manual'
export type LinkableType = 'project' | 'phase' | 'task'

export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  invited_by: string | null
  created_at: string
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
}

export interface TemplatePhase {
  id: string
  template_id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
}

export interface Project {
  id: string
  name: string
  address: string | null
  status: ProjectStatus
  template_id: string | null
  customer_id: string | null
  created_by: string
  created_at: string
}

export interface Phase {
  id: string
  project_id: string
  name: string
  description: string | null
  status: PhaseStatus
  sort_order: number
  created_at: string
}

export interface Task {
  id: string
  phase_id: string
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  assigned_to: string | null
  created_at: string
}

export interface TimeEntry {
  id: string
  user_id: string
  project_id: string
  phase_id: string | null
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  method: TimeEntryMethod
  admin_edited: boolean
  edited_by: string | null
  notes: string | null
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  content: string
  linked_type: LinkableType
  linked_id: string
  created_at: string
}

export interface Photo {
  id: string
  user_id: string
  file_path: string
  thumbnail_path: string | null
  caption: string | null
  linked_type: LinkableType
  linked_id: string
  created_at: string
}

export interface Plan {
  id: string
  project_id: string
  name: string
  file_path: string
  version: number
  uploaded_by: string
  created_at: string
}

export interface Annotation {
  id: string
  plan_id: string
  user_id: string
  canvas_data: Record<string, unknown>
  layer_name: string | null
  updated_at: string
  created_at: string
}

export interface ScheduleEntry {
  id: string
  user_id: string
  project_id: string
  date: string
  notes: string | null
  created_by: string
  created_at: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  portal_token: string
  portal_active: boolean
  created_by: string
  created_at: string
}

export interface TemplateTask {
  id: string
  template_phase_id: string
  title: string
  sort_order: number
  created_at: string
}

export interface ProjectView {
  id: string
  user_id: string
  project_id: string
  last_viewed_at: string
}

export interface Expense {
  id: string
  project_id: string
  user_id: string
  amount: number
  description: string
  category: string
  receipt_path: string | null
  receipt_thumbnail: string | null
  expense_date: string
  created_at: string
}

export interface Inspection {
  id: string
  project_id: string
  type: string
  status: string
  scheduled_date: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  clock_events: boolean
  phase_complete: boolean
  new_photo: boolean
  push_subscription: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// Joined types for common queries
export interface ProjectWithPhases extends Project {
  phases: Phase[]
}

export interface TemplatePhaseWithTasks extends TemplatePhase {
  template_tasks: TemplateTask[]
}

export interface TemplateWithPhases extends ProjectTemplate {
  template_phases: (TemplatePhase & { template_tasks?: TemplateTask[] })[]
}

export interface PhaseWithTasks extends Phase {
  tasks: Task[]
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export interface Invoice {
  id: string
  customer_id: string
  project_id: string | null
  invoice_number: number
  title: string
  status: InvoiceStatus
  tax_amount: number
  notes: string | null
  issued_date: string
  due_date: string | null
  notified_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  sort_order: number
  created_at: string
}

export interface LineItemPreset {
  id: string
  name: string
  default_unit_price: number | null
  sort_order: number
  created_by: string
  created_at: string
}

// Joined types
export interface InvoiceWithLineItems extends Invoice {
  invoice_line_items: InvoiceLineItem[]
}

export interface InvoiceWithCustomer extends Invoice {
  customers: { name: string; email: string | null }
  projects: { name: string } | null
}

// =============================================================
// Materials & Quotes (Milestone 3)
// =============================================================

export type MaterialUnit = 'ft' | 'ea' | 'box' | 'bag' | 'set'

export interface MaterialCategory {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Material {
  id: string
  name: string
  unit: MaterialUnit
  price: number
  category_id: string
  sort_order: number
  active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MaterialWithCategory extends Material {
  material_categories: { name: string; sort_order: number }
}

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'converted'

export type QuoteJobType = 'rough_in' | 'trim_out' | 'service'

export interface Quote {
  id: string
  quote_number: number
  customer_id: string
  project_id: string | null
  title: string
  description: string
  job_type: QuoteJobType
  status: QuoteStatus
  markup_enabled: boolean
  markup_percent: number
  tax_enabled: boolean
  tax_percent: number
  labor_rate: number
  labor_hours: number
  flat_fee_enabled: boolean
  flat_fee: number
  issued_date: string
  valid_until: string | null
  sent_at: string | null
  converted_at: string | null
  converted_to_invoice_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface QuoteLineItem {
  id: string
  quote_id: string
  material_id: string | null
  material_name: string
  unit: string
  unit_price: number
  quantity: number
  phase: string
  sort_order: number
  created_at: string
}

export interface QuoteWithLineItems extends Quote {
  quote_line_items: QuoteLineItem[]
}

export interface QuoteWithCustomer extends Quote {
  customers: { name: string; email: string | null }
  projects: { name: string } | null
}

/**
 * Quote totals computed from line items + pricing knobs.
 * Formula matches docs/joe-materials-prototype.tsx — labor is NOT marked up,
 * tax is applied to materials + markup + labor + flat fee.
 */
export interface QuoteTotals {
  materialsTotal: number
  markupAmount: number
  laborAmount: number
  flatFeeAmount: number
  subtotalBeforeTax: number
  taxAmount: number
  grandTotal: number
}
