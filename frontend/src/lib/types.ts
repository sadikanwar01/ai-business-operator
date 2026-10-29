export type MissionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type StepStatus = 'waiting' | 'running' | 'complete' | 'failed'
export type AgentStatus = 'waiting' | 'working' | 'complete' | 'failed'
export type LeadStatus = 'review' | 'contacted' | 'rejected' | 'qualified'
export type MessageStatus = 'ready' | 'approved' | 'rejected' | 'sent'

export interface User {
  id: string
  name: string
  email: string
  role: string
  avatar_hue: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
}

export interface AuthPayload {
  token: string
  expires_in: number
  user: User
  workspace: Workspace
}

export interface MissionCounts {
  researched: number
  qualified: number
  high_intent: number
  outreach_ready: number
  approved: number
}

export interface Mission {
  id: string
  workspace_id: string
  title: string
  goal: string
  status: MissionStatus
  progress: number
  current_step: string | null
  mode: 'live' | 'demo'
  provider: string
  model: string | null
  industry: string | null
  location: string | null
  target_count: number
  desired_action: string | null
  target_audience: string | null
  desired_result: string | null
  source: string
  error: string | null
  summary: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  counts: MissionCounts
}

export interface MissionStep {
  id: string
  mission_id: string
  key: string
  name: string
  agent: string
  status: StepStatus
  progress: number
  detail: string | null
  order_index: number
  started_at: string | null
  completed_at: string | null
}

export interface AgentState {
  id: string
  mission_id: string
  name: string
  role: string
  task: string | null
  status: AgentStatus
  order_index: number
  updated_at: string
}

export interface ActivityEntry {
  id: string
  workspace_id: string
  mission_id: string | null
  agent: string
  action: string
  status: 'info' | 'complete' | 'warn' | 'error'
  message: string
  meta: string | null
  created_at: string
  mission_title?: string | null
}

export interface LeadRow {
  id: string
  score: number
  tier: string
  opportunity: string
  status: LeadStatus
  last_activity: string | null
  updated_at: string
  company: string
  industry: string
  location: string
  city: string
  website: string
  specialty: string
  mission_id: string
  mission_title: string
}

export interface Signal {
  id: string
  label: string
  value: string
  severity: string
  evidence: string
}

export interface ScoreDimension {
  id: string
  dimension: string
  weight: number
  score: number
  rationale: string
}

export interface ResearchRecord {
  id: string
  field: string
  value: string
  source: string
  source_url: string
  excerpt: string
  confidence: number
  retrieved_at: string
  company?: string
}

export interface OutreachMessage {
  id: string
  mission_id: string
  lead_id: string
  company_id: string
  company: string
  city: string
  website: string
  specialty?: string
  subject: string
  body: string
  confidence: number
  status: MessageStatus
  tone: string | null
  score: number
  tier: string
  flags: string[] | { items: string[]; verdict?: string; grounding_score?: number; tone_score?: number; spam_score?: number; suggestion?: string }
  review_notes: string[]
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  lead_id: string
  outreach_id: string | null
  mission_id: string | null
  sequence: number
  due_date: string
  status: string
  note: string | null
  company: string
  city: string
  score: number
  tier: string
  subject: string | null
  outreach_status: string | null
  label: string
}

export interface DashboardPayload {
  snapshot: {
    qualified_leads: number
    high_intent: number
    outreach_ready: number
    awaiting_review: number
    follow_ups_due: number
  }
  active_missions: Mission[]
  recent_missions: Mission[]
  activity: ActivityEntry[]
  provider: {
    provider: string
    mode: 'live' | 'demo'
    model: string
    live_configured: boolean
    base_url: string | null
  }
  user: { name: string; email: string }
  workspace: { name: string; plan: string }
}

export interface AnalyticsPayload {
  scope: 'mission' | 'workspace'
  mission: Mission | null
  funnel: { label: string; value: number }[]
  metrics: {
    leads_researched: number
    qualified: number
    high_intent: number
    outreach_generated: number
    approved: number
    conversion_rate: number
    approval_rate: number
    average_opportunity_score: number
  }
  top_mission: {
    id: string
    title: string
    status: MissionStatus
    progress: number
    created_at: string
    qualified: number
    researched: number
  } | null
  missions: {
    id: string
    title: string
    status: MissionStatus
    progress: number
    created_at: string
    qualified: number
    researched: number
  }[]
}

export interface KnowledgeCategory {
  key: string
  label: string
  items: {
    id: string
    category: string
    title: string
    content: string
    updated_at: string
  }[]
}

export interface Integration {
  id: string
  category: string
  name: string
  description: string
  status: 'connected' | 'available' | 'not_connected'
  provider: string
  model?: string
  mode?: string
  updated_at: string
}
