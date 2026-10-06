-- Award achievements from saved progress, and restore awards missed before this fix.
-- Apply after the student foundation and runtime fixes. Safe to run again.
begin;

-- Private helper: callers cannot submit their own counts or award another student.
create or replace function public.award_student_achievements(p_student uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_completed bigint;
  v_total bigint;
  v_xp bigint;
  v_streak integer;
  v_new jsonb;
begin
  -- Serialize awards for the same student, including simultaneous game saves.
  select greatest(current_streak, longest_streak)
    into v_streak
    from public.profiles
    where id = p_student and role = 'student'
    for update;
  if not found then
    return '[]'::jsonb;
  end if;

  -- Match the original game's active-level rules. Earned badges are permanent.
  select count(*), count(*) filter (where p.completed),
         coalesce(sum(p.xp_earned), 0)
    into v_total, v_completed, v_xp
    from public.levels l
    left join public.student_level_progress p
      on p.level_id = l.id and p.student_id = p_student
    where l.active;

  with awarded as (
    insert into public.student_achievements (student_id, achievement_id)
    select p_student, a.id
      from public.achievements a
      where case a.requirement_type
        when 'levels_completed' then v_completed >= a.requirement_value
        when 'full_course' then v_total > 0 and v_completed = v_total
        when 'streak' then v_streak >= a.requirement_value
        when 'xp' then v_xp >= a.requirement_value
        else false
      end
    on conflict (student_id, achievement_id) do nothing
    returning achievement_id, earned_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'name', a.name, 'description', a.description,
    'icon', a.icon, 'earned_at', awarded.earned_at
  ) order by a.id), '[]'::jsonb)
    into v_new
    from awarded join public.achievements a on a.id = awarded.achievement_id;

  insert into public.student_notifications (
    student_id, notification_key, type, title, message, link
  )
  select p_student, 'achievement_' || (badge->>'id'), 'achievement',
         'Achievement unlocked!',
         (badge->>'name') || ': ' || (badge->>'description'),
         '/profile#achievements'
    from jsonb_array_elements(v_new) badge
  on conflict (student_id, notification_key) do nothing;

  return v_new;
end;
$$;
revoke all on function public.award_student_achievements(uuid)
  from public, anon, authenticated;

-- Preserve the existing telemetry receiver, adding awards after its saved stats.
create or replace function public.record_level_progress(p_level_id bigint, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_student uuid := auth.uid(); v_level levels%rowtype; v_run student_telemetry_runs%rowtype; v_session student_level_sessions%rowtype; v_progress student_level_progress%rowtype;
  v_attempts int := (p_payload->>'attempts')::int; v_mistakes int := (p_payload->>'mistakes')::int; v_seconds int := (p_payload->>'total_play_time_seconds')::int; v_lines int := (p_payload->>'lines_used')::int; v_completed boolean := (p_payload->>'completed')::boolean; v_seq int := (p_payload->>'sequence')::int; v_duplicate boolean := false; v_award int := 0;
  d_attempts int; d_mistakes int; d_seconds int; d_lines int; v_session_number int; v_new record; v_today date := (now() at time zone 'Asia/Manila')::date;
begin
  if v_student is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_payload) <> 'object'
    or coalesce(p_payload->>'run_id','') !~ '^[A-Za-z0-9_-]{16,64}$'
    or v_seq < 1
    or (p_payload->>'telemetry_version')::int not in (1,2)
    or v_attempts not between 1 and 100
    or v_mistakes not between 0 and 1000
    or v_seconds not between 0 and 86400
    or v_lines not between 0 and 10000
    or (p_payload->>'play_time_seconds')::int not between 0 and 86400
    or (p_payload->>'completed_lines')::int not between 0 and 10000
    or (p_payload->>'play_time_seconds')::int > v_seconds
    or (p_payload->>'completed_lines')::int > v_lines
    or coalesce(p_payload->>'scene_name','') !~ '^[0-9]+$'
    or (nullif(p_payload->>'code_mode','') is not null and p_payload->>'code_mode' not in ('guided','hint','free'))
  then raise exception 'Invalid telemetry'; end if;
  select * into v_level from levels where id=p_level_id and active=true;
  if not found or v_level.level_number::text <> p_payload->>'scene_name' then raise exception 'Level mismatch'; end if;
  if not exists(select 1 from assignments a where (a.level_id=p_level_id or (a.level_id is null and a.lesson_id=v_level.lesson_id)) and (a.student_id=v_student or exists(select 1 from class_students cs where cs.class_id=a.class_id and cs.student_id=v_student))) then raise exception 'Level is not assigned'; end if;
  -- Whole-lesson assignments unlock in order. A direct level assignment remains
  -- playable immediately, matching the existing PHP behavior.
  if not exists(select 1 from assignments a where a.level_id=p_level_id and (a.student_id=v_student or exists(select 1 from class_students cs where cs.class_id=a.class_id and cs.student_id=v_student)))
    and exists(
      select 1 from levels prior
      where prior.lesson_id=v_level.lesson_id and prior.active=true and prior.order_in_lesson < v_level.order_in_lesson
        and not exists(select 1 from student_level_progress slp where slp.student_id=v_student and slp.level_id=prior.id and slp.completed=true)
    )
  then raise exception 'Level is locked'; end if;
  insert into student_telemetry_runs(student_id,level_id,run_id) values(v_student,p_level_id,p_payload->>'run_id') on conflict do nothing;
  select * into v_run from student_telemetry_runs where student_id=v_student and level_id=p_level_id and run_id=p_payload->>'run_id' for update;
  if v_seq <= v_run.sequence_number then v_duplicate := true;
  elsif v_attempts < v_run.attempts or v_mistakes < v_run.mistakes or v_seconds < v_run.total_seconds or v_lines < v_run.total_lines then raise exception 'Cumulative telemetry decreased';
  else
    d_attempts:=v_attempts-v_run.attempts; d_mistakes:=v_mistakes-v_run.mistakes; d_seconds:=v_seconds-v_run.total_seconds; d_lines:=v_lines-v_run.total_lines;
    select * into v_session from student_level_sessions where student_id=v_student and level_id=p_level_id and run_id=p_payload->>'run_id' order by session_number desc limit 1 for update;
    if not found or v_session.completed then
      v_session_number:=coalesce(v_session.session_number,0)+1;
      insert into student_level_sessions(student_id,level_id,run_id,session_number,base_attempts,base_mistakes,base_seconds,base_lines,telemetry_version,code_mode)
      values(v_student,p_level_id,p_payload->>'run_id',v_session_number,coalesce(v_session.base_attempts+v_session.attempts,0),coalesce(v_session.base_mistakes+v_session.mistakes,0),coalesce(v_session.base_seconds+v_session.play_time_seconds,0),coalesce(v_session.base_lines+v_session.lines_used,0),(p_payload->>'telemetry_version')::int,nullif(p_payload->>'code_mode','')::code_mode) returning * into v_session;
    end if;
    update student_level_sessions set attempts=v_attempts-base_attempts,mistakes=v_mistakes-base_mistakes,play_time_seconds=v_seconds-base_seconds,lines_used=v_lines-base_lines,completed_lines=case when v_completed and (p_payload->>'telemetry_version')::int=2 then (p_payload->>'completed_lines')::int else null end,completed=v_completed,completed_at=case when v_completed then now() else null end where id=v_session.id returning * into v_session;
    insert into student_level_progress(student_id,level_id) values(v_student,p_level_id) on conflict do nothing;
    select * into v_progress from student_level_progress where student_id=v_student and level_id=p_level_id for update;
    if v_completed and not v_progress.completed then v_award:=v_level.xp_reward; end if;
    update student_level_progress set completed=completed or v_completed,attempts=attempts+d_attempts,mistakes=mistakes+d_mistakes,play_time_seconds=play_time_seconds+d_seconds,lines_used=coalesce(lines_used,0)+d_lines,best_time_seconds=case when v_completed then least(coalesce(best_time_seconds,(p_payload->>'play_time_seconds')::int),(p_payload->>'play_time_seconds')::int) else best_time_seconds end,best_lines_used=case when v_completed then least(coalesce(best_lines_used,(p_payload->>'completed_lines')::int),(p_payload->>'completed_lines')::int) else best_lines_used end,xp_earned=xp_earned+v_award,completed_at=case when v_completed and completed_at is null then now() else completed_at end,updated_at=now() where student_id=v_student and level_id=p_level_id returning * into v_progress;
    update profiles set total_xp=total_xp+v_award,last_activity_date=v_today,current_streak=case when last_activity_date=v_today then current_streak when last_activity_date=v_today-1 then current_streak+1 else 1 end,longest_streak=greatest(longest_streak,case when last_activity_date=v_today then current_streak when last_activity_date=v_today-1 then current_streak+1 else 1 end) where id=v_student;
    if v_completed then
      insert into student_activity(student_id,level_id,action_type,xp_earned,duration_seconds,metadata)
      values(v_student,p_level_id,'level_completed',v_award,d_seconds,jsonb_build_object('run_id',p_payload->>'run_id','sequence',v_seq,'session_number',v_session.session_number));
    elsif d_attempts > 0 then
      insert into student_activity(student_id,level_id,action_type,xp_earned,duration_seconds,metadata)
      values(v_student,p_level_id,'level_attempted',0,d_seconds,jsonb_build_object('run_id',p_payload->>'run_id','sequence',v_seq,'attempt_delta',d_attempts,'session_number',v_session.session_number));
    end if;
    update student_telemetry_runs set sequence_number=v_seq,attempts=v_attempts,mistakes=v_mistakes,total_seconds=v_seconds,total_lines=v_lines,updated_at=now() where student_id=v_student and level_id=p_level_id and run_id=p_payload->>'run_id';
  end if;
  select * into v_progress from student_level_progress where student_id=v_student and level_id=p_level_id;
  select * into v_session from student_level_sessions where student_id=v_student and level_id=p_level_id and run_id=p_payload->>'run_id' order by session_number desc limit 1;
  return jsonb_build_object('duplicate',v_duplicate,'level',to_jsonb(v_progress),'session',to_jsonb(v_session),'new_achievements',public.award_student_achievements(v_student));
end $$;
revoke all on function public.record_level_progress(bigint,jsonb) from public;
grant execute on function public.record_level_progress(bigint,jsonb) to authenticated;

-- Existing completions qualify immediately; students do not need to replay.
-- Repair time is the award timestamp because the original award was never saved.
-- longest_streak also restores badges earned before a student's streak reset.
do $$
declare
  v_student uuid;
begin
  for v_student in select id from public.profiles where role = 'student' order by id
  loop
    perform public.award_student_achievements(v_student);
  end loop;
end;
$$;

commit;
