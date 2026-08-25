-- Migration Phase 2 — à exécuter dans Supabase > SQL Editor
-- (uniquement si tu as déjà exécuté supabase-schema.sql lors de la Phase 1)

alter table book_projects add column if not exists listing jsonb;
