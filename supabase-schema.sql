-- ─── html-tools Supabase Schema ───────────────────────────────────
-- Run this in the Supabase SQL editor (Database → SQL Editor → New query)


-- ── 1. tool_memory table ────────────────────────────────────────────
-- Stores key/value pairs per user per tool.
-- The `value` column is jsonb so it can hold any JSON-serialisable data.

create table if not exists public.tool_memory (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tool_id    text not null,
  key        text not null,
  value      jsonb,
  updated_at timestamptz default now(),
  unique (user_id, tool_id, key)
);

-- Keep updated_at fresh on upsert
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


-- ── 2. Row-Level Security (RLS) ─────────────────────────────────────
-- Users can only read and write their own rows.

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


-- ── 3. Storage bucket ───────────────────────────────────────────────
-- Create this in Supabase Dashboard → Storage → New bucket
-- Name: tool-files
-- Set to Private (not public)
-- Then add the RLS policies below.

-- Storage RLS policies (run after creating the bucket):
-- Dashboard → Storage → tool-files → Policies → New policy

-- Allow users to manage their own folder:
-- Policy name:  "User manages own files"
-- Allowed operations: SELECT, INSERT, UPDATE, DELETE
-- Policy definition:
--   (auth.uid()::text) = (storage.foldername(name))[2]
--
-- The path structure is:  {tool_id}/{user_id}/{filename}
-- So foldername()[2] gives the user_id segment.


-- ── 4. Enable Google Auth ───────────────────────────────────────────
-- Dashboard → Authentication → Providers → Google → Enable
-- Add your Google OAuth client ID and secret.
-- Set the redirect URL in Google Cloud Console to:
--   https://<your-project>.supabase.co/auth/v1/callback
