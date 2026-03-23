// ============================================
// CampaignLog — Global TypeScript Types
// ============================================

export type Plan = 'free' | 'pro' | 'team'
export type WorkspaceRole = 'admin' | 'member' | 'viewer'
export type CampaignStatus = 'active' | 'paused' | 'ended' | 'draft'
export type ChangeType =
  | 'budget' | 'creative' | 'audience' | 'pause'
  | 'launch' | 'copy' | 'targeting' | 'platform' | 'note'
export type ExpectedImpact = 'positive' | 'negative' | 'neutral'
export type Outcome = 'positive' | 'negative' | 'neutral' | 'pending' | 'none'

// ── Database row types ──────────────────────

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: Plan
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  workspace_id: string | null
  full_name: string | null
  email: string
  role: WorkspaceRole
  marketing_role: string | null
  avatar_color: string
  avatar_initials: string | null
  invited_by: string | null
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  workspace_id: string
  name: string
  channel: string | null
  status: CampaignStatus
  start_date: string | null
  end_date: string | null
  budget_daily: number | null
  budget_currency: string
  goal: string | null
  health_score: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ChangeLog {
  id: string
  workspace_id: string
  campaign_id: string
  created_by: string
  change_type: ChangeType
  title: string
  reason: string | null
  before_value: string | null
  after_value: string | null
  expected_impact: ExpectedImpact | null
  tags: string[]
  outcome: Outcome | null
  outcome_note: string | null
  outcome_at: string | null
  flagged: boolean
  flagged_by: string | null
  created_at: string
  updated_at: string
  // Joined
  campaign?: Campaign
  profile?: Profile
}

export interface Invitation {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  invited_by: string | null
  token: string
  accepted: boolean
  expires_at: string
  created_at: string
}

export interface Subscription {
  id: string
  workspace_id: string
  lemon_squeezy_id: string | null
  plan: Plan
  status: string
  renews_at: string | null
  created_at: string
}

// ── Form types ──────────────────────────────

export interface CreateCampaignInput {
  name: string
  channel: string
  status: CampaignStatus
  start_date?: string
  end_date?: string
  budget_daily?: number
  budget_currency?: string
  goal?: string
}

export interface CreateChangeLogInput {
  campaign_id: string
  change_type: ChangeType
  title: string
  reason?: string
  before_value?: string
  after_value?: string
  expected_impact?: ExpectedImpact
  tags?: string[]
}

export interface UpdateOutcomeInput {
  outcome: Outcome
  outcome_note?: string
}

// ── Dashboard stat types ────────────────────

export interface WorkspaceStats {
  total_changes: number
  changes_this_week: number
  active_campaigns: number
  paused_campaigns: number
  team_members: number
  flagged_items: number
  outcome_tracked_pct: number
  positive_outcome_pct: number
}

export interface CampaignWithStats extends Campaign {
  change_count: number
  recent_change_at: string | null
  weekly_change_count: number
}

export interface MemberActivity {
  profile: Profile
  change_count: number
  last_active: string | null
}

// ── Plan limits ─────────────────────────────

export const PLAN_LIMITS: Record<Plan, { campaigns: number; members: number; history_days: number }> = {
  free:  { campaigns: 2,   members: 2,   history_days: 30  },
  pro:   { campaigns: 20,  members: 5,   history_days: 365 },
  team:  { campaigns: 999, members: 25,  history_days: 999 },
}
