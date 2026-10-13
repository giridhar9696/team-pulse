import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { existsSync, writeFileSync } from 'node:fs';

async function login(page:Page,role:'admin'|'employee') {
  const prefix=role==='admin' ? 'TEAM_PULSE_TEST_ADMIN' : 'TEAM_PULSE_TEST_EMPLOYEE';
  await page.goto('/login');
  await page.getByRole('tab',{name:role==='admin'?'Admin':'Employee',exact:true}).click();
  await page.getByLabel('Account email').fill(process.env[`${prefix}_EMAIL`]!);
  await page.getByLabel('Password',{exact:true}).fill(process.env[`${prefix}_PASSWORD`]!);
  await page.getByRole('button',{name:`Enter ${role==='admin'?'Admin':'Employee'} panel`}).click();
  await expect(page).toHaveURL(new RegExp(`/${role}$`));
}
test('real administrator/employee persistence, review cycle and direct authorization',async({browser})=>{
  if (existsSync('.staging-fixtures.json')) throw new Error('Clean up and verify the previous staging fixture before another run. See docs/deployment.md.');
  const adminClient=createClient(process.env.TEAM_PULSE_TEST_SUPABASE_URL!,process.env.TEAM_PULSE_TEST_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const employeeClient=createClient(process.env.TEAM_PULSE_TEST_SUPABASE_URL!,process.env.TEAM_PULSE_TEST_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const adminAuth=await adminClient.auth.signInWithPassword({email:process.env.TEAM_PULSE_TEST_ADMIN_EMAIL!,password:process.env.TEAM_PULSE_TEST_ADMIN_PASSWORD!});
  const employeeAuth=await employeeClient.auth.signInWithPassword({email:process.env.TEAM_PULSE_TEST_EMPLOYEE_EMAIL!,password:process.env.TEAM_PULSE_TEST_EMPLOYEE_PASSWORD!});
  expect(adminAuth.error).toBeNull();expect(employeeAuth.error).toBeNull();
  const administrator=(await adminClient.from('memberships').select('*').eq('user_id',adminAuth.data.user!.id).single()).data!;
  const employee=(await employeeClient.from('memberships').select('*').eq('user_id',employeeAuth.data.user!.id).single()).data!;
  expect(administrator.role).toBe('admin');expect(employee.role).toBe('employee');
  expect(administrator.organization_id).toBe(employee.organization_id);
  const adminContext=await browser.newContext(),employeeContext=await browser.newContext();
  const adminPage=await adminContext.newPage(),employeePage=await employeeContext.newPage();
  const suffix=crypto.randomUUID();
  let projectId:string|undefined;
  const createdTasks:string[]=[];
  const recordFixtures=(flag='w')=>writeFileSync('.staging-fixtures.json',JSON.stringify({projectRef:process.env.TEAM_PULSE_TEST_PROJECT_REF,organizationId:administrator.organization_id,projectId:projectId??null,taskIds:createdTasks,name:`E2E-${suffix}`},null,2),{flag});
  // Reserve before any database write; a second run cannot overwrite unresolved cleanup evidence.
  recordFixtures('wx');
  try {
    await login(adminPage,'admin');
    await adminPage.goto('/admin/projects/new');
    await adminPage.getByLabel('Project name',{exact:true}).fill(`E2E-${suffix}`);
    await adminPage.getByLabel('Project description').fill('Isolated staging workflow verification');
    await adminPage.getByLabel('Start date',{exact:true}).fill('2026-01-01');
    await adminPage.getByLabel('Overall deadline').fill('2099-12-31');
    await adminPage.getByLabel('Task name').fill(`Task-${suffix}`);
    await adminPage.getByLabel('Task description').fill('Verify submission and review');
    await adminPage.getByLabel('Assigned employee').selectOption(employee.id);
    await adminPage.getByLabel('Assigned date').fill('2026-01-01');
    await adminPage.getByLabel('Deadline',{exact:true}).fill('2099-12-31');
    await adminPage.getByRole('button',{name:'Save Project',exact:true}).click();
    await expect(adminPage).toHaveURL(/\/admin\/projects\/[a-f0-9-]+$/);
    projectId=adminPage.url().split('/').at(-1)!;
    recordFixtures();
    const task=(await adminClient.from('tasks').select('*').eq('project_id',projectId).single()).data!;
    createdTasks.push(task.id);
    recordFixtures();
    const hidden=await adminClient.rpc('create_task',{payload:{projectId,title:'Administrator-only assignment',description:'Access boundary fixture',technology:'Backend',assigneeId:administrator.id,assignedDate:'2026-01-01',deadline:'2099-12-31',status:'pending',required:false}});
    expect(hidden.error).toBeNull();createdTasks.push(hidden.data);
    recordFixtures();
    expect((await employeeClient.from('tasks').select('*').eq('id',hidden.data)).data).toEqual([]);
    expect((await employeeClient.rpc('mutate_task',{tid:hidden.data,expected_version:1,action:'cancel',payload:{}})).error).not.toBeNull();
    expect((await employeeClient.from('memberships').update({role:'admin'}).eq('user_id',employeeAuth.data.user!.id)).error).not.toBeNull();
    await login(employeePage,'employee');
    await employeePage.goto(`/employee/tasks/${task.id}`);
    await employeePage.getByLabel('Work URL').fill('https://example.test/work');
    await employeePage.getByLabel('Completion note').fill('Initial submission');
    await employeePage.getByRole('button',{name:'Submit for Review'}).click();
    await expect(employeePage.getByText('Submission sent for admin review.')).toBeVisible();
    await adminPage.goto(`/admin/tasks/${task.id}`);
    await adminPage.getByLabel('Admin feedback').fill('Add the missing regression test');
    await adminPage.getByRole('button',{name:'Request Changes',exact:true}).click();
    await expect(adminPage.getByText('Changes requested and previous submission preserved.')).toBeVisible();
    await employeePage.reload();
    await employeePage.getByLabel('Completion note').fill('Regression test added');
    await employeePage.getByRole('button',{name:'Submit for Review'}).click();
    await expect(employeePage.getByText('Resubmission sent for admin review.')).toBeVisible();
    await adminPage.reload();
    await adminPage.getByRole('button',{name:'Approve',exact:true}).click();
    await expect(adminPage.getByText('Task approved and project progress updated.')).toBeVisible();
    await employeePage.reload();
    await expect(employeePage.getByRole('button',{name:'Submit for Review'})).toBeDisabled();
    expect((await employeeClient.from('submissions').select('id').eq('task_id',task.id)).data).toHaveLength(2);
    const secondContext=await browser.newContext();
    try {const page=await secondContext.newPage();await login(page,'employee');await page.goto(`/employee/tasks/${task.id}`);await expect(page.getByRole('button',{name:'Submit for Review'})).toBeDisabled();} finally {await secondContext.close();}
  } finally {
    // Owner cleanup is explicit because production intentionally has no destructive client endpoint.
    recordFixtures();
    await adminContext.close();await employeeContext.close();
    await adminClient.auth.signOut();await employeeClient.auth.signOut();
  }
});
