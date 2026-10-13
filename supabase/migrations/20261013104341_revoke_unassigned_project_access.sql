begin;
-- Remove project access after the last assignment is handed off; retain all task history.
create or replace function private.mutate_task(tid uuid, expected_version integer, action text, payload jsonb) returns uuid
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
  if action in ('edit','reassign') and t.assignee_id is distinct from payload->>'assigneeId' then
    delete from public.project_memberships pm where pm.organization_id=t.organization_id and pm.project_id=t.project_id and pm.member_id=t.assignee_id
      and not exists(select 1 from public.tasks owned where owned.organization_id=t.organization_id and owned.project_id=t.project_id and owned.assignee_id=t.assignee_id);
  end if;
  perform private.emit_event(t.organization_id,t.project_id,tid,'Task ' || action || '.',
    case when action='submit' then 'submission' when action in ('approve','changes') then 'review' else 'task' end,
    case when action='submit' then 'Work submitted' when action='approve' then 'Task approved' when action='changes' then 'Changes requested' when action='reassign' then 'Task reassigned' when action='delay' then 'Delay reported' when action='cancel' then 'Task cancelled' else 'Task updated' end);
  return tid;
end $$;

commit;
