
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-notes', 'voice-notes', true, 2097152, array['audio/webm','audio/ogg','audio/mp4','audio/mpeg'])
on conflict (id) do update set public = true;

create policy "Public can read voice notes"
on storage.objects for select
using (bucket_id = 'voice-notes');

create policy "Users can upload their own voice notes"
on storage.objects for insert
to authenticated
with check (bucket_id = 'voice-notes' and auth.uid()::text = (storage.foldername(name))[1]);
