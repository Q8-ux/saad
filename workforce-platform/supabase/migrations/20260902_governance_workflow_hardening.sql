-- Hardened operational workflow, approvals, separation of duties, immutable audit and SLA controls.

create table if not exists public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  entity_type text not null,
  version integer not null default 1,
  is_active boolean not null default true,
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_definitions(id) on delete cascade,
  step_order integer not null check(step_order > 0),
  code text not null,
  name_ar text not null,
  name_en text not null,
  required_role text not null,
  sla_minutes integer not null default 1440 check(sla_minutes > 0),
  require_different_actor boolean not null default true,
  is_mandatory boolean not null default true,
  unique(workflow_id, step_order),
  unique(workflow_id, code)
);

create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_definitions(id),
  entity_type text not null,
  entity_id uuid not null,
  requested_by uuid not null references public.employees(id),
  current_step_order integer not null default 1,
  status text not null default 'pending' check(status in ('draft','pending','in_review','approved','rejected','cancelled','expired')),
  risk_level text not null default 'normal' check(risk_level in ('normal','elevated','high','critical')),
  submitted_at timestamptz not null default now(),
  completed_at timestamptz,
  row_version bigint not null default 1,
  unique(entity_type, entity_id)
);

create table if not exists public.workflow_decisions (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  step_id uuid not null references public.workflow_steps(id),
  actor_employee_id uuid not null references public.employees(id),
  decision text not null check(decision in ('approved','rejected','returned')),
  comment text,
  decided_at timestamptz not null default now(),
  unique(instance_id, step_id)
);

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  event_type text not null,
  severity text not null default 'info' check(severity in ('info','warning','high','critical')),
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_instances_status on public.workflow_instances(status, submitted_at desc);
create index if not exists idx_workflow_decisions_instance on public.workflow_decisions(instance_id, decided_at);
create index if not exists idx_security_events_time on public.security_events(created_at desc, severity);

alter table public.workflow_definitions enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.workflow_instances enable row level security;
alter table public.workflow_decisions enable row level security;
alter table public.security_events enable row level security;

create policy "management reads workflows" on public.workflow_definitions for select to authenticated using (public.current_employee_role() in ('admin','manager','supervisor','auditor'));
create policy "admin manages workflows" on public.workflow_definitions for all to authenticated using (public.current_employee_role()='admin') with check (public.current_employee_role()='admin');
create policy "management reads workflow steps" on public.workflow_steps for select to authenticated using (public.current_employee_role() in ('admin','manager','supervisor','auditor'));
create policy "admin manages workflow steps" on public.workflow_steps for all to authenticated using (public.current_employee_role()='admin') with check (public.current_employee_role()='admin');
create policy "requester or management reads instances" on public.workflow_instances for select to authenticated using (requested_by in (select id from public.employees where auth_user_id=auth.uid()) or public.current_employee_role() in ('admin','manager','supervisor','auditor'));
create policy "requester creates instance" on public.workflow_instances for insert to authenticated with check (requested_by in (select id from public.employees where auth_user_id=auth.uid()));
create policy "management reads decisions" on public.workflow_decisions for select to authenticated using (public.current_employee_role() in ('admin','manager','supervisor','auditor'));
create policy "auditors read security events" on public.security_events for select to authenticated using (public.current_employee_role() in ('admin','auditor'));

-- Immutable audit: application users can never update/delete audit or security events.
revoke update, delete on public.audit_logs from authenticated;
revoke update, delete on public.security_events from authenticated;

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql as $$ begin raise exception 'Audit records are immutable'; end $$;

drop trigger if exists audit_logs_immutable on public.audit_logs;
create trigger audit_logs_immutable before update or delete on public.audit_logs for each row execute function public.prevent_audit_mutation();

drop trigger if exists security_events_immutable on public.security_events;
create trigger security_events_immutable before update or delete on public.security_events for each row execute function public.prevent_audit_mutation();

-- Enforce separation of duties and role authorization at database level.
create or replace function public.record_workflow_decision(
  p_instance uuid,
  p_decision text,
  p_comment text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  v_employee public.employees%rowtype;
  v_instance public.workflow_instances%rowtype;
  v_step public.workflow_steps%rowtype;
  v_decision_id uuid;
begin
  if p_decision not in ('approved','rejected','returned') then raise exception 'INVALID_DECISION'; end if;
  select * into v_employee from public.employees where auth_user_id=auth.uid() and is_active=true;
  if v_employee.id is null then raise exception 'NO_ACTIVE_EMPLOYEE'; end if;
  select * into v_instance from public.workflow_instances where id=p_instance for update;
  if v_instance.id is null or v_instance.status not in ('pending','in_review') then raise exception 'INSTANCE_NOT_ACTIONABLE'; end if;
  select * into v_step from public.workflow_steps where workflow_id=v_instance.workflow_id and step_order=v_instance.current_step_order;
  if v_step.id is null then raise exception 'WORKFLOW_STEP_MISSING'; end if;
  if v_employee.role <> v_step.required_role and v_employee.role <> 'admin' then raise exception 'ROLE_NOT_AUTHORIZED'; end if;
  if v_step.require_different_actor and v_instance.requested_by=v_employee.id then raise exception 'SEPARATION_OF_DUTIES'; end if;

  insert into public.workflow_decisions(instance_id,step_id,actor_employee_id,decision,comment)
  values(p_instance,v_step.id,v_employee.id,p_decision,p_comment) returning id into v_decision_id;

  if p_decision='approved' then
    if exists(select 1 from public.workflow_steps where workflow_id=v_instance.workflow_id and step_order>v_instance.current_step_order) then
      update public.workflow_instances set current_step_order=current_step_order+1,status='in_review',row_version=row_version+1 where id=p_instance;
    else
      update public.workflow_instances set status='approved',completed_at=now(),row_version=row_version+1 where id=p_instance;
    end if;
  elsif p_decision='rejected' then
    update public.workflow_instances set status='rejected',completed_at=now(),row_version=row_version+1 where id=p_instance;
  else
    update public.workflow_instances set status='pending',row_version=row_version+1 where id=p_instance;
  end if;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,new_data)
  values(auth.uid(),'workflow_decision','workflow_instance',p_instance::text,jsonb_build_object('decision',p_decision,'step',v_step.code,'actor',v_employee.id));
  return v_decision_id;
end $$;

revoke all on function public.record_workflow_decision(uuid,text,text) from public;
grant execute on function public.record_workflow_decision(uuid,text,text) to authenticated;

-- Critical-risk requests cannot be approved by a single operational actor.
create or replace function public.validate_critical_workflow()
returns trigger language plpgsql as $$
begin
  if new.risk_level='critical' and not exists (
    select 1 from public.workflow_steps where workflow_id=new.workflow_id and required_role='manager'
  ) then raise exception 'CRITICAL_WORKFLOW_REQUIRES_MANAGER_APPROVAL'; end if;
  return new;
end $$;

drop trigger if exists validate_critical_workflow_trigger on public.workflow_instances;
create trigger validate_critical_workflow_trigger before insert or update of risk_level,workflow_id on public.workflow_instances for each row execute function public.validate_critical_workflow();
