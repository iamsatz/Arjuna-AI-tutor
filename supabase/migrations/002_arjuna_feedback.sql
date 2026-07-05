-- Parent session feedback + AI analysis
create table if not exists public.arjuna_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invite_code text,
  child_name text,
  submitted_by text not null check (submitted_by in ('mother', 'father')),
  raw_text text not null,
  analysis jsonb not null default '{}'::jsonb,
  session_id text
);

create index if not exists arjuna_feedback_created_at_idx
  on public.arjuna_feedback (created_at desc);

alter table public.arjuna_feedback enable row level security;

drop policy if exists "arjuna_feedback_insert" on public.arjuna_feedback;
create policy "arjuna_feedback_insert" on public.arjuna_feedback
  for insert to anon, authenticated with check (true);

drop policy if exists "arjuna_feedback_select" on public.arjuna_feedback;
create policy "arjuna_feedback_select" on public.arjuna_feedback
  for select to anon, authenticated using (true);
