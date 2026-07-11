-- The app treats these columns as always present, but they were created
-- nullable-with-default. Backfill any NULLs, then enforce NOT NULL so the
-- generated types stop forcing null-guards through the codebase.

-- words
update public.words set created_at = now() where created_at is null;
update public.words set updated_at = now() where updated_at is null;
alter table public.words
  alter column created_at set not null,
  alter column updated_at set not null;

-- collections
update public.collections set is_public = false where is_public is null;
update public.collections set is_default = false where is_default is null;
update public.collections set created_at = now() where created_at is null;
update public.collections set updated_at = now() where updated_at is null;
alter table public.collections
  alter column is_public set not null,
  alter column is_default set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

-- word_progress
update public.word_progress set ease_factor = 2.5 where ease_factor is null;
update public.word_progress set interval = 0 where interval is null;
update public.word_progress set repetitions = 0 where repetitions is null;
update public.word_progress set next_review_at = now() where next_review_at is null;
update public.word_progress set is_learned = false where is_learned is null;
update public.word_progress set created_at = now() where created_at is null;
update public.word_progress set updated_at = now() where updated_at is null;
alter table public.word_progress
  alter column ease_factor set not null,
  alter column interval set not null,
  alter column repetitions set not null,
  alter column next_review_at set not null,
  alter column is_learned set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

-- user_streaks
update public.user_streaks set current_streak = 0 where current_streak is null;
update public.user_streaks set longest_streak = 0 where longest_streak is null;
alter table public.user_streaks
  alter column current_streak set not null,
  alter column longest_streak set not null;

-- study_sessions
update public.study_sessions set started_at = coalesce(finished_at, now()) where started_at is null;
update public.study_sessions set total_words = 0 where total_words is null;
update public.study_sessions set correct_answers = 0 where correct_answers is null;
alter table public.study_sessions
  alter column started_at set not null,
  alter column total_words set not null,
  alter column correct_answers set not null;

-- api_keys
update public.api_keys set created_at = now() where created_at is null;
alter table public.api_keys
  alter column created_at set not null;
