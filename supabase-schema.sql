-- À exécuter dans Supabase > SQL Editor

create table if not exists book_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  genre text,
  book_type text not null default 'roman', -- 'roman' | 'carnet'
  status text not null default 'concept', -- 'concept' | 'plan' | 'writing' | 'done'
  concept jsonb,
  created_at timestamptz not null default now()
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references book_projects(id) on delete cascade,
  order_index int not null,
  title text,
  summary text,
  content text default '',
  status text not null default 'planned', -- 'planned' | 'drafted' | 'edited'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security : chaque utilisateur ne voit que ses propres projets
alter table book_projects enable row level security;
alter table chapters enable row level security;

create policy "Users can manage their own projects"
  on book_projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage chapters of their own projects"
  on chapters for all
  using (
    exists (
      select 1 from book_projects
      where book_projects.id = chapters.project_id
      and book_projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from book_projects
      where book_projects.id = chapters.project_id
      and book_projects.user_id = auth.uid()
    )
  );

create index if not exists idx_chapters_project_id on chapters(project_id);
create index if not exists idx_book_projects_user_id on book_projects(user_id);
