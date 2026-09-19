-- Migration Phase 3k — Liens d'essai (24h)
-- À exécuter dans Supabase > SQL Editor

create table if not exists trial_links (
  token text primary key,
  created_at timestamptz not null default now(),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);

-- Aucune policy d'accès client : cette table n'est lue/écrite QUE côté serveur avec la
-- clé service_role (dans api/admin-data.js et api/create-checkout-session.js).
alter table trial_links enable row level security;
