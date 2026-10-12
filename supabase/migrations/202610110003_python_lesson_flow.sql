-- Python belongs to the assigned lesson. Existing game and Python records are preserved.
begin;
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
  and exists(select 1 from public.levels v where v.lesson_id=a.lesson_id and v.active)
  and not exists (
   select 1 from public.levels v where v.lesson_id=a.lesson_id and v.active
   and not exists(select 1 from public.student_level_progress p where p.student_id=auth.uid() and p.level_id=v.id and p.completed)
  )
 ),false)
$$;
-- Old grants remain readable/backed up, but can no longer unlock activities or bypass games.
revoke execute on function public.python_assign(uuid,uuid,bigint,boolean,timestamptz) from authenticated;
create or replace function public.python_review(p_submission uuid,p_status text,p_logic integer,p_application integer,p_correctness integer,p_feedback text) returns void language plpgsql security definer set search_path='' as $$
declare s public.python_submissions; reviewer text;
begin
 select * into s from public.python_submissions where id=p_submission;
 if not found or not public.python_can_review(s.student_id) then raise exception 'Submission not found.'; end if;
 select name into reviewer from public.profiles where id=auth.uid();
 insert into public.python_reviews(submission_id,student_id,reviewer_id,reviewer_name,status,logic,application,correctness,feedback)
 values(s.id,s.student_id,auth.uid(),reviewer,p_status,p_logic,p_application,p_correctness,p_feedback);
 insert into public.student_notifications(student_id,type,title,message,link) values(s.student_id,'info','Python activity reviewed',left(p_feedback,220),'/lesson/'||(select lesson_id from public.python_activities where id=s.activity_id)||'/python?run='||s.run_id||'#history');
end $$;

commit;
