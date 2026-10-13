import { z } from 'zod';
import { requireSupabase } from '../lib/supabase';
import type { AppUser } from '../features/auth/authService';
import { getDerivedProjectStatus } from '../features/admin/projectMetrics';
import type { ProjectTask, TeamPulseEmployee, TeamPulseProject } from './types';
import type { TeamPulseSettings } from '../features/admin/projectContext';
import type { ActivityRecord, AppNotification } from '../features/operations/operationsUtils';
import { isValidSubmissionUrl } from '../features/employee/employeeUtils';
import { organizationDate } from '../lib/validation';

const memberSchema = z.object({id:z.string(),name:z.string(),email:z.string(),job_title:z.string(),role:z.enum(['admin','employee']),status:z.enum(['active','inactive','frozen']),velocity:z.number(),version:z.number(),user_id:z.string().nullable()});
const projectSchema = z.object({id:z.string(),name:z.string(),description:z.string(),owner_id:z.string(),start_date:z.string(),deadline:z.string()});
const taskSchema = z.object({id:z.string(),project_id:z.string(),title:z.string(),description:z.string(),technology:z.enum(['Frontend','Backend','Database']),assignee_id:z.string(),assigned_date:z.string(),deadline:z.string(),status:z.enum(['pending','in_progress','submitted','review','changes_requested','approved','overdue','cancelled']),required:z.boolean(),version:z.number()});
const submissionSchema = z.object({id:z.string(),task_id:z.string(),url:z.string().url().refine(isValidSubmissionUrl),note:z.string(),created_at:z.string()});
const reviewSchema = z.object({id:z.string(),task_id:z.string(),decision:z.enum(['approved','changes_requested']),feedback:z.string(),created_at:z.string()});
const delaySchema = z.object({id:z.string(),task_id:z.string(),reason:z.string(),created_at:z.string()});
const eventSchema = z.object({id:z.string(),project_id:z.string().nullable(),task_id:z.string().nullable(),message:z.string(),created_at:z.string()});
const notificationSchema = z.object({id:z.string(),task_id:z.string().nullable(),project_id:z.string().nullable(),category:z.enum(['task','deadline','submission','review','project','employee','settings']),title:z.string(),message:z.string(),created_at:z.string(),read_at:z.string().nullable()});
const preferencesSchema = z.object({notification_digest:z.boolean(),deadline_alerts:z.boolean(),date_format:z.enum(['iso','friendly']),theme:z.enum(['dark','light','system'])});
const summarySchema=z.object({project_id:z.string(),progress:z.number().int().min(0).max(100),status:z.enum(['Active','At Risk','Review','Completed'])});
const organizationSchema=z.object({id:z.string(),time_zone:z.string()});

export const defaultSettings: TeamPulseSettings = {displayName:'',email:'',notificationDigest:true,deadlineAlerts:true,dateFormat:'iso',theme:'dark'};
export type Workspace = {projects:TeamPulseProject[];employees:TeamPulseEmployee[];notifications:AppNotification[];activity:ActivityRecord[];readNotificationIds:string[];settings:TeamPulseSettings;timeZone:string};
export const emptyWorkspace: Workspace = {projects:[],employees:[],notifications:[],activity:[],readNotificationIds:[],settings:defaultSettings,timeZone:'Asia/Kolkata'};

async function readRows<T>(table: string, schema: z.ZodType<T>, signal: AbortSignal): Promise<T[]> {
  const rows: T[] = [];
  for (let offset=0; ; offset+=500) {
    const client=requireSupabase();
    const request=table==='project_summaries' ? client.rpc(table,{}) : client.from(table).select('*');
    const {data,error} = await request.order(table==='user_preferences' ? 'user_id' : table==='project_summaries' ? 'project_id' : 'id').range(offset,offset+499).abortSignal(signal);
    if (error) throw new Error('Unable to load workspace data. Please retry.');
    const page = z.array(schema).parse(data);
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

export async function loadWorkspace(user: AppUser, signal: AbortSignal): Promise<Workspace> {
  await rpc('sync_deadlines',{});
  const [members,projectRows,tasks,submissions,reviews,delays,events,notices,prefs,summaryRows,organizations] = await Promise.all([
    readRows('memberships',memberSchema,signal),readRows('projects',projectSchema,signal),readRows('tasks',taskSchema,signal),
    readRows('submissions',submissionSchema,signal),readRows('reviews',reviewSchema,signal),readRows('delays',delaySchema,signal),
    readRows('activity_events',eventSchema,signal),readRows('notifications',notificationSchema,signal),readRows('user_preferences',preferencesSchema,signal),
    readRows('project_summaries',summarySchema,signal),
    readRows('organizations',organizationSchema,signal),
  ]);
  const organization=organizations.find(o=>o.id===user.organizationId);
  if (!organization) throw new Error('Unable to verify organization configuration.');
  const timeZone=organization.time_zone;
  const today=organizationDate(new Date().toISOString(),timeZone);
  const summaries=summaryRows;
  const byNewest = <T extends {created_at:string,id:string}>(items:T[]) => items.sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
  const employees: TeamPulseEmployee[] = members.map(m=>({id:m.id,name:m.name,email:m.email,role:m.job_title,status:m.status,velocity:m.velocity,version:m.version,linked:Boolean(m.user_id),accessRole:m.role}));
  const projects: TeamPulseProject[] = projectRows.map(p=>{
    const projectTasks:ProjectTask[] = tasks.filter(t=>t.project_id===p.id).map(t=>{
      const taskSubmissions=byNewest(submissions.filter(s=>s.task_id===t.id)).map(s=>({id:s.id,url:s.url,note:s.note,submittedAt:s.created_at}));
      const taskReviews=byNewest(reviews.filter(r=>r.task_id===t.id));
      const taskDelays=byNewest(delays.filter(d=>d.task_id===t.id)).map(d=>({reason:d.reason,reportedAt:d.created_at}));
      return {id:t.id,version:t.version,title:t.title,description:t.description,technology:t.technology,assigneeId:t.assignee_id,assignedDate:t.assigned_date,deadline:t.deadline,status:t.status,required:t.required,overdue:!['approved','cancelled'].includes(t.status)&&t.deadline<today,
        submissions:taskSubmissions,submission:taskSubmissions[0],review:taskReviews[0] ? {decision:taskReviews[0].decision,feedback:taskReviews[0].feedback,reviewedAt:taskReviews[0].created_at,reviewedOn:organizationDate(taskReviews[0].created_at,timeZone)} : undefined,
        delays:taskDelays,delay:taskDelays[0],history:byNewest(events.filter(e=>e.task_id===t.id)).map(e=>({id:e.id,at:e.created_at,message:e.message}))};
    });
    const summary=summaries.find(s=>s.project_id===p.id);
    if (!summary) throw new Error('Unable to verify project totals. Refresh and retry.');
    const project:TeamPulseProject={id:p.id,name:p.name,description:p.description,ownerId:p.owner_id,startDate:p.start_date,deadline:p.deadline,status:summary.status,summary:{progress:summary.progress,status:summary.status},tasks:projectTasks,
      activity:byNewest(events.filter(e=>e.project_id===p.id)).map(e=>({id:e.id,at:e.created_at,message:e.message})),notifications:[]};
    project.status=getDerivedProjectStatus(project);
    return project;
  });
  const notifications:AppNotification[]=byNewest(notices).filter(n=>n.category!=='deadline'||prefs[0]?.deadline_alerts!==false).map(n=>({id:n.id,category:n.category,title:n.title,message:n.message,at:n.created_at,audience:user.role,
    urgent:n.category==='deadline'&&tasks.some(t=>t.id===n.task_id&&!['approved','cancelled'].includes(t.status)&&t.deadline<=today),
    to:n.task_id ? `/${user.role}/tasks/${n.task_id}` : n.project_id ? user.role==='admin' ? `/admin/projects/${n.project_id}` : '/employee/projects' : n.category==='employee' && user.role==='admin' ? '/admin/employees' : `/${user.role}/notifications`}));
  const activity:ActivityRecord[]=byNewest(events).map(e=>({id:e.id,action:e.message.split('.')[0],description:e.message,at:e.created_at,day:organizationDate(e.created_at,timeZone),projectId:e.project_id??undefined,taskId:e.task_id??undefined,
    projectName:projects.find(p=>p.id===e.project_id)?.name,employeeId:tasks.find(t=>t.id===e.task_id)?.assignee_id,
    to:e.task_id ? `/${user.role}/tasks/${e.task_id}` : e.project_id && user.role==='admin' ? `/admin/projects/${e.project_id}` : `/${user.role}/activity`}));
  const preference=prefs[0];
  return {projects,employees,notifications,activity,timeZone,readNotificationIds:notices.filter(n=>n.read_at).map(n=>n.id),settings:{...defaultSettings,displayName:user.name,email:user.email,
    ...(preference ? {notificationDigest:preference.notification_digest,deadlineAlerts:preference.deadline_alerts,dateFormat:preference.date_format,theme:preference.theme} : {})}};
}

export async function rpc<T>(name:string,args:Record<string,unknown>):Promise<T> {
  const {data,error}=await requireSupabase().rpc(name,args);
  if (error) {
    if (error.code==='40001') throw new Error('This record changed. Refresh and retry.');
    if (error.code==='42501') throw new Error('You no longer have permission for this action.');
    throw new Error('The change was not saved. Check the input and retry.');
  }
  return data as T;
}
