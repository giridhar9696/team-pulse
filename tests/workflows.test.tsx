// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../src/features/admin/ProjectProvider';
import { EmployeeTaskDetail } from '../src/features/employee/EmployeeTaskDetail';
import { TaskForm } from '../src/features/admin/TaskForm';
import { AdminTasks } from '../src/features/admin/AdminTasks';
import { AppShell } from '../src/app/AppShell';
import { AddProjectForm } from '../src/features/admin/AddProjectForm';
import { EmployeeManagement } from '../src/features/admin/EmployeeManagement';
import { SettingsPage } from '../src/features/operations/SettingsPage';
import { AdminHome } from '../src/features/admin/AdminHome';
import { ProjectsList } from '../src/features/admin/ProjectsList';
import { ProjectWorkspace } from '../src/features/admin/ProjectWorkspace';
import { ReportsPage } from '../src/features/admin/ReportsPage';
import { TaskDetail } from '../src/features/admin/TaskDetail';
import { EmployeeHome } from '../src/features/employee/EmployeeHome';
import { EmployeeProjects } from '../src/features/employee/EmployeeProjects';
import { EmployeeTasks } from '../src/features/employee/EmployeeTasks';
import { NotificationsPage } from '../src/features/operations/NotificationsPage';
import { GlobalSearchPage } from '../src/features/operations/GlobalSearchPage';
import { ActivityLogPage } from '../src/features/operations/ActivityLogPage';
import { HelpPage } from '../src/features/operations/HelpPage';
import { CalendarPage } from '../src/features/calendar/CalendarPage';
import type { ReactElement } from 'react';
import { todayDate } from '../src/lib/validation';
import { useProjects } from '../src/features/admin/projectContext';
import { emptyWorkspace, type Workspace } from '../src/data/workspace';

const mocks=vi.hoisted(()=>({load:vi.fn(),rpc:vi.fn(),refreshUser:vi.fn(),role:'employee' as 'employee'|'admin'}));
vi.mock('../src/features/auth/authContext',()=>({useAuth:()=>({user:{id:'user',organizationId:'org',identifier:'EMP001',name:'Employee',email:'employee@example.test',role:mocks.role},refreshUser:mocks.refreshUser})}));
vi.mock('../src/data/workspace',async()=>{const actual=await vi.importActual<object>('../src/data/workspace');return {...actual,loadWorkspace:mocks.load,rpc:mocks.rpc};});
vi.mock('../src/lib/supabase',()=>({requireSupabase:()=>({functions:{invoke:vi.fn()}})}));
let data:Workspace;
function Boundary() {
  const {loading,error,busy}=useProjects();
  if (loading) return <p>Loading</p>;
  return <>{error && <p role="alert">{error}</p>}<fieldset disabled={busy}><EmployeeTaskDetail /></fieldset></>;
}
function mount() {
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={['/employee/tasks/task']}><Routes><Route path="/employee/tasks/:taskId" element={<Boundary />} /></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
}
function mountPage(element:ReactElement,path:string,panel:'admin'|'employee'='employee') {
  mocks.role=panel;
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={[path]}><Routes><Route path={`/${panel}`} element={<AppShell panel={panel} />}><Route index element={element} /><Route path="*" element={element} /></Route></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
}
beforeEach(()=>{
  vi.clearAllMocks();
  mocks.role='employee';
  Object.defineProperty(window,'matchMedia',{writable:true,value:()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})});
  data={...emptyWorkspace,employees:[{id:'EMP001',name:'Employee',email:'employee@example.test',role:'Engineer',status:'active',velocity:0,version:1,linked:true,accessRole:'employee'}],
    projects:[{id:'project',name:'Delivery',description:'Project',ownerId:'EMP001',startDate:'2026-10-13',deadline:'2026-10-30',status:'Active',notifications:[],activity:[],tasks:[{id:'task',version:7,title:'Build workflow',description:'Task details',technology:'Frontend',assigneeId:'EMP001',assignedDate:'2026-10-13',deadline:'2026-10-20',status:'pending',required:true,submissions:[]}]}]};
  mocks.load.mockImplementation(async()=>data);
});
afterEach(cleanup);
describe('shared data reporting and navigation',()=>{
  it('derives administrator dashboard totals from persisted tasks',async()=>{
    mountPage(<AdminHome />,'/admin','admin');
    await screen.findByText('Operations dashboard');
    expect(screen.getByRole('link',{name:/Total Tasks/}).textContent).toContain('1');
    expect(screen.getByRole('link',{name:/Approved Tasks/}).textContent).toContain('0');
    expect(screen.getAllByText('Delivery').length).toBeGreaterThan(0);
  });
  it('filters projects by name and server-confirmed progress',async()=>{
    data.projects[0].summary={progress:50,status:'Review'};
    mountPage(<ProjectsList />,'/admin/projects','admin');
    await screen.findByText('Delivery');
    fireEvent.change(screen.getByLabelText('Project progress'),{target:{value:'high'}});
    await screen.findByText('No matching projects');
    fireEvent.change(screen.getByLabelText('Project progress'),{target:{value:'mid'}});
    expect(screen.getByText('Delivery')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search projects'),{target:{value:'unknown'}});
    await screen.findByText('No matching projects');
  });
  it('renders project tasks and recorded submissions/history in its workspace',async()=>{
    data.projects[0].tasks[0].submission={id:'submission',url:'https://example.test',note:'Recorded completion',submittedAt:'2026-10-13T12:00:00Z'};
    data.projects[0].activity=[{id:'event',at:'2026-10-13',message:'Recorded project activity'}];
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={['/admin/projects/project']}><Routes><Route path="/admin" element={<AppShell panel="admin" />}><Route path="projects/:projectId" element={<ProjectWorkspace />} /></Route></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
    await screen.findByText('Recorded completion');
    expect(screen.getByText('Recorded project activity')).toBeTruthy();
  });
  it('filters reports and exports the displayed task records',async()=>{
    const createUrl=vi.fn<(blob:Blob)=>string>(()=> 'blob:report');Object.defineProperty(URL,'createObjectURL',{configurable:true,value:createUrl});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});
    const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    try {
      mountPage(<ReportsPage />,'/admin/reports','admin');await screen.findByText('Reports & Analytics');
      fireEvent.change(screen.getByLabelText('Report period from'),{target:{value:'2020-01-01'}});
      fireEvent.change(screen.getByLabelText('Report period to'),{target:{value:'2099-12-31'}});
      fireEvent.click(screen.getByRole('button',{name:'Export CSV'}));
      expect(createUrl).toHaveBeenCalledOnce();
      const blob=createUrl.mock.calls[0][0];
      const text=await new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.readAsText(blob);});
      expect(text).toContain('Build workflow');expect(text).toContain('Employee');
      fireEvent.change(screen.getByLabelText('Status'),{target:{value:'approved'}});
      await screen.findByText('No report rows');
    } finally {click.mockRestore();}
  });
  it('shows employee dashboard metrics only for assigned work',async()=>{
    data.projects[0].tasks.push({...data.projects[0].tasks[0],id:'other',assigneeId:'OTHER',title:'Other employee work'});
    mountPage(<EmployeeHome />,'/employee');await screen.findByText('Welcome back, Employee.');
    expect(screen.getByRole('link',{name:/Assigned/}).textContent).toContain('1');
    expect(screen.queryByText('Other employee work')).toBeNull();
  });
  it('shows authorized project totals alongside only the employee assignments',async()=>{
    data.projects[0].summary={progress:50,status:'Review'};
    data.projects[0].tasks.push({...data.projects[0].tasks[0],id:'other',assigneeId:'OTHER',title:'Other employee work'});
    mountPage(<EmployeeProjects />,'/employee/projects');await screen.findByText('50% approved required work');
    expect(screen.queryByText('Other employee work')).toBeNull();
  });
  it('supports employee task views and filters without exposing other assignments',async()=>{
    mountPage(<EmployeeTasks />,'/employee/tasks');await screen.findByText('Build workflow');
    fireEvent.click(screen.getByRole('button',{name:'Table'}));
    fireEvent.change(screen.getByLabelText('Status filter'),{target:{value:'approved'}});
    await screen.findByText('No matching tasks');
    fireEvent.change(screen.getByLabelText('Status filter'),{target:{value:'pending'}});
    expect(screen.getByText('Build workflow')).toBeTruthy();
  });
  it('applies the persisted friendly-date preference to task deadlines',async()=>{
    data.settings={...data.settings,dateFormat:'friendly'};
    mountPage(<EmployeeTasks />,'/employee/tasks');await screen.findByText('Build workflow');
    expect(screen.getByText('Due Oct 20, 2026')).toBeTruthy();
    expect(screen.queryByText('Due 2026-10-20')).toBeNull();
  });
  it('reads notifications only after the persisted read-state update',async()=>{
    data.notifications=[{id:'notice',category:'task',title:'Assigned work',message:'Your task',at:'2026-10-13',to:'/employee/tasks/task',audience:'employee'}];
    mocks.rpc.mockImplementation(async()=>{data={...data,readNotificationIds:['notice']};return null;});
    mountPage(<NotificationsPage />,'/employee/notifications');await screen.findByText('Assigned work');
    fireEvent.click(screen.getByRole('button',{name:'Mark all as read'}));
    await screen.findByText('0 unread notifications from shared task, project, and account events.');
    expect(mocks.rpc).toHaveBeenCalledWith('read_notifications',{ids:['notice']});
  });
  it('searches permitted tasks and hides the employee directory for employee accounts',async()=>{
    mountPage(<GlobalSearchPage />,'/employee/search');await screen.findByText('Start typing to search');
    fireEvent.change(screen.getByLabelText('Search Team Pulse'),{target:{value:'Build workflow'}});
    await screen.findByRole('link',{name:/Build workflow/});
    expect(screen.queryByRole('heading',{name:'Employees'})).toBeNull();
  });
  it('displays persisted activity and applies date filters',async()=>{
    data.activity=[{id:'event',action:'Task approved',description:'Server-recorded review',at:'2026-10-13',to:'/employee/tasks/task',projectId:'project',taskId:'task'}];
    mountPage(<ActivityLogPage />,'/employee/activity');await screen.findByText('Activity Log');
    fireEvent.change(screen.getByLabelText('Activity from'),{target:{value:'2020-01-01'}});fireEvent.change(screen.getByLabelText('Activity to'),{target:{value:'2099-12-31'}});
    expect(screen.getByText('Server-recorded review')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Activity to'),{target:{value:'2020-01-02'}});
    await screen.findByText('No activity');
  });
  it('shows role-appropriate help navigation',async()=>{
    mountPage(<HelpPage />,'/employee/help');await screen.findByText('Help & FAQs');
    expect(screen.queryByRole('link',{name:'Reports'})).toBeNull();
    expect(screen.getByText('Can I change deadlines?')).toBeTruthy();
  });
  it('selects deadlines consistently in day view and advances one calendar day',async()=>{
    data.projects[0].tasks[0].deadline=todayDate();
    mountPage(<CalendarPage panel="employee" />,'/employee/calendar');await screen.findByText('Deadline Calendar');
    fireEvent.click(screen.getByRole('button',{name:'day'}));
    expect(screen.getAllByText('Build workflow').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button',{name:'Next'}));
    await screen.findByText('No task on the selected date.');
  });
  it('allows an administrator to approve persisted submitted work through the review UI',async()=>{
    const submission={id:'submission',url:'https://example.test/work',note:'Completion note',submittedAt:'2026-10-13'};
    data.projects[0].tasks[0]={...data.projects[0].tasks[0],status:'submitted',submission,submissions:[submission]};
    mocks.rpc.mockImplementation(async()=>{data={...data,projects:data.projects.map(p=>({...p,tasks:p.tasks.map(t=>({...t,status:'approved',version:8,review:{decision:'approved',reviewedAt:'2026-10-13',feedback:'Approved.'}}))}))};return 'task';});
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={['/admin/tasks/task']}><Routes><Route path="/admin" element={<AppShell panel="admin" />}><Route path="tasks/:taskId" element={<TaskDetail />} /></Route></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
    await screen.findByText('Build workflow');fireEvent.click(screen.getByRole('button',{name:'Approve'}));
    await screen.findByText('Task approved and project progress updated.');
    expect(mocks.rpc).toHaveBeenCalledWith('mutate_task',expect.objectContaining({action:'approve',expected_version:7}));
    expect((screen.getByRole('button',{name:'Approve'}) as HTMLButtonElement).disabled).toBe(true);
  });
  it('validates and persists administrative submission and requested-change workflows',async()=>{
    mocks.rpc.mockImplementation(async(_name,args)=>{
      data={...data,projects:data.projects.map(p=>({...p,tasks:p.tasks.map(t=>args.action==='submit' ? {...t,status:'submitted',version:8,submission:{id:'submission',url:args.payload.url,note:args.payload.note,submittedAt:'2026-10-13'},submissions:[{id:'submission',url:args.payload.url,note:args.payload.note,submittedAt:'2026-10-13'}]} : {...t,status:'changes_requested',version:9,review:{decision:'changes_requested',reviewedAt:'2026-10-13',feedback:args.payload.feedback}})}))};return 'task';
    });
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={['/admin/tasks/task']}><Routes><Route path="/admin" element={<AppShell panel="admin" />}><Route path="tasks/:taskId" element={<TaskDetail />} /></Route></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
    await screen.findByText('Build workflow');
    fireEvent.click(screen.getByRole('button',{name:'Submit / Resubmit'}));
    await screen.findByText('A valid HTTP(S) URL and completion note are required.');expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Work URL'),{target:{value:'https://example.test/work'}});fireEvent.change(screen.getByLabelText('Completion note'),{target:{value:'Recorded completion'}});
    fireEvent.click(screen.getByRole('button',{name:'Submit / Resubmit'}));await screen.findByText('Work submitted for admin review.');
    fireEvent.click(screen.getByRole('button',{name:'Request Changes'}));await screen.findByText('Feedback is required before requesting changes.');
    fireEvent.change(screen.getByLabelText('Admin feedback'),{target:{value:'Add regression tests'}});fireEvent.click(screen.getByRole('button',{name:'Request Changes'}));
    await screen.findByText('Changes requested and previous submission preserved.');
    expect(mocks.rpc).toHaveBeenLastCalledWith('mutate_task',expect.objectContaining({action:'changes',expected_version:8,payload:{feedback:'Add regression tests'}}));
  });
  it('records administrative delay and cancellation only after successful writes',async()=>{
    mocks.rpc.mockImplementation(async(_name,args)=>{
      data={...data,projects:data.projects.map(p=>({...p,tasks:p.tasks.map(t=>args.action==='delay' ? {...t,status:'overdue',version:8,delay:{reason:args.payload.reason,reportedAt:'2026-10-13'}} : {...t,status:'cancelled',version:9})}))};return 'task';
    });
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={['/admin/tasks/task']}><Routes><Route path="/admin" element={<AppShell panel="admin" />}><Route path="tasks/:taskId" element={<TaskDetail />} /></Route></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
    await screen.findByText('Build workflow');fireEvent.click(screen.getByRole('button',{name:'Report Delay'}));await screen.findByText('Delay reason is required.');
    fireEvent.change(screen.getByLabelText('Delay reason'),{target:{value:'Blocked dependency'}});fireEvent.click(screen.getByRole('button',{name:'Report Delay'}));await screen.findByText('Delay reason recorded.');
    fireEvent.click(screen.getByRole('button',{name:'Cancel Task'}));await screen.findByText('Task cancelled.');
    expect(mocks.rpc).toHaveBeenLastCalledWith('mutate_task',expect.objectContaining({action:'cancel',expected_version:8}));
  });
});
describe('persistent workflow UI',()=>{
  it('preserves completion notes and shows an error when persistence fails',async()=>{
    mocks.rpc.mockRejectedValue(new Error('The change was not saved.'));
    mount();await screen.findByText('Build workflow');
    fireEvent.change(screen.getByLabelText('Work URL'),{target:{value:'https://example.test/work'}});
    fireEvent.change(screen.getByLabelText('Completion note'),{target:{value:'Keep this note'}});
    fireEvent.click(screen.getByText('Submit for Review'));
    await screen.findByRole('alert');
    expect((screen.getByLabelText('Completion note') as HTMLTextAreaElement).value).toBe('Keep this note');
    expect(screen.queryByText('Submission sent for admin review.')).toBeNull();
  });
  it('waits for the persisted submission and passes the displayed record version',async()=>{
    mocks.rpc.mockImplementation(async()=>{
      data={...data,projects:data.projects.map(p=>({...p,tasks:p.tasks.map(t=>({...t,status:'submitted',version:8,submissions:[{id:'submission',url:'https://example.test/work',note:'Completed',submittedAt:'2026-10-13T10:00:00Z'}]}))}))};
      return 'task';
    });
    mount();await screen.findByText('Build workflow');
    fireEvent.change(screen.getByLabelText('Work URL'),{target:{value:'https://example.test/work'}});
    fireEvent.change(screen.getByLabelText('Completion note'),{target:{value:'Completed'}});
    fireEvent.click(screen.getByText('Submit for Review'));
    await screen.findByText('Submission sent for admin review.');
    expect(mocks.rpc).toHaveBeenCalledWith('mutate_task',{tid:'task',expected_version:7,action:'submit',payload:{url:'https://example.test/work',note:'Completed'}});
    expect((screen.getByLabelText('Completion note') as HTMLTextAreaElement).value).toBe('');
  });
  it('distinguishes a committed write followed by a failed refresh',async()=>{
    mocks.rpc.mockResolvedValue('task');
    mocks.load.mockResolvedValueOnce(data).mockRejectedValue(new Error('network'));
    mount();await screen.findByText('Build workflow');
    fireEvent.change(screen.getByLabelText('Work URL'),{target:{value:'https://example.test/work'}});
    fireEvent.change(screen.getByLabelText('Completion note'),{target:{value:'Completed'}});
    fireEvent.click(screen.getByText('Submit for Review'));
    await screen.findByText(/Saved, but workspace refresh failed/);
    expect(screen.queryByText('Submission sent for admin review.')).toBeNull();
  });
  it('does not reset a task draft when its parent rerenders during a failed save',async()=>{
    const onSubmit=vi.fn().mockResolvedValue(undefined);
    const props={projects:[{id:'project',name:'Delivery'}],employees:data.employees,submitLabel:'Save Task',onSubmit,onCancel:vi.fn()};
    const view=render(<TaskForm {...props} />);
    fireEvent.change(screen.getByLabelText('Task title'),{target:{value:'Unsaved title'}});
    view.rerender(<TaskForm {...props} projects={[...props.projects]} />);
    await waitFor(()=>expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('Unsaved title'));
  });
  it('keeps an edit tied to its displayed version after a background workspace refresh',async()=>{
    mocks.rpc.mockRejectedValue(new Error('This record changed. Refresh and retry.'));
    const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});
    render(<QueryClientProvider client={cache}><ProjectProvider><MemoryRouter initialEntries={['/admin/tasks']}><AdminTasks /></MemoryRouter></ProjectProvider></QueryClientProvider>);
    await screen.findByText('Build workflow');
    fireEvent.click(screen.getByRole('button',{name:'Edit task'}));
    fireEvent.change(screen.getByLabelText('Task title'),{target:{value:'My unsaved edit'}});
    data={...data,projects:data.projects.map(p=>({...p,tasks:p.tasks.map(t=>({...t,title:'Another administrator edit',version:8}))}))};
    await act(async()=>{await cache.invalidateQueries({queryKey:['workspace']});});
    fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('mutate_task',expect.objectContaining({tid:'task',expected_version:7,action:'edit'})));
    expect((screen.getByLabelText('Task title') as HTMLInputElement).value).toBe('My unsaved edit');
  });
  it('traps mobile navigation focus, closes with Escape and restores focus',async()=>{
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={['/employee']}><Routes><Route path="/employee" element={<AppShell panel="employee" />} /></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
    const trigger=screen.getByRole('button',{name:'Open navigation'});
    fireEvent.click(trigger);
    const dialog=screen.getByRole('dialog',{name:'Navigation menu'});
    const close=within(dialog).getByRole('button',{name:'Close navigation'});
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close,{key:'Tab',shiftKey:true});
    const links=within(dialog).getAllByRole('link');
    expect(document.activeElement).toBe(links.at(-1));
    fireEvent.keyDown(document.activeElement!,{key:'Escape'});
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
  it('creates a project through the existing form only after confirmed backend persistence',async()=>{
    mocks.rpc.mockImplementation(async()=>{
      data={...data,projects:[...data.projects,{...data.projects[0],id:'created-project',name:'New delivery'}]};return 'created-project';
    });
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={['/admin/projects/new']}><Routes><Route path="/admin" element={<AppShell panel="admin" />}><Route path="projects/new" element={<AddProjectForm />} /><Route path="projects/:projectId" element={<p>Persisted project workspace</p>} /></Route></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
    await screen.findByLabelText('Project name');
    fireEvent.change(screen.getByLabelText('Project name'),{target:{value:'New delivery'}});
    fireEvent.change(screen.getByLabelText('Project description'),{target:{value:'Shared delivery'}});
    fireEvent.change(screen.getByLabelText('Start date'),{target:{value:'2026-10-13'}});
    fireEvent.change(screen.getByLabelText('Overall deadline'),{target:{value:'2026-10-30'}});
    fireEvent.change(screen.getByLabelText('Task name'),{target:{value:'First task'}});
    fireEvent.change(screen.getByLabelText('Task description'),{target:{value:'Implement first task'}});
    fireEvent.change(screen.getByLabelText('Assigned employee'),{target:{value:'EMP001'}});
    fireEvent.change(screen.getByLabelText('Assigned date'),{target:{value:'2026-10-13'}});
    fireEvent.change(screen.getByLabelText('Deadline'),{target:{value:'2026-10-20'}});
    fireEvent.click(screen.getByRole('button',{name:'Save Project'}));
    await screen.findByText('Persisted project workspace');
    expect(mocks.rpc).toHaveBeenCalledWith('create_project',expect.objectContaining({payload:expect.objectContaining({name:'New delivery',tasks:expect.arrayContaining([expect.objectContaining({assigneeId:'EMP001',title:'First task'})])})}));
  });
  it('preserves a new employee form when the directory save fails',async()=>{
    mocks.rpc.mockRejectedValue(new Error('The change was not saved.'));
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={['/admin/employees']}><Routes><Route path="/admin" element={<AppShell panel="admin" />}><Route path="employees" element={<EmployeeManagement />} /></Route></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
    await screen.findByText('Engineering Directory');
    fireEvent.click(screen.getByRole('button',{name:'Add Employee'}));
    fireEvent.change(screen.getByLabelText('Employee ID'),{target:{value:'EMP002'}});
    fireEvent.change(screen.getByLabelText('Name'),{target:{value:'New employee'}});
    fireEvent.change(screen.getByLabelText('Email'),{target:{value:'new@example.test'}});
    fireEvent.click(screen.getByRole('button',{name:'Save Employee'}));
    await screen.findByText('The change was not saved.');
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('New employee');
    expect(mocks.rpc).toHaveBeenCalledWith('save_employee',expect.objectContaining({employee_id:null,expected_version:null}));
    expect(screen.queryByText('New employee saved.')).toBeNull();
  });
  it('persists preferences and applies the confirmed theme',async()=>{
    mocks.rpc.mockImplementation(async(_name,args)=>{data={...data,settings:args.payload};return null;});
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ProjectProvider><MemoryRouter initialEntries={['/employee/settings']}><Routes><Route path="/employee" element={<AppShell panel="employee" />}><Route path="settings" element={<SettingsPage />} /></Route></Routes></MemoryRouter></ProjectProvider></QueryClientProvider>);
    await screen.findByLabelText('Display name');
    fireEvent.change(screen.getByLabelText('Display name'),{target:{value:'Updated employee'}});
    fireEvent.change(screen.getByLabelText('Theme preference'),{target:{value:'light'}});
    fireEvent.click(screen.getByRole('button',{name:'Save Settings'}));
    await screen.findByText('Preferences saved.');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(mocks.rpc).toHaveBeenCalledWith('save_preferences',expect.objectContaining({payload:expect.objectContaining({displayName:'Updated employee',theme:'light'})}));
  });
  it('reports a persisted delay and keeps the server-created delay history',async()=>{
    mocks.rpc.mockImplementation(async()=>{
      data={...data,projects:data.projects.map(p=>({...p,tasks:p.tasks.map(t=>({...t,status:'overdue',version:8,delays:[{reason:'Dependency blocked',reportedAt:'2026-10-13T12:00:00Z'}],delay:{reason:'Dependency blocked',reportedAt:'2026-10-13T12:00:00Z'}}))}))};return 'task';
    });
    mount();await screen.findByText('Build workflow');
    fireEvent.change(screen.getByLabelText('Mandatory reason'),{target:{value:'Dependency blocked'}});
    fireEvent.click(screen.getByRole('button',{name:'Report Delay'}));
    await screen.findByText('Delay reason recorded for admin visibility.');
    expect(mocks.rpc).toHaveBeenCalledWith('mutate_task',{tid:'task',expected_version:7,action:'delay',payload:{reason:'Dependency blocked'}});
    expect((screen.getByLabelText('Mandatory reason') as HTMLTextAreaElement).value).toBe('');
  });
});
