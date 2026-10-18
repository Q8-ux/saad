create table if not exists public.radar_tools_workers (
  id text primary key check(id='primary'), beat_at timestamptz not null,
  run_id text not null, report jsonb not null default '{}'::jsonb
);
create table if not exists public.radar_tools_jobs (
  id uuid primary key, token_hash text not null check(length(token_hash)=64),
  payload_cipher text, result_cipher text,
  state text not null default 'queued' check(state in ('queued','running','completed','expired')),
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 hour',
  claimed_at timestamptz, claimed_by text
);
alter table public.radar_tools_workers enable row level security;
alter table public.radar_tools_jobs enable row level security;
revoke all on public.radar_tools_workers,public.radar_tools_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.radar_tools_workers,public.radar_tools_jobs to service_role;
create or replace function public.radar_tools_enqueue(p_id uuid,p_token_hash text,p_payload text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(693481762);
  update public.radar_tools_jobs set payload_cipher=null,result_cipher=null,state='expired' where expires_at<now() and state<>'expired';
  delete from public.radar_tools_jobs where created_at<now()-interval '2 hours';
  if (select count(*) from public.radar_tools_jobs where created_at>now()-interval '1 hour')>=8
     or (select count(*) from public.radar_tools_jobs where state in ('queued','running'))>=3 then
    raise exception 'RADAR_QUEUE_LIMIT';
  end if;
  if length(p_payload)>400000 then raise exception 'RADAR_PAYLOAD_LIMIT'; end if;
  insert into public.radar_tools_jobs(id,token_hash,payload_cipher) values(p_id,p_token_hash,p_payload);
end $$;
create or replace function public.radar_tools_claim(p_run_id text)
returns table(id uuid,payload_cipher text) language plpgsql security invoker set search_path='' as $$
declare picked uuid;
begin
  select j.id into picked from public.radar_tools_jobs j where j.state='queued' and j.expires_at>now() order by j.created_at for update skip locked limit 1;
  if picked is not null then
    return query update public.radar_tools_jobs j set state='running',claimed_at=now(),claimed_by=p_run_id where j.id=picked returning j.id,j.payload_cipher;
  end if;
end $$;
create or replace function public.radar_tools_complete(p_id uuid,p_run_id text,p_result text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if length(p_result)>400000 then raise exception 'RADAR_RESULT_LIMIT'; end if;
  update public.radar_tools_jobs set result_cipher=p_result,payload_cipher=null,state='completed' where id=p_id and claimed_by=p_run_id and state='running' and expires_at>now();
  if not found then raise exception 'RADAR_CLAIM_INVALID'; end if;
end $$;
revoke all on function public.radar_tools_enqueue(uuid,text,text),public.radar_tools_claim(text),public.radar_tools_complete(uuid,text,text) from public,anon,authenticated;
grant execute on function public.radar_tools_enqueue(uuid,text,text),public.radar_tools_claim(text),public.radar_tools_complete(uuid,text,text) to service_role;
create index if not exists radar_tools_pending on public.radar_tools_jobs(state,created_at);
