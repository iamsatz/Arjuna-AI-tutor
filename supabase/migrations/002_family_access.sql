-- Family password + multi-child per invite (run after 001_arjuna_mvp.sql)

alter table public.arjuna_invites
  add column if not exists family_password_hash text,
  add column if not exists setup_complete boolean not null default false;

create table if not exists public.arjuna_family_children (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null references public.arjuna_invites (code) on delete cascade,
  child_name text not null,
  grade text,
  board text,
  created_at timestamptz not null default now()
);

create unique index if not exists arjuna_family_children_name_idx
  on public.arjuna_family_children (invite_code, lower(child_name));

create index if not exists arjuna_family_children_invite_idx
  on public.arjuna_family_children (invite_code);

alter table public.arjuna_family_children enable row level security;

drop policy if exists "arjuna_family_children_all" on public.arjuna_family_children;
create policy "arjuna_family_children_all" on public.arjuna_family_children
  for all to anon, authenticated using (true) with check (true);

-- Migrate legacy single-child claims into family_children
insert into public.arjuna_family_children (invite_code, child_name, grade, board, created_at)
select i.code, i.child_name, i.grade, i.board, coalesce(i.claimed_at, i.created_at)
from public.arjuna_invites i
where i.child_name is not null
  and not exists (
    select 1 from public.arjuna_family_children c
    where c.invite_code = i.code
      and lower(c.child_name) = lower(i.child_name)
  );

update public.arjuna_invites
set setup_complete = true
where child_name is not null and setup_complete = false;
