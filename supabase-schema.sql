-- html-tools Supabase schema
-- Run this in the Supabase SQL editor.

-- 1. tool_memory
create table if not exists public.tool_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, tool_id, key)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tool_memory_updated_at on public.tool_memory;
create trigger tool_memory_updated_at
  before update on public.tool_memory
  for each row execute procedure public.set_updated_at();

alter table public.tool_memory enable row level security;

create policy "Users read own memory"
  on public.tool_memory for select
  using (auth.uid() = user_id);

create policy "Users write own memory"
  on public.tool_memory for insert
  with check (auth.uid() = user_id);

create policy "Users update own memory"
  on public.tool_memory for update
  using (auth.uid() = user_id);

create policy "Users delete own memory"
  on public.tool_memory for delete
  using (auth.uid() = user_id);

-- 2. tool_library
create table if not exists public.tool_library (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null default 'tools',
  icon text not null default '*',
  kind text not null default 'html',
  version integer not null default 0,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

drop trigger if exists tool_library_updated_at on public.tool_library;
create trigger tool_library_updated_at
  before update on public.tool_library
  for each row execute procedure public.set_updated_at();

alter table public.tool_library enable row level security;

create policy "Users read own tools"
  on public.tool_library for select
  using (auth.uid() = user_id);

create policy "Users write own tools"
  on public.tool_library for insert
  with check (auth.uid() = user_id);

create policy "Users update own tools"
  on public.tool_library for update
  using (auth.uid() = user_id);

create policy "Users delete own tools"
  on public.tool_library for delete
  using (auth.uid() = user_id);

-- 3. tool_library_versions
create table if not exists public.tool_library_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  version integer not null,
  html text not null,
  entry_path text not null default 'index.html',
  commit_message text not null default 'update tool',
  created_at timestamptz not null default now(),
  unique (user_id, tool_id, version)
);

alter table public.tool_library_versions enable row level security;

create policy "Users read own tool versions"
  on public.tool_library_versions for select
  using (auth.uid() = user_id);

create policy "Users write own tool versions"
  on public.tool_library_versions for insert
  with check (auth.uid() = user_id);

create policy "Users update own tool versions"
  on public.tool_library_versions for update
  using (auth.uid() = user_id);

create policy "Users delete own tool versions"
  on public.tool_library_versions for delete
  using (auth.uid() = user_id);

-- 4. Storage bucket
-- Create a private bucket named tool-files.
-- Policy for files:
--   (auth.uid()::text) = (storage.foldername(name))[2]
-- The folder structure is {tool_id}/{user_id}/{filename}

-- 5. Google Auth
-- Enable Google under Authentication > Providers.
-- Add the Supabase callback URL to your Google OAuth settings.
