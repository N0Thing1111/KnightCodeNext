-- Apply after deploying the matching account-creation code (app_metadata.role).
-- Existing profiles and passwords are unchanged. Public metadata cannot grant staff access.
begin;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,role,student_id,username,name,email,class_section)
 values(new.id,
  case when new.raw_app_meta_data->>'role' in ('student','teacher','admin') then (new.raw_app_meta_data->>'role')::public.account_role else 'student' end,
  nullif(new.raw_user_meta_data->>'student_id',''),nullif(lower(new.raw_user_meta_data->>'username'),''),
  coalesce(nullif(new.raw_user_meta_data->>'name',''),split_part(new.email,'@',1)),lower(new.email),nullif(new.raw_user_meta_data->>'class_section',''));
 return new;
end $$;
commit;
