-- Backup v3 includes Python records in the SAME restore transaction.
-- Older saves are rejected by this version before any records are replaced.
-- Restore school records atomically. Existing Auth accounts/passwords are never deleted.
begin;
create or replace function public.restore_school_backup(p_backup jsonb, p_user_map jsonb, p_admin uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
set statement_timeout = '60s' set lock_timeout = '5s'
as $$
declare
  tables text[] := array['profiles','lessons','levels','classes','class_students','assignments',
    'student_level_progress','student_activity','achievements','student_achievements',
    'student_notifications','student_telemetry_runs','student_level_sessions',
    'student_code_executions','announcements','teacher_notifications','python_activities','python_grants','python_drafts','python_runs','python_submissions','python_reviews'];
  insert_order text[] := array['lessons','levels','achievements','classes','class_students','assignments',
    'student_level_progress','student_activity','student_achievements','student_notifications',
    'student_telemetry_runs','student_level_sessions','student_code_executions','announcements','teacher_notifications','python_activities','python_grants','python_drafts','python_runs','python_submissions','python_reviews'];
  t text; row_data jsonb; k text; columns_sql text; updates_sql text;
  target_id uuid; current_email text; matched_role text; counts jsonb := '{}';
  actual bigint; expected bigint; sequence_name text; maximum_id bigint;
begin
  if not exists(select 1 from public.profiles where id=p_admin and role='admin' and active) then
    raise exception 'An active administrator is required.';
  end if;
  if p_backup->>'format' is distinct from 'KnightCode Supabase school save'
    or coalesce(p_backup->>'version','') not in ('3')
    or jsonb_typeof(p_user_map) is distinct from 'object' then
    raise exception 'Invalid save file.';
  end if;
  if p_backup->>'version'='1' and not (p_backup->'tables' ? 'student_code_executions') then
    p_backup := jsonb_set(p_backup,'{tables,student_code_executions}','[]');
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
    public.python_activities, public.python_grants, public.python_drafts, public.python_runs, public.python_submissions, public.python_reviews
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
  delete from public.python_grants where id in (select id from public.python_grants);
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
$$;
revoke all on function public.restore_school_backup(jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.restore_school_backup(jsonb,jsonb,uuid) to service_role;

-- The web app checks this before creating any missing Auth accounts.
create or replace function public.school_restore_version() returns integer
language sql stable security definer set search_path = pg_catalog as $$ select 2 $$;
revoke all on function public.school_restore_version() from public,anon,authenticated;
grant execute on function public.school_restore_version() to service_role;
commit;
