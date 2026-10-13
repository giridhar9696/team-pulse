begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now()
);
create table public.memberships (
  organization_id uuid not null references public.organizations(id),
  id text not null check (id ~ '^[A-Z0-9_-]{1,40}$'),
  user_id uuid unique references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 200),
  email text not null check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  job_title text not null check (length(trim(job_title)) between 1 and 200),
  role text not null default 'employee' check (role in ('admin','employee')),
  status text not null default 'active' check (status in ('active','inactive','frozen')),
  velocity integer not null default 0 check (velocity between 0 and 100),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id,id)
);
create unique index memberships_email on public.memberships(lower(email));
create index memberships_org_user on public.memberships(organization_id,user_id);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null check (length(trim(name)) between 1 and 200),
  description text not null check (length(trim(description)) between 1 and 10000),
  owner_id text not null,
  start_date date not null,
  deadline date not null check (deadline >= start_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,id),
  foreign key (organization_id,owner_id) references public.memberships(organization_id,id) on update cascade
);
create index projects_org on public.projects(organization_id);
create table public.project_memberships (
  organization_id uuid not null,
  project_id uuid not null,
  member_id text not null,
  created_at timestamptz not null default now(),
  primary key (project_id,member_id),
  foreign key (organization_id,project_id) references public.projects(organization_id,id),
  foreign key (organization_id,member_id) references public.memberships(organization_id,id) on update cascade
);
create index project_memberships_member on public.project_memberships(organization_id,member_id);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null check (length(trim(description)) between 1 and 10000),
  technology text not null check (technology in ('Frontend','Backend','Database')),
  assignee_id text not null,
  assigned_date date not null,
  deadline date not null check (deadline >= assigned_date),
  status text not null default 'pending' check (status in ('pending','in_progress','submitted','review','changes_requested','approved','overdue','cancelled')),
  required boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,id),
  foreign key (organization_id,project_id) references public.projects(organization_id,id),
  foreign key (organization_id,assignee_id) references public.memberships(organization_id,id) on update cascade
);
create index tasks_org_project on public.tasks(organization_id,project_id);
create index tasks_assignee_deadline on public.tasks(organization_id,assignee_id,deadline);
create table public.submissions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, task_id uuid not null,
  actor_id uuid not null references auth.users(id),
  url text not null check (length(url) <= 2048 and url ~ '^https?://[^[:space:]]+$'),
  note text not null check (length(trim(note)) between 1 and 10000),
  created_at timestamptz not null default now(),
  foreign key (organization_id,task_id) references public.tasks(organization_id,id)
);
create table public.reviews (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, task_id uuid not null,
  submission_id uuid not null references public.submissions(id), actor_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','changes_requested')),
  feedback text not null check (length(trim(feedback)) between 1 and 10000),
  created_at timestamptz not null default now(),
  foreign key (organization_id,task_id) references public.tasks(organization_id,id)
);
create table public.delays (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, task_id uuid not null,
  actor_id uuid not null references auth.users(id),
  reason text not null check (length(trim(reason)) between 1 and 10000), created_at timestamptz not null default now(),
  foreign key (organization_id,task_id) references public.tasks(organization_id,id)
);
create table public.activity_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  project_id uuid, task_id uuid, actor_id uuid not null references auth.users(id),
  message text not null, created_at timestamptz not null default now(),
  foreign key (organization_id,project_id) references public.projects(organization_id,id),
  foreign key (organization_id,task_id) references public.tasks(organization_id,id)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  recipient_id uuid not null references auth.users(id), task_id uuid,
  category text not null check (category in ('task','deadline','submission','review','project','employee','settings')),
  title text not null, message text not null, created_at timestamptz not null default now(), read_at timestamptz,
  foreign key (organization_id,task_id) references public.tasks(organization_id,id)
);
create index notifications_recipient_time on public.notifications(recipient_id,created_at desc);
create table public.user_preferences (
  user_id uuid primary key references auth.users(id),
  notification_digest boolean not null default true, deadline_alerts boolean not null default true,
  date_format text not null default 'iso' check (date_format in ('iso','friendly')),
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  updated_at timestamptz not null default now()
);

create function private.current_member() returns public.memberships
language plpgsql stable security definer set search_path = '' as $$
declare m public.memberships;
begin
  select * into m from public.memberships where user_id = auth.uid() and status = 'active';
  if m.user_id is null then raise exception 'Active organization membership required' using errcode = '42501'; end if;
  return m;
end $$;
create function private.is_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.memberships where user_id=auth.uid() and organization_id=org and status='active');
$$;
create function private.is_admin(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.memberships where user_id=auth.uid() and organization_id=org and status='active' and role='admin');
$$;
create function private.can_project(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.projects p join public.memberships m on m.organization_id=p.organization_id
    where p.id=pid and m.user_id=auth.uid() and m.status='active' and
      (m.role='admin' or exists(select 1 from public.project_memberships pm where pm.project_id=pid and pm.organization_id=m.organization_id and pm.member_id=m.id))
  );
$$;
create function private.can_task(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.tasks t join public.memberships m on m.organization_id=t.organization_id
    where t.id=tid and m.user_id=auth.uid() and m.status='active' and private.can_project(t.project_id)
    and (m.role='admin' or t.assignee_id=m.id)
  );
$$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.reviews enable row level security;
alter table public.delays enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;
alter table public.user_preferences enable row level security;
create policy organizations_read on public.organizations for select to authenticated using(private.is_member(id));
create policy memberships_read on public.memberships for select to authenticated using(private.is_member(organization_id) and (user_id=auth.uid() or private.is_admin(organization_id)));
create policy projects_read on public.projects for select to authenticated using(private.can_project(id));
create policy project_memberships_read on public.project_memberships for select to authenticated using(private.can_project(project_id) and (private.is_admin(organization_id) or member_id=(private.current_member()).id));
create policy tasks_read on public.tasks for select to authenticated using(private.can_task(id));
create policy submissions_read on public.submissions for select to authenticated using(private.can_task(task_id));
create policy reviews_read on public.reviews for select to authenticated using(private.can_task(task_id));
create policy delays_read on public.delays for select to authenticated using(private.can_task(task_id));
create policy activity_read on public.activity_events for select to authenticated using(private.is_admin(organization_id) or (task_id is not null and private.can_task(task_id)));
create policy notifications_read on public.notifications for select to authenticated using(recipient_id=auth.uid() and private.is_member(organization_id) and (task_id is null or private.can_task(task_id)));
create policy preferences_read on public.user_preferences for select to authenticated using(user_id=auth.uid() and exists(select 1 from public.memberships where user_id=auth.uid() and status='active'));
revoke all on public.organizations, public.memberships, public.projects, public.project_memberships, public.tasks, public.submissions, public.reviews, public.delays, public.activity_events, public.notifications, public.user_preferences from anon, authenticated;
grant select on public.organizations, public.memberships, public.projects, public.project_memberships, public.tasks, public.submissions, public.reviews, public.delays, public.activity_events, public.notifications, public.user_preferences to authenticated;

-- Only server-controlled workflows write records; callers cannot forge histories or approvals.
create function private.emit_event(org uuid, pid uuid, tid uuid, msg text, cat text, heading text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor public.memberships;
begin
  actor := private.current_member();
  if actor.organization_id <> org then raise exception 'Forbidden' using errcode='42501'; end if;
  insert into public.activity_events(organization_id,project_id,task_id,actor_id,message) values(org,pid,tid,auth.uid(),msg);
  insert into public.notifications(organization_id,recipient_id,task_id,category,title,message)
  select org,m.user_id,tid,cat,heading,msg from public.memberships m
  where m.organization_id=org and m.status='active' and m.user_id is not null
  and (m.role='admin' or exists(select 1 from public.tasks t where t.id=tid and t.assignee_id=m.id));
end $$;

create function private.add_task(org uuid, pid uuid, payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare tid uuid; m public.memberships; p public.projects;
begin
  m := private.current_member();
  if m.organization_id <> org or m.role <> 'admin' then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into p from public.projects where id=pid and organization_id=org;
  if p.id is null then raise exception 'Project not found' using errcode='42501'; end if;
  if not exists(select 1 from public.memberships where organization_id=org and id=payload->>'assigneeId' and status='active') then raise exception 'Active assignee required'; end if;
  if (payload->>'assignedDate')::date < p.start_date or (payload->>'deadline')::date > p.deadline then raise exception 'Task dates must fit project dates'; end if;
  if coalesce(payload->>'status','pending') not in ('pending','in_progress','overdue') then raise exception 'New tasks cannot have review or terminal states'; end if;
  insert into public.project_memberships(organization_id,project_id,member_id) values(org,pid,payload->>'assigneeId') on conflict do nothing;
  insert into public.tasks(organization_id,project_id,title,description,technology,assignee_id,assigned_date,deadline,status,required)
  values(org,pid,trim(payload->>'title'),trim(payload->>'description'),payload->>'technology',payload->>'assigneeId',(payload->>'assignedDate')::date,(payload->>'deadline')::date,coalesce(payload->>'status','pending'),coalesce((payload->>'required')::boolean,true)) returning id into tid;
  perform private.emit_event(org,pid,tid,'Task created.','task','Task assigned');
  return tid;
end $$;

create function private.create_project(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m public.memberships; pid uuid; draft jsonb;
begin
  m := private.current_member();
  if m.role <> 'admin' then raise exception 'Administrator required' using errcode='42501'; end if;
  if jsonb_typeof(payload->'tasks') is distinct from 'array' or jsonb_array_length(payload->'tasks') not between 1 and 100 then raise exception 'One to 100 initial tasks required'; end if;
  insert into public.projects(organization_id,name,description,owner_id,start_date,deadline)
  values(m.organization_id,trim(payload->>'name'),trim(payload->>'description'),m.id,(payload->>'startDate')::date,(payload->>'deadline')::date) returning id into pid;
  for draft in select value from jsonb_array_elements(payload->'tasks') loop
    perform private.add_task(m.organization_id,pid,draft);
  end loop;
  perform private.emit_event(m.organization_id,pid,null,'Project created.','project','Project created');
  return pid;
end $$;

create function private.mutate_task(tid uuid, expected_version integer, action text, payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m public.memberships; t public.tasks; sid uuid; next_status text; p public.projects;
begin
  m := private.current_member();
  select * into t from public.tasks where id=tid for update;
  if t.id is null or t.organization_id <> m.organization_id or not private.can_task(tid) then raise exception 'Task access denied' using errcode='42501'; end if;
  if expected_version is null or expected_version <> t.version then raise exception 'Task changed; refresh and retry' using errcode='40001'; end if;
  if t.status in ('approved','cancelled') then raise exception 'Closed tasks are immutable'; end if;
  next_status := t.status;
  if action in ('edit','reassign','approve','changes','cancel') and m.role <> 'admin' then raise exception 'Administrator required' using errcode='42501'; end if;
  if action = 'submit' then
    if t.status in ('submitted','review') then raise exception 'Submission already awaiting review'; end if;
    insert into public.submissions(organization_id,task_id,actor_id,url,note) values(t.organization_id,tid,auth.uid(),payload->>'url',trim(payload->>'note'));
    next_status := 'submitted';
  elsif action = 'delay' then
    if t.status in ('submitted','review') then raise exception 'Cannot delay work awaiting review'; end if;
    insert into public.delays(organization_id,task_id,actor_id,reason) values(t.organization_id,tid,auth.uid(),trim(payload->>'reason'));
    next_status := 'overdue';
  elsif action in ('approve','changes') then
    if t.status not in ('submitted','review') then raise exception 'Submitted work required'; end if;
    select id into sid from public.submissions where task_id=tid order by created_at desc,id desc limit 1;
    if sid is null then raise exception 'Submission required'; end if;
    next_status := case when action='approve' then 'approved' else 'changes_requested' end;
    if action='changes' and length(trim(payload->>'feedback')) < 6 then raise exception 'Describe required changes'; end if;
    insert into public.reviews(organization_id,task_id,submission_id,actor_id,decision,feedback) values(t.organization_id,tid,sid,auth.uid(),next_status,trim(payload->>'feedback'));
  elsif action = 'cancel' then next_status := 'cancelled';
  elsif action in ('edit','reassign') then
    if not exists(select 1 from public.memberships where organization_id=t.organization_id and id=payload->>'assigneeId' and status='active') then raise exception 'Active assignee required'; end if;
    insert into public.project_memberships(organization_id,project_id,member_id) values(t.organization_id,t.project_id,payload->>'assigneeId') on conflict do nothing;
    update public.tasks set assignee_id=payload->>'assigneeId' where id=tid;
    if action='edit' then
      if payload->>'projectId' is distinct from t.project_id::text then raise exception 'Tasks cannot move between projects'; end if;
      next_status := payload->>'status';
      if next_status is distinct from t.status and not (t.status in ('pending','in_progress','overdue') and next_status in ('pending','in_progress','overdue')) then raise exception 'Use submission and review workflow to change state'; end if;
      select * into p from public.projects where id=t.project_id;
      if (payload->>'assignedDate')::date < p.start_date or (payload->>'deadline')::date > p.deadline then raise exception 'Task dates must fit project dates'; end if;
      update public.tasks set title=trim(payload->>'title'),description=trim(payload->>'description'),technology=payload->>'technology',assigned_date=(payload->>'assignedDate')::date,deadline=(payload->>'deadline')::date,required=(payload->>'required')::boolean where id=tid;
    end if;
  else raise exception 'Unknown task action'; end if;
  update public.tasks set status=next_status,version=version+1,updated_at=now() where id=tid;
  perform private.emit_event(t.organization_id,t.project_id,tid,'Task ' || action || '.','task','Task updated');
  return tid;
end $$;

create function private.save_employee(employee_id text, expected_version integer, payload jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare m public.memberships; target public.memberships; normalized text;
begin
  m := private.current_member();
  if m.role <> 'admin' then raise exception 'Administrator required' using errcode='42501'; end if;
  normalized := upper(trim(payload->>'id'));
  if employee_id is null then
    insert into public.memberships(organization_id,id,name,email,job_title,status,velocity)
    values(m.organization_id,normalized,trim(payload->>'name'),lower(trim(payload->>'email')),trim(payload->>'role'),payload->>'status',coalesce((payload->>'velocity')::integer,0));
  else
    select * into target from public.memberships where organization_id=m.organization_id and id=employee_id for update;
    if target.id is null then raise exception 'Employee not found'; end if;
    if target.role='admin' then raise exception 'Administrator accounts require owner provisioning'; end if;
    if expected_version is null or expected_version <> target.version then raise exception 'Employee changed; refresh and retry' using errcode='40001'; end if;
    if target.user_id is not null and lower(trim(payload->>'email')) <> target.email then raise exception 'Linked account email must be changed through verified authentication'; end if;
    update public.memberships set id=normalized,name=trim(payload->>'name'),email=lower(trim(payload->>'email')),job_title=trim(payload->>'role'),status=payload->>'status',velocity=(payload->>'velocity')::integer,version=version+1,updated_at=now() where organization_id=m.organization_id and id=employee_id;
  end if;
  perform private.emit_event(m.organization_id,null,null,'Employee account saved: ' || normalized,'employee','Employee account updated');
  return normalized;
end $$;

create function private.save_preferences(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.memberships;
begin
  m := private.current_member();
  if length(trim(payload->>'displayName')) not between 1 and 200 then raise exception 'Display name required'; end if;
  update public.memberships set name=trim(payload->>'displayName'),version=version+1,updated_at=now() where user_id=auth.uid();
  insert into public.user_preferences(user_id,notification_digest,deadline_alerts,date_format,theme)
  values(auth.uid(),(payload->>'notificationDigest')::boolean,(payload->>'deadlineAlerts')::boolean,payload->>'dateFormat',payload->>'theme')
  on conflict(user_id) do update set notification_digest=excluded.notification_digest,deadline_alerts=excluded.deadline_alerts,date_format=excluded.date_format,theme=excluded.theme,updated_at=now();
end $$;
create function private.read_notifications(ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.memberships;
begin
  m := private.current_member();
  if cardinality(ids) > 1000 then raise exception 'Too many notifications'; end if;
  update public.notifications set read_at=coalesce(read_at,now()) where recipient_id=auth.uid() and organization_id=m.organization_id and id=any(ids) and (task_id is null or private.can_task(task_id));
end $$;

create function public.create_project(payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.create_project(payload); $$;
create function public.create_task(payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.add_task((private.current_member()).organization_id,(payload->>'projectId')::uuid,payload); $$;
create function public.mutate_task(tid uuid, expected_version integer, action text, payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.mutate_task(tid,expected_version,action,payload); $$;
create function public.save_employee(employee_id text, expected_version integer, payload jsonb) returns text language sql security invoker set search_path='' as $$ select private.save_employee(employee_id,expected_version,payload); $$;
create function public.save_preferences(payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.save_preferences(payload); $$;
create function public.read_notifications(ids uuid[]) returns void language sql security invoker set search_path='' as $$ select private.read_notifications(ids); $$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.current_member(), private.is_member(uuid), private.is_admin(uuid), private.can_project(uuid), private.can_task(uuid), private.create_project(jsonb), private.add_task(uuid,uuid,jsonb), private.mutate_task(uuid,integer,text,jsonb), private.save_employee(text,integer,jsonb), private.save_preferences(jsonb), private.read_notifications(uuid[]) to authenticated;
revoke all on function public.create_project(jsonb), public.create_task(jsonb), public.mutate_task(uuid,integer,text,jsonb), public.save_employee(text,integer,jsonb), public.save_preferences(jsonb), public.read_notifications(uuid[]) from public, anon;
grant execute on function public.create_project(jsonb), public.create_task(jsonb), public.mutate_task(uuid,integer,text,jsonb), public.save_employee(text,integer,jsonb), public.save_preferences(jsonb), public.read_notifications(uuid[]) to authenticated;
commit;
