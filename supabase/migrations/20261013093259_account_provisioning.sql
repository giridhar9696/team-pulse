begin;

create table private.account_requests (
  organization_id uuid not null, member_id text not null,
  action text not null check (action in ('invite','recover')),
  requested_by uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  primary key (organization_id,member_id,action),
  foreign key (organization_id,member_id) references public.memberships(organization_id,id) on update cascade
);
alter table private.account_requests enable row level security;
revoke all on private.account_requests from public,anon,authenticated;

create function private.reserve_account_request(employee_id text, request_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.memberships; target public.memberships; reserved integer;
begin
  actor := private.current_member();
  if actor.role <> 'admin' then raise exception 'Administrator required' using errcode='42501'; end if;
  select * into target from public.memberships where organization_id=actor.organization_id and id=employee_id;
  if target.id is null or target.role <> 'employee' or target.status <> 'active' then raise exception 'Active employee required' using errcode='42501'; end if;
  if request_action not in ('invite','recover') then raise exception 'Invalid account action'; end if;
  if request_action='invite' and target.user_id is not null then raise exception 'Account is already linked'; end if;
  if request_action='recover' and target.user_id is null then raise exception 'Invite this employee first'; end if;
  insert into private.account_requests(organization_id,member_id,action,requested_by) values(actor.organization_id,target.id,request_action,auth.uid())
  on conflict(organization_id,member_id,action) do update set requested_at=now(),requested_by=auth.uid()
  where private.account_requests.requested_at < now()-interval '60 seconds';
  get diagnostics reserved = row_count;
  if reserved=0 then raise exception 'Wait before requesting another account email' using errcode='P0001'; end if;
  perform private.emit_event(actor.organization_id,null,null,'Account email requested: ' || target.id,'employee','Account email requested');
  return jsonb_build_object('email',target.email,'userId',target.user_id);
end $$;
create function public.reserve_account_request(employee_id text, request_action text) returns jsonb
language sql security invoker set search_path='' as $$ select private.reserve_account_request(employee_id,request_action); $$;
revoke all on function private.reserve_account_request(text,text), public.reserve_account_request(text,text) from public,anon;
grant execute on function private.reserve_account_request(text,text), public.reserve_account_request(text,text) to authenticated;

-- Link only a confirmed Auth email; never use editable user metadata for authorization.
create function private.link_confirmed_identity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.email_confirmed_at is not null and new.email is not null then
    update public.memberships set user_id=new.id,updated_at=now(),version=version+1
      where user_id is null and lower(email)=lower(new.email) and role='employee';
    update public.memberships set email=lower(new.email),updated_at=now(),version=version+1
      where user_id=new.id and email is distinct from lower(new.email);
  end if;
  return new;
end $$;
revoke all on function private.link_confirmed_identity() from public,anon,authenticated;
create trigger link_team_pulse_identity after insert or update of email,email_confirmed_at on auth.users
for each row execute function private.link_confirmed_identity();

alter table public.organizations add column time_zone text not null default 'Asia/Kolkata';
alter table public.notifications add column event_key text;
create unique index notifications_event_key on public.notifications(recipient_id,event_key) where event_key is not null;
create function private.sync_deadlines() returns void
language plpgsql security definer set search_path='' as $$
declare actor public.memberships; day date;
begin
  actor:=private.current_member();
  select (now() at time zone o.time_zone)::date into day from public.organizations o where o.id=actor.organization_id;
  insert into public.notifications(organization_id,recipient_id,task_id,category,title,message,event_key)
    select actor.organization_id,auth.uid(),t.id,'deadline',case when t.deadline < day then 'Deadline reached' else 'Approaching deadline' end,
      t.title || ' is due ' || t.deadline::text,'deadline:' || t.id::text || ':' || t.deadline::text
    from public.tasks t where t.organization_id=actor.organization_id and private.can_task(t.id)
    and t.status not in ('approved','cancelled') and t.deadline <= day+2
    on conflict(recipient_id,event_key) where event_key is not null do nothing;
end $$;
create function public.sync_deadlines() returns void language sql security invoker set search_path='' as $$ select private.sync_deadlines(); $$;
revoke all on function private.sync_deadlines(),public.sync_deadlines() from public,anon;
grant execute on function private.sync_deadlines(),public.sync_deadlines() to authenticated;
create or replace function private.read_notifications(ids uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare m public.memberships;
begin
  m:=private.current_member();
  if cardinality(ids)>1000 then raise exception 'Too many notifications'; end if;
  update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=auth.uid() and organization_id=m.organization_id
    and (ids is null or id=any(ids)) and (task_id is null or private.can_task(task_id));
end $$;
commit;
