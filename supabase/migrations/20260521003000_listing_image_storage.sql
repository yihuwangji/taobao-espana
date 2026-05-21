insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Anyone can upload listing images'
  ) then
    create policy "Anyone can upload listing images"
      on storage.objects
      for insert
      to anon, authenticated
      with check (bucket_id = 'listing-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete own listing images'
  ) then
    create policy "Users can delete own listing images"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'listing-images' and owner = auth.uid());
  end if;
end $$;
