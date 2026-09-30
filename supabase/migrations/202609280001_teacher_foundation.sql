-- KnightCode teacher portal foundation. Additive: preserves all student data.
alter table public.profiles add column if not exists teacher_id text;
alter table public.profiles add column if not exists school_code text;
alter table public.profiles drop constraint if exists profiles_student_id_key;
create unique index if not exists profiles_school_student_unique on public.profiles(school_code,lower(student_id)) where role='student' and student_id is not null;
create unique index if not exists profiles_teacher_id_unique on public.profiles(lower(teacher_id)) where teacher_id is not null;
create index if not exists profiles_school_code_idx on public.profiles(school_code) where school_code is not null;

create type public.announcement_status as enum ('draft','published');
create table public.announcements (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id bigint references public.classes(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 10000),
  status public.announcement_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger announcements_touch before update on public.announcements for each row execute function public.touch_updated_at();
create index announcements_teacher_idx on public.announcements(teacher_id,created_at desc);

create table public.teacher_notifications (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  notification_key text not null,
  type text not null default 'activity',
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(teacher_id,notification_key)
);
create index teacher_notifications_teacher_idx on public.teacher_notifications(teacher_id,is_read,created_at desc);

alter table public.announcements enable row level security;
alter table public.teacher_notifications enable row level security;
create policy teacher_reads_own_announcements on public.announcements for select to authenticated using (teacher_id=auth.uid());
create policy teacher_reads_own_notifications on public.teacher_notifications for select to authenticated using (teacher_id=auth.uid());
create policy teacher_updates_own_notifications on public.teacher_notifications for update to authenticated using (teacher_id=auth.uid()) with check (teacher_id=auth.uid());

-- Teacher data remains closed to direct browser mutations. KnightCode's server
-- actions authenticate the caller, verify row ownership, then use the server-only
-- service role. This avoids exposing class roster administration in the browser.
revoke all on public.announcements from anon;
revoke all on public.teacher_notifications from anon;

update storage.buckets set file_size_limit=5242880 where id='profile-images';

create table public.teacher_import_batches (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.profiles(id) on delete cascade,
 class_id bigint not null references public.classes(id) on delete cascade, rows jsonb not null default '[]'::jsonb,
 result jsonb, created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 minutes'
);
alter table public.teacher_import_batches enable row level security;
revoke all on public.teacher_import_batches from anon,authenticated;
create index teacher_import_batches_owner on public.teacher_import_batches(teacher_id,expires_at);
