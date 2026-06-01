-- Enable anonymous auth (must also be enabled in Supabase dashboard)

-- contacts
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- aliases
create table aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- dictations
create table dictations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- contacts <-> dictations
create table contacts_dictations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  dictation_id uuid not null references dictations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique(contact_id, dictation_id)
);

-- contacts <-> aliases
create table contacts_aliases (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  alias_id uuid not null references aliases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique(contact_id, alias_id)
);

-- updated_at trigger for contacts
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

-- RLS: every table is locked to the owning user_id
alter table contacts enable row level security;
alter table aliases enable row level security;
alter table dictations enable row level security;
alter table contacts_dictations enable row level security;
alter table contacts_aliases enable row level security;

create policy "own contacts" on contacts for all using (auth.uid() = user_id);
create policy "own aliases" on aliases for all using (auth.uid() = user_id);
create policy "own dictations" on dictations for all using (auth.uid() = user_id);
create policy "own contacts_dictations" on contacts_dictations for all using (auth.uid() = user_id);
create policy "own contacts_aliases" on contacts_aliases for all using (auth.uid() = user_id);
