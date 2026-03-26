-- users (extension of auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  username text unique not null,
  avatar_url text,
  display_role text,
  bio text,
  default_source_lang text default 'en',
  default_target_lang text default 'uk',
  daily_goal int default 10,
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

-- words
create table public.words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  word text not null,
  translations jsonb not null default '[]',
  examples jsonb not null default '[]',
  source_lang text not null,
  target_lang text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- collections
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  description text,
  source_lang text not null,
  target_lang text not null,
  is_public boolean default false,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- collection_words
create table public.collection_words (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete cascade not null,
  word_id uuid references public.words(id) on delete cascade not null,
  added_at timestamptz default now(),
  unique(collection_id, word_id)
);

-- collection_follows
create table public.collection_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  collection_id uuid references public.collections(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, collection_id)
);

-- word_progress
create table public.word_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  word_id uuid references public.words(id) on delete cascade not null,
  ease_factor float default 2.5,
  interval int default 0,
  repetitions int default 0,
  next_review_at timestamptz default now(),
  is_learned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, word_id)
);

-- user_streaks
create table public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null unique,
  current_streak int default 0,
  longest_streak int default 0,
  last_activity_at timestamptz,
  updated_at timestamptz default now()
);

-- badges
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon_url text
);

-- user_badges
create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  badge_id uuid references public.badges(id) on delete cascade not null,
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

-- api_keys
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  key text unique not null,
  name text not null,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

-- study_sessions
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  collection_ids jsonb not null default '[]',
  total_words int default 0,
  correct_answers int default 0,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- study_session_words
create table public.study_session_words (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.study_sessions(id) on delete cascade not null,
  word_id uuid references public.words(id) on delete cascade not null,
  format text not null check (format in ('flip', 'quiz', 'write')),
  is_correct boolean not null
);

-- RLS: users
alter table public.users enable row level security;
create policy "Public profiles are viewable by everyone" on public.users for select using (true);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- RLS: words
alter table public.words enable row level security;
create policy "Users can view own words" on public.words for select using (auth.uid() = user_id);
create policy "Users can insert own words" on public.words for insert with check (auth.uid() = user_id);
create policy "Users can update own words" on public.words for update using (auth.uid() = user_id);
create policy "Users can delete own words" on public.words for delete using (auth.uid() = user_id);

-- RLS: collections
alter table public.collections enable row level security;
create policy "Public collections viewable by everyone" on public.collections for select using (is_public = true or auth.uid() = user_id);
create policy "Users can insert own collections" on public.collections for insert with check (auth.uid() = user_id);
create policy "Users can update own collections" on public.collections for update using (auth.uid() = user_id);
create policy "Users can delete own collections" on public.collections for delete using (auth.uid() = user_id);

-- RLS: collection_words
alter table public.collection_words enable row level security;
create policy "Collection words viewable if collection is public or owned" on public.collection_words for select using (
  exists (select 1 from public.collections c where c.id = collection_id and (c.is_public = true or c.user_id = auth.uid()))
);
create policy "Users can manage words in own collections" on public.collection_words for all using (
  exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
);

-- RLS: collection_follows
alter table public.collection_follows enable row level security;
create policy "Users can view own follows" on public.collection_follows for select using (auth.uid() = user_id);
create policy "Users can follow collections" on public.collection_follows for insert with check (auth.uid() = user_id);
create policy "Users can unfollow collections" on public.collection_follows for delete using (auth.uid() = user_id);

-- RLS: word_progress
alter table public.word_progress enable row level security;
create policy "Users can manage own word progress" on public.word_progress for all using (auth.uid() = user_id);

-- RLS: user_streaks
alter table public.user_streaks enable row level security;
create policy "Streaks are publicly viewable" on public.user_streaks for select using (true);
create policy "Users can manage own streak" on public.user_streaks for all using (auth.uid() = user_id);

-- RLS: badges
alter table public.badges enable row level security;
create policy "Badges are publicly viewable" on public.badges for select using (true);

-- RLS: user_badges
alter table public.user_badges enable row level security;
create policy "User badges are publicly viewable" on public.user_badges for select using (true);
create policy "System can insert user badges" on public.user_badges for insert with check (auth.uid() = user_id);

-- RLS: api_keys
alter table public.api_keys enable row level security;
create policy "Users can manage own api keys" on public.api_keys for all using (auth.uid() = user_id);

-- RLS: study_sessions
alter table public.study_sessions enable row level security;
create policy "Users can manage own study sessions" on public.study_sessions for all using (auth.uid() = user_id);

-- RLS: study_session_words
alter table public.study_session_words enable row level security;
create policy "Users can manage own session words" on public.study_session_words for all using (
  exists (select 1 from public.study_sessions s where s.id = session_id and s.user_id = auth.uid())
);

-- Seed badges
insert into public.badges (slug, name, description) values
  ('first_word', 'Перше слово', 'Додано перше слово до словника'),
  ('words_10', '10 слів', 'Додано 10 слів до словника'),
  ('words_100', '100 слів', 'Додано 100 слів до словника'),
  ('streak_7', 'Тиждень поспіль', '7 днів навчання поспіль'),
  ('streak_30', 'Місяць поспіль', '30 днів навчання поспіль'),
  ('first_collection', 'Перша збірка', 'Створено першу збірку'),
  ('first_public', 'Публічна збірка', 'Опубліковано першу збірку'),
  ('first_follow', 'Підписка', 'Підписано на першу збірку');

-- Function: auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function: update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_words_updated_at before update on public.words
  for each row execute procedure public.update_updated_at_column();

create trigger update_collections_updated_at before update on public.collections
  for each row execute procedure public.update_updated_at_column();

create trigger update_word_progress_updated_at before update on public.word_progress
  for each row execute procedure public.update_updated_at_column();
