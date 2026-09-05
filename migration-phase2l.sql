-- Migration Phase 2l — Couverture générée
-- À exécuter dans Supabase > SQL Editor

alter table book_projects add column if not exists cover_image_url text;
alter table book_projects add column if not exists cover_prompt text;
