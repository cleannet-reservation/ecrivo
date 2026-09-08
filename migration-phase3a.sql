-- Migration Phase 3a — Abonnements Stripe
-- À exécuter dans Supabase > SQL Editor

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text, -- 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | ...
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- Les utilisateurs peuvent SEULEMENT lire leur propre ligne.
-- Aucune policy d'écriture pour eux : seul le webhook Stripe (via la clé service_role,
-- qui contourne RLS) peut créer/modifier une ligne. Ça empêche un utilisateur de
-- s'auto-attribuer un abonnement actif en modifiant les données côté client.
create policy "Users can read their own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

create index if not exists idx_subscriptions_stripe_sub_id on subscriptions(stripe_subscription_id);
