-- One current section per student. Keep table/column names for old save files.
begin;
-- Never silently choose a teacher or discard an existing membership.
do $$ begin
  if exists (select student_id from public.class_students group by student_id having count(*) > 1) then
    raise exception 'Some students belong to multiple sections. Resolve their memberships before applying this migration.';
  end if;
end $$;
create unique index if not exists class_students_one_section on public.class_students(student_id);

create or replace function public.section_display_name(p_name text, p_section text)
returns text language sql immutable set search_path = '' as $$
 select case when nullif(trim(p_section),'') is null or trim(p_name)=trim(p_section)
 then trim(p_name) else trim(p_name) || ' - ' || trim(p_section) end
$$;
-- Preserve both parts of old names, then keep the legacy section column in sync.
update public.classes set name=public.section_display_name(name,section),
 section=public.section_display_name(name,section) where id in (select id from public.classes);
create or replace function public.normalize_section_name() returns trigger
language plpgsql set search_path = '' as $$ begin
 if tg_op='INSERT' then
   new.name := public.section_display_name(new.name,new.section);
 end if;
 new.name := trim(new.name);
 if new.name='' then raise exception 'Section name is required'; end if;
 new.section := new.name;
 return new;
end $$;
create trigger normalize_section_name before insert or update on public.classes
for each row execute function public.normalize_section_name();

-- The profile field is a display copy, never a second source of membership.
create or replace function public.derive_student_section() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
 if new.role='student' then
  new.class_section := (select c.name from public.class_students cs join public.classes c on c.id=cs.class_id where cs.student_id=new.id);
 end if;
 return new;
end $$;
create trigger derive_student_section before insert or update of class_section on public.profiles
for each row execute function public.derive_student_section();
create or replace function public.sync_student_section() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
 if tg_op <> 'INSERT' then
  update public.profiles set class_section=null where id=old.student_id;
 end if;
 if tg_op <> 'DELETE' then
  update public.profiles set class_section=null where id=new.student_id;
 end if;
 return null;
end $$;
create trigger sync_student_section after insert or update or delete on public.class_students
for each row execute function public.sync_student_section();
create or replace function public.sync_section_students() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
 update public.profiles set class_section=null where id in (select student_id from public.class_students where class_id=new.id);
 return null;
end $$;
create trigger sync_section_students after update of name on public.classes
for each row execute function public.sync_section_students();
update public.profiles set class_section=null where role='student';
revoke update (class_section) on public.profiles from authenticated;

-- Server actions authenticate the actor; only the server service role can call this.
create or replace function public.set_student_section(p_student uuid,p_section bigint,p_actor uuid,p_allow_move boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_role public.account_role; old_section bigint; old_teacher uuid; target_teacher uuid;
begin
 select role into actor_role from public.profiles where id=p_actor and active and role in ('admin','teacher');
 if actor_role is null then raise exception 'Administrator or teacher authentication required'; end if;
 perform 1 from public.profiles where id=p_student and role='student' for update;
 if not found then raise exception 'Student not found'; end if;
 select cs.class_id,c.teacher_id into old_section,old_teacher from public.class_students cs join public.classes c on c.id=cs.class_id where cs.student_id=p_student;
 if actor_role='teacher' and old_teacher is not null and old_teacher<>p_actor then
  raise exception 'This student already belongs to another teacher. Ask an administrator to transfer the student.';
 end if;
 if old_section is not distinct from p_section then return; end if;
 if p_section is not null then
  select c.teacher_id into target_teacher from public.classes c join public.profiles p on p.id=c.teacher_id
    where c.id=p_section and c.status='active' and p.role='teacher' and p.active for share of c;
  if target_teacher is null then raise exception 'Choose an active section with an active teacher'; end if;
  if actor_role='teacher' and target_teacher<>p_actor then raise exception 'You can only enroll students in your own sections'; end if;
 end if;
 if old_section is not null and p_section is not null and old_section<>p_section and not p_allow_move then
  raise exception 'Student already belongs to a section. Use the transfer option instead.';
 end if;
 if old_section is not distinct from p_section then return; end if;
 if old_section is not null then delete from public.class_students where student_id=p_student; end if;
 if p_section is not null then insert into public.class_students(class_id,student_id) values(p_section,p_student); end if;
end $$;
revoke all on function public.set_student_section(uuid,bigint,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_student_section(uuid,bigint,uuid,boolean) to service_role;
create or replace function public.section_membership_version() returns integer language sql as $$ select 1 $$;
revoke all on function public.section_membership_version() from public,anon,authenticated;
grant execute on function public.section_membership_version() to service_role;

-- A transfer keeps history but stops the previous teacher's assignments granting access.
create or replace function public.is_current_student_teacher(p_student uuid,p_teacher uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.class_students cs join public.classes c on c.id=cs.class_id
 where cs.student_id=p_student and c.teacher_id=p_teacher)
$$;
revoke all on function public.is_current_student_teacher(uuid,uuid) from public,anon;
grant execute on function public.is_current_student_teacher(uuid,uuid) to authenticated,service_role;
create policy assignments_current_teacher on public.assignments as restrictive for select to authenticated
using (public.is_current_student_teacher(auth.uid(),teacher_id));
-- These game RPCs use SECURITY DEFINER and need the same check as the student pages.
do $patch$
declare signature text; definition text;
begin
 foreach signature in array array['public.record_student_activity(text,bigint,bigint)', 'public.record_level_progress(bigint,jsonb)', 'public.record_code_execution(bigint,jsonb)'] loop
  definition := pg_get_functiondef(signature::regprocedure);
  definition := replace(definition,'a.student_id=v_student or exists',
    'public.is_current_student_teacher(v_student,a.teacher_id) and a.student_id=v_student or public.is_current_student_teacher(v_student,a.teacher_id) and exists');
  execute definition;
 end loop;
end $patch$;
commit;
