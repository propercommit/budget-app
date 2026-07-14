-- Private receipts bucket; 10 MB storage-layer cap per object (10485760 bytes).
-- No storage.objects policies are needed (and none could be created here — the
-- postgres role db push connects as does not own storage.objects): the server
-- uses the service role, which bypasses RLS entirely; clients upload only with
-- a signed upload token ("objects table permissions: none" per storage-js) and
-- read only via server-minted signed URLs.
-- allowed_mime_types checks the client-DECLARED Content-Type only; the
-- authoritative content gate is the confirm step's magic-byte sniff
-- (lib/receipt-validation.ts). This array and the sniff list change together.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
