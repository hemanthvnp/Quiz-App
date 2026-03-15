-- QFactor: Quiz Event Points Tracking System
-- Supabase SQL Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- EVENTS TABLE
-- ============================================
create table events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  date timestamptz not null,
  quiz_master text not null,
  quiz_master_email text not null,
  moderators jsonb default '[]'::jsonb,
  number_of_rounds integer not null default 1,
  points_system text,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'completed')),
  current_round_id uuid,
  current_question integer not null default 0,
  created_at timestamptz default now()
);

-- ============================================
-- ROUNDS TABLE
-- ============================================
create table rounds (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  round_name text not null,
  round_number integer not null default 1,
  description text,
  bounce_points integer not null default 10,
  pounce_plus integer not null default 15,
  pounce_minus integer not null default -5,
  question_count integer not null default 10,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed')),
  created_at timestamptz default now()
);

-- ============================================
-- TEAMS TABLE
-- ============================================
create table teams (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  lead text not null,
  created_at timestamptz default now()
);

-- ============================================
-- PARTICIPANTS TABLE
-- ============================================
create table participants (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  student_id text,
  email text,
  phone text,
  created_at timestamptz default now()
);

-- ============================================
-- SCORES TABLE
-- ============================================
create table scores (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  question_number integer not null,
  action_type text not null check (action_type in ('bounce', 'pounce_plus', 'pounce_minus', 'buzzer', 'buzzer_minus', 'bonus')),
  points integer not null,
  winning_team_id uuid references teams(id),
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_rounds_event_id on rounds(event_id);
create index idx_teams_event_id on teams(event_id);
create index idx_participants_team_id on participants(team_id);
create index idx_scores_event_id on scores(event_id);
create index idx_scores_round_id on scores(round_id);
create index idx_scores_team_id on scores(team_id);

-- ============================================
-- REALTIME: Enable realtime on scores and events
-- ============================================
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table teams;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- For this app, all tables are publicly readable.
-- In production, you would add proper RLS policies.

alter table events enable row level security;
alter table rounds enable row level security;
alter table teams enable row level security;
alter table participants enable row level security;
alter table scores enable row level security;

-- Public read access
create policy "Public read events" on events for select using (true);
create policy "Public read rounds" on rounds for select using (true);
create policy "Public read teams" on teams for select using (true);
create policy "Public read participants" on participants for select using (true);
create policy "Public read scores" on scores for select using (true);

-- Authenticated write access (admin via anon key for simplicity)
create policy "Allow all inserts on events" on events for insert with check (true);
create policy "Allow all updates on events" on events for update using (true);
create policy "Allow all deletes on events" on events for delete using (true);

create policy "Allow all inserts on rounds" on rounds for insert with check (true);
create policy "Allow all updates on rounds" on rounds for update using (true);
create policy "Allow all deletes on rounds" on rounds for delete using (true);

create policy "Allow all inserts on teams" on teams for insert with check (true);
create policy "Allow all updates on teams" on teams for update using (true);
create policy "Allow all deletes on teams" on teams for delete using (true);

create policy "Allow all inserts on participants" on participants for insert with check (true);
create policy "Allow all updates on participants" on participants for update using (true);
create policy "Allow all deletes on participants" on participants for delete using (true);

create policy "Allow all inserts on scores" on scores for insert with check (true);
create policy "Allow all updates on scores" on scores for update using (true);
create policy "Allow all deletes on scores" on scores for delete using (true);
