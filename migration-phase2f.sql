-- Migration Phase 2f — Suites de livres
-- À exécuter dans Supabase > SQL Editor

alter table book_projects add column if not exists continuity_notes text;
alter table book_projects add column if not exists sequel_of uuid references book_projects(id) on delete set null;
