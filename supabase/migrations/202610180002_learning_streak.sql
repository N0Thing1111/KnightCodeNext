-- One learning-day definition for game attempts and completed/error Python runs.
-- Retain at most seven calendar dates on each profile so detail cleanup cannot
-- erase the weekly markers. Existing counters retain longer streak history.
begin;
do $backfill$
begin
 if not exists(select 1 from pg_attribute where attrelid='public.profiles'::regclass and attname='learning_activity_dates' and not attisdropped) then
  alter table public.profiles add column learning_activity_dates date[] not null default '{}';
  -- Include retained evidence and the already-earned game streak. Older detail
  -- may have been cleaned up, so never discard the saved longest streak.
  with evidence as (
   select p.id student_id, p.last_activity_date - g.n activity_day
   from public.profiles p cross join lateral generate_series(0,greatest(p.current_streak-1,-1)) g(n)
   where p.role='student' and p.last_activity_date is not null
   union
   select student_id,(created_at at time zone 'Asia/Manila')::date from public.student_activity
   where action_type in ('level_attempted','level_completed')
   union
   select student_id,(finished_at at time zone 'Asia/Manila')::date from public.python_runs
   where status in ('finished','error') and finished_at is not null
  ), dated as (
   select student_id,activity_day,activity_day-row_number() over(partition by student_id order by activity_day)::integer island
   from evidence where activity_day <= (now() at time zone 'Asia/Manila')::date
  ), chains as (
   select student_id,max(activity_day) last_day,count(*)::integer length from dated group by student_id,island
  ), latest as (
   select distinct on(student_id) student_id,last_day,length from chains order by student_id,last_day desc
  ), summary as (
   select p.id,l.last_day,coalesce(l.length,0) length,
    greatest(p.longest_streak,coalesce((select max(c.length) from chains c where c.student_id=p.id),0)) longest,
    coalesce((select array_agg(d.activity_day order by d.activity_day) from dated d where d.student_id=p.id
      and d.activity_day >= (now() at time zone 'Asia/Manila')::date-6),'{}'::date[]) days
   from public.profiles p left join latest l on l.student_id=p.id where p.role='student'
  )
  update public.profiles p set current_streak=s.length,longest_streak=s.longest,
   last_activity_date=s.last_day,learning_activity_dates=s.days from summary s where p.id=s.id;
 end if;
end $backfill$;

-- Private helper: the client cannot claim a learning day directly. The trusted
-- receivers call it after validating and saving an actual attempt/result.
create or replace function public.record_learning_day(p_student uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
 today date := (now() at time zone 'Asia/Manila')::date;
 previous date; streak integer; days date[];
begin
 select last_activity_date,current_streak,learning_activity_dates into previous,streak,days
 from public.profiles where id=p_student and role='student' and active for update;
 if not found then raise exception 'Active student required.'; end if;
 streak:=case when previous=today then greatest(streak,1) when previous=today-1 then streak+1 else 1 end;
 select array_agg(activity_day order by activity_day) into days from (
  select distinct activity_day from unnest(coalesce(days,'{}'::date[]) || array[today]) activity_day
  where activity_day between today-6 and today
 ) counted;
 update public.profiles set current_streak=streak,longest_streak=greatest(longest_streak,streak),
  last_activity_date=today,learning_activity_dates=days where id=p_student;
end $$;
revoke all on function public.record_learning_day(uuid) from public,anon,authenticated,service_role;

do $patch$
declare body text; old text; replacement text;
begin
 body:=pg_get_functiondef('public.record_level_progress(bigint,jsonb)'::regprocedure);
 old:=$old$update profiles set total_xp=total_xp+v_award,last_activity_date=v_today,current_streak=case when last_activity_date=v_today then current_streak when last_activity_date=v_today-1 then current_streak+1 else 1 end,longest_streak=greatest(longest_streak,case when last_activity_date=v_today then current_streak when last_activity_date=v_today-1 then current_streak+1 else 1 end) where id=v_student;$old$;
 replacement:=$new$update profiles set total_xp=total_xp+v_award where id=v_student;
    if d_attempts > 0 or v_completed then perform public.record_learning_day(v_student); end if;$new$;
 if position(replacement in body)=0 then
  if position(old in body)=0 then raise exception 'Game receiver changed; review streak patch.'; end if;
  execute replace(body,old,replacement);
 end if;
 body:=pg_get_functiondef('public.python_finish_run(uuid,text,jsonb)'::regprocedure);
 old:=$old$update public.python_runs set status=p_status,result=p_result,finished_at=now() where id=p_run;$old$;
 replacement:=old || $new$
 if p_status in ('finished','error') then
  perform public.record_learning_day(r.student_id);
  perform public.award_student_achievements(r.student_id);
 end if;$new$;
 if position('record_learning_day' in body)=0 then
  if position(old in body)=0 then raise exception 'Python receiver changed; review streak patch.'; end if;
  execute replace(body,old,replacement);
 end if;
 -- Capture already includes all profile columns. Old saves must explicitly
 -- replace the new summary, not leave post-backup dates on a restored profile.
 body:=pg_get_functiondef('public.restore_school_backup(jsonb,jsonb,uuid)'::regprocedure);
 old:=$old$row_data := jsonb_set(row_data,'{id}',to_jsonb(target_id));$old$;
 replacement:=old || $new$
    if not (row_data ? 'learning_activity_dates') or row_data->'learning_activity_dates'='null'::jsonb then
      row_data:=jsonb_set(row_data,'{learning_activity_dates}',coalesce((
        select jsonb_agg((row_data->>'last_activity_date')::date-n order by n desc)
        from generate_series(0,least(greatest(coalesce((row_data->>'current_streak')::integer,0),0),7)-1) n
        where nullif(row_data->>'last_activity_date','') is not null
      ),'[]'::jsonb));
    end if;$new$;
 if position('learning_activity_dates' in body)=0 then
  if position(old in body)=0 then raise exception 'Restore receiver changed; review streak patch.'; end if;
  execute replace(body,old,replacement);
 end if;
 body:=pg_get_functiondef('public.clear_school_data(uuid,text)'::regprocedure);
 old:='last_activity_date=null where role=''student''';
 replacement:='last_activity_date=null,learning_activity_dates=''{}''::date[] where role=''student''';
 if position('learning_activity_dates' in body)=0 then
  if position(old in body)=0 then raise exception 'Clear receiver changed; review streak patch.'; end if;
  execute replace(body,old,replacement);
 end if;
end $patch$;
commit;
