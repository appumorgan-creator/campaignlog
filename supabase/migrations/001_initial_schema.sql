-- ============================================
-- CampaignLog — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. WORKSPACES
-- ============================================
create table workspaces (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  plan        text not null default 'free' check (plan in ('free','pro','team')),
  logo_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================
-- 2. PROFILES (extends Supabase auth.users)
-- ============================================
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  workspace_id    uuid references workspaces(id) on delete set null,
  full_name       text,
  email           text unique not null,
  role            text not null default 'member' check (role in ('admin','member','viewer')),
  marketing_role  text,   -- "Paid Media", "Creative Lead", "Email & CRM", etc.
  avatar_color    text not null default '#4f46e5',
  avatar_initials text,
  invited_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================
-- 3. CAMPAIGNS
-- ============================================
create table campaigns (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  name            text not null,
  channel         text,     -- "Google Ads", "Meta", "HubSpot Email", etc.
  status          text not null default 'active' check (status in ('active','paused','ended','draft')),
  start_date      date,
  end_date        date,
  budget_daily    numeric,
  budget_currency text default 'INR',
  goal            text,     -- campaign objective
  health_score    integer default 0 check (health_score between 0 and 100),
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================
-- 4. CHANGE LOGS (core table)
-- ============================================
create table change_logs (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  created_by      uuid not null references profiles(id),

  -- What changed
  change_type     text not null check (change_type in (
    'budget','creative','audience','pause','launch',
    'copy','targeting','platform','note'
  )),
  title           text not null,
  reason          text,
  before_value    text,
  after_value     text,
  expected_impact text check (expected_impact in ('positive','negative','neutral')),
  tags            text[] default '{}',

  -- Outcome (filled in later)
  outcome         text check (outcome in ('positive','negative','neutral','pending','none')),
  outcome_note    text,
  outcome_at      timestamptz,

  -- Flags
  flagged         boolean not null default false,
  flagged_by      uuid references profiles(id),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================
-- 5. INVITATIONS
-- ============================================
create table invitations (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references workspaces(id) on delete cascade,
  email           text not null,
  role            text not null default 'member',
  invited_by      uuid references profiles(id),
  token           text unique not null default encode(gen_random_bytes(32), 'hex'),
  accepted        boolean default false,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  created_at      timestamptz not null default now()
);

-- ============================================
-- 6. SUBSCRIPTIONS
-- ============================================
create table subscriptions (
  id                  uuid primary key default uuid_generate_v4(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  lemon_squeezy_id    text unique,
  lemon_customer_id   text,
  plan                text not null default 'free',
  status              text not null default 'active',
  renews_at           timestamptz,
  trial_ends_at       timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================
-- INDEXES — for fast queries
-- ============================================
create index idx_change_logs_workspace    on change_logs(workspace_id);
create index idx_change_logs_campaign     on change_logs(campaign_id);
create index idx_change_logs_created_by   on change_logs(created_by);
create index idx_change_logs_created_at   on change_logs(created_at desc);
create index idx_change_logs_type         on change_logs(change_type);
create index idx_change_logs_outcome      on change_logs(outcome);
create index idx_campaigns_workspace      on campaigns(workspace_id);
create index idx_campaigns_status         on campaigns(status);
create index idx_profiles_workspace       on profiles(workspace_id);

-- ============================================
-- HEALTH SCORE FUNCTION
-- Auto-computes campaign health based on
-- log completeness + outcome tracking rate
-- ============================================
create or replace function compute_health_score(p_campaign_id uuid)
returns integer language plpgsql as $$
declare
  total_logs      integer;
  with_reason     integer;
  with_outcome    integer;
  with_before     integer;
  score           integer;
begin
  select count(*) into total_logs
  from change_logs where campaign_id = p_campaign_id;

  if total_logs = 0 then return 0; end if;

  select count(*) into with_reason
  from change_logs where campaign_id = p_campaign_id and reason is not null and reason != '';

  select count(*) into with_outcome
  from change_logs where campaign_id = p_campaign_id and outcome is not null and outcome != 'pending';

  select count(*) into with_before
  from change_logs where campaign_id = p_campaign_id and before_value is not null;

  -- Weighted score: reason 40%, outcome 40%, before/after 20%
  score := round(
    (with_reason::float / total_logs * 40) +
    (with_outcome::float / total_logs * 40) +
    (with_before::float  / total_logs * 20)
  );

  return least(score, 100);
end;
$$;

-- ============================================
-- TRIGGER — auto-update campaign health score
-- ============================================
create or replace function update_campaign_health()
returns trigger language plpgsql as $$
begin
  update campaigns
  set health_score = compute_health_score(NEW.campaign_id),
      updated_at   = now()
  where id = NEW.campaign_id;
  return NEW;
end;
$$;

create trigger trg_update_health
after insert or update on change_logs
for each row execute function update_campaign_health();

-- ============================================
-- TRIGGER — auto-create profile on signup
-- ============================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, avatar_initials)
  values (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    upper(left(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.email), 1))
  );
  return NEW;
end;
$$;

create trigger trg_new_user
after insert on auth.users
for each row execute function handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table workspaces    enable row level security;
alter table profiles      enable row level security;
alter table campaigns     enable row level security;
alter table change_logs   enable row level security;
alter table invitations   enable row level security;
alter table subscriptions enable row level security;

-- Workspaces: members can read their own workspace
create policy "workspace_read" on workspaces
  for select using (
    id in (select workspace_id from profiles where id = auth.uid())
  );

create policy "workspace_insert" on workspaces
  for insert with check (true);

create policy "workspace_update" on workspaces
  for update using (
    id in (select workspace_id from profiles where id = auth.uid() and role = 'admin')
  );

-- Profiles: users see members of their workspace
create policy "profiles_read" on profiles
  for select using (
    workspace_id in (select workspace_id from profiles where id = auth.uid())
    or id = auth.uid()
  );

create policy "profiles_update" on profiles
  for update using (id = auth.uid());

-- Campaigns: workspace members only
create policy "campaigns_read" on campaigns
  for select using (
    workspace_id in (select workspace_id from profiles where id = auth.uid())
  );

create policy "campaigns_write" on campaigns
  for all using (
    workspace_id in (select workspace_id from profiles where id = auth.uid())
  );

-- Change logs: workspace members only
create policy "changelogs_read" on change_logs
  for select using (
    workspace_id in (select workspace_id from profiles where id = auth.uid())
  );

create policy "changelogs_write" on change_logs
  for all using (
    workspace_id in (select workspace_id from profiles where id = auth.uid())
  );

-- Invitations: admins only
create policy "invitations_read" on invitations
  for select using (
    workspace_id in (select workspace_id from profiles where id = auth.uid() and role = 'admin')
    or email = (select email from profiles where id = auth.uid())
  );

create policy "invitations_write" on invitations
  for all using (
    workspace_id in (select workspace_id from profiles where id = auth.uid() and role = 'admin')
  );

-- Subscriptions: admins only
create policy "subscriptions_read" on subscriptions
  for select using (
    workspace_id in (select workspace_id from profiles where id = auth.uid())
  );
