begin;
update public.teacher_import_batches b set result=jsonb_set(b.result,'{created}',
 (select coalesce(jsonb_agg(r - 'temp_password'),'[]'::jsonb) from jsonb_array_elements(b.result->'created') r))
where b.id in (select id from public.teacher_import_batches where jsonb_typeof(result->'created')='array');
commit;
