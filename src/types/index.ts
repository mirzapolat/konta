// ─── Auth & Profiles ──────────────────────────────────────────────────────────

export interface Profile {
  id: string
  name: string
  email: string
  created_at: string
  last_login_at: string | null
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  branding: { logo_url?: string } | null
}

export interface WorkspaceMember {
  workspace_id: string
  profile_id: string
  status: 'owner' | 'member' | 'invited'
  updated_at: string
  profile?: Profile
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectItemType = 'project' | 'attendance' | 'rsvp' | 'series'

export interface Project {
  id: string
  workspace_id: string
  parent_id: string | null
  name: string
  type: ProjectItemType
  has_children: number
  created_at: string
}

// ─── Event Attendance ─────────────────────────────────────────────────────────

export type FieldType = 'text' | 'email' | 'phone' | 'select'

export interface EventField {
  name: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
  show_in_table?: boolean
}

export type CollisionMode = 'block' | 'mark' | 'ignore'

export interface AttendanceObject {
  id: string
  workspace_id: string
  parent_id: string | null
  created_by: string
  name: string
  event_date: string | null
  created_at: string
  updated_at: string
  fields: EventField[]
  active: boolean
  security_rotatingcode_enabled: boolean
  security_rotatingcode_interval: number
  security_clientidchecks_enabled: boolean
  security_clientidchecks_type: CollisionMode
  email_receipts: boolean
  branding_enabled: boolean
}

export interface AttendanceCode {
  id: string
  event_id: string
  type: 'static' | 'rotating'
  created_at: string
  expires_at: string | null
}

export type AttendanceStatus = 'attended' | 'excused'
export type RecordedWith = 'qr' | 'link' | 'manual' | 'moderator'

export interface AttendanceRecord {
  id: string
  event_id: string
  recorded_at: string
  content: Record<string, string>
  status: AttendanceStatus
  recorded_with: RecordedWith
  client_id: string | null
  client_id_collision: string | null
}

export interface AttendanceModeration {
  id: string
  event_id: string
  label: string
  active: boolean
  created_at: string
  expires_at: string | null
}

export interface AttendanceExcuseLink {
  id: string
  event_id: string
  label: string
  active: boolean
  created_at: string
  expires_at: string | null
}

// ─── RSVP ─────────────────────────────────────────────────────────────────────

export type RsvpFieldType = 'text' | 'email' | 'number' | 'phone' | 'select' | 'date' | 'checkbox'

export interface RsvpField {
  name: string
  label: string
  description?: string
  type: RsvpFieldType
  required: boolean
  options?: string[]
}

export interface RsvpObject {
  id: string
  workspace_id: string
  parent_id: string | null
  created_by: string
  name: string
  event_date: string | null
  created_at: string
  updated_at: string
  fields: RsvpField[]
  active: boolean
  email_receipts: boolean
}

export interface RsvpLink {
  id: string
  rsvp_id: string
  label: string
  created_at: string
  open_count: number
  fill_count: number
  active: boolean
}

export interface RsvpRecord {
  id: string
  rsvp_id: string
  submitted_at: string
  content: Record<string, string>
}

// ─── Series ───────────────────────────────────────────────────────────────────

export interface SeriesObject {
  id: string
  workspace_id: string
  parent_id: string | null
  created_by: string
  name: string
  created_at: string
  updated_at: string
  combine_on: string
}

export interface SeriesEvent {
  series_id: string
  event_id: string
  weight: number
  attendance_object?: AttendanceObject
}

export interface SeriesCollision {
  id: string
  series_id: string
  field_name: string
  first_value: string
  second_value: string
  chosen_value: string | null
  dismissed_at: string | null
  dismissed_by: string | null
}

export interface SeriesReviewLink {
  id: string
  series_id: string
  label: string
  active: boolean
  show_graph: boolean
  member_review: 'deactivated' | 'own_public' | 'own_email' | 'all_public' | 'all_email'
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  type: 'workspace_invite' | 'member_joined'
  workspace_id: string
  workspace_name: string
  from_name?: string
  read: boolean
  created_at: string
}
