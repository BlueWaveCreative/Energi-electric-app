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
