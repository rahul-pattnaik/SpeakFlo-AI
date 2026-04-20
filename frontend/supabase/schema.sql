create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  full_name text not null,
  english_level text not null default 'Beginner',
  learning_goal text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_sessions (
  id uuid primary key,
  user_id uuid not null,
  mode text not null,
  topic text,
  title text,
  status text not null default 'active',
  source text not null default 'local-fallback',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  session_score integer,
  summary jsonb default '{}'::jsonb
);

create table if not exists public.learning_session_events (
  id uuid primary key,
  session_id uuid not null references public.learning_sessions(id) on delete cascade,
  event_type text not null,
  user_input text,
  agent_output text,
  corrected_text text,
  explanation text,
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vocabulary_reviews (
  id uuid primary key,
  user_id uuid not null,
  word text not null,
  user_meaning text,
  user_sentence text not null,
  corrected_sentence text,
  needs_review boolean not null default false,
  learner_confident boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.weak_areas (
  id uuid primary key,
  user_id uuid not null,
  area_type text not null,
  area_key text not null,
  area_name text not null,
  error_count integer not null default 1,
  confidence_score integer not null default 50,
  recommended_mode text not null,
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_learning_sessions_user on public.learning_sessions(user_id, started_at desc);
create index if not exists idx_session_events_session on public.learning_session_events(session_id, created_at asc);
create index if not exists idx_vocabulary_reviews_user on public.vocabulary_reviews(user_id, created_at desc);
create index if not exists idx_weak_areas_user on public.weak_areas(user_id, last_seen_at desc);

alter table public.profiles enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.learning_session_events enable row level security;
alter table public.vocabulary_reviews enable row level security;
alter table public.weak_areas enable row level security;

drop policy if exists "profiles owner read" on public.profiles;
create policy "profiles owner read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles owner write" on public.profiles;
create policy "profiles owner write" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "sessions owner access" on public.learning_sessions;
create policy "sessions owner access" on public.learning_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "events owner access" on public.learning_session_events;
create policy "events owner access" on public.learning_session_events
  for all using (
    exists (
      select 1 from public.learning_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.learning_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "vocab owner access" on public.vocabulary_reviews;
create policy "vocab owner access" on public.vocabulary_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weak areas owner access" on public.weak_areas;
create policy "weak areas owner access" on public.weak_areas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
