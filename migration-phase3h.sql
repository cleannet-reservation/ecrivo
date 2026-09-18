-- Migration Phase 3h — Super admin
-- À exécuter dans Supabase > SQL Editor

create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Pas de policy de lecture/écriture pour les utilisateurs classiques : cette table n'est
-- consultée QUE côté serveur avec la clé service_role (dans api/admin-data.js), jamais
-- exposée au client. RLS activé par défaut = personne ne peut la lire via l'API publique.
alter table admins enable row level security;

-- Pour te rendre administrateur, exécute ensuite (remplace par ton propre User ID Supabase,
-- visible dans Authentication > Users) :
-- insert into admins (user_id) values ('TON-USER-ID-ICI');
