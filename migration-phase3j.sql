-- Migration Phase 3j — Accès offert par email
-- À exécuter dans Supabase > SQL Editor

create table if not exists granted_emails (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

-- Aucune policy d'accès client : cette table n'est lue/écrite QUE côté serveur avec la
-- clé service_role (dans api/admin-data.js et api/create-checkout-session.js).
alter table granted_emails enable row level security;
