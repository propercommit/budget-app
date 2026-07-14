-- Tighten avatars bucket: writes scoped to the caller's own uid.

-- Self-contained: DROP IF EXISTS + CREATE, never ALTER (see note below).
drop policy if exists "Users can upload avatars 1oj01fe_0" on storage.objects;
drop policy if exists "Users can upload avatars 1oj01fe_1" on storage.objects;
drop policy if exists "Users can upload avatars 1oj01fe_2" on storage.objects;
drop policy if exists "Users can upload avatars 1oj01fe_3" on storage.objects;

-- READ: unchanged — public bucket, so this stays bucket-scoped.
create policy "avatars_select" on storage.objects
  for select to authenticated
  using ( bucket_id = 'avatars' );

-- CREATE: only files named avatars/<your-uid>-...
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name like 'avatars/' || auth.uid()::text || '-%'
  );

-- UPDATE: only your own files, and the result stays yours.
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using      ( bucket_id = 'avatars' and name like 'avatars/' || auth.uid()::text || '-%' )
  with check ( bucket_id = 'avatars' and name like 'avatars/' || auth.uid()::text || '-%' );

-- DELETE: only your own files.
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'avatars' and name like 'avatars/' || auth.uid()::text || '-%' );