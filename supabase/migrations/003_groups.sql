-- Groups for organising contacts
create table groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(user_id, name)
);

alter table contacts add column group_id uuid references groups(id) on delete set null;

alter table groups enable row level security;
create policy "own groups" on groups for all using (auth.uid() = user_id);

grant select, insert, update, delete on public.groups to anon;
grant select, insert, update, delete on public.groups to authenticated;
