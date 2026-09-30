-- KnightCode V2 school administration foundation
alter table public.profiles add column if not exists must_change_password boolean not null default false;

create table if not exists public.admin_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  record_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_entity_idx on public.admin_audit_log(entity,record_id);

alter table public.admin_settings enable row level security;
alter table public.admin_audit_log enable row level security;

insert into public.admin_settings(setting_key,setting_value) values
  ('school_name','KnightCode School'),
  ('school_code','KNIGHTCODE-DEMO'),
  ('teacher_registration','0')
on conflict(setting_key) do nothing;
