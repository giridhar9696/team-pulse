import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWorkspace, rpc } from '../src/data/workspace';
import type { AppUser } from '../src/features/auth/authService';

const mock=vi.hoisted(()=>({rows:{} as Record<string,object[]>,errorTable:'',calls:[] as {table:string,from:number,to:number,signal:AbortSignal}[],rpcError:null as null|{code:string}}));
// Keep the chain faithful to the Data API: table reads call select before ordering/range.
vi.mock('../src/lib/supabase',()=>{
  function query(table:string) {
    let from=0,to=499;
    const builder={select:()=>builder,order:()=>builder,range:(start:number,end:number)=>{from=start;to=end;return builder;},abortSignal:async(signal:AbortSignal)=>{
      mock.calls.push({table,from,to,signal});
      return {data:(mock.rows[table]??[]).slice(from,to+1),error:mock.errorTable===table?{code:'network'}:null};
    }};
    return builder;
  }
  return {requireSupabase:()=>({from:query,rpc:(name:string)=>name==='project_summaries'?query(name):Promise.resolve({data:null,error:mock.rpcError})})};
});
const user:AppUser={id:'user',organizationId:'org',role:'employee',name:'Employee',identifier:'EMP001',email:'employee@example.test'};
const at='2026-10-13T12:00:00Z';
beforeEach(()=>{
  mock.errorTable='';mock.calls=[];mock.rpcError=null;
  mock.rows={
    organizations:[{id:'org',time_zone:'Asia/Kolkata'}],
    memberships:[{id:'EMP001',name:'Employee',email:user.email,job_title:'Engineer',role:'employee',status:'active',velocity:0,version:1,user_id:'user'}],
    projects:[{id:'project',name:'Delivery',description:'Shared project',owner_id:'ADMIN',start_date:'2026-01-01',deadline:'2099-12-31'}],
    tasks:[{id:'task',project_id:'project',title:'Assigned work',description:'Task',technology:'Frontend',assignee_id:'EMP001',assigned_date:'2026-01-01',deadline:'2099-12-31',status:'approved',required:true,version:4}],
    submissions:[{id:'submission',task_id:'task',url:'https://example.test/work',note:'Done',created_at:at}],
    reviews:[{id:'review',task_id:'task',decision:'approved',feedback:'Approved',created_at:at}],
    delays:[],activity_events:[{id:'event',task_id:'task',project_id:'project',message:'Task approved.',created_at:at}],
    notifications:[{id:'notice',task_id:'task',project_id:'project',category:'review',title:'Approved',message:'Task approved',created_at:at,read_at:at}],
    user_preferences:[{notification_digest:false,deadline_alerts:true,date_format:'friendly',theme:'light'}],
    project_summaries:[{project_id:'project',progress:50,status:'Active'}],
  };
});
describe('database workspace adapter',()=>{
  it('maps persisted histories, private notices and server project totals into the existing UI model',async()=>{
    const result=await loadWorkspace(user,new AbortController().signal);
    expect(result.projects[0].summary?.progress).toBe(50);
    expect(result.projects[0].tasks[0].submissions).toHaveLength(1);
    expect(result.projects[0].tasks[0].review?.decision).toBe('approved');
    expect(result.notifications[0].to).toBe('/employee/tasks/task');
    expect(result.readNotificationIds).toEqual(['notice']);
    expect(result.settings.theme).toBe('light');
    expect(result.employees[0].linked).toBe(true);
  });
  it('normalizes review dates to the organization day for accurate completion reporting',async()=>{
    mock.rows.reviews=[{...mock.rows.reviews[0],created_at:'2026-10-13T19:00:00Z'}];
    const result=await loadWorkspace(user,new AbortController().signal);
    expect(result.projects[0].tasks[0].review?.reviewedOn).toBe('2026-10-14');
    expect(result.timeZone).toBe('Asia/Kolkata');
  });
  it('reads beyond the default API row cap and propagates cancellation to each page',async()=>{
    mock.rows.notifications=Array.from({length:1001},(_,i)=>({...mock.rows.notifications[0],id:`notice-${i}`}));
    const signal=new AbortController().signal;
    const result=await loadWorkspace(user,signal);
    expect(result.notifications).toHaveLength(1001);
    expect(mock.calls.filter(c=>c.table==='notifications').map(c=>[c.from,c.to])).toEqual([[0,499],[500,999],[1000,1499]]);
    expect(mock.calls.every(c=>c.signal===signal)).toBe(true);
  });
  it('fails visibly instead of returning prototype data when backend reads fail',async()=>{
    mock.errorTable='tasks';
    await expect(loadWorkspace(user,new AbortController().signal)).rejects.toThrow(/Unable to load/);
  });
  it('rejects unsafe stored links and incomplete project summary responses',async()=>{
    mock.rows.submissions=[{...mock.rows.submissions[0],url:'javascript:alert(1)'}];
    await expect(loadWorkspace(user,new AbortController().signal)).rejects.toThrow();
    mock.rows.submissions=[];mock.rows.project_summaries=[];
    await expect(loadWorkspace(user,new AbortController().signal)).rejects.toThrow(/project totals/);
  });
  it('reports stale writes and lost authorization without leaking database diagnostics',async()=>{
    mock.rpcError={code:'40001'};await expect(rpc('mutate_task',{})).rejects.toThrow(/changed/);
    mock.rpcError={code:'42501'};await expect(rpc('mutate_task',{})).rejects.toThrow(/permission/);
  });
});
