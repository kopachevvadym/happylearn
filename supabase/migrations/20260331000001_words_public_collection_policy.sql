-- Allow anyone to read words that belong to at least one public collection
create policy "Words in public collections are viewable by all"
  on public.words for select
  using (
    exists (
      select 1
      from public.collection_words cw
      join public.collections c on c.id = cw.collection_id
      where cw.word_id = words.id
        and c.is_public = true
    )
  );
