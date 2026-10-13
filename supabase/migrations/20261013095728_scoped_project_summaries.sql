begin;
create function private.project_summaries() returns table(project_id uuid,progress integer,status text)
language plpgsql stable security definer set search_path='' as $$
declare actor public.memberships;
begin
  actor:=private.current_member();
  return query
  select p.id,
    case when totals.required_count=0 then 0 else round(100.0*totals.approved_count/totals.required_count)::integer end,
    case when totals.required_count>0 and totals.required_count=totals.approved_count then 'Completed'
      when totals.overdue_count>0 then 'At Risk' when totals.review_count>0 then 'Review' else 'Active' end
  from public.projects p join public.organizations o on o.id=p.organization_id
  cross join lateral (
    select count(*) filter(where t.required and t.status<>'cancelled') required_count,
      count(*) filter(where t.required and t.status='approved') approved_count,
      count(*) filter(where t.required and t.status not in ('approved','cancelled') and (t.status='overdue' or t.deadline<(now() at time zone o.time_zone)::date)) overdue_count,
      count(*) filter(where t.required and t.status in ('submitted','review','changes_requested')) review_count
    from public.tasks t where t.project_id=p.id
  ) totals
  where p.organization_id=actor.organization_id and private.can_project(p.id);
end $$;
create function public.project_summaries() returns table(project_id uuid,progress integer,status text)
language sql stable security invoker set search_path='' as $$ select * from private.project_summaries(); $$;
revoke all on function private.project_summaries(),public.project_summaries() from public,anon;
grant execute on function private.project_summaries(),public.project_summaries() to authenticated;
commit;
