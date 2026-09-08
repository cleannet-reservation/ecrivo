-- Migration Phase 3b — Clés API personnelles (BYOK : Bring Your Own Key)
-- À exécuter dans Supabase > SQL Editor

create table if not exists user_api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  anthropic_api_key text,
  openai_api_key text,
  updated_at timestamptz not null default now()
);

alter table user_api_keys enable row level security;

-- Contrairement à la table subscriptions, ici c'est bien l'utilisateur lui-même
-- qui gère ses propres clés : il peut les lire, les créer, les modifier, les supprimer.
create policy "Users can manage their own API keys"
  on user_api_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
