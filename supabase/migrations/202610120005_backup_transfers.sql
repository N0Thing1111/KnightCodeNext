begin;
-- No client SELECT/INSERT policies: access only through server-issued signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('school-backup-transfers','school-backup-transfers',false,33554432,array['application/octet-stream'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
commit;
