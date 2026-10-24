-- Deploy the compatible website code BEFORE applying this migration.
-- Version 4 backups omit retired grants. Version 3 restores ignore that legacy key.
-- Transactional migration; do not run individual statements separately.
SET lock_timeout = '5s';
SELECT pg_advisory_xact_lock(7102026);
LOCK TABLE public.python_grants IN ACCESS EXCLUSIVE MODE;
DO $guard$
BEGIN
 IF EXISTS (SELECT 1 FROM public.python_grants) THEN
  RAISE EXCEPTION 'Legacy Python grants contain records. Archive/review them before retiring this table.';
 END IF;
END
$guard$;

CREATE OR REPLACE FUNCTION public.school_restore_version()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$ select 3 $function$;

CREATE OR REPLACE FUNCTION public.lock_school_snapshot()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET lock_timeout TO '5s'
AS $function$
begin
 perform pg_advisory_xact_lock(7102026);
 lock table public.profiles,public.lessons,public.levels,public.classes,public.class_students,
 public.assignments,public.student_level_progress,public.student_activity,public.achievements,
 public.student_achievements,public.student_notifications,public.student_telemetry_runs,
 public.student_level_sessions,public.student_code_executions,public.announcements,
 public.teacher_notifications,public.python_activities,public.python_drafts,
 public.python_runs,public.python_submissions,public.python_reviews in share row exclusive mode;
end $function$;

CREATE OR REPLACE FUNCTION public.restore_school_backup(p_backup jsonb, p_user_map jsonb, p_admin uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
 SET statement_timeout TO '60s'
 SET lock_timeout TO '5s'
AS $function$
declare
  tables text[] := array['profiles','lessons','levels','classes','class_students','assignments',
    'student_level_progress','student_activity','achievements','student_achievements',
    'student_notifications','student_telemetry_runs','student_level_sessions',
    'student_code_executions','announcements','teacher_notifications','python_activities','python_drafts','python_runs','python_submissions','python_reviews'];
  insert_order text[] := array['lessons','levels','achievements','classes','class_students','assignments',
    'student_level_progress','student_activity','student_achievements','student_notifications',
    'student_telemetry_runs','student_level_sessions','student_code_executions','announcements','teacher_notifications','python_activities','python_drafts','python_runs','python_submissions','python_reviews'];
  t text; row_data jsonb; k text; columns_sql text; updates_sql text;
  target_id uuid; current_email text; matched_role text; counts jsonb := '{}';
  actual bigint; expected bigint; sequence_name text; maximum_id bigint;
begin
  if not exists(select 1 from public.profiles where id=p_admin and role='admin' and active) then
    raise exception 'An active administrator is required.';
  end if;
  if p_backup->>'format' is distinct from 'KnightCode Supabase school save'
    or coalesce(p_backup->>'version','') not in ('3','4')
    or jsonb_typeof(p_user_map) is distinct from 'object' then
    raise exception 'Invalid save file.';
  end if;
  foreach t in array tables loop
    if jsonb_typeof(p_backup->'tables'->t) is distinct from 'array' then
      raise exception 'Save file is missing table %.', t;
    end if;
  end loop;
  -- Serialize restores and block school writes while replacing this snapshot.
  perform pg_advisory_xact_lock(7102026);
  lock table public.profiles, public.lessons, public.levels, public.classes,
    public.class_students, public.assignments, public.student_level_progress,
    public.student_activity, public.achievements, public.student_achievements,
    public.student_notifications, public.student_telemetry_runs, public.student_level_sessions,
    public.student_code_executions, public.announcements, public.teacher_notifications,
    public.python_activities, public.python_drafts, public.python_runs, public.python_submissions, public.python_reviews
    in share row exclusive mode;

  if (select count(*) from jsonb_each_text(p_user_map)) <>
       jsonb_array_length(p_backup->'tables'->'profiles')
    or (select count(distinct value) from jsonb_each_text(p_user_map)) <>
       jsonb_array_length(p_backup->'tables'->'profiles') then
    raise exception 'Account mapping is incomplete or duplicated.';
  end if;
  for row_data in select value from jsonb_array_elements(p_backup->'tables'->'profiles') loop
    if coalesce(row_data->>'role','') not in ('teacher','student') then
      raise exception 'Save files cannot replace administrator accounts.';
    end if;
    target_id := (p_user_map->>(row_data->>'id'))::uuid;
    select a.email,p.role::text into current_email,matched_role
      from auth.users a join public.profiles p on p.id=a.id where a.id=target_id;
    if not found or matched_role <> row_data->>'role'
      or lower(current_email) is distinct from lower(row_data->>'email') then
      raise exception 'A restored account does not match its Auth account.';
    end if;
  end loop;

  delete from public.python_reviews where id in (select id from public.python_reviews);
  delete from public.python_submissions where id in (select id from public.python_submissions);
  delete from public.python_runs where id in (select id from public.python_runs);
  delete from public.python_drafts where id in (select id from public.python_drafts);
  delete from public.python_activities where id in (select id from public.python_activities);
  -- Children first. No Auth deletion and no TRUNCATE/CASCADE of unrelated tables.
  delete from public.student_code_executions where id in (select id from public.student_code_executions);
  delete from public.student_level_sessions where id in (select id from public.student_level_sessions);
  delete from public.student_telemetry_runs where student_id in (select student_id from public.student_telemetry_runs);
  delete from public.student_notifications where id in (select id from public.student_notifications);
  delete from public.teacher_notifications where id in (select id from public.teacher_notifications);
  delete from public.student_achievements where student_id in (select student_id from public.student_achievements);
  delete from public.student_activity where id in (select id from public.student_activity);
  delete from public.student_level_progress where student_id in (select student_id from public.student_level_progress);
  delete from public.announcements where id in (select id from public.announcements);
  delete from public.assignments where id in (select id from public.assignments);
  delete from public.class_students where class_id in (select class_id from public.class_students);
  -- Pending teacher imports refer to the old class contents and are not saved records.
  delete from public.teacher_import_batches where id in (select id from public.teacher_import_batches);
  delete from public.classes where id in (select id from public.classes);
  delete from public.levels where id in (select id from public.levels);
  delete from public.lessons where id in (select id from public.lessons);
  delete from public.achievements where id in (select id from public.achievements);

  -- Release unique business identifiers only for accounts being restored.
  -- This also permits identifiers swapped since the backup without deleting accounts.
  update public.profiles set student_id=null,teacher_id=null,username=null
    where id in (select value::uuid from jsonb_each_text(p_user_map));
  for row_data in select value from jsonb_array_elements(p_backup->'tables'->'profiles') loop
    target_id := (p_user_map->>(row_data->>'id'))::uuid;
    row_data := jsonb_set(row_data,'{id}',to_jsonb(target_id));
    -- Old saves have no daily totals. Reset them rather than retaining data
    -- earned after the backup. New saves capture these profile fields normally.
    if not (row_data ?& array['practice_time_date','practice_game_seconds','practice_python_ms']) then
      row_data:=row_data || '{"practice_time_date":null,"practice_game_seconds":0,"practice_python_ms":0}'::jsonb;
    end if;
    if not (row_data ? 'learning_activity_dates') or row_data->'learning_activity_dates'='null'::jsonb then
      row_data:=jsonb_set(row_data,'{learning_activity_dates}',coalesce((
        select jsonb_agg((row_data->>'last_activity_date')::date-n order by n desc)
        from generate_series(0,least(greatest(coalesce((row_data->>'current_streak')::integer,0),0),7)-1) n
        where nullif(row_data->>'last_activity_date','') is not null
      ),'[]'::jsonb));
    end if;
    select string_agg(format('%I = r.%I',key,key),',') into updates_sql
      from jsonb_object_keys(row_data) key where key <> 'id';
    -- Reject unknown columns; never ignore values from an incompatible save.
    for k in select jsonb_object_keys(row_data) loop
      if not exists(select 1 from pg_attribute where attrelid='public.profiles'::regclass and attname=k and attnum>0 and not attisdropped) then
        raise exception 'Unknown profiles column: %.',k;
      end if;
    end loop;
    execute format('update public.profiles p set %s from jsonb_populate_record(null::public.profiles,$1) r where p.id=$2',updates_sql)
      using row_data,target_id;
  end loop;
  counts := jsonb_build_object('profiles',jsonb_array_length(p_backup->'tables'->'profiles'));

  foreach t in array insert_order loop
    for row_data in select value from jsonb_array_elements(p_backup->'tables'->t) loop
      if t='levels' and not (row_data ? 'build_available') then
   row_data:=jsonb_set(row_data,'{build_available}',to_jsonb((row_data->>'level_number')::integer in (1,2,3,4,5,6,7,13)));
 end if;
 -- These fields are UUID references only outside profiles.
      foreach k in array array['student_id','teacher_id'] loop
        if row_data ? k and row_data->>k is not null then
          if not (p_user_map ? (row_data->>k)) then
            raise exception 'Missing account link in %.%.',t,k;
          end if;
          row_data := jsonb_set(row_data,array[k],p_user_map->(row_data->>k));
        end if;
      end loop;
      -- Reviewers may be teachers from this save or administrators preserved outside it.
      if t='python_reviews' and row_data->>'reviewer_id' is not null then
        if p_user_map ? (row_data->>'reviewer_id') then
          row_data:=jsonb_set(row_data,'{reviewer_id}',p_user_map->(row_data->>'reviewer_id'));
        elsif not exists(select 1 from public.profiles where id=(row_data->>'reviewer_id')::uuid and role='admin') then
          row_data:=jsonb_set(row_data,'{reviewer_id}','null');
        end if;
      end if;
      -- Teacher notification links also contain the student's Auth UUID.
      if t in ('student_notifications','teacher_notifications') and row_data->>'link' like '/teacher/student/%' then
        k := split_part(row_data->>'link','/',4);
        if p_user_map ? k then
          row_data := jsonb_set(row_data,'{link}',to_jsonb(replace(row_data->>'link',k,p_user_map->>k)));
        end if;
      end if;
      for k in select jsonb_object_keys(row_data) loop
        if not exists(select 1 from pg_attribute where attrelid=format('public.%I',t)::regclass and attname=k and attnum>0 and not attisdropped) then
          raise exception 'Unknown %.% column.',t,k;
        end if;
      end loop;
      select string_agg(format('%I',key),',' order by key) into columns_sql from jsonb_object_keys(row_data) key;
      -- Keep numeric IDs, dates, optional nulls, Run IDs and session numbers exactly.
      -- Explicit columns let defaults cover fields absent from older saves.
      execute format('insert into public.%I (%s) overriding system value select %s from jsonb_populate_record(null::public.%I,$1)',t,columns_sql,columns_sql,t)
        using row_data;
    end loop;
    execute format('select count(*) from public.%I',t) into actual;
    expected := jsonb_array_length(p_backup->'tables'->t);
    if actual <> expected then raise exception 'Restore count mismatch for %: expected %, got %.',t,expected,actual; end if;
    counts := counts || jsonb_build_object(t,actual);
  end loop;
  -- Explicit IDs must not make the next ordinary insert collide.
  foreach t in array insert_order loop
    if not exists(select 1 from pg_attribute where attrelid=format('public.%I',t)::regclass and attname='id' and attnum>0 and not attisdropped) then continue; end if;
    sequence_name := pg_get_serial_sequence(format('public.%I',t),'id');
    if sequence_name is not null then
      execute format('select max(id) from public.%I',t) into maximum_id;
      perform setval(sequence_name::regclass, greatest(coalesce(maximum_id,1),1),maximum_id is not null);
    end if;
  end loop;
  perform setval(pg_get_serial_sequence('public.python_runs','sequence')::regclass, greatest(coalesce((select max(sequence) from public.python_runs),1),1), exists(select 1 from public.python_runs));
  insert into public.admin_audit_log(admin_id,action,entity,details)
    values(p_admin,'restore_backup','system',jsonb_build_object('backup_created_at',p_backup->>'created_at','verified_counts',counts,'atomic',true));
  return counts;
end;
$function$;

CREATE OR REPLACE FUNCTION public.capture_school_backup(p_admin uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '60s'
 SET lock_timeout TO '5s'
AS $function$
declare t text; rows jsonb; tables jsonb:='{}';
begin
 if not exists(select 1 from public.profiles where id=p_admin and role='admin' and active) then raise exception 'Administrator required.'; end if;
 perform public.lock_school_snapshot();
 foreach t in array array['profiles','lessons','levels','classes','class_students','assignments',
 'student_level_progress','student_activity','achievements','student_achievements','student_notifications',
 'student_telemetry_runs','student_level_sessions','student_code_executions','announcements',
 'teacher_notifications','python_activities','python_drafts','python_runs','python_submissions','python_reviews'] loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from public.%I r %s',t,
   case when t='profiles' then 'where role <> ''admin''' else '' end) into rows;
  tables:=tables||jsonb_build_object(t,rows);
 end loop;
 return jsonb_build_object('format','KnightCode Supabase school save','version',4,'created_at',clock_timestamp(),'tables',tables);
end $function$;

CREATE OR REPLACE FUNCTION public.clear_school_data(p_admin uuid, p_scope text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '60s'
 SET lock_timeout TO '5s'
AS $function$
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
 update public.profiles set total_xp=0,current_streak=0,longest_streak=0,last_activity_date=null,learning_activity_dates='{}'::date[],practice_time_date=null,practice_game_seconds=0,practice_python_ms=0 where role='student';
 if p_scope='school' then
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
end $function$;

CREATE OR REPLACE FUNCTION public.assert_teacher_deletable(p_admin uuid, p_teacher uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_admin AND role='admin' AND active) THEN
  RAISE EXCEPTION 'Administrator required.';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_teacher AND role='teacher') THEN
  RAISE EXCEPTION 'Teacher account not found.';
 END IF;
 IF EXISTS (SELECT 1 FROM public.classes WHERE teacher_id=p_teacher)
 OR EXISTS (SELECT 1 FROM public.assignments WHERE teacher_id=p_teacher)
 OR EXISTS (SELECT 1 FROM public.announcements WHERE teacher_id=p_teacher)
 OR EXISTS (SELECT 1 FROM public.teacher_notifications WHERE teacher_id=p_teacher)
 OR EXISTS (SELECT 1 FROM public.teacher_import_batches WHERE teacher_id=p_teacher)
 OR EXISTS (SELECT 1 FROM public.python_reviews WHERE reviewer_id=p_teacher) THEN
  RAISE EXCEPTION 'This teacher has linked records. Archive the account instead; no records were deleted.';
 END IF;
END;
$function$;

DROP FUNCTION public.python_assign(uuid, uuid, bigint, boolean, timestamptz);
-- RESTRICT is deliberate: unexpected dependencies must stop the migration.
DROP TABLE public.python_grants RESTRICT;
NOTIFY pgrst, 'reload schema';
