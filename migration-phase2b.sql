-- Migration Phase 2b — Collections & mémoire de style
-- À exécuter dans Supabase > SQL Editor

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  style_notes text,
  created_at timestamptz not null default now()
);

alter table book_projects add column if not exists collection_id uuid references collections(id) on delete set null;

alter table collections enable row level security;

create policy "Users can manage their own collections"
  on collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_collections_user_id on collections(user_id);
