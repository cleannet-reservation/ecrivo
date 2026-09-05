-- Migration Phase 2o — Image de 4e de couverture
-- À exécuter dans Supabase > SQL Editor

alter table book_projects add column if not exists back_cover_image_url text;
alter table book_projects add column if not exists back_cover_image_prompt text;
