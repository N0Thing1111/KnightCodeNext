-- Safe removal of an unused lesson. Installing this function changes no school records.
begin;
create or replace function public.delete_unused_lesson(p_admin uuid, p_lesson bigint)
returns void language plpgsql security definer
set search_path = '' set statement_timeout = '15s' set lock_timeout = '5s' as $$
declare lesson_title text;
begin
  if p_lesson is null or p_lesson < 1 then raise exception 'Invalid lesson.'; end if;
  if not exists(select 1 from public.profiles where id=p_admin and role='admin' and active) then
    raise exception 'Administrator required.';
  end if;
  -- Use the same lock order as school backups/restores. Other writers cannot
  -- attach a level, assignment, activity, or visit between this check and deletion.
  perform public.lock_school_snapshot();
  select title into lesson_title from public.lessons where id=p_lesson;
  if not found then raise exception 'Lesson not found. Refresh the lesson list.'; end if;
  if exists(select 1 from public.levels where lesson_id=p_lesson)
    or exists(select 1 from public.assignments where lesson_id=p_lesson)
    or exists(select 1 from public.python_activities where lesson_id=p_lesson)
    or exists(select 1 from public.student_activity where metadata->>'lesson_id'=p_lesson::text) then
    raise exception 'This lesson has linked levels, assignments, Python activities, or learning history. Archive it instead; no records were deleted.';
  end if;
  delete from public.lessons where id=p_lesson;
  insert into public.admin_audit_log(admin_id,action,entity,record_id,details)
  values(p_admin,'delete','lessons',p_lesson::text,jsonb_build_object('title',lesson_title,'unused_only',true));
end $$;
revoke all on function public.delete_unused_lesson(uuid,bigint) from public,anon,authenticated;
grant execute on function public.delete_unused_lesson(uuid,bigint) to service_role;
notify pgrst, 'reload schema';
commit;
