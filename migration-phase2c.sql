-- Migration Phase 2c — Templates carnets
-- À exécuter dans Supabase > SQL Editor

alter table book_projects add column if not exists carnet_config jsonb;
