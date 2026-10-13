-- Run only as the selected project's owner after replacing the email placeholder.
-- First invite/confirm this Auth account in Supabase. This script does not send email.
do $$
declare admin_user auth.users; organization uuid;
begin
  select * into admin_user from auth.users where lower(email)=lower('REPLACE_WITH_CONFIRMED_ADMIN_EMAIL') and email_confirmed_at is not null;
  if admin_user.id is null then raise exception 'A confirmed administrator Auth account is required'; end if;
  if exists(select 1 from public.memberships where user_id=admin_user.id) then raise exception 'Account already has a membership; review before changing privileges'; end if;
  insert into public.organizations(name) values('Team Pulse') returning id into organization;
  insert into public.memberships(organization_id,id,user_id,name,email,job_title,role)
  values(organization,'ADMIN001',admin_user.id,'Administrator',lower(admin_user.email),'Administrator','admin');
end $$;
