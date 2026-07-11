-- 1. API keys: store a SHA-256 hash instead of the plaintext key.
--    Existing keys keep working — they are hashed in place during migration.
create extension if not exists pgcrypto;

alter table public.api_keys add column if not exists key_hash text;
update public.api_keys set key_hash = encode(digest(key, 'sha256'), 'hex') where key_hash is null;
alter table public.api_keys alter column key_hash set not null;
alter table public.api_keys add constraint api_keys_key_hash_key unique (key_hash);
alter table public.api_keys drop column key;

-- 2. Follower counts: follows were only visible to the follower themselves,
--    so every follower count in the catalog rendered as 0 or 1.
--    Follows of public collections (and of one's own collections) are visible.
drop policy "Users can view own follows" on public.collection_follows;
create policy "Follows of public collections are viewable"
  on public.collection_follows for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (c.is_public or c.user_id = auth.uid())
    )
  );

-- 3. Public profile stats: word_progress is (correctly) private, so the
--    profile page always showed 0 learned words for anyone but the owner.
--    Expose only the aggregate through a definer function.
create or replace function public.get_public_profile_stats(profile_id uuid)
returns table (learned_count bigint)
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint as learned_count
  from word_progress wp
  where wp.user_id = profile_id and wp.is_learned
$$;

grant execute on function public.get_public_profile_stats(uuid) to anon, authenticated;
