begin;
-- Keep original snapshots/history visible only to the student who produced them.
drop policy python_activity_read on public.python_activities;
create policy python_activity_read on public.python_activities for select to authenticated using (
 public.python_role() in ('teacher','admin') or (public.python_role()='student' and
 (published or exists(select 1 from public.python_runs r where r.activity_id=python_activities.id and r.student_id=auth.uid())))
);
create function public.python_start_run_checked(p_activity uuid,p_run uuid,p_source text,p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare version integer;
begin
 -- Serialize against activity edits so the displayed checks and stored snapshot agree.
 select revision into version from public.python_activities where id=p_activity for share;
 if version is null or version <> p_revision then
  raise exception 'This activity was updated. Save a copy of your code, then reload the page before running it.';
 end if;
 return public.python_start_run(p_activity,p_run,p_source);
end $$;
revoke all on function public.python_start_run_checked(uuid,uuid,text,integer) from public,anon;
grant execute on function public.python_start_run_checked(uuid,uuid,text,integer) to authenticated;
commit;
