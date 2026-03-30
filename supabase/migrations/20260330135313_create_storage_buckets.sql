insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create
policy "Avatar images are publicly accessible"
on storage.objects for
select
    using (bucket_id = 'avatars');

create
policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);

create
policy "Users can update own avatar"
on storage.objects for
update
    using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
    );