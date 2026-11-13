-- Oman employee directory migration: run ONCE via the trusted database SQL editor.
-- Do not run this from a public browser or expose a service_role key.
create table if not exists public.employee_directory (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  login_email text not null unique check (login_email = lower(btrim(login_email)) and login_email ~ '^[^ @]+@[^ @]+[.][^ @]+$'),
  user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','active','disabled')),
  position_title text not null default 'موظف المبيعات',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.employee_directory enable row level security;
revoke all on public.employee_directory from anon;
grant select on public.employee_directory to authenticated;
create policy "employee directory manager or own read" on public.employee_directory
  for select to authenticated using (
    public.has_role((select auth.uid()),'manager'::public.app_role)
    or user_id = (select auth.uid())
  );
-- All employee mutations happen in a role-guarded SECURITY DEFINER RPC.
create or replace function public.manage_employee(
  p_action text, p_employee_id uuid default null, p_display_name text default null,
  p_login_email text default null, p_position_title text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare rec public.employee_directory; linked uuid; em text;
begin
  if (select auth.uid()) is null or not public.has_role((select auth.uid()), 'manager'::public.app_role) then
    raise exception 'غير مصرح: مدير المتجر فقط';
  end if;
  if p_action = 'create' then
    em:=lower(btrim(coalesce(p_login_email,'')));
    if char_length(btrim(coalesce(p_display_name,''))) < 2 or em !~ '^[^ @]+@[^ @]+[.][^ @]+$' then
      raise exception 'يرجى إدخال اسم الموظف وبريد الدخول الصحيح';
    end if;
    insert into public.employee_directory(display_name,login_email,position_title,created_by)
    values (btrim(p_display_name),em,coalesce(nullif(btrim(p_position_title),''),'موظف المبيعات'),(select auth.uid()))
    returning * into rec;
  elsif p_action = 'edit' then
    select * into rec from public.employee_directory where id=p_employee_id for update;
    if not found then raise exception 'الموظف غير موجود'; end if;
    if rec.user_id is not null and p_login_email is not null and lower(btrim(p_login_email)) <> rec.login_email then
      raise exception 'لا يمكن تغيير بريد حساب مفعل من هنا؛ يلزم مسار تغيير البريد الموثق';
    end if;
    update public.employee_directory set
      display_name=coalesce(nullif(btrim(p_display_name),''),display_name),
      login_email=case when user_id is null and p_login_email is not null then lower(btrim(p_login_email)) else login_email end,
      position_title=coalesce(nullif(btrim(p_position_title),''),position_title),updated_at=now()
    where id=p_employee_id returning * into rec;
  elsif p_action = 'activate' then
    select * into rec from public.employee_directory where id=p_employee_id for update;
    if not found then raise exception 'سجل الموظف غير موجود'; end if;
    select id into linked from auth.users
      where lower(email)=rec.login_email and email_confirmed_at is not null;
    if linked is null then
      raise exception 'يجب أن ينشئ الموظف حساب دخوله ويؤكد بريده الإلكتروني أولاً؛ بعدها اضغط تفعيل';
    end if;
    if exists(select 1 from public.employee_directory where user_id=linked and id <> rec.id) then
      raise exception 'هذا الحساب مرتبط بموظف آخر';
    end if;
    insert into public.user_roles(user_id,role) values(linked,'staff'::public.app_role)
      on conflict(user_id,role) do nothing;
    update public.employee_directory set user_id=linked,status='active',updated_at=now()
      where id=p_employee_id returning * into rec;
  elsif p_action = 'disable' or p_action = 'delete' then
    select * into rec from public.employee_directory where id=p_employee_id for update;
    if not found then raise exception 'سجل الموظف غير موجود'; end if;
    if rec.user_id is not null and public.has_role(rec.user_id,'manager'::public.app_role) then
      raise exception 'لا يمكن تعديل صلاحية المدير من إدارة الموظفين';
    end if;
    if rec.user_id is not null then
      delete from public.user_roles where user_id=rec.user_id and role='staff'::public.app_role;
    end if;
    if p_action='delete' then
      delete from public.employee_directory where id=p_employee_id;
      return jsonb_build_object('deleted',true,'id',p_employee_id);
    else
      update public.employee_directory set status='disabled',updated_at=now()
        where id=p_employee_id returning * into rec;
    end if;
  else
    raise exception 'عملية غير معروفة';
  end if;
  insert into public.audit_logs(actor,action,table_name,record_id,details)
  values ((select auth.uid()),'employee_'||p_action,'employee_directory',rec.id::text,
    jsonb_build_object('name',rec.display_name,'status',rec.status));
  return jsonb_build_object('id',rec.id,'display_name',rec.display_name,
    'login_email',rec.login_email,'position_title',rec.position_title,'status',rec.status);
end $$;
revoke all on function public.manage_employee(text,uuid,text,text,text) from public,anon;
grant execute on function public.manage_employee(text,uuid,text,text,text) to authenticated;

-- Get your own display name without exposing teammates' contact details to unprivileged users.
create or replace function public.my_employee_name()
returns text language sql stable security definer set search_path = ''
as $$
 select coalesce(
   (select e.display_name from public.employee_directory e
     where e.user_id=(select auth.uid()) and e.status='active' limit 1),
   case when public.has_role((select auth.uid()), 'manager'::public.app_role)
      then 'مدير المتجر' else 'موظف المتجر' end
 );
$$;
revoke all on function public.my_employee_name() from public,anon;
grant execute on function public.my_employee_name() to authenticated;

-- Rename the already assigned manager in the directory without changing their login identity.
insert into public.employee_directory(display_name,login_email,user_id,status,position_title)
select 'مدير المتجر',lower(email),id,'active','مدير عام'
from auth.users u
where exists (select 1 from public.user_roles r where r.user_id=u.id and r.role='manager'::public.app_role)
on conflict (login_email) do nothing;
