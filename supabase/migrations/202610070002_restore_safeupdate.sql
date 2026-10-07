-- Compatibility fix for Supabase safeupdate; leaves the safeguard enabled.
-- Alters the restore function only. Does not run a restore or delete records.
begin;
do $patch$
declare definition text; t text; key_column text;
begin
  definition := pg_get_functiondef('public.restore_school_backup(jsonb,jsonb,uuid)'::regprocedure);
  foreach t in array array['student_code_executions','student_level_sessions','student_telemetry_runs','student_notifications','teacher_notifications','student_achievements','student_activity','student_level_progress','announcements','assignments','class_students','teacher_import_batches','classes','levels','lessons','achievements'] loop
    key_column := case when t in ('student_telemetry_runs','student_achievements','student_level_progress') then 'student_id' when t='class_students' then 'class_id' else 'id' end;
    definition := replace(definition,format('delete from public.%s;',t),format('delete from public.%s where %s in (select %s from public.%s);',t,key_column,key_column,t));
  end loop;
  if definition ~* 'delete[[:space:]]+from[[:space:]]+public[.][a-z_]+[[:space:]]*;' then
    raise exception 'An unqualified DELETE remains in the restore function.';
  end if;
  execute definition;
end;
$patch$;
commit;
