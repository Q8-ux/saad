create extension if not exists pgcrypto;

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  facility_type text not null default 'site',
  latitude numeric(10,7),
  longitude numeric(10,7),
  geofence_radius_m integer not null default 150,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  employee_no text unique not null,
  first_name_ar text not null,
  second_name_ar text not null,
  first_name_en text,
  second_name_en text,
  department text,
  job_title text,
  role text not null default 'employee' check (role in ('admin','manager','supervisor','operator','employee','auditor')),
  facility_id uuid references public.facilities(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete restrict,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check_in_latitude numeric(10,7),
  check_in_longitude numeric(10,7),
  check_out_latitude numeric(10,7),
  check_out_longitude numeric(10,7),
  gps_accuracy_m numeric(8,2),
  source text not null default 'web',
  status text not null default 'active' check (status in ('active','completed','flagged','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.transfer_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  from_facility_id uuid references public.facilities(id),
  to_facility_id uuid not null references public.facilities(id),
  reason text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','approved','active','completed','rejected','cancelled')),
  approved_by uuid references public.employees(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id),
  reported_by uuid references public.employees(id),
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','investigating','resolved','closed')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  title text not null,
  body text not null,
  channel text not null default 'in_app',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_employee on public.attendance_sessions(employee_id, check_in_at desc);
create index if not exists idx_transfer_status on public.transfer_requests(status, starts_at);
create index if not exists idx_incidents_status on public.incidents(status, severity);

alter table public.facilities enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.transfer_requests enable row level security;
alter table public.incidents enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_employee_role()
returns text language sql stable security definer set search_path=public as $$
  select role from public.employees where auth_user_id = auth.uid() and is_active = true limit 1
$$;

create policy "authenticated read facilities" on public.facilities for select to authenticated using (true);
create policy "authenticated read employees" on public.employees for select to authenticated using (true);
create policy "employee reads own profile or management reads all" on public.employees for select to authenticated using (auth_user_id = auth.uid() or public.current_employee_role() in ('admin','manager','supervisor','auditor'));
create policy "management manages facilities" on public.facilities for all to authenticated using (public.current_employee_role() in ('admin','manager')) with check (public.current_employee_role() in ('admin','manager'));
create policy "management manages employees" on public.employees for all to authenticated using (public.current_employee_role() in ('admin','manager')) with check (public.current_employee_role() in ('admin','manager'));
create policy "attendance readable by owner or management" on public.attendance_sessions for select to authenticated using (employee_id in (select id from public.employees where auth_user_id=auth.uid()) or public.current_employee_role() in ('admin','manager','supervisor','auditor'));
create policy "employee creates own attendance" on public.attendance_sessions for insert to authenticated with check (employee_id in (select id from public.employees where auth_user_id=auth.uid()) or public.current_employee_role() in ('admin','manager','supervisor'));
create policy "employee updates own active attendance" on public.attendance_sessions for update to authenticated using (employee_id in (select id from public.employees where auth_user_id=auth.uid()) or public.current_employee_role() in ('admin','manager','supervisor')) with check (employee_id in (select id from public.employees where auth_user_id=auth.uid()) or public.current_employee_role() in ('admin','manager','supervisor'));
create policy "transfers readable by owner or management" on public.transfer_requests for select to authenticated using (employee_id in (select id from public.employees where auth_user_id=auth.uid()) or public.current_employee_role() in ('admin','manager','supervisor','auditor'));
create policy "employee creates own transfer" on public.transfer_requests for insert to authenticated with check (employee_id in (select id from public.employees where auth_user_id=auth.uid()));
create policy "management updates transfers" on public.transfer_requests for update to authenticated using (public.current_employee_role() in ('admin','manager','supervisor')) with check (public.current_employee_role() in ('admin','manager','supervisor'));
create policy "authenticated read incidents" on public.incidents for select to authenticated using (true);
create policy "authenticated report incidents" on public.incidents for insert to authenticated with check (reported_by in (select id from public.employees where auth_user_id=auth.uid()) or public.current_employee_role() in ('admin','manager','supervisor'));
create policy "management updates incidents" on public.incidents for update to authenticated using (public.current_employee_role() in ('admin','manager','supervisor')) with check (public.current_employee_role() in ('admin','manager','supervisor'));
create policy "users read own notifications" on public.notifications for select to authenticated using (employee_id in (select id from public.employees where auth_user_id=auth.uid()) or public.current_employee_role() in ('admin','manager'));
create policy "users update own notifications" on public.notifications for update to authenticated using (employee_id in (select id from public.employees where auth_user_id=auth.uid()));
create policy "auditors read logs" on public.audit_logs for select to authenticated using (public.current_employee_role() in ('admin','auditor'));

insert into public.facilities (name_ar,name_en,facility_type,latitude,longitude,geofence_radius_m)
select * from (values
 ('مبنى الوزارة','Ministry Headquarters','ministry',29.3759,47.9774,200),
 ('مركز التحكم الوطني - السرة','National Control Center - Surra','control_center',29.3136,47.9722,180),
 ('محطة الصبية','Subiya Power Station','power_station',29.5637,48.1728,500),
 ('محطة الدوحة الغربية','Doha West Power Station','power_station',29.3677,47.7715,500),
 ('محطة الزور الجنوبية','Az Zour South Power Station','power_station',28.7170,48.3800,500)
) as seed(name_ar,name_en,facility_type,latitude,longitude,geofence_radius_m)
where not exists (select 1 from public.facilities);
