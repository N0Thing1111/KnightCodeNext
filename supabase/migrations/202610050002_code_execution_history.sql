-- Run history is separate from restart-based attempts and never awards XP.
begin;
create table public.student_code_executions (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  level_id bigint not null references public.levels(id) on delete cascade,
  run_id text not null,
  session_number integer not null,
  execution_number integer not null check (execution_number between 1 and 100000),
  restart_number integer not null check (restart_number between 0 and 100),
  source text not null check (char_length(source) <= 32768),
  source_truncated boolean not null default false,
  status text not null check (status in ('running','finished','warning','rejected','completed','interrupted')),
  warning text not null default '' check (char_length(warning) <= 500),
  code_mode public.code_mode not null,
  start_x numeric not null, start_y numeric not null,
  end_x numeric not null, end_y numeric not null,
  elapsed_ms integer not null check (elapsed_ms between 0 and 86400000),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (student_id, level_id, run_id, execution_number),
  foreign key (student_id, level_id, run_id, session_number)
    references public.student_level_sessions(student_id, level_id, run_id, session_number)
    on delete cascade
);
create index code_executions_session_idx on public.student_code_executions
  (student_id, level_id, run_id, session_number, execution_number);
alter table public.student_code_executions enable row level security;
revoke all on public.student_code_executions from anon, authenticated;
grant select on public.student_code_executions to authenticated;
grant all on public.student_code_executions to service_role;
grant usage, select on sequence public.student_code_executions_id_seq to service_role;
create policy student_reads_own_code_executions on public.student_code_executions
  for select to authenticated using (student_id = auth.uid());

create or replace function public.record_code_execution(p_level_id bigint, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_student uuid := auth.uid();
  v_session public.student_level_sessions%rowtype;
  v_existing public.student_code_executions%rowtype;
  v_number integer;
  v_status text;
  v_axis text;
begin
  if v_student is null or not exists (
    select 1 from public.profiles where id = v_student and role = 'student' and active
  ) then raise exception 'Student authentication required'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or not (p_payload ?& array['run_id','scene_name','execution_number','restart_number','source',
      'source_truncated','status','code_mode','start_x','start_y','end_x','end_y','elapsed_ms'])
    or coalesce(p_payload->>'run_id','') !~ '^[A-Za-z0-9_-]{16,64}$'
    or jsonb_typeof(p_payload->'source') <> 'string'
    or char_length(p_payload->>'source') > 32768
    or jsonb_typeof(p_payload->'source_truncated') <> 'boolean'
    or coalesce(p_payload->>'status','') not in ('running','finished','warning','rejected','completed','interrupted')
    or coalesce(p_payload->>'code_mode','') not in ('guided','hint','free')
    or char_length(coalesce(p_payload->>'warning','')) > 500
    or coalesce((p_payload->>'execution_number')::integer,0) not between 1 and 100000
    or coalesce((p_payload->>'restart_number')::integer,-1) not between 0 and 100
    or coalesce((p_payload->>'elapsed_ms')::integer,-1) not between 0 and 86400000
  then raise exception 'Invalid Run history'; end if;
  foreach v_axis in array array['start_x','start_y','end_x','end_y'] loop
    if jsonb_typeof(p_payload->v_axis) <> 'number'
      or coalesce((p_payload->>v_axis)::numeric,1000001) not between -1000000 and 1000000
    then raise exception 'Invalid Run position'; end if;
  end loop;
  if not exists (
    select 1 from public.levels l join public.assignments a
      on a.level_id=l.id or (a.level_id is null and a.lesson_id=l.lesson_id)
    where l.id=p_level_id and l.active and l.level_number::text=p_payload->>'scene_name'
      and (a.student_id=v_student or exists (
        select 1 from public.class_students cs where cs.class_id=a.class_id and cs.student_id=v_student
      ))
  ) then raise exception 'Level is not assigned'; end if;

  -- Progress and Run messages use one browser queue. The progress receiver
  -- creates the session first and validates whether the level is unlocked.
  select * into v_session from public.student_level_sessions
    where student_id=v_student and level_id=p_level_id and run_id=p_payload->>'run_id'
    order by session_number desc limit 1 for update;
  if not found then raise exception 'Save level progress before Run history'; end if;
  v_number := (p_payload->>'execution_number')::integer;
  v_status := p_payload->>'status';
  select * into v_existing from public.student_code_executions
    where student_id=v_student and level_id=p_level_id
      and run_id=p_payload->>'run_id' and execution_number=v_number;
  if found and v_existing.source <> p_payload->>'source' then
    raise exception 'Run source cannot be replaced';
  end if;

  insert into public.student_code_executions (
    student_id,level_id,run_id,session_number,execution_number,restart_number,
    source,source_truncated,status,warning,code_mode,start_x,start_y,end_x,end_y,elapsed_ms,finished_at
  ) values (
    v_student,p_level_id,p_payload->>'run_id',v_session.session_number,v_number,
    (p_payload->>'restart_number')::integer,p_payload->>'source',
    (p_payload->>'source_truncated')::boolean,v_status,coalesce(p_payload->>'warning',''),
    (p_payload->>'code_mode')::public.code_mode,
    (p_payload->>'start_x')::numeric,(p_payload->>'start_y')::numeric,
    (p_payload->>'end_x')::numeric,(p_payload->>'end_y')::numeric,
    (p_payload->>'elapsed_ms')::integer,case when v_status <> 'running' then now() end
  ) on conflict (student_id,level_id,run_id,execution_number) do update
    set status=excluded.status,warning=excluded.warning,end_x=excluded.end_x,end_y=excluded.end_y,
      elapsed_ms=excluded.elapsed_ms,finished_at=excluded.finished_at
    where student_code_executions.status='running' and excluded.status <> 'running';
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.record_code_execution(bigint,jsonb) from public, anon;
grant execute on function public.record_code_execution(bigint,jsonb) to authenticated;
commit;
