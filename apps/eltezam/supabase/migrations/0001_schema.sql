-- ELTEZAM – التزام لتصميم المواقع
-- Schema, Row Level Security, trial enforcement, RPCs and storage.
-- Run in Supabase: SQL Editor → paste & run (or `supabase db push`).
-- Project manager · Eng. Ahmed Zahran

create extension if not exists pgcrypto;

-- ───────────────────────────── enums ─────────────────────────────
do $$ begin
  create type public.user_role as enum ('client', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.account_status as enum ('trial', 'active', 'expired', 'suspended');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.project_status as enum ('new','under_review','proposal_sent','awaiting_payment','approved','in_progress','client_review','revision_requested','completed','delivered','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('pending','confirmed','rejected');
exception when duplicate_object then null; end $$;

-- Trial configuration (mirrored in src/lib/access.ts and netlify/functions/_lib/guard.ts)
create or replace function public.trial_hours() returns int language sql immutable as $$ select 24 $$;
create or replace function public.trial_limit(kind text) returns int language sql immutable as $$
  select case kind when 'projects' then 3 when 'ai_calls' then 5 when 'cv_documents' then 2 else 0 end
$$;

-- ───────────────────────────── tables ─────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  role public.user_role not null default 'client',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  account_status public.account_status not null default 'trial',
  created_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  slug text not null unique,
  category text not null default 'web',
  description text not null default '',
  description_en text,
  image_url text,
  price numeric(12,2),
  show_on_home boolean not null default true,
  sort_order int not null default 99,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  price numeric(12,2),
  currency text not null default 'SAR',
  features jsonb not null default '[]'::jsonb,
  revisions_limit int not null default 2 check (revisions_limit >= 0),
  delivery_days int check (delivery_days is null or delivery_days >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists packages_service_idx on public.packages(service_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_slug text not null,
  package_id uuid references public.packages(id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '' check (char_length(description) <= 5000),
  details jsonb not null default '{}'::jsonb,
  status public.project_status not null default 'new',
  budget text,
  deadline date,
  quote_amount numeric(12,2),
  currency text not null default 'SAR',
  revisions_limit int not null default 2,
  revisions_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects(user_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_service_idx on public.projects(service_slug);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text not null default 'application/octet-stream',
  file_size bigint not null default 0 check (file_size <= 52428800),
  kind text not null default 'attachment' check (kind in ('attachment','preview','final')),
  created_at timestamptz not null default now()
);
create index if not exists project_files_project_idx on public.project_files(project_id);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  update_text text not null,
  status public.project_status,
  created_at timestamptz not null default now()
);
create index if not exists project_updates_project_idx on public.project_updates(project_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'SAR',
  payment_method text not null default 'bank_transfer',
  payment_status public.payment_status not null default 'pending',
  transaction_reference text,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_project_idx on public.payments(project_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  message text not null check (char_length(message) between 1 and 4000),
  sender_role public.user_role not null default 'client',
  created_at timestamptz not null default now()
);
create index if not exists messages_user_idx on public.messages(user_id, created_at);
create index if not exists messages_project_idx on public.messages(project_id);

create table if not exists public.cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  language text not null default 'ar' check (language in ('ar','en')),
  template_id text not null default 'professional',
  data jsonb not null default '{}'::jsonb,
  file_path text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cv_documents_user_idx on public.cv_documents(user_id);

create table if not exists public.video_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  video_type text not null,
  duration int not null check (duration in (15,30,60,90)),
  aspect_ratio text not null check (aspect_ratio in ('16:9','9:16','1:1')),
  brief jsonb not null default '{}'::jsonb,
  script text,
  storyboard jsonb,
  stage int not null default 0 check (stage between 0 and 9),
  preview_url text,
  final_video_url text,
  created_at timestamptz not null default now()
);
create index if not exists video_projects_user_idx on public.video_projects(user_id);
create index if not exists video_projects_project_idx on public.video_projects(project_id);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_en text,
  category text not null,
  description text not null default '',
  image_url text,
  video_url text,
  project_url text,
  technologies jsonb not null default '[]'::jsonb,
  is_demo boolean not null default false,
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  subject text not null check (char_length(subject) between 3 and 150),
  service text,
  kind text not null default 'contact' check (kind in ('contact','consultation','quote')),
  message text not null check (char_length(message) between 10 and 4000),
  status text not null default 'new' check (status in ('new','replied','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on public.ai_usage(user_id, created_at);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_user_idx on public.activity_log(user_id, created_at desc);

-- ───────────────────────────── helpers ─────────────────────────────
create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin')
$$;

-- 'admin' | 'active' | 'trial' | 'expired' | 'suspended' | 'guest'  (server time only)
create or replace function public.access_level(uid uuid default auth.uid()) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when p.role = 'admin' then 'admin'
      when p.account_status = 'suspended' then 'suspended'
      when p.account_status = 'active' then 'active'
      when p.trial_ends_at is not null and p.trial_ends_at > now() then 'trial'
      else 'expired' end
    from public.profiles p where p.id = uid), 'guest')
$$;

create or replace function public.notify_user(p_user uuid, p_title text, p_message text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, title, message, link) values (p_user, p_title, left(coalesce(p_message,''), 500), p_link)
$$;
revoke execute on function public.notify_user(uuid, text, text, text) from public, anon, authenticated;

-- ───────────────────── auth → profile + trial start ─────────────────────
-- The trial starts when the e-mail is confirmed (or immediately when confirmation is disabled).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare confirmed boolean := new.email_confirmed_at is not null;
begin
  insert into public.profiles (id, email, full_name, phone, trial_started_at, trial_ends_at)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'phone',''),
          case when confirmed then now() end, case when confirmed then now() + make_interval(hours => public.trial_hours()) end)
  on conflict (id) do nothing;
  insert into public.activity_log(user_id, action) values (new.id, 'signup');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_user_confirmed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles set trial_started_at = now(), trial_ends_at = now() + make_interval(hours => public.trial_hours())
    where id = new.id and trial_started_at is null;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users for each row execute function public.handle_user_confirmed();

-- ───────────────────── protective triggers ─────────────────────
-- Clients may only change full_name / phone on their profile. role, trial and status are server/admin only.
create or replace function public.protect_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role; new.trial_started_at := old.trial_started_at; new.trial_ends_at := old.trial_ends_at;
    new.account_status := old.account_status; new.email := old.email; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile();

-- New project by a client: enforce access + trial limits, force safe defaults.
create or replace function public.before_project_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare lvl text := public.access_level(); cnt int; pk_rev int;
begin
  if public.is_admin() then return new; end if;
  if lvl not in ('trial','active') then raise exception 'trial_expired'; end if;
  if lvl = 'trial' then
    select count(*) into cnt from public.projects where user_id = auth.uid();
    if cnt >= public.trial_limit('projects') then raise exception 'trial_limit'; end if;
  end if;
  new.user_id := auth.uid(); new.status := 'new'; new.quote_amount := null; new.revisions_used := 0;
  new.created_at := now(); new.updated_at := now();
  select revisions_limit into pk_rev from public.packages where id = new.package_id;
  new.revisions_limit := coalesce(pk_rev, 2);
  return new;
end $$;
drop trigger if exists before_project_insert on public.projects;
create trigger before_project_insert before insert on public.projects for each row execute function public.before_project_insert();

create or replace function public.after_project_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_updates(project_id, author_id, update_text, status) values (new.id, new.user_id, 'تم استلام الطلب', 'new');
  insert into public.activity_log(user_id, action, meta) values (new.user_id, 'project_created', jsonb_build_object('project', new.id, 'service', new.service_slug));
  return new;
end $$;
drop trigger if exists after_project_insert on public.projects;
create trigger after_project_insert after insert on public.projects for each row execute function public.after_project_insert();

create or replace function public.before_cv_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare lvl text := public.access_level(); cnt int;
begin
  if public.is_admin() then return new; end if;
  if lvl not in ('trial','active') then raise exception 'trial_expired'; end if;
  if lvl = 'trial' then
    select count(*) into cnt from public.cv_documents where user_id = auth.uid();
    if cnt >= public.trial_limit('cv_documents') then raise exception 'trial_limit'; end if;
  end if;
  new.user_id := auth.uid();
  return new;
end $$;
drop trigger if exists before_cv_insert on public.cv_documents;
create trigger before_cv_insert before insert on public.cv_documents for each row execute function public.before_cv_insert();

create or replace function public.before_video_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if public.access_level() not in ('trial','active') then raise exception 'trial_expired'; end if;
  new.user_id := auth.uid(); new.preview_url := null; new.final_video_url := null;
  if new.project_id is not null and not exists (select 1 from public.projects where id = new.project_id and user_id = auth.uid()) then raise exception 'forbidden'; end if;
  return new;
end $$;
drop trigger if exists before_video_insert on public.video_projects;
create trigger before_video_insert before insert on public.video_projects for each row execute function public.before_video_insert();

-- Clients can edit only creative fields of their video project (stage/urls are admin-only).
create or replace function public.protect_video_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.stage := old.stage; new.preview_url := old.preview_url; new.final_video_url := old.final_video_url; new.user_id := old.user_id; new.project_id := old.project_id;
  end if;
  return new;
end $$;
drop trigger if exists protect_video_update on public.video_projects;
create trigger protect_video_update before update on public.video_projects for each row execute function public.protect_video_update();

create or replace function public.before_message_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    new.sender_role := 'admin';
    perform public.notify_user(new.user_id, 'رسالة جديدة من فريق التزام', new.message, '/dashboard/messages');
  else
    new.sender_role := 'client'; new.user_id := auth.uid();
    if new.project_id is not null and not exists (select 1 from public.projects where id = new.project_id and user_id = auth.uid()) then raise exception 'forbidden'; end if;
  end if;
  return new;
end $$;
drop trigger if exists before_message_insert on public.messages;
create trigger before_message_insert before insert on public.messages for each row execute function public.before_message_insert();

create or replace function public.before_payment_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.user_id := auth.uid(); new.payment_status := 'pending';
    if new.project_id is not null and not exists (select 1 from public.projects where id = new.project_id and user_id = auth.uid()) then raise exception 'forbidden'; end if;
  end if;
  return new;
end $$;
drop trigger if exists before_payment_insert on public.payments;
create trigger before_payment_insert before insert on public.payments for each row execute function public.before_payment_insert();

create or replace function public.before_file_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.uploaded_by := auth.uid();
  if not public.is_admin() then new.kind := 'attachment'; end if;
  return new;
end $$;
drop trigger if exists before_file_insert on public.project_files;
create trigger before_file_insert before insert on public.project_files for each row execute function public.before_file_insert();

create or replace function public.after_update_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from public.projects where id = new.project_id;
  if owner is not null and owner is distinct from new.author_id then
    perform public.notify_user(owner, 'تحديث على مشروعك', new.update_text, '/dashboard/projects/' || new.project_id);
  end if;
  return new;
end $$;
drop trigger if exists after_update_insert on public.project_updates;
create trigger after_update_insert after insert on public.project_updates for each row execute function public.after_update_insert();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists touch_projects on public.projects;
create trigger touch_projects before update on public.projects for each row execute function public.touch_updated_at();
drop trigger if exists touch_cv on public.cv_documents;
create trigger touch_cv before update on public.cv_documents for each row execute function public.touch_updated_at();

-- ───────────────────────────── RLS ─────────────────────────────
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.packages enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.project_updates enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.cv_documents enable row level security;
alter table public.video_projects enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.ai_usage enable row level security;
alter table public.activity_log enable row level security;

-- drop & recreate policies idempotently
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_delete on public.profiles for delete using (public.is_admin());

-- public catalogue
create policy services_read on public.services for select using (active or public.is_admin());
create policy services_admin on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy packages_read on public.packages for select using (active or public.is_admin());
create policy packages_admin on public.packages for all using (public.is_admin()) with check (public.is_admin());
create policy portfolio_read on public.portfolio_items for select using (published or public.is_admin());
create policy portfolio_admin on public.portfolio_items for all using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.site_settings for select using (true);
create policy settings_admin on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- projects: clients read/insert their own; status changes go through RPCs
create policy projects_select on public.projects for select using (user_id = auth.uid() or public.is_admin());
create policy projects_insert on public.projects for insert with check (auth.uid() is not null);
create policy projects_admin_update on public.projects for update using (public.is_admin()) with check (public.is_admin());
create policy projects_admin_delete on public.projects for delete using (public.is_admin());

create policy files_select on public.project_files for select using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy files_insert on public.project_files for insert with check (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy files_admin_delete on public.project_files for delete using (public.is_admin());

create policy updates_select on public.project_updates for select using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy updates_admin on public.project_updates for insert with check (public.is_admin());

create policy payments_select on public.payments for select using (user_id = auth.uid() or public.is_admin());
create policy payments_insert on public.payments for insert with check (auth.uid() is not null);
create policy payments_admin_update on public.payments for update using (public.is_admin()) with check (public.is_admin());

create policy notifications_select on public.notifications for select using (user_id = auth.uid() or public.is_admin());
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid() or public.is_admin());

create policy messages_select on public.messages for select using (user_id = auth.uid() or public.is_admin());
create policy messages_insert on public.messages for insert with check (auth.uid() is not null);

create policy cv_select on public.cv_documents for select using (user_id = auth.uid() or public.is_admin());
create policy cv_insert on public.cv_documents for insert with check (auth.uid() is not null);
create policy cv_update on public.cv_documents for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy cv_delete on public.cv_documents for delete using (user_id = auth.uid() or public.is_admin());

create policy video_select on public.video_projects for select using (user_id = auth.uid() or public.is_admin());
create policy video_insert on public.video_projects for insert with check (auth.uid() is not null);
create policy video_update on public.video_projects for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy contact_insert on public.contact_messages for insert with check (status = 'new');
create policy contact_admin on public.contact_messages for select using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update using (public.is_admin()) with check (public.is_admin());

create policy ai_usage_select on public.ai_usage for select using (user_id = auth.uid() or public.is_admin());
-- inserts into ai_usage only via the service role (Netlify functions)

create policy activity_admin on public.activity_log for select using (public.is_admin());

-- ───────────────────────────── RPCs ─────────────────────────────
create or replace function public.my_access() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'level', public.access_level(),
    'trial_ends_at', (select trial_ends_at from public.profiles where id = auth.uid()),
    'server_now', now(),
    'usage', jsonb_build_object(
      'projects', (select count(*) from public.projects where user_id = auth.uid()),
      'ai_calls', (select count(*) from public.ai_usage where user_id = auth.uid()),
      'cv_documents', (select count(*) from public.cv_documents where user_id = auth.uid())))
$$;

create or replace function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'clients', (select count(*) from profiles where role = 'client'),
    'new_clients_7d', (select count(*) from profiles where role = 'client' and created_at > now() - interval '7 days'),
    'trial_users', (select count(*) from profiles where role = 'client' and account_status not in ('active','suspended') and trial_ends_at > now()),
    'expired_trials', (select count(*) from profiles where role = 'client' and account_status not in ('active','suspended') and (trial_ends_at is null or trial_ends_at <= now())),
    'paid_clients', (select count(*) from profiles where role = 'client' and account_status = 'active'),
    'projects', (select count(*) from projects),
    'active_projects', (select count(*) from projects where status in ('approved','in_progress','client_review','revision_requested')),
    'completed_projects', (select count(*) from projects where status in ('completed','delivered')),
    'payments_confirmed', (select count(*) from payments where payment_status = 'confirmed'),
    'revenue_confirmed', (select coalesce(sum(amount),0) from payments where payment_status = 'confirmed'),
    'pending_payments', (select count(*) from payments where payment_status = 'pending'),
    'new_contacts', (select count(*) from contact_messages where status = 'new'));
end $$;

create or replace function public.client_request_revision(p_project uuid, p_note text) returns void language plpgsql security definer set search_path = public as $$
declare p public.projects;
begin
  select * into p from projects where id = p_project and user_id = auth.uid() for update;
  if not found then raise exception 'forbidden'; end if;
  if p.status not in ('client_review','delivered','completed') then raise exception 'invalid_state'; end if;
  if p.revisions_used >= p.revisions_limit then raise exception 'revisions_limit'; end if;
  update projects set revisions_used = revisions_used + 1, status = 'revision_requested' where id = p_project;
  insert into project_updates(project_id, author_id, update_text, status) values (p_project, auth.uid(), 'طلب تعديل من العميل: ' || left(coalesce(p_note,''), 2000), 'revision_requested');
end $$;

create or replace function public.client_approve_delivery(p_project uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update projects set status = 'completed' where id = p_project and user_id = auth.uid() and status in ('client_review','delivered');
  if not found then raise exception 'invalid_state'; end if;
  insert into project_updates(project_id, author_id, update_text, status) values (p_project, auth.uid(), 'اعتمد العميل التسليم', 'completed');
end $$;

create or replace function public.client_accept_quote(p_project uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update projects set status = 'awaiting_payment' where id = p_project and user_id = auth.uid() and status = 'proposal_sent';
  if not found then raise exception 'invalid_state'; end if;
  insert into project_updates(project_id, author_id, update_text, status) values (p_project, auth.uid(), 'وافق العميل على عرض السعر', 'awaiting_payment');
end $$;

create or replace function public.admin_set_project_status(p_project uuid, p_status public.project_status, p_note text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update projects set status = p_status where id = p_project;
  insert into project_updates(project_id, author_id, update_text, status) values (p_project, auth.uid(), coalesce(nullif(p_note,''), 'تم تحديث حالة المشروع'), p_status);
end $$;

create or replace function public.admin_send_quote(p_project uuid, p_amount numeric, p_currency text, p_note text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;
  update projects set quote_amount = p_amount, currency = coalesce(nullif(p_currency,''),'SAR'), status = 'proposal_sent' where id = p_project;
  insert into project_updates(project_id, author_id, update_text, status)
  values (p_project, auth.uid(), 'عرض سعر: ' || p_amount || ' ' || coalesce(nullif(p_currency,''),'SAR') || coalesce(' — ' || nullif(p_note,''), ''), 'proposal_sent');
end $$;

create or replace function public.admin_extend_trial(p_user uuid, p_hours int) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_hours <= 0 or p_hours > 24*90 then raise exception 'invalid_hours'; end if;
  update profiles set trial_started_at = coalesce(trial_started_at, now()),
    trial_ends_at = greatest(now(), coalesce(trial_ends_at, now())) + make_interval(hours => p_hours),
    account_status = case when account_status = 'expired' then 'trial'::account_status else account_status end
  where id = p_user;
  perform notify_user(p_user, 'تم تمديد تجربتك المجانية', 'تم تمديد التجربة ' || p_hours || ' ساعة', '/dashboard/subscription');
  insert into activity_log(user_id, action, meta) values (p_user, 'trial_extended', jsonb_build_object('hours', p_hours, 'by', auth.uid()));
end $$;

create or replace function public.admin_set_account_status(p_user uuid, p_status public.account_status) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update profiles set account_status = p_status where id = p_user and role = 'client';
  insert into activity_log(user_id, action, meta) values (p_user, 'status_' || p_status, jsonb_build_object('by', auth.uid()));
end $$;

create or replace function public.admin_confirm_payment(p_payment uuid, p_confirm boolean) returns void language plpgsql security definer set search_path = public as $$
declare pay public.payments;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update payments set payment_status = case when p_confirm then 'confirmed'::payment_status else 'rejected'::payment_status end where id = p_payment returning * into pay;
  if not found then raise exception 'not_found'; end if;
  if p_confirm and pay.project_id is not null then
    update projects set status = 'approved' where id = pay.project_id and status in ('new','under_review','proposal_sent','awaiting_payment');
    if found then insert into project_updates(project_id, author_id, update_text, status) values (pay.project_id, auth.uid(), 'تم تأكيد استلام الدفعة واعتماد المشروع', 'approved'); end if;
  end if;
  perform notify_user(pay.user_id, case when p_confirm then 'تم تأكيد دفعتك' else 'لم يتم تأكيد الدفعة' end, pay.amount || ' ' || pay.currency, '/dashboard/payments');
end $$;

create or replace function public.admin_set_revisions_limit(p_project uuid, p_limit int) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update projects set revisions_limit = greatest(0, p_limit) where id = p_project;
end $$;

revoke execute on function public.admin_stats() from anon;
revoke execute on function public.admin_set_project_status(uuid, public.project_status, text) from anon;
revoke execute on function public.admin_send_quote(uuid, numeric, text, text) from anon;
revoke execute on function public.admin_extend_trial(uuid, int) from anon;
revoke execute on function public.admin_set_account_status(uuid, public.account_status) from anon;
revoke execute on function public.admin_confirm_payment(uuid, boolean) from anon;
revoke execute on function public.admin_set_revisions_limit(uuid, int) from anon;

-- ───────────────────────────── Storage ─────────────────────────────
-- project-files: private, path = {owner_user_id}/{project_id}/{file}
-- public-media : public read (portfolio images/videos, service images), admin write
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 52428800), ('public-media', 'public-media', true, 104857600)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "pf_read" on storage.objects;
drop policy if exists "pf_insert" on storage.objects;
drop policy if exists "pf_admin_delete" on storage.objects;
drop policy if exists "pm_read" on storage.objects;
drop policy if exists "pm_admin_write" on storage.objects;
create policy "pf_read" on storage.objects for select using (bucket_id = 'project-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "pf_insert" on storage.objects for insert with check (bucket_id = 'project-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "pf_admin_delete" on storage.objects for delete using (bucket_id = 'project-files' and public.is_admin());
create policy "pm_read" on storage.objects for select using (bucket_id = 'public-media');
create policy "pm_admin_write" on storage.objects for all using (bucket_id = 'public-media' and public.is_admin()) with check (bucket_id = 'public-media' and public.is_admin());

-- ───────────────────── first admin (run manually, once) ─────────────────────
-- After Eng. Ahmed Zahran signs up through the site, promote the account from the SQL editor:
--   update public.profiles set role = 'admin', account_status = 'active' where email = '<admin email>';
-- There are no hard-coded admin credentials anywhere in the code.
