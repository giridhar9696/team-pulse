-- Owner-reviewed repair only: link a confirmed existing Auth user to the matching employee.
-- Replace all placeholders with the selected organization's actual values.
do $$
declare account auth.users; affected integer;
begin
  select * into account from auth.users where lower(email)=lower('REPLACE_WITH_EMPLOYEE_EMAIL') and email_confirmed_at is not null;
  if account.id is null then raise exception 'Confirmed Auth account required'; end if;
  if exists(select 1 from public.memberships where user_id=account.id) then raise exception 'Identity is already linked'; end if;
  update public.memberships set user_id=account.id,version=version+1,updated_at=now()
    where organization_id='REPLACE_WITH_ORGANIZATION_UUID'::uuid and id='REPLACE_WITH_EMPLOYEE_CODE'
    and lower(email)=lower(account.email) and role='employee' and status='active' and user_id is null;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Exactly one matching active employee is required'; end if;
end $$;
