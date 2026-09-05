-- Migration Phase 2m — 4e de couverture
-- À exécuter dans Supabase > SQL Editor

alter table book_projects add column if not exists back_cover_text text;
