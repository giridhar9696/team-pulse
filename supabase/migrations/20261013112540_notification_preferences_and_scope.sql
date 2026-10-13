begin;
alter table public.notifications add column project_id uuid;
alter table public.notifications add constraint notifications_project_scope foreign key(organization_id,project_id) references public.projects(organization_id,id);
create index notifications_org_project on public.notifications(organization_id,project_id);
drop policy notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using(
  recipient_id=auth.uid() and private.is_member(organization_id)
  and (task_id is null or private.can_task(task_id))
  and (project_id is null or private.can_project(project_id))
  and (category<>'employee' or private.is_admin(organization_id))
);
create or replace function private.emit_event(org uuid,pid uuid,tid uuid,msg text,cat text,heading text) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.memberships;
begin
  actor:=private.current_member();
  if actor.organization_id<>org then raise exception 'Forbidden' using errcode='42501'; end if;
  insert into public.activity_events(organization_id,project_id,task_id,actor_id,message) values(org,pid,tid,auth.uid(),msg);
  insert into public.notifications(organization_id,recipient_id,project_id,task_id,category,title,message,event_key)
    select org,m.user_id,pid,tid,cat,heading,msg,
      case when cat='task' and heading='Task assigned' then 'assigned:'||tid::text||':'||m.id else null end
    from public.memberships m where m.organization_id=org and m.status='active' and m.user_id is not null
    and (m.role='admin' or exists(select 1 from public.tasks t where t.id=tid and t.assignee_id=m.id))
    on conflict(recipient_id,event_key) where event_key is not null do nothing;
end $$;
create or replace function private.sync_deadlines() returns void
language plpgsql security definer set search_path='' as $$
declare actor public.memberships; day date;
begin
  actor:=private.current_member();
  select (now() at time zone o.time_zone)::date into day from public.organizations o where o.id=actor.organization_id;
  -- Catch up a confirmed employee who was assigned work before accepting an invitation.
  insert into public.notifications(organization_id,recipient_id,project_id,task_id,category,title,message,event_key)
    select actor.organization_id,auth.uid(),t.project_id,t.id,'task','Task assigned',t.title || ' is assigned to you.','assigned:'||t.id::text||':'||actor.id
    from public.tasks t where t.organization_id=actor.organization_id and t.assignee_id=actor.id and private.can_task(t.id)
    on conflict(recipient_id,event_key) where event_key is not null do nothing;
  if exists(select 1 from public.user_preferences where user_id=auth.uid() and not deadline_alerts) then return; end if;
  insert into public.notifications(organization_id,recipient_id,project_id,task_id,category,title,message,event_key)
    select actor.organization_id,auth.uid(),t.project_id,t.id,'deadline',
      case when t.deadline<day then 'Deadline reached' when t.deadline=day then 'Due today' when t.deadline=day+1 then 'Red alert: due tomorrow' else 'Approaching deadline' end,
      t.title || ' is due ' || t.deadline::text,'deadline:'||t.id::text||':'||t.deadline::text
    from public.tasks t where t.organization_id=actor.organization_id and private.can_task(t.id) and t.status not in ('approved','cancelled') and t.deadline<=day+2
    on conflict(recipient_id,event_key) where event_key is not null do update
      set title=excluded.title,message=excluded.message,project_id=excluded.project_id,
        read_at=case when public.notifications.title<>excluded.title then null else public.notifications.read_at end,
        created_at=case when public.notifications.title<>excluded.title then now() else public.notifications.created_at end;
end $$;
create or replace function private.read_notifications(ids uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.memberships;
begin
  actor:=private.current_member();
  if cardinality(ids)>1000 then raise exception 'Too many notifications'; end if;
  update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=auth.uid() and organization_id=actor.organization_id
    and (ids is null or id=any(ids)) and (task_id is null or private.can_task(task_id))
    and (project_id is null or private.can_project(project_id)) and (category<>'employee' or actor.role='admin');
end $$;
commit;
