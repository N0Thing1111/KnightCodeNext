-- Availability and atomic school operations. Applying this file does NOT clear or restore data.
begin;
alter table public.levels add column build_available boolean not null default false;
update public.levels set build_available=true where level_number in (1,2,3,4,5,6,7,13);

create or replace function public.python_can_start(p_activity uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.python_role()='student' and exists (
  select 1 from public.python_activities a join public.lessons l on l.id=a.lesson_id
  where a.id=p_activity and a.published and l.active
  and exists (
   select 1 from public.assignments assignment
   where assignment.lesson_id=a.lesson_id and assignment.level_id is null
   and public.is_current_student_teacher(auth.uid(),assignment.teacher_id)
   and (assignment.student_id=auth.uid() or exists (
    select 1 from public.class_students cs where cs.student_id=auth.uid() and cs.class_id=assignment.class_id
   ))
  )
  -- No playable game yet: Python is available. Previously started work stays available.
  and (exists(select 1 from public.python_runs r where r.student_id=auth.uid() and r.activity_id=a.id)
   or not exists (
    select 1 from public.levels v where v.lesson_id=a.lesson_id and v.active and v.build_available
    and not exists(select 1 from public.student_level_progress p where p.student_id=auth.uid() and p.level_id=v.id and p.completed)
   ))
 ),false)
$$;

-- Keep old v3 saves usable; they predate the availability column.
do $patch$ declare definition text; begin
 definition:=pg_get_functiondef('public.restore_school_backup(jsonb,jsonb,uuid)'::regprocedure);
 definition:=replace(definition,'-- These fields are UUID references only outside profiles.',
 $new$if t='levels' and not (row_data ? 'build_available') then
   row_data:=jsonb_set(row_data,'{build_available}',to_jsonb((row_data->>'level_number')::integer in (1,2,3,4,5,6,7,13)));
 end if;
 -- These fields are UUID references only outside profiles.$new$);
 execute definition;
end $patch$;

-- Lock the same tables in a consistent order for capture, clear, and restore.
create or replace function public.lock_school_snapshot() returns void
language plpgsql security definer set search_path='' set lock_timeout='5s' as $$
begin
 perform pg_advisory_xact_lock(7102026);
 lock table public.profiles,public.lessons,public.levels,public.classes,public.class_students,
 public.assignments,public.student_level_progress,public.student_activity,public.achievements,
 public.student_achievements,public.student_notifications,public.student_telemetry_runs,
 public.student_level_sessions,public.student_code_executions,public.announcements,
 public.teacher_notifications,public.python_activities,public.python_grants,public.python_drafts,
 public.python_runs,public.python_submissions,public.python_reviews in share row exclusive mode;
end $$;
revoke all on function public.lock_school_snapshot() from public,anon,authenticated;

create or replace function public.capture_school_backup(p_admin uuid) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='60s' set lock_timeout='5s' as $$
declare t text; rows jsonb; tables jsonb:='{}';
begin
 if not exists(select 1 from public.profiles where id=p_admin and role='admin' and active) then raise exception 'Administrator required.'; end if;
 perform public.lock_school_snapshot();
 foreach t in array array['profiles','lessons','levels','classes','class_students','assignments',
 'student_level_progress','student_activity','achievements','student_achievements','student_notifications',
 'student_telemetry_runs','student_level_sessions','student_code_executions','announcements',
 'teacher_notifications','python_activities','python_grants','python_drafts','python_runs','python_submissions','python_reviews'] loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from public.%I r %s',t,
   case when t='profiles' then 'where role <> ''admin''' else '' end) into rows;
  tables:=tables||jsonb_build_object(t,rows);
 end loop;
 return jsonb_build_object('format','KnightCode Supabase school save','version',3,'created_at',clock_timestamp(),'tables',tables);
end $$;
revoke all on function public.capture_school_backup(uuid) from public,anon,authenticated;
grant execute on function public.capture_school_backup(uuid) to service_role;

create or replace function public.clear_school_data(p_admin uuid,p_scope text) returns void
language plpgsql security definer set search_path='' set statement_timeout='60s' set lock_timeout='5s' as $$
declare t text;
begin
 if p_scope not in ('learning','school') or p_scope is null then raise exception 'Invalid clear scope.'; end if;
 if not exists(select 1 from public.profiles where id=p_admin and role='admin' and active) then raise exception 'Administrator required.'; end if;
 perform public.lock_school_snapshot();
 foreach t in array array['python_reviews','python_submissions','python_runs','python_drafts',
 'student_code_executions','student_level_sessions','student_telemetry_runs','student_level_progress',
 'student_activity','student_achievements','student_notifications','teacher_notifications'] loop
  -- A real key predicate is required by Supabase safeupdate.
  if t in ('student_telemetry_runs','student_level_progress','student_achievements') then
   execute format('delete from public.%I where student_id in (select id from public.profiles)',t);
  else execute format('delete from public.%I where id in (select id from public.%I)',t,t); end if;
 end loop;
 update public.profiles set total_xp=0,current_streak=0,longest_streak=0,last_activity_date=null where role='student';
 if p_scope='school' then
  delete from public.python_grants where id in (select id from public.python_grants);
  delete from public.teacher_import_batches where id in (select id from public.teacher_import_batches);
  delete from public.announcements where id in (select id from public.announcements);
  delete from public.assignments where id in (select id from public.assignments);
  delete from public.class_students where student_id in (select id from public.profiles);
  delete from public.classes where id in (select id from public.classes);
  -- Auth and dependent profiles are removed in this SAME transaction, or everything rolls back.
  delete from auth.users where id in (select id from public.profiles where role in ('student','teacher'));
 end if;
 insert into public.admin_audit_log(admin_id,action,entity,details)
 values(p_admin,'reset_'||p_scope,'system','{"atomic":true}');
end $$;
revoke all on function public.clear_school_data(uuid,text) from public,anon,authenticated;
grant execute on function public.clear_school_data(uuid,text) to service_role;
do $patch$ declare definition text; begin
 definition:=pg_get_functiondef('public.record_level_progress(bigint,jsonb)'::regprocedure);
 definition:=replace(definition,'prior.active=true and prior.order_in_lesson','prior.active=true and prior.build_available and prior.order_in_lesson');
 execute definition;
end $patch$;
commit;
