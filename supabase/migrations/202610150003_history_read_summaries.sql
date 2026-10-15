-- Read-only summaries; no school records are modified.
begin;
create index if not exists student_activity_student_created_idx on public.student_activity(student_id,created_at desc);
create index if not exists python_runs_student_started_idx on public.python_runs(student_id,started_at desc);
create index if not exists student_sessions_student_level_idx on public.student_level_sessions(student_id,level_id);
create or replace function public.teacher_history_summary(p_teacher uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_teacher and role='teacher' and active) then raise exception 'Active teacher required.'; end if;
 with roster as materialized (
  select distinct cs.student_id from public.class_students cs join public.classes c on c.id=cs.class_id
  join public.profiles p on p.id=cs.student_id and p.role='student' where c.teacher_id=p_teacher
 ), recent as (
  select a.* from public.student_activity a join roster r on r.student_id=a.student_id order by a.created_at desc,a.id desc limit 8
 ), latest as (
  select r.student_id,
   (select a.created_at from public.student_activity a where a.student_id=r.student_id order by a.created_at desc limit 1) game_activity,
   (select p.started_at from public.python_runs p where p.student_id=r.student_id order by p.started_at desc limit 1) python_started from roster r
 ), assessment as (
  select s.student_id,s.level_id,sum(greatest(s.attempts-1,0)) unsuccessful
  from public.student_level_sessions s join roster r on r.student_id=s.student_id group by s.student_id,s.level_id
 ), days as (
  select (a.created_at at time zone 'Asia/Manila')::date::text as day,count(*) count
  from public.student_activity a join roster r on r.student_id=a.student_id
  where a.created_at >= (((now() at time zone 'Asia/Manila')::date - 6)::timestamp at time zone 'Asia/Manila') group by 1
 )
 select jsonb_build_object('recent',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id desc) from recent t),'[]'::jsonb),
  'latest',coalesce((select jsonb_agg(to_jsonb(t)) from latest t),'[]'::jsonb),
  'sessions',coalesce((select jsonb_agg(to_jsonb(t)) from assessment t),'[]'::jsonb),
  'days',coalesce((select jsonb_agg(to_jsonb(t)) from days t),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.teacher_history_summary(uuid) from public,anon,authenticated;
grant execute on function public.teacher_history_summary(uuid) to service_role;
-- Invoker security retains submission RLS for the authenticated viewer.
create or replace function public.python_completion_pairs()
returns table(student_id uuid,activity_id uuid) language sql stable security invoker set search_path='' as $$
 select distinct s.student_id,s.activity_id from public.python_submissions s
$$;
revoke all on function public.python_completion_pairs() from public,anon;
grant execute on function public.python_completion_pairs() to authenticated,service_role;
notify pgrst,'reload schema';
commit;
