-- Arjuna MVP tables (merge into existing Supabase project)
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/shikwtguxfhefzvfkedo/sql

create table if not exists public.arjuna_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  device text,
  device_mode text,
  invite_code text,
  child_name text,
  language_mode text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists arjuna_events_created_at_idx on public.arjuna_events (created_at desc);
create index if not exists arjuna_events_event_type_idx on public.arjuna_events (event_type);

create table if not exists public.arjuna_rooms (
  code text primary key,
  state jsonb not null default '{}'::jsonb,
  tv_linked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.arjuna_events enable row level security;
alter table public.arjuna_rooms enable row level security;

drop policy if exists "arjuna_events_insert" on public.arjuna_events;
create policy "arjuna_events_insert" on public.arjuna_events
  for insert to anon, authenticated with check (true);

drop policy if exists "arjuna_events_select" on public.arjuna_events;
create policy "arjuna_events_select" on public.arjuna_events
  for select to anon, authenticated using (true);

drop policy if exists "arjuna_rooms_all" on public.arjuna_rooms;
create policy "arjuna_rooms_all" on public.arjuna_rooms
  for all to anon, authenticated using (true) with check (true);

-- Enable Realtime (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.arjuna_rooms;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.arjuna_exams (
  id uuid primary key default gen_random_uuid(),
  profile_id text,
  invite_code text not null,
  child_name text not null,
  subject text not null,
  board text,
  grade text,
  exam_date date,
  topics jsonb not null default '[]'::jsonb,
  concept_notes text,
  page_count int not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists arjuna_exams_invite_code_idx on public.arjuna_exams (invite_code);
create index if not exists arjuna_exams_profile_id_idx on public.arjuna_exams (profile_id);
create index if not exists arjuna_exams_exam_date_idx on public.arjuna_exams (exam_date);

alter table public.arjuna_exams enable row level security;

drop policy if exists "arjuna_exams_all" on public.arjuna_exams;
create policy "arjuna_exams_all" on public.arjuna_exams
  for all to anon, authenticated using (true) with check (true);

create table if not exists public.arjuna_invites (
  code text primary key,
  label text,
  child_name text,
  grade text,
  board text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

alter table public.arjuna_invites enable row level security;

drop policy if exists "arjuna_invites_all" on public.arjuna_invites;
create policy "arjuna_invites_all" on public.arjuna_invites
  for all to anon, authenticated using (true) with check (true);

create table if not exists public.arjuna_curricula (
  id uuid primary key default gen_random_uuid(),
  school_key text not null unique,
  school_name text not null,
  grade text not null,
  board text,
  term text,
  subjects jsonb not null default '[]'::jsonb,
  raw_text text,
  created_at timestamptz not null default now()
);

create index if not exists arjuna_curricula_school_key_idx on public.arjuna_curricula (school_key);

alter table public.arjuna_curricula enable row level security;

drop policy if exists "arjuna_curricula_all" on public.arjuna_curricula;
create policy "arjuna_curricula_all" on public.arjuna_curricula
  for all to anon, authenticated using (true) with check (true);

create table if not exists public.arjuna_memory (
  id uuid primary key default gen_random_uuid(),
  school_key text not null,
  kind text not null,
  topic_key text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists arjuna_memory_lookup_idx
  on public.arjuna_memory (school_key, kind, topic_key);

alter table public.arjuna_memory enable row level security;

drop policy if exists "arjuna_memory_all" on public.arjuna_memory;
create policy "arjuna_memory_all" on public.arjuna_memory
  for all to anon, authenticated using (true) with check (true);

create table if not exists public.arjuna_student_memory (
  student_key text primary key,
  invite_code text,
  child_name text,
  school_key text,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists arjuna_student_memory_invite_idx
  on public.arjuna_student_memory (invite_code);

alter table public.arjuna_student_memory enable row level security;

drop policy if exists "arjuna_student_memory_all" on public.arjuna_student_memory;
create policy "arjuna_student_memory_all" on public.arjuna_student_memory
  for all to anon, authenticated using (true) with check (true);
