import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadWorkspace, emptyWorkspace, rpc } from '../../data/workspace';
import type { EmployeeInput } from '../../data/employeeDirectory';
import { requireSupabase } from '../../lib/supabase';
import { useAuth } from '../auth/authContext';
import { ProjectContext, type ProjectContextValue } from './projectContext';

export function ProjectProvider({ children }: {children:ReactNode}) {
  const {user,refreshUser}=useAuth();
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const inFlight=useRef(false);
  const query=useQuery({queryKey:['workspace',user?.id,user?.organizationId,user?.role,user?.identifier],enabled:Boolean(user),refetchInterval:60000,queryFn:({signal})=>loadWorkspace(user!,signal)});
  const data=user ? query.data ?? emptyWorkspace : emptyWorkspace;
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-color-scheme: light)');
    const apply=()=>{document.documentElement.dataset.theme=data.settings.theme==='system' ? preference.matches ? 'light' : 'dark' : data.settings.theme;};
    apply();preference.addEventListener('change',apply);
    return ()=>preference.removeEventListener('change',apply);
  },[data.settings.theme]);
  useEffect(()=>{setError(null);},[user?.id]);
  async function refresh() { await query.refetch(); }
  async function save<T,R>(operation:()=>Promise<T>,after:(result:T,fresh:typeof data)=>R):Promise<R|null> {
    if (inFlight.current) return null;
    inFlight.current=true;setBusy(true);setError(null);
    let persisted=false;
    try {
      const result=await operation(); persisted=true;
      const snapshot=await query.refetch();
      if (snapshot.error || !snapshot.data) throw new Error('Saved, but workspace refresh failed. Refresh before making further changes.');
      return after(result,snapshot.data);
    } catch (failure) {
      setError(persisted ? 'Saved, but workspace refresh failed. Refresh before making further changes.' : failure instanceof Error ? failure.message : 'The change was not saved. Please retry.');
      return null;
    } finally {inFlight.current=false;setBusy(false);}
  }
  function taskAction(tid:string,action:string,payload:object={},expectedVersion?:number) {
    const task=data.projects.flatMap(p=>p.tasks).find(t=>t.id===tid);
    if (!task) return Promise.resolve(null);
    return save(()=>rpc<string>('mutate_task',{tid,expected_version:expectedVersion??task.version,action,payload:action==='submit' ? {...payload,url:new URL((payload as {url:string}).url).href} : payload}),
      (id,fresh)=>fresh.projects.flatMap(p=>p.tasks).find(t=>t.id===id)??null);
  }
  function employeeAction(id:string|null,input:EmployeeInput,expectedVersion?:number) {
    const target=data.employees.find(e=>e.id===id);
    return save(()=>rpc<string>('save_employee',{employee_id:id,expected_version:expectedVersion??target?.version??null,payload:input}),
      (code,fresh)=>fresh.employees.find(e=>e.id===code)??null);
  }
  function accountAction(employeeId:string,action:'invite'|'recover') {
    return save(async()=>{
      const {data:result,error:requestError}=await requireSupabase().functions.invoke('manage-account',{body:{employeeId,action,redirectOrigin:window.location.origin}});
      if (requestError || !result?.ok) throw new Error('Account request failed. Ask your administrator to verify email configuration and retry.');
      return true;
    },()=>true).then(Boolean);
  }
  const value:ProjectContextValue={...data,loading:Boolean(user)&&query.isPending,busy,error:error??(query.error ? 'Unable to load workspace data. Please retry.' : null),loadError:query.isError,hasData:Boolean(query.data),refresh,dismissError:()=>setError(null),
    createEmployee:input=>employeeAction(null,input),updateEmployee:(id,input,version)=>employeeAction(id,input,version),
    setEmployeeStatus:(id,status,version)=>{const employee=data.employees.find(e=>e.id===id);return employee ? employeeAction(id,{...employee,status},version) : Promise.resolve(null);},
    resetEmployeePassword:id=>accountAction(id,'recover'),inviteEmployee:id=>accountAction(id,'invite'),
    createProject:input=>save(()=>rpc<string>('create_project',{payload:input}),(id,fresh)=>fresh.projects.find(p=>p.id===id)??null),
    createTask:input=>save(()=>rpc<string>('create_task',{payload:input}),(id,fresh)=>fresh.projects.flatMap(p=>p.tasks).find(t=>t.id===id)??null),
    updateTask:(id,input,version)=>taskAction(id,'edit',input,version),reassignTask:(id,assigneeId)=>taskAction(id,'reassign',{assigneeId}),submitTask:(id,input)=>taskAction(id,'submit',input),reportDelay:(id,reason)=>taskAction(id,'delay',{reason}),
    approveTask:(id,feedback)=>taskAction(id,'approve',{feedback}),requestChanges:(id,feedback)=>taskAction(id,'changes',{feedback}),cancelTask:id=>taskAction(id,'cancel'),
    markNotificationRead:id=>save(()=>rpc('read_notifications',{ids:[id]}),()=>true).then(Boolean),
    markAllNotificationsRead:ids=>save(()=>rpc('read_notifications',{ids:ids.length>1000 ? null : ids}),()=>true).then(Boolean),
    updateSettings:settings=>save(async()=>{await rpc('save_preferences',{payload:settings});await refreshUser();return true;},()=>true).then(Boolean),
  };
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
