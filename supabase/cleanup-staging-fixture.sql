-- Owner only: verify the dedicated staging project and substitute the ignored fixture record.
-- This transaction refuses a mismatched project or an incomplete/foreign task inventory.
begin;
do $$
declare
  fixture_org uuid := 'REPLACE_ORGANIZATION_ID';
  fixture_project uuid := 'REPLACE_PROJECT_ID';
  fixture_name text := 'REPLACE_PROJECT_NAME';
  fixture_tasks uuid[] := array['REPLACE_TASK_ID']::uuid[];
begin
  if fixture_name !~ '^E2E-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'A recorded E2E project name is required';
  end if;
  perform 1 from public.projects where id=fixture_project and organization_id=fixture_org and name=fixture_name for update;
  if not found then raise exception 'Recorded staging project does not match'; end if;
  perform 1 from public.tasks where organization_id=fixture_org and project_id=fixture_project for update;
  if exists(select 1 from public.tasks where project_id=fixture_project and not(id=any(fixture_tasks)))
    or exists(select 1 from unnest(fixture_tasks) id where not exists(
      select 1 from public.tasks t where t.id=id and t.organization_id=fixture_org and t.project_id=fixture_project
    )) then raise exception 'Recorded task inventory does not match'; end if;
  delete from public.notifications where organization_id=fixture_org and (project_id=fixture_project or task_id=any(fixture_tasks));
  delete from public.reviews where organization_id=fixture_org and task_id=any(fixture_tasks);
  delete from public.submissions where organization_id=fixture_org and task_id=any(fixture_tasks);
  delete from public.delays where organization_id=fixture_org and task_id=any(fixture_tasks);
  delete from public.activity_events where organization_id=fixture_org and (project_id=fixture_project or task_id=any(fixture_tasks));
  delete from public.project_memberships where organization_id=fixture_org and project_id=fixture_project;
  delete from public.tasks where organization_id=fixture_org and project_id=fixture_project;
  delete from public.projects where organization_id=fixture_org and id=fixture_project;
end $$;
commit;
