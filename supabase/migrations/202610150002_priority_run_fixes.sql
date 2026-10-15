-- No history is deleted by installing this update.
begin;
alter table public.student_level_progress add column if not exists history_unsuccessful_attempts bigint default 0
  check (history_unsuccessful_attempts >= 0);
alter table public.python_runs add column if not exists last_seen_at timestamptz default now();

-- Keep all prior role, assignment, availability and idempotency checks intact.
do $patch$
declare body text; old text; replacement text;
begin
 body:=pg_get_functiondef('public.record_level_progress(bigint,jsonb)'::regprocedure);
 for old,replacement in select * from (values
  ('v_attempts not between 1 and 100','v_attempts not between 1 and 1000000'),
  ('v_mistakes not between 0 and 1000','v_mistakes not between 0 and 1000000'),
  ('v_seconds not between 0 and 86400','v_seconds not between 0 and 31536000'),
  ('v_lines not between 0 and 10000','v_lines not between 0 and 100000000'),
  ('(p_payload->>''play_time_seconds'')::int not between 0 and 86400','(p_payload->>''play_time_seconds'')::int not between 0 and 31536000'),
  ('(p_payload->>''completed_lines'')::int not between 0 and 10000','(p_payload->>''completed_lines'')::int not between 0 and 100000000')
 ) patches(old_value,new_value) loop
  if position(replacement in body)>0 then continue; end if;
  if position(old in body)=0 then raise exception 'Telemetry receiver changed; inspect before applying priority fixes.'; end if;
  body:=replace(body,old,replacement);
 end loop;
 -- A resumed browser session may outlive cleanup of its old detail row.
 -- Start the replacement row at the preserved telemetry baseline, not zero.
 body:=replace(body,'coalesce(v_session.base_attempts+v_session.attempts,0)','coalesce(v_session.base_attempts+v_session.attempts,v_run.attempts)');
 body:=replace(body,'coalesce(v_session.base_mistakes+v_session.mistakes,0)','coalesce(v_session.base_mistakes+v_session.mistakes,v_run.mistakes)');
 body:=replace(body,'coalesce(v_session.base_seconds+v_session.play_time_seconds,0)','coalesce(v_session.base_seconds+v_session.play_time_seconds,v_run.total_seconds)');
 body:=replace(body,'coalesce(v_session.base_lines+v_session.lines_used,0)','coalesce(v_session.base_lines+v_session.lines_used,v_run.total_lines)');
 execute body;
end $patch$;

-- Run-history restarts follow the same cumulative counter as game progress.
alter table public.student_code_executions drop constraint if exists student_code_executions_restart_number_check;
alter table public.student_code_executions add constraint student_code_executions_restart_number_check
 check (restart_number between 0 and 1000000);
do $patch$
declare body text;
begin
 body:=pg_get_functiondef('public.record_code_execution(bigint,jsonb)'::regprocedure);
 if position('coalesce((p_payload->>''restart_number'')::integer,-1) not between 0 and 1000000' in body)=0 then
  if position('coalesce((p_payload->>''restart_number'')::integer,-1) not between 0 and 100' in body)=0 then
   raise exception 'Execution receiver changed; inspect before applying priority fixes.';
  end if;
  body:=replace(body,'coalesce((p_payload->>''restart_number'')::integer,-1) not between 0 and 100',
   'coalesce((p_payload->>''restart_number'')::integer,-1) not between 0 and 1000000');
  execute body;
 end if;
end $patch$;

create or replace function public.python_touch_run(p_run uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if public.python_role() is distinct from 'student' then raise exception 'Student required.'; end if;
 update public.python_runs set last_seen_at=now()
 where id=p_run and student_id=auth.uid() and status='running';
end $$;
create or replace function public.python_abandon_run(p_run uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if public.python_role() is distinct from 'student' then raise exception 'Student required.'; end if;
 update public.python_runs set status='stopped',finished_at=now(),last_seen_at=now(),
  result=jsonb_build_object('output','','error','The activity page closed before an execution result was saved. Source code is preserved.',
   'inputs','[]'::jsonb,'checks','[]'::jsonb,'elapsed_ms',0)
 where id=p_run and student_id=auth.uid() and status='running';
end $$;
revoke all on function public.python_touch_run(uuid),public.python_abandon_run(uuid) from public,anon;
grant execute on function public.python_touch_run(uuid),public.python_abandon_run(uuid) to authenticated;

create or replace function public.manage_run_history(
 p_admin uuid, p_kind text, p_before timestamptz,
 p_student uuid default null, p_class bigint default null,
 p_execute boolean default false, p_expected text default null
) returns jsonb language plpgsql security definer set search_path=''
 set statement_timeout='60s' set lock_timeout='5s' as $$
declare
 targets jsonb; total bigint; fingerprint text; affected integer := 0;
 executions bigint := 0; batch_size integer; summary jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_admin and role='admin' and active) then
  raise exception 'Administrator required.';
 end if;
 if p_kind is null or p_kind not in ('game_unfinished','game_completed','game_all','python_practice','python_finished','python_submitted') then
  raise exception 'Choose a valid history category.';
 end if;
 if p_before is null or not isfinite(p_before) or p_before > now()-interval '24 hours' then
  raise exception 'Choose a cutoff at least 24 hours ago. Recent activity is protected.';
 end if;
 if p_student is not null and not exists(select 1 from public.profiles where id=p_student and role='student') then
  raise exception 'Student no longer exists. Refresh the page.';
 end if;
 if p_class is not null and not exists(select 1 from public.classes where id=p_class) then
  raise exception 'Section no longer exists. Refresh the page.';
 end if;
 if p_execute then
  -- Same lock/order as save, restore and reset. Also blocks new submissions/reviews
  -- and telemetry writes while candidates are rechecked and changed atomically.
  perform public.lock_school_snapshot();
  if not exists(select 1 from public.profiles where id=p_admin and role='admin' and active) then
   raise exception 'Administrator required.';
  end if;
 end if;

 if p_kind like 'game_%' then
  with candidates as materialized (
   select s.*, p.name as student_name, p.student_id as student_number,
    v.title as item_title, t.updated_at as last_telemetry,
    e.last_execution, e.execution_count, e.execution_version,
    greatest(s.started_at,s.completed_at,t.updated_at,e.last_execution) as last_activity
   from public.student_level_sessions s
   join public.profiles p on p.id=s.student_id
   join public.levels v on v.id=s.level_id
   left join public.student_telemetry_runs t on t.student_id=s.student_id and t.level_id=s.level_id and t.run_id=s.run_id
   left join lateral (
    select count(*) as execution_count,
     max(greatest(x.started_at,x.finished_at)) as last_execution,
     md5(coalesce(string_agg(x.id::text||':'||x.xmin::text,',' order by x.id),'')) as execution_version
    from public.student_code_executions x
    where x.student_id=s.student_id and x.level_id=s.level_id and x.run_id=s.run_id and x.session_number=s.session_number
   ) e on true
   where (p_student is null or s.student_id=p_student)
    and (p_class is null or exists(select 1 from public.class_students cs where cs.student_id=s.student_id and cs.class_id=p_class))
    and (p_kind='game_all' or (p_kind='game_completed' and s.completed) or (p_kind='game_unfinished' and not s.completed))
    and greatest(s.started_at,s.completed_at,t.updated_at,e.last_execution)<p_before
  ), batch as (select * from candidates order by last_activity,id limit 500)
  select (select count(*) from candidates), coalesce(jsonb_agg(jsonb_build_object(
   'id',b.id::text,'student',b.student_name,'student_number',b.student_number,
   'item',b.item_title,'status',case when b.completed then 'Completed' else 'Unfinished' end,
   'last_activity',b.last_activity,'executions',b.execution_count,'version',md5(to_jsonb(b)::text)
  ) order by b.last_activity,b.id),'[]'::jsonb) into total,targets from batch b;
 else
  with candidates as materialized (
   select r.id,r.student_id,r.activity_id,r.started_at,r.finished_at,r.status,r.last_seen_at,
    p.name as student_name,p.student_id as student_number,
    r.activity_snapshot->'content'->>'title' as item_title,
    s.id as submission_id,s.submitted_at,
    rv.review_version,
    greatest(r.started_at,r.last_seen_at,r.finished_at,s.submitted_at,rv.last_review) as last_activity
   from public.python_runs r join public.profiles p on p.id=r.student_id
   left join public.python_submissions s on s.run_id=r.id
   left join lateral (
    select max(v.created_at) as last_review,
     md5(coalesce(string_agg(v.id::text||':'||v.xmin::text,',' order by v.id),'')) as review_version
    from public.python_reviews v where v.submission_id=s.id
   ) rv on true
   where (p_student is null or r.student_id=p_student)
    and (p_class is null or exists(select 1 from public.class_students cs where cs.student_id=r.student_id and cs.class_id=p_class))
    and (r.status<>'running' or coalesce(r.last_seen_at,r.started_at)<now()-interval '24 hours')
    and ((p_kind='python_practice' and s.id is null and r.status in ('error','stopped','timeout','running'))
      or (p_kind='python_finished' and s.id is null and r.status='finished')
      or (p_kind='python_submitted' and s.id is not null and not (r.result ? 'history_cleared_at')))
    and greatest(r.started_at,r.last_seen_at,r.finished_at,s.submitted_at,rv.last_review)<p_before
  ), batch as (
   select c.*,md5(to_jsonb(r)::text) as run_version
   from (select * from candidates order by last_activity,id limit 500) c
   join public.python_runs r on r.id=c.id
  )
  select (select count(*) from candidates), coalesce(jsonb_agg(jsonb_build_object(
   'id',b.id::text,'student',b.student_name,'student_number',b.student_number,
   'item',b.item_title,'status',case when b.submission_id is not null then 'Submitted' when b.status='running' then 'Unfinished (connection lost)' else b.status end,
   'last_activity',b.last_activity,'executions',0,'version',md5(to_jsonb(b)::text)
  ) order by b.last_activity,b.id),'[]'::jsonb) into total,targets from batch b;
 end if;

 batch_size := jsonb_array_length(targets);
 fingerprint := md5(jsonb_build_object('kind',p_kind,'before',p_before,'student',p_student,'class',p_class,'targets',targets)::text);
 select coalesce(sum((value->>'executions')::bigint),0) into executions from jsonb_array_elements(targets);
 summary := jsonb_build_object('total',total,'count',batch_size,'executions',executions,'fingerprint',fingerprint,
  'sample',(select coalesce(jsonb_agg(value-'version'-'executions'),'[]'::jsonb) from (
   select value from jsonb_array_elements(targets) limit 10
  ) sample));
 if not p_execute then return summary; end if;
 if p_expected is null or p_expected<>fingerprint then
  raise exception 'Matching history changed since preview. Preview again; nothing was cleared.';
 end if;
 if batch_size=0 then raise exception 'No matching history to clear.'; end if;

 if p_kind like 'game_%' then
  -- FK cascades only its command history. Keep telemetry deduplication counters,
  -- aggregate progress, XP, achievements, assignments and completion intact.
  -- Preserve the assessment contribution before removing its detail records.
  update public.student_level_progress p
  set history_unsuccessful_attempts=coalesce(p.history_unsuccessful_attempts,0)+removed.earlier_attempts
  from (select student_id,level_id,sum(greatest(attempts-1,0)) as earlier_attempts
    from public.student_level_sessions
    where id in (select (value->>'id')::bigint from jsonb_array_elements(targets))
    group by student_id,level_id) removed
  where p.student_id=removed.student_id and p.level_id=removed.level_id;
  delete from public.student_level_sessions where id in (select (value->>'id')::bigint from jsonb_array_elements(targets));
  get diagnostics affected = row_count;
 elsif p_kind='python_submitted' then
  update public.python_runs set
   source='[Code cleared by administrator]',
   result=jsonb_build_object('output','','error','','inputs','[]'::jsonb,
    'elapsed_ms',coalesce(result->'elapsed_ms','0'::jsonb),'checks','[]'::jsonb,'history_cleared_at',now())
  where id in (select (value->>'id')::uuid from jsonb_array_elements(targets));
  get diagnostics affected = row_count;
 else
  -- Preserve unlock history without preserving every Run. Never overwrite a draft.
  insert into public.python_drafts(activity_id,student_id,source,first_run_at)
   select activity_id,student_id,'',min(started_at) from public.python_runs
   where id in (select (value->>'id')::uuid from jsonb_array_elements(targets)) group by activity_id,student_id
  on conflict(activity_id,student_id) do update
   set first_run_at=least(public.python_drafts.first_run_at,excluded.first_run_at);
  delete from public.python_runs where id in (select (value->>'id')::uuid from jsonb_array_elements(targets));
  get diagnostics affected = row_count;
 end if;
 if affected<>batch_size then raise exception 'Cleanup count changed. Nothing was cleared; preview again.'; end if;
 insert into public.admin_audit_log(admin_id,action,entity,details) values(p_admin,'clear_run_history','run_history',
  jsonb_build_object('category',p_kind,'before',p_before,'student_id',p_student,'class_id',p_class,
   'affected',affected,'executions',executions,'fingerprint',fingerprint,'atomic',true,
   'preserved','Progress, XP, achievements, Python submissions and reviews'));
 return summary||jsonb_build_object('affected',affected);
end $$;
revoke all on function public.manage_run_history(uuid,text,timestamptz,uuid,bigint,boolean,text) from public,anon,authenticated;
grant execute on function public.manage_run_history(uuid,text,timestamptz,uuid,bigint,boolean,text) to service_role;
notify pgrst, 'reload schema';
commit;
