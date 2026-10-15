-- Installs manual cleanup only. Applying this migration does NOT clear any history.
begin;

-- Remember an earned Python unlock even when its last practice Run is removed.
-- Nullable for older save files; current saves include it automatically.
alter table public.python_drafts add column if not exists first_run_at timestamptz;
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
  and (exists(select 1 from public.python_runs r where r.student_id=auth.uid() and r.activity_id=a.id)
   or exists(select 1 from public.python_drafts d where d.student_id=auth.uid() and d.activity_id=a.id and d.first_run_at is not null)
   or not exists (
    select 1 from public.levels v where v.lesson_id=a.lesson_id and v.active and v.build_available
    and not exists(select 1 from public.student_level_progress p where p.student_id=auth.uid() and p.level_id=v.id and p.completed)
   ))
 ),false)
$$;

-- The browser reports execution results, but cannot claim that an administrator
-- cleared a submission. Table writes remain restricted to the existing RPCs.
create or replace function public.python_finish_run(p_run uuid,p_status text,p_result jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare r public.python_runs;
begin
 select * into r from public.python_runs where id=p_run and student_id=auth.uid() for update;
 if not found or public.python_role() is distinct from 'student' then raise exception 'Run not found.'; end if;
 if p_result ? 'history_cleared_at' then raise exception 'Invalid result metadata.'; end if;
 if p_status not in ('finished','error','stopped','timeout') or jsonb_typeof(p_result)<>'object' then raise exception 'Invalid result.'; end if;
 if r.status<>'running' then
  if r.status=p_status and r.result=p_result then return; end if;
  raise exception 'This Run is already finished.';
 end if;
 update public.python_runs set status=p_status,result=p_result,finished_at=now() where id=p_run;
end $$;

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
   select r.id,r.student_id,r.activity_id,r.started_at,r.finished_at,r.status,
    p.name as student_name,p.student_id as student_number,
    r.activity_snapshot->'content'->>'title' as item_title,
    s.id as submission_id,s.submitted_at,
    rv.review_version,
    greatest(r.started_at,r.finished_at,s.submitted_at,rv.last_review) as last_activity
   from public.python_runs r join public.profiles p on p.id=r.student_id
   left join public.python_submissions s on s.run_id=r.id
   left join lateral (
    select max(v.created_at) as last_review,
     md5(coalesce(string_agg(v.id::text||':'||v.xmin::text,',' order by v.id),'')) as review_version
    from public.python_reviews v where v.submission_id=s.id
   ) rv on true
   where (p_student is null or r.student_id=p_student)
    and (p_class is null or exists(select 1 from public.class_students cs where cs.student_id=r.student_id and cs.class_id=p_class))
    and r.status<>'running'
    and ((p_kind='python_practice' and s.id is null and r.status in ('error','stopped','timeout'))
      or (p_kind='python_finished' and s.id is null and r.status='finished')
      or (p_kind='python_submitted' and s.id is not null and not (r.result ? 'history_cleared_at')))
    and greatest(r.started_at,r.finished_at,s.submitted_at,rv.last_review)<p_before
  ), batch as (
   select c.*,md5(to_jsonb(r)::text) as run_version
   from (select * from candidates order by last_activity,id limit 500) c
   join public.python_runs r on r.id=c.id
  )
  select (select count(*) from candidates), coalesce(jsonb_agg(jsonb_build_object(
   'id',b.id::text,'student',b.student_name,'student_number',b.student_number,
   'item',b.item_title,'status',case when b.submission_id is not null then 'Submitted' else b.status end,
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
