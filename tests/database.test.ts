import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const org = '10000000-0000-4000-8000-000000000001';
const otherOrg = '10000000-0000-4000-8000-000000000002';
const admin = '20000000-0000-4000-8000-000000000001';
const employee = '20000000-0000-4000-8000-000000000002';
const colleague = '20000000-0000-4000-8000-000000000003';
const outsider = '20000000-0000-4000-8000-000000000004';
let db: PGlite;
let task: string;
let project: string;
const draft = { title: 'Build login', description: 'Secure access', technology: 'Frontend', assigneeId: 'EMP001', assignedDate: '2026-10-13', deadline: '2026-10-20', status: 'pending', required: true };

async function asUser<T>(id: string | null, operation: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? '']);
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
  try { return await operation(); } finally { await db.exec('reset role'); }
}
async function mutate(id: string, version: number, action: string, payload: object = {}) {
  return asUser(id, () => db.query('select public.mutate_task($1,$2,$3,$4::jsonb)', [task, version, action, JSON.stringify(payload)]));
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
  `);
  await db.exec(readFileSync('supabase/migrations/20261013091345_team_pulse_foundation.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261013093259_account_provisioning.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261013095451_integrity_and_query_indexes.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261013095728_scoped_project_summaries.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261013103046_submission_url_validation.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261013104341_revoke_unassigned_project_access.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261013112540_notification_preferences_and_scope.sql', 'utf8'));
  await db.exec(`
    insert into auth.users values('${admin}'),('${employee}'),('${colleague}'),('${outsider}');
    insert into public.organizations(id,name) values('${org}','Team Pulse Test'),('${otherOrg}','Other organization');
    insert into public.memberships(organization_id,id,user_id,name,email,job_title,role) values
      ('${org}','ADMIN','${admin}','Admin','admin@example.test','Administrator','admin'),
      ('${org}','EMP001','${employee}','Employee','employee@example.test','Engineer','employee'),
      ('${org}','EMP002','${colleague}','Colleague','colleague@example.test','Engineer','employee'),
      ('${otherOrg}','OTHER','${outsider}','Outsider','outsider@example.test','Administrator','admin');
  `);
  const created = await asUser(admin, () => db.query<{create_project: string}>('select public.create_project($1::jsonb)', [JSON.stringify({name:'Delivery',description:'Test project',startDate:'2026-10-13',deadline:'2026-10-30',tasks:[draft]})]));
  project = created.rows[0].create_project;
  task = (await db.query<{id:string}>('select id from public.tasks')).rows[0].id;
});
afterEach(async () => { await db.close(); });

describe('PostgreSQL foundation and authorization', () => {
  it('enables RLS on every application table and denies anonymous data/RPC access', async () => {
    const tables = await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r'");
    expect(tables.rows.length).toBe(11);
    expect(tables.rows.every(t => t.relrowsecurity)).toBe(true);
    await expect(asUser(null, () => db.query('select * from public.tasks'))).rejects.toThrow(/permission denied/);
    await expect(asUser(null, () => db.query("select public.create_project('{}')"))).rejects.toThrow(/permission denied/);
  });
  it('checks project and task access independently and isolates organizations', async () => {
    expect((await asUser(employee, () => db.query('select * from public.tasks'))).rows).toHaveLength(1);
    expect((await asUser(employee, () => db.query('select * from public.memberships'))).rows).toHaveLength(1);
    expect((await asUser(outsider, () => db.query('select * from public.tasks'))).rows).toHaveLength(0);
    expect((await asUser(colleague, () => db.query('select * from public.projects'))).rows).toHaveLength(0);
    await db.query('insert into public.project_memberships(organization_id,project_id,member_id) values($1,$2,$3)',[org,project,'EMP002']);
    expect((await asUser(colleague, () => db.query('select * from public.projects'))).rows).toHaveLength(1);
    expect((await asUser(colleague, () => db.query('select * from public.tasks'))).rows).toHaveLength(0);
    await expect(mutate(colleague,1,'submit',{url:'https://example.test',note:'forged'})).rejects.toThrow(/access denied/);
    await expect(mutate(outsider,1,'cancel')).rejects.toThrow(/access denied/);
    await db.query('delete from public.project_memberships where member_id=$1',['EMP001']);
    expect((await asUser(employee, () => db.query('select * from public.tasks'))).rows).toHaveLength(0);
  });
  it('denies privilege escalation, forged audit events and direct table writes', async () => {
    for (const sql of ["update public.memberships set role='admin'", "update public.tasks set status='approved'", "insert into public.activity_events(organization_id,actor_id,message) values('"+org+"','"+employee+"','forged')"]) {
      await expect(asUser(employee, () => db.exec(sql))).rejects.toThrow(/permission denied/);
    }
    await expect(mutate(employee,1,'approve',{feedback:'Approved.'})).rejects.toThrow(/Administrator required/);
    await expect(asUser(employee, () => db.query("select public.save_employee(null,null,'{}')"))).rejects.toThrow(/Administrator required/);
    await expect(asUser(admin, () => db.query("select private.emit_event($1,null,null,'forged','task','Forged')",[org]))).rejects.toThrow(/permission denied/);
  });
  it('preserves submission/review history, checks versions, and closes approved tasks', async () => {
    await mutate(employee,1,'submit',{url:'https://example.test/work',note:'Completed with tests'});
    await expect(mutate(admin,1,'approve',{feedback:'Approved.'})).rejects.toThrow(/changed/);
    await mutate(admin,2,'changes',{feedback:'Add regression tests'});
    await mutate(employee,3,'submit',{url:'https://example.test/work-v2',note:'Added regression tests'});
    await mutate(admin,4,'approve',{feedback:'Approved.'});
    expect((await db.query('select * from public.submissions')).rows).toHaveLength(2);
    expect((await db.query('select * from public.reviews')).rows).toHaveLength(2);
    expect((await db.query<{status:string,version:number}>('select status,version from public.tasks')).rows[0]).toEqual({status:'approved',version:5});
    await expect(mutate(employee,5,'submit',{url:'https://example.test',note:'again'})).rejects.toThrow(/immutable/);
    await expect(mutate(admin,5,'cancel')).rejects.toThrow(/immutable/);
  });
  it('rolls back invalid URLs and project creation with invalid tasks', async () => {
    await expect(mutate(employee,1,'submit',{url:'javascript:alert(1)',note:'bad URL'})).rejects.toThrow(/check constraint/);
    expect((await db.query('select * from public.submissions')).rows).toHaveLength(0);
    await expect(asUser(admin, () => db.query('select public.create_project($1::jsonb)',[JSON.stringify({name:'Invalid',description:'Rollback',startDate:'2026-10-13',deadline:'2026-10-30',tasks:[draft,{...draft,assigneeId:'OTHER'}]})]))).rejects.toThrow(/Active assignee/);
    expect((await db.query('select * from public.projects')).rows).toHaveLength(1);
    await expect(mutate(admin,1,'edit',{...draft,projectId:project,status:'approved'})).rejects.toThrow(/workflow/);
  });
  it('rejects malformed direct-API HTTP URLs and accepts canonical domain/IP links',async()=>{
    for (const url of ['https://[','https://example.test:99999','http://999.999.999.999','http://example.123','https://user:password@example.test']) {
      await expect(mutate(employee,1,'submit',{url,note:'Malformed direct request'})).rejects.toThrow(/check constraint/);
    }
    for (const url of ['https://example.test/work?query=yes#section','http://127.0.0.1:8080/work','https://[2001:db8::1]/work']) {
      expect((await db.query<{valid:boolean}>('select private.valid_submission_url($1) as valid',[url])).rows[0].valid).toBe(true);
    }
    expect((await db.query('select * from public.submissions')).rows).toHaveLength(0);
  });
  it('blocks inactive/frozen users despite a valid identity and preserves task data', async () => {
    for (const status of ['inactive','frozen']) {
      await db.query('update public.memberships set status=$1 where user_id=$2',[status,employee]);
      expect((await asUser(employee, () => db.query('select * from public.tasks'))).rows).toHaveLength(0);
      await expect(mutate(employee,1,'delay',{reason:'Blocker'})).rejects.toThrow(/Active organization membership/);
      expect((await db.query('select * from public.tasks')).rows).toHaveLength(1);
    }
  });
  it('scopes read states and preferences to the authenticated user', async () => {
    const notices = await db.query<{id:string}>('select id from public.notifications where recipient_id=$1',[admin]);
    await asUser(employee, () => db.query('select public.read_notifications($1::uuid[])',[notices.rows.map(n=>n.id)]));
    expect((await db.query('select * from public.notifications where read_at is not null')).rows).toHaveLength(0);
    await asUser(employee,()=>db.query('select public.read_notifications(null)'));
    expect((await db.query('select * from public.notifications where read_at is not null and recipient_id=$1',[admin])).rows).toHaveLength(0);
    expect((await db.query('select * from public.notifications where read_at is not null and recipient_id=$1',[employee])).rows).toHaveLength(1);
    await asUser(employee, () => db.query('select public.save_preferences($1::jsonb)',[JSON.stringify({displayName:'Updated name',notificationDigest:false,deadlineAlerts:true,dateFormat:'friendly',theme:'light',role:'admin',user_id:admin})]));
    expect((await db.query<{role:string}>('select role from public.memberships where user_id=$1',[employee])).rows[0].role).toBe('employee');
    expect((await asUser(admin, () => db.query('select * from public.user_preferences'))).rows).toHaveLength(0);
    expect((await asUser(employee, () => db.query('select * from public.user_preferences'))).rows).toHaveLength(1);
  });
  it('restricts account requests to scoped administrators and rate-limits repeated email requests',async()=>{
    await expect(asUser(employee,()=>db.query("select public.reserve_account_request('EMP001','recover')"))).rejects.toThrow(/Administrator/);
    await expect(asUser(outsider,()=>db.query("select public.reserve_account_request('EMP001','recover')"))).rejects.toThrow(/Active employee/);
    await asUser(admin,()=>db.query("select public.reserve_account_request('EMP001','recover')"));
    await expect(asUser(admin,()=>db.query("select public.reserve_account_request('EMP001','recover')"))).rejects.toThrow(/Wait/);
    await expect(asUser(admin,()=>db.query("select public.reserve_account_request('ADMIN','recover')"))).rejects.toThrow(/Active employee/);
  });
  it('links only confirmed employee emails and cannot bootstrap an administrator',async()=>{
    await db.exec(`insert into public.memberships(organization_id,id,name,email,job_title) values('${org}','INVITED','invited@example.test','invited@example.test','Engineer');`);
    const invited='20000000-0000-4000-8000-000000000010';
    await db.query('insert into auth.users(id,email) values($1,$2)',[invited,'invited@example.test']);
    expect((await db.query<{user_id:string|null}>("select user_id from public.memberships where id='INVITED'")).rows[0].user_id).toBeNull();
    await db.query('update auth.users set email_confirmed_at=now() where id=$1',[invited]);
    expect((await db.query<{user_id:string}>("select user_id from public.memberships where id='INVITED'")).rows[0].user_id).toBe(invited);
    expect((await asUser(invited,()=>db.query<{role:string}>("select role from public.memberships where id='INVITED'"))).rows[0].role).toBe('employee');
  });
  it('creates deadline notices once and keeps them scoped to permitted tasks',async()=>{
    await db.query('update public.tasks set assigned_date=$1,deadline=$2',['2020-01-01','2020-01-02']);
    await asUser(employee,()=>db.query('select public.sync_deadlines()'));
    await asUser(employee,()=>db.query('select public.sync_deadlines()'));
    await asUser(outsider,()=>db.query('select public.sync_deadlines()'));
    const notices=await db.query<{recipient_id:string}>("select recipient_id from public.notifications where category='deadline'");
    expect(notices.rows).toEqual([{recipient_id:employee}]);
  });
  it('respects deadline preferences and reopens notices when the deadline phase changes',async()=>{
    await db.query('update public.tasks set assigned_date=$1,deadline=$2',['2020-01-01','2020-01-02']);
    await asUser(employee,()=>db.query('select public.save_preferences($1::jsonb)',[JSON.stringify({displayName:'Employee',notificationDigest:false,deadlineAlerts:false,dateFormat:'friendly',theme:'light'})]));
    await asUser(employee,()=>db.query('select public.sync_deadlines()'));
    expect((await db.query("select * from public.notifications where category='deadline'")).rows).toHaveLength(0);
    await db.query('update public.user_preferences set deadline_alerts=true where user_id=$1',[employee]);
    await asUser(employee,()=>db.query('select public.sync_deadlines()'));
    await asUser(employee,()=>db.query('select public.read_notifications(null)'));
    await asUser(employee,()=>db.query('select public.sync_deadlines()'));
    expect((await db.query<{read_at:string|null}>("select read_at from public.notifications where category='deadline'")).rows[0].read_at).not.toBeNull();
    await db.query("update public.notifications set title='Approaching deadline' where category='deadline'");
    await asUser(employee,()=>db.query('select public.sync_deadlines()'));
    expect((await db.query<{title:string,read_at:string|null}>("select title,read_at from public.notifications where category='deadline'")).rows).toEqual([{title:'Deadline reached',read_at:null}]);
  });
  it('catches up assignment notices after an invitation and hides notices after access is revoked',async()=>{
    await db.query('delete from public.notifications where recipient_id=$1',[employee]);
    await asUser(employee,()=>db.query('select public.sync_deadlines()'));
    await asUser(employee,()=>db.query('select public.sync_deadlines()'));
    expect((await asUser(employee,()=>db.query("select * from public.notifications where title='Task assigned'"))).rows).toHaveLength(1);
    await mutate(admin,1,'reassign',{assigneeId:'EMP002'});
    expect((await asUser(employee,()=>db.query('select * from public.notifications'))).rows).toHaveLength(0);
    await asUser(employee,()=>db.query('select public.read_notifications(null)'));
    expect((await db.query('select * from public.notifications where recipient_id=$1 and read_at is not null',[employee])).rows).toHaveLength(0);
  });
  it('allows employee creation, delay reporting and reassignment without losing history',async()=>{
    await asUser(admin,()=>db.query('select public.save_employee(null,null,$1::jsonb)',[JSON.stringify({id:'EMP003',name:'New colleague',email:'new@example.test',role:'Engineer',status:'active',velocity:0,roleOverride:'admin'})]));
    expect((await db.query<{role:string}>("select role from public.memberships where id='EMP003'")).rows[0].role).toBe('employee');
    await mutate(employee,1,'delay',{reason:'Dependency unavailable'});
    await mutate(admin,2,'reassign',{assigneeId:'EMP002'});
    expect((await db.query('select * from public.delays')).rows).toHaveLength(1);
    expect((await asUser(employee,()=>db.query('select * from public.tasks'))).rows).toHaveLength(0);
    expect((await asUser(employee,()=>db.query('select * from public.projects'))).rows).toHaveLength(0);
    expect((await asUser(employee,()=>db.query('select * from public.project_summaries()'))).rows).toHaveLength(0);
    expect((await asUser(colleague,()=>db.query('select * from public.tasks'))).rows).toHaveLength(1);
  });
  it('accepts one of two queued writes using the same displayed version',async()=>{
    const results=await asUser(employee,()=>Promise.allSettled([
      db.query('select public.mutate_task($1,1,$2,$3::jsonb)',[task,'submit',JSON.stringify({url:'https://example.test/first',note:'First write'})]),
      db.query('select public.mutate_task($1,1,$2,$3::jsonb)',[task,'submit',JSON.stringify({url:'https://example.test/second',note:'Second write'})]),
    ]));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
    expect((await db.query('select * from public.submissions')).rows).toHaveLength(1);
  });
  it('shares accurate project totals without exposing other assignments',async()=>{
    await asUser(admin,()=>db.query('select public.create_task($1::jsonb)',[JSON.stringify({...draft,projectId:project,assigneeId:'ADMIN'})]));
    await mutate(employee,1,'submit',{url:'https://example.test/work',note:'Completed'});
    await mutate(admin,2,'approve',{feedback:'Approved.'});
    const totals=await asUser(employee,()=>db.query<{project_id:string,progress:number}>('select * from public.project_summaries()'));
    expect(totals.rows).toHaveLength(1);expect(totals.rows[0].progress).toBe(50);
    expect((await asUser(employee,()=>db.query('select * from public.tasks'))).rows).toHaveLength(1);
    expect((await asUser(outsider,()=>db.query('select * from public.project_summaries()'))).rows).toHaveLength(0);
    await expect(asUser(null,()=>db.query('select * from public.project_summaries()'))).rejects.toThrow(/permission denied/);
  });
  it('cleans up only the recorded staging project and refuses mismatched task inventories',async()=>{
    const name='E2E-30000000-0000-4000-8000-000000000001';
    await db.query('update public.projects set name=$1 where id=$2',[name,project]);
    const other=(await asUser(admin,()=>db.query<{create_project:string}>('select public.create_project($1::jsonb)',[JSON.stringify({name:'Unrelated project',description:'Keep this project',startDate:'2026-10-13',deadline:'2026-10-30',tasks:[draft]})]))).rows[0].create_project;
    await mutate(employee,1,'submit',{url:'https://example.test/work',note:'Done'});
    await mutate(admin,2,'approve',{feedback:'Approved.'});
    const template=readFileSync('supabase/cleanup-staging-fixture.sql','utf8');
    const cleanup=(id:string)=>template.replace('REPLACE_ORGANIZATION_ID',org).replace('REPLACE_PROJECT_ID',project).replace('REPLACE_PROJECT_NAME',name).replace('REPLACE_TASK_ID',id);
    await expect(db.exec(cleanup('30000000-0000-4000-8000-000000000099'))).rejects.toThrow(/inventory/);
    await db.exec('rollback');
    expect((await db.query('select * from public.projects')).rows).toHaveLength(2);
    await db.exec(cleanup(task));
    expect((await db.query<{id:string}>('select id from public.projects')).rows).toEqual([{id:other}]);
    expect((await db.query('select * from public.tasks')).rows).toHaveLength(1);
    expect((await db.query('select * from public.memberships')).rows).toHaveLength(4);
    expect((await db.query('select * from auth.users')).rows).toHaveLength(4);
    expect((await db.query('select * from public.submissions')).rows).toHaveLength(0);
    expect((await db.query('select * from public.notifications where task_id=$1',[task])).rows).toHaveLength(0);
  });
});
