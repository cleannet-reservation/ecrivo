-- Migration Phase 2i — Cibles de pages/chapitres choisies dès la création
-- À exécuter dans Supabase > SQL Editor

alter table book_projects add column if not exists target_pages int;
alter table book_projects add column if not exists target_chapters int;
