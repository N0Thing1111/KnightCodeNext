-- Additive Python practice records. Does not update game data or execute a restore.
begin;
create table public.python_activities (
 id uuid primary key default gen_random_uuid(),
 lesson_id bigint not null unique references public.lessons(id) on delete cascade,
 revision integer not null default 1 check(revision>0),
 content jsonb not null check(jsonb_typeof(content)='object'),
 published boolean not null default true,
 updated_at timestamptz not null default now()
);
create table public.python_grants (
 id uuid primary key default gen_random_uuid(),
 activity_id uuid not null references public.python_activities(id) on delete cascade,
 teacher_id uuid not null references public.profiles(id) on delete cascade,
 student_id uuid references public.profiles(id) on delete cascade,
 class_id bigint references public.classes(id) on delete cascade,
 due_date timestamptz,
 skip_game_gate boolean not null default false,
 created_at timestamptz not null default now(),
 check ((student_id is null) <> (class_id is null))
);
create unique index python_grant_student on public.python_grants(activity_id,student_id) where student_id is not null;
create unique index python_grant_class on public.python_grants(activity_id,class_id) where class_id is not null;
create table public.python_drafts (
 id uuid primary key default gen_random_uuid(),
 activity_id uuid not null references public.python_activities(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 source text not null default '' check(length(source)<=32768),
 updated_at timestamptz not null default now(),
 unique(activity_id,student_id)
);
create table public.python_runs (
 id uuid primary key,
 sequence bigint generated always as identity unique,
 activity_id uuid not null references public.python_activities(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 source text not null check(length(source) between 1 and 32768),
 activity_snapshot jsonb not null,
 status text not null default 'running' check(status in ('running','finished','error','stopped','timeout')),
 result jsonb not null default '{}' check(octet_length(result::text)<=150000),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 unique(id,student_id,activity_id)
);
create index python_runs_student_activity on public.python_runs(student_id,activity_id,sequence desc);
create table public.python_submissions (
 id uuid primary key default gen_random_uuid(),
 run_id uuid not null unique,
 student_id uuid not null references public.profiles(id) on delete cascade,
 activity_id uuid not null references public.python_activities(id) on delete cascade,
 submitted_at timestamptz not null default now(),
 foreign key(run_id,student_id,activity_id) references public.python_runs(id,student_id,activity_id) on delete cascade
);
create table public.python_reviews (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.python_submissions(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 reviewer_id uuid references public.profiles(id) on delete set null,
 reviewer_name text not null,
 status text not null check(status in ('reviewed','needs_revision','passed')),
 logic integer not null check(logic between 0 and 4),
 application integer not null check(application between 0 and 4),
 correctness integer not null check(correctness between 0 and 4),
 feedback text not null check(length(feedback)<=4000),
 created_at timestamptz not null default now()
);
create index python_reviews_submission on public.python_reviews(submission_id,created_at desc);
create or replace function public.python_role() returns text language sql stable security definer set search_path='' as $$
 select role::text from public.profiles where id=auth.uid() and active
$$;
create or replace function public.python_can_review(p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.python_role()='admin' or (public.python_role()='teacher' and public.is_current_student_teacher(p_student,auth.uid())),false)
$$;
create or replace function public.python_can_start(p_activity uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.python_role()='student' and exists (
  select 1 from public.python_activities a join public.lessons l on l.id=a.lesson_id
  where a.id=p_activity and a.published and l.active
  and exists(select 1 from public.python_grants g where g.activity_id=a.id
    and public.is_current_student_teacher(auth.uid(),g.teacher_id)
    and (g.student_id=auth.uid() or exists(select 1 from public.class_students cs where cs.student_id=auth.uid() and cs.class_id=g.class_id))
    and (g.skip_game_gate or (
      exists(select 1 from public.levels v where v.lesson_id=a.lesson_id and v.active)
      and not exists(select 1 from public.levels v where v.lesson_id=a.lesson_id and v.active
        and not exists(select 1 from public.student_level_progress p where p.student_id=auth.uid() and p.level_id=v.id and p.completed))
    )))
 )
$$;
-- All writes go through checked functions, not direct client table mutations.
do $$ declare t text; begin
 foreach t in array array['python_activities','python_grants','python_drafts','python_runs','python_submissions','python_reviews'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create policy python_activity_read on public.python_activities for select to authenticated using(public.python_role() in ('teacher','admin') or (public.python_role()='student' and published));
create policy python_grant_read on public.python_grants for select to authenticated using (
 public.python_role()='admin' or (public.python_role()='teacher' and teacher_id=auth.uid()) or
 (public.python_role()='student' and public.is_current_student_teacher(auth.uid(),teacher_id) and (student_id=auth.uid() or exists(select 1 from public.class_students cs where cs.class_id=python_grants.class_id and cs.student_id=auth.uid())))
);
do $$ declare t text; begin
 foreach t in array array['python_drafts','python_runs','python_submissions','python_reviews'] loop
  execute format('create policy python_history_read on public.%I for select to authenticated using ((public.python_role()=''student'' and student_id=auth.uid()) or public.python_can_review(student_id))',t);
 end loop;
end $$;
create or replace function public.python_save_draft(p_activity uuid,p_source text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(public.python_can_start(p_activity),false) then raise exception 'Activity is locked or not assigned.'; end if;
 insert into public.python_drafts(activity_id,student_id,source) values(p_activity,auth.uid(),p_source)
 on conflict(activity_id,student_id) do update set source=excluded.source,updated_at=now();
end $$;
create or replace function public.python_start_run(p_activity uuid,p_run uuid,p_source text) returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.python_runs;
begin
 if not coalesce(public.python_can_start(p_activity),false) then raise exception 'Activity is locked or not assigned.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,11102026));
 select * into existing from public.python_runs where id=p_run;
 if found then
  if existing.student_id<>auth.uid() or existing.activity_id<>p_activity or existing.source<>p_source then raise exception 'Run identity conflict.'; end if;
  return p_run;
 end if;
 if (select count(*) from public.python_runs where student_id=auth.uid() and started_at>now()-interval '1 minute')>=20 then raise exception 'Please wait before starting more Runs.'; end if;
 insert into public.python_runs(id,activity_id,student_id,source,activity_snapshot)
 select p_run,id,auth.uid(),p_source,jsonb_build_object('revision',revision,'content',content) from public.python_activities where id=p_activity;
 perform public.python_save_draft(p_activity,p_source);
 return p_run;
end $$;
create or replace function public.python_finish_run(p_run uuid,p_status text,p_result jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r public.python_runs;
begin
 select * into r from public.python_runs where id=p_run and student_id=auth.uid() for update;
 if not found or public.python_role() is distinct from 'student' then raise exception 'Run not found.'; end if;
 if p_status not in ('finished','error','stopped','timeout') or jsonb_typeof(p_result)<>'object' then raise exception 'Invalid result.'; end if;
 if r.status<>'running' then
  if r.status=p_status and r.result=p_result then return; end if;
  raise exception 'This Run is already finished.';
 end if;
 update public.python_runs set status=p_status,result=p_result,finished_at=now() where id=p_run;
end $$;
create or replace function public.python_submit(p_run uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.python_runs; result_id uuid;
begin
 select * into r from public.python_runs where id=p_run and student_id=auth.uid() for share;
 if not found or not coalesce(public.python_can_start(r.activity_id),false) then raise exception 'Submission is not allowed.'; end if;
 if r.status='running' then raise exception 'Wait for the Run result to save first.'; end if;
 insert into public.python_submissions(run_id,student_id,activity_id) values(r.id,auth.uid(),r.activity_id)
 on conflict(run_id) do nothing returning id into result_id;
 if result_id is null then select id into result_id from public.python_submissions where run_id=r.id; end if;
 return result_id;
end $$;
create or replace function public.python_review(p_submission uuid,p_status text,p_logic integer,p_application integer,p_correctness integer,p_feedback text) returns void language plpgsql security definer set search_path='' as $$
declare s public.python_submissions; reviewer text;
begin
 select * into s from public.python_submissions where id=p_submission;
 if not found or not public.python_can_review(s.student_id) then raise exception 'Submission not found.'; end if;
 select name into reviewer from public.profiles where id=auth.uid();
 insert into public.python_reviews(submission_id,student_id,reviewer_id,reviewer_name,status,logic,application,correctness,feedback)
 values(s.id,s.student_id,auth.uid(),reviewer,p_status,p_logic,p_application,p_correctness,p_feedback);
 insert into public.student_notifications(student_id,type,title,message,link) values(s.student_id,'info','Python activity reviewed',left(p_feedback,220),'/activities?run='||s.run_id);
end $$;
create or replace function public.python_assign(p_activity uuid,p_student uuid,p_class bigint,p_skip boolean,p_due timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare target_teacher uuid;
begin
 if public.python_role() not in ('teacher','admin') or public.python_role() is null then raise exception 'Staff access required.'; end if;
 if (p_student is null)=(p_class is null) then raise exception 'Select a section or a student.'; end if;
 if p_student is not null then
  select c.teacher_id into target_teacher from public.classes c join public.class_students cs on cs.class_id=c.id join public.profiles p on p.id=cs.student_id where cs.student_id=p_student and p.role='student' and p.active and c.status='active';
 else select teacher_id into target_teacher from public.classes where id=p_class and status='active'; end if;
 if target_teacher is null or (public.python_role()='teacher' and target_teacher<>auth.uid()) then raise exception 'Choose a student or section assigned to you.'; end if;
 if not exists(select 1 from public.profiles where id=target_teacher and role='teacher' and active) then raise exception 'An active teacher is required.'; end if;
 if p_student is not null then
  insert into public.python_grants(activity_id,teacher_id,student_id,skip_game_gate,due_date) values(p_activity,target_teacher,p_student,p_skip,p_due)
  on conflict(activity_id,student_id) where student_id is not null do update set teacher_id=excluded.teacher_id,skip_game_gate=excluded.skip_game_gate,due_date=excluded.due_date;
 else
  insert into public.python_grants(activity_id,teacher_id,class_id,skip_game_gate,due_date) values(p_activity,target_teacher,p_class,p_skip,p_due)
  on conflict(activity_id,class_id) where class_id is not null do update set teacher_id=excluded.teacher_id,skip_game_gate=excluded.skip_game_gate,due_date=excluded.due_date;
 end if;
end $$;
create or replace function public.python_update_activity(p_activity uuid,p_content jsonb,p_published boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if public.python_role() is distinct from 'admin' then raise exception 'Administrator access required.'; end if;
 if jsonb_typeof(p_content)<>'object' or octet_length(p_content::text)>50000 then raise exception 'Invalid activity content.'; end if;
 update public.python_activities set content=p_content,published=p_published,revision=revision+1,updated_at=now() where id=p_activity;
 if not found then raise exception 'Activity not found.'; end if;
end $$;
-- Validate persisted results even when a caller bypasses the website API.
create or replace function public.python_valid_result(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;
begin
 if jsonb_typeof(v) is distinct from 'object' then return false; end if;
 if jsonb_typeof(v->'output') is distinct from 'string' or length(v->>'output')>20000 then return false; end if;
 if jsonb_typeof(v->'error') is distinct from 'string' or length(v->>'error')>6000 then return false; end if;
 if jsonb_typeof(v->'elapsed_ms') is distinct from 'number' then return false; end if;
 if (v->>'elapsed_ms')::numeric<0 or (v->>'elapsed_ms')::numeric>120000 then return false; end if;
 if jsonb_typeof(v->'inputs') is distinct from 'array' then return false; end if;
 if jsonb_array_length(v->'inputs')>100 then return false; end if;
 for item in select value from jsonb_array_elements(v->'inputs') loop
  if jsonb_typeof(item)<>'string' or length(item#>>'{}')>4096 then return false; end if;
 end loop;
 if jsonb_typeof(v->'checks') is distinct from 'array' then return false; end if;
 if jsonb_array_length(v->'checks')>10 then return false; end if;
 for item in select value from jsonb_array_elements(v->'checks') loop
  if jsonb_typeof(item) is distinct from 'object'
    or jsonb_typeof(item->'passed') is distinct from 'boolean'
    or jsonb_typeof(item->'label') is distinct from 'string' or length(item->>'label')>100
    or jsonb_typeof(item->'actual') is distinct from 'string' or length(item->>'actual')>5000
    or jsonb_typeof(item->'expected') is distinct from 'string' or length(item->>'expected')>5000
    or jsonb_typeof(item->'error') is distinct from 'string' or length(item->>'error')>1000 then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;
alter table public.python_runs add constraint python_result_shape check ((status='running' and result='{}'::jsonb) or (status<>'running' and public.python_valid_result(result)));
alter table public.python_submissions add constraint python_submission_owner unique(id,student_id);
alter table public.python_reviews add constraint python_review_owner foreign key(submission_id,student_id) references public.python_submissions(id,student_id) on delete cascade;

-- Remove the default PUBLIC execute privilege on every new function.
do $$ declare f record; begin
 for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname like 'python\_%' escape '\' loop
  execute format('revoke all on function %s from public,anon',f.sig);
  execute format('grant execute on function %s to authenticated,service_role',f.sig);
 end loop;
end $$;
-- One activity per existing curriculum lesson; no old assignment is changed.
insert into public.python_activities(lesson_id,content) select id, '{"title":"Plan a purchase","concept":"Sequence","instructions":"A notebook costs 35 pesos. Read the quantity and then the money paid, each as a whole number. Calculate the total before calculating the change. Print the total on the first line and the change on the second line. Assume there is enough money. Use calculations, not answers typed directly into print().","guide":"A variable remembers a value. int(input()) reads a whole number. Multiplication uses *. Subtraction uses -. Python follows your instructions from top to bottom. Example: price = 10, quantity = 2, then total = price * quantity. print(total) displays 20.","starter":"# Read quantity, then money paid.\nquantity = int(input())\nmoney = int(input())\n# Calculate the total and change, then print each on its own line.\n","cases":[{"label":"Three notebooks","inputs":["3","120"],"expected":"105\n15"},{"label":"Exactly enough","inputs":["2","70"],"expected":"70\n0"},{"label":"One notebook","inputs":["1","50"],"expected":"35\n15"}],"extension":"Try a different notebook price and explain which calculation needs to change. Restore the required price before submitting."}'::jsonb from public.lessons where order_number=1 on conflict(lesson_id) do nothing;
insert into public.python_activities(lesson_id,content) select id, '{"title":"Check the fuel warning","concept":"If conditions","instructions":"Read a whole-number fuel amount. If fuel is below 5, print Low fuel. Always print Check complete afterward. When fuel is 5 or higher, the only output should be Check complete. Use an if condition so the warning is a decision, not a fixed message.","guide":"An if runs its indented instructions only when a condition is true. < means less than. Put a colon after the condition and four spaces before its body. Example: if score > 10: followed by an indented print(\"Target reached\"). A line without that indentation runs after the decision.","starter":"fuel = int(input())\n# Add a condition for the warning.\n\nprint(\"Check complete\")\n","cases":[{"label":"Low fuel","inputs":["2"],"expected":"Low fuel\nCheck complete"},{"label":"At the boundary","inputs":["5"],"expected":"Check complete"},{"label":"Enough fuel","inputs":["12"],"expected":"Check complete"}],"extension":"Predict what changes if you use <= instead of <. Try fuel 5 to check your prediction."}'::jsonb from public.lessons where order_number=2 on conflict(lesson_id) do nothing;
insert into public.python_activities(lesson_id,content) select id, '{"title":"Can I afford the notebook?","concept":"If and else","instructions":"A notebook costs 35 pesos. Read the money available as a whole number. If it is enough, print Buy and then the remaining money on the next line. Otherwise print Save more. Handle exactly 35 correctly. Use if and else to express the two choices.","guide":">= means greater than or equal to. else runs when the if condition is false; else also ends with a colon. Both branches need indentation. Read the money once, choose the branch, and calculate change only in the affordable branch.","starter":"money = int(input())\nprice = 35\n# Choose one of two actions and print the required result.\n","cases":[{"label":"Money left over","inputs":["50"],"expected":"Buy\n15"},{"label":"Exact amount","inputs":["35"],"expected":"Buy\n0"},{"label":"Not enough","inputs":["20"],"expected":"Save more"}],"extension":"Explain why using > instead of >= would make the exact-amount case wrong."}'::jsonb from public.lessons where order_number=3 on conflict(lesson_id) do nothing;
insert into public.python_activities(lesson_id,content) select id, '{"title":"Track a changing balance","concept":"State and updates","instructions":"Read an opening balance, a deposit, and a withdrawal, in that order. Add the deposit to the balance first. If the updated balance can cover the withdrawal, subtract it and print the final balance. Otherwise print Declined and then the unchanged updated balance on the next line. Assume nonnegative whole-number inputs.","guide":"balance = balance + deposit replaces the old value with the new one. Later conditions see the new value. A decision made before an update can give a different result. Trace the value after each step on paper before running.","starter":"balance = int(input())\ndeposit = int(input())\nwithdrawal = int(input())\n# Update the balance before deciding about the withdrawal.\n","cases":[{"label":"Deposit makes it possible","inputs":["10","30","35"],"expected":"5"},{"label":"Withdrawal declined","inputs":["10","5","20"],"expected":"Declined\n15"},{"label":"Use the full balance","inputs":["20","15","35"],"expected":"0"}],"extension":"Move the condition before the deposit temporarily. Which example now behaves incorrectly, and why?"}'::jsonb from public.lessons where order_number=4 on conflict(lesson_id) do nothing;
insert into public.python_activities(lesson_id,content) select id, '{"title":"Total several items","concept":"Repeat with a for loop","instructions":"Read how many items there are. Then read one whole-number price for each item. Use a for loop to add all prices and print only the final total. Zero items must produce 0. Do not write one separate input line for every example item: the loop should work for any nonnegative count.","guide":"range(count) repeats count times. Start total at 0 before the loop. Inside the loop, read a price and add it to total. Indented lines repeat; a print placed after the loop runs once. Example: for step in range(3): repeats its body three times.","starter":"count = int(input())\ntotal = 0\n# Repeat reading and adding a price count times.\n\nprint(total)\n","cases":[{"label":"Three items","inputs":["3","10","20","5"],"expected":"35"},{"label":"No items","inputs":["0"],"expected":"0"},{"label":"One item","inputs":["1","17"],"expected":"17"}],"extension":"Also calculate the number of items costing more than 20. Remove the extra output before submitting the required version."}'::jsonb from public.lessons where order_number=5 on conflict(lesson_id) do nothing;
insert into public.python_activities(lesson_id,content) select id, '{"title":"Save until the target","concept":"While conditions","instructions":"Read a positive whole-number target. Starting with savings of 0, repeatedly read a positive deposit while savings are below the target. Stop asking as soon as the target is reached or exceeded. Print the savings and then the number of deposits, on separate lines. Use a while loop with an update that makes the condition eventually false.","guide":"while repeats as long as its condition is true. Initialize savings and count before the loop; update both inside it. Forgetting the savings update can create an endless loop. The target may be reached exactly or exceeded, so compare using < rather than !=.","starter":"target = int(input())\nsavings = 0\ndeposits = 0\n# Keep accepting deposits only while savings are below target.\n\nprint(savings)\nprint(deposits)\n","cases":[{"label":"Reach exactly","inputs":["50","20","30"],"expected":"50\n2"},{"label":"Go above target","inputs":["40","25","25"],"expected":"50\n2"},{"label":"One deposit","inputs":["10","15"],"expected":"15\n1"}],"extension":"Explain why savings != target can keep requesting deposits forever when a deposit takes savings above the target."}'::jsonb from public.lessons where order_number=6 on conflict(lesson_id) do nothing;
insert into public.python_activities(lesson_id,content) select id, '{"title":"Repair the ticket counter","concept":"Plan, combine, and debug","instructions":"Read the number of visitors, then one whole-number age per visitor. Tickets cost 5 for ages below 12 and 10 for everyone else. Use repetition and a decision to compute the total and print it once. Repair the starter program: it contains mistakes in its starting total, loop count, and age boundary. Test zero visitors and age exactly 12 before submitting.","guide":"Trace a small example before editing. Ask: what should total be before anyone arrives? How many ages should be read? Which branch includes age 12? Fix the cause, then rerun the same case and a different case. A for loop and an if/else can work together.","starter":"visitors = int(input())\ntotal = 1\nfor visitor in range(visitors + 1):\n    age = int(input())\n    if age <= 12:\n        total = total + 5\n    else:\n        total = total + 10\nprint(total)\n","cases":[{"label":"Mixed ages","inputs":["3","8","12","20"],"expected":"25"},{"label":"No visitors","inputs":["0"],"expected":"0"},{"label":"Boundary age","inputs":["1","12"],"expected":"10"}],"extension":"Describe the effect of each original bug. Then consider how you would add a separate senior ticket price."}'::jsonb from public.lessons where order_number=7 on conflict(lesson_id) do nothing;
commit;
