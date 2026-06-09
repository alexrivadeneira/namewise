-- ─── Extensions ───────────────────────────────────────────────────────────────

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  group_id uuid, -- set after groups table is created below
  summary text,  -- cached AI-generated relationship summary, cleared when new dictations are linked
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table dictations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

create table contacts_dictations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  dictation_id uuid not null references dictations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique(contact_id, dictation_id)
);

create table contacts_aliases (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  alias_id uuid not null references aliases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique(contact_id, alias_id)
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(user_id, name)
);

-- Add FK from contacts to groups now that groups exists
alter table contacts
  add constraint contacts_group_id_fkey
  foreign key (group_id) references groups(id) on delete set null;

-- ─── Triggers ─────────────────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table contacts enable row level security;
alter table aliases enable row level security;
alter table dictations enable row level security;
alter table contacts_dictations enable row level security;
alter table contacts_aliases enable row level security;
alter table groups enable row level security;

create policy "own contacts" on contacts for all using (auth.uid() = user_id);
create policy "own aliases" on aliases for all using (auth.uid() = user_id);
create policy "own dictations" on dictations for all using (auth.uid() = user_id);
create policy "own contacts_dictations" on contacts_dictations for all using (auth.uid() = user_id);
create policy "own contacts_aliases" on contacts_aliases for all using (auth.uid() = user_id);
create policy "own groups" on groups for all using (auth.uid() = user_id);

-- ─── Grants ───────────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.contacts to anon, authenticated;
grant select, insert, update, delete on public.aliases to anon, authenticated;
grant select, insert, update, delete on public.dictations to anon, authenticated;
grant select, insert, update, delete on public.contacts_dictations to anon, authenticated;
grant select, insert, update, delete on public.contacts_aliases to anon, authenticated;
grant select, insert, update, delete on public.groups to anon, authenticated;
