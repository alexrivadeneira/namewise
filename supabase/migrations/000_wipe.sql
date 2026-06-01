-- Drop all tables in the public schema
do $$ declare
  r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute 'drop table if exists public.' || quote_ident(r.tablename) || ' cascade';
  end loop;
end $$;

-- Drop all custom types/enums
do $$ declare
  r record;
begin
  for r in (select typname from pg_type where typnamespace = 'public'::regnamespace and typtype = 'e') loop
    execute 'drop type if exists public.' || quote_ident(r.typname) || ' cascade';
  end loop;
end $$;
