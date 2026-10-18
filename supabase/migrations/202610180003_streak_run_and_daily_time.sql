-- Actual code Runs earn game streaks; saved time has its own bounded summary.
-- No account, assignment, submission or history records are deleted.
begin;
do $initialize$
begin
 if not exists(select 1 from pg_attribute where attrelid='public.profiles'::regclass and attname='practice_time_date' and not attisdropped) then
  alter table public.profiles add column practice_time_date date,
   add column practice_game_seconds bigint not null default 0 check(practice_game_seconds>=0),
   add column practice_python_ms numeric not null default 0 check(practice_python_ms>=0);
  -- Best available baseline for today from retained summaries, without a row cap.
  -- Exact per-save daily attribution starts when this update is installed.
  update public.profiles p set practice_time_date=(now() at time zone 'Asia/Manila')::date,
   practice_game_seconds=coalesce((select sum(s.play_time_seconds) from public.student_level_sessions s
    where s.student_id=p.id and (s.started_at at time zone 'Asia/Manila')::date=(now() at time zone 'Asia/Manila')::date),0),
   practice_python_ms=coalesce((select sum(case when jsonb_typeof(r.result->'elapsed_ms')='number'
    then least(120000,greatest(0,(r.result->>'elapsed_ms')::numeric)) else 0 end)
    from public.python_runs r where r.student_id=p.id and r.status<>'running'
    and (r.finished_at at time zone 'Asia/Manila')::date=(now() at time zone 'Asia/Manila')::date),0)
   where p.role='student';
 end if;
end $initialize$;

create or replace function public.record_practice_time(p_student uuid,p_game_seconds bigint,p_python_ms numeric)
returns void language plpgsql security definer set search_path='' as $$
declare today date := (now() at time zone 'Asia/Manila')::date;
begin
 if p_game_seconds is null or p_python_ms is null or p_game_seconds<0 or p_python_ms<0 or p_python_ms>120000 then
  raise exception 'Invalid practice duration.';
 end if;
 update public.profiles set
  practice_game_seconds=(case when practice_time_date=today then practice_game_seconds else 0 end)+p_game_seconds,
  practice_python_ms=(case when practice_time_date=today then practice_python_ms else 0 end)+p_python_ms,
  practice_time_date=today
 where id=p_student and role='student' and active;
 if not found then raise exception 'Active student required.'; end if;
end $$;
revoke all on function public.record_practice_time(uuid,bigint,numeric) from public,anon,authenticated,service_role;

do $patch$
declare body text; old text; replacement text;
begin
 body:=pg_get_functiondef('public.record_level_progress(bigint,jsonb)'::regprocedure);
 old:='if d_attempts > 0 or v_completed then perform public.record_learning_day(v_student); end if;';
 replacement:=$new$perform public.record_practice_time(v_student,d_seconds,0);
    -- Legacy builds have no execution events: newly reported source lines are
    -- evidence of code use. Current builds count their actual Run event below.
    if (p_payload->>'telemetry_version')::integer=1 and d_lines>0 then
      perform public.record_learning_day(v_student);
    end if;$new$;
 if position('record_practice_time' in body)=0 then
  if position(old in body)=0 then raise exception 'Game receiver changed; inspect before applying.'; end if;
  execute replace(body,old,replacement);
 end if;

 body:=pg_get_functiondef('public.record_code_execution(bigint,jsonb)'::regprocedure);
 old:=$old$return jsonb_build_object('ok',true);$old$;
 replacement:=$new$-- Only a new, nonblank Run counts. Updates/retries on another day cannot
  -- earn a second day for yesterday's Run. Session locking serializes inserts.
  if v_existing.id is null and length(btrim(p_payload->>'source', E' \t\r\n'))>0 then
    perform public.record_learning_day(v_student);
    perform public.award_student_achievements(v_student);
  end if;
  return jsonb_build_object('ok',true);$new$;
 if position('record_learning_day' in body)=0 then
  if position(old in body)=0 then raise exception 'Code receiver changed; inspect before applying.'; end if;
  execute replace(body,old,replacement);
 end if;

 body:=pg_get_functiondef('public.python_finish_run(uuid,text,jsonb)'::regprocedure);
 old:='update public.python_runs set status=p_status,result=p_result,finished_at=now() where id=p_run;';
 replacement:=old || $new$
 perform public.record_practice_time(r.student_id,0,
  case when jsonb_typeof(p_result->'elapsed_ms')='number'
   then least(120000,greatest(0,(p_result->>'elapsed_ms')::numeric)) else 0 end);$new$;
 if position('record_practice_time' in body)=0 then
  if position(old in body)=0 then raise exception 'Python receiver changed; inspect before applying.'; end if;
  execute replace(body,old,replacement);
 end if;

 body:=pg_get_functiondef('public.restore_school_backup(jsonb,jsonb,uuid)'::regprocedure);
 old:=$old$row_data := jsonb_set(row_data,'{id}',to_jsonb(target_id));$old$;
 replacement:=old || $new$
    -- Old saves have no daily totals. Reset them rather than retaining data
    -- earned after the backup. New saves capture these profile fields normally.
    if not (row_data ?& array['practice_time_date','practice_game_seconds','practice_python_ms']) then
      row_data:=row_data || '{"practice_time_date":null,"practice_game_seconds":0,"practice_python_ms":0}'::jsonb;
    end if;$new$;
 if position('practice_time_date' in body)=0 then
  if position(old in body)=0 then raise exception 'Restore receiver changed; inspect before applying.'; end if;
  execute replace(body,old,replacement);
 end if;
 body:=pg_get_functiondef('public.clear_school_data(uuid,text)'::regprocedure);
 old:='last_activity_date=null,learning_activity_dates=''{}''::date[] where role=''student''';
 replacement:='last_activity_date=null,learning_activity_dates=''{}''::date[],practice_time_date=null,practice_game_seconds=0,practice_python_ms=0 where role=''student''';
 if position('practice_time_date' in body)=0 then
  if position(old in body)=0 then raise exception 'Clear receiver changed; inspect before applying.'; end if;
  execute replace(body,old,replacement);
 end if;
end $patch$;
commit;
