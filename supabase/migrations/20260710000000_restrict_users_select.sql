-- The previous policy ("using (true)") exposed every column of public.users —
-- including email — to anyone holding the public anon key.

drop policy "Public profiles are viewable by everyone" on public.users;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

-- Safe public projection for profile pages and author bylines.
-- security_invoker = off: the view reads base rows with its owner's
-- privileges, so callers see these columns without access to the base table.
create or replace view public.public_profiles
with (security_invoker = off) as
  select id, username, avatar_url, display_role, bio,
         default_source_lang, default_target_lang, created_at
  from public.users;

grant select on public.public_profiles to anon, authenticated;
