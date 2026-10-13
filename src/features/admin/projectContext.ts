import { createContext, useContext } from 'react';
import type { EmployeeInput } from '../../data/employeeDirectory';
import type { ProjectTask, TaskStatus, TeamPulseEmployee, TeamPulseProject, TechnologyArea } from '../../data/types';
import type { ActivityRecord, AppNotification } from '../operations/operationsUtils';

export type CreateProjectInput = { name:string;description:string;startDate:string;deadline:string;status:TeamPulseProject['status'];tasks:Omit<ProjectTask,'id'|'version'|'status'|'required'>[] };
export type TeamPulseSettings = {displayName:string;email:string;notificationDigest:boolean;deadlineAlerts:boolean;dateFormat:'iso'|'friendly';theme:'dark'|'light'|'system'};
export type TaskMutationInput = {projectId:string;title:string;description:string;technology:TechnologyArea;assigneeId:string;assignedDate:string;deadline:string;status:TaskStatus;required:boolean};
export type ProjectContextValue = {
  projects:TeamPulseProject[];employees:TeamPulseEmployee[];notifications:AppNotification[];activity:ActivityRecord[];readNotificationIds:string[];settings:TeamPulseSettings;timeZone:string;
  loading:boolean;busy:boolean;error:string|null;loadError:boolean;hasData:boolean;refresh:()=>Promise<void>;dismissError:()=>void;
  markNotificationRead:(id:string)=>Promise<boolean>;
  markAllNotificationsRead:(ids:string[])=>Promise<boolean>;
  updateSettings:(settings:TeamPulseSettings)=>Promise<boolean>;
  createEmployee:(input:EmployeeInput)=>Promise<TeamPulseEmployee|null>;
  updateEmployee:(employeeId:string,input:EmployeeInput,expectedVersion:number)=>Promise<TeamPulseEmployee|null>;
  setEmployeeStatus:(employeeId:string,status:TeamPulseEmployee['status'],expectedVersion:number)=>Promise<TeamPulseEmployee|null>;
  resetEmployeePassword:(employeeId:string)=>Promise<boolean>;
  inviteEmployee:(employeeId:string)=>Promise<boolean>;
  createProject:(input:CreateProjectInput)=>Promise<TeamPulseProject|null>;
  createTask:(input:TaskMutationInput)=>Promise<ProjectTask|null>;
  updateTask:(taskId:string,input:TaskMutationInput,expectedVersion:number)=>Promise<ProjectTask|null>;
  reassignTask:(taskId:string,assigneeId:string)=>Promise<ProjectTask|null>;
  submitTask:(taskId:string,input:{url:string;note:string})=>Promise<ProjectTask|null>;
  reportDelay:(taskId:string,reason:string)=>Promise<ProjectTask|null>;
  approveTask:(taskId:string,feedback:string)=>Promise<ProjectTask|null>;
  requestChanges:(taskId:string,feedback:string)=>Promise<ProjectTask|null>;
  cancelTask:(taskId:string)=>Promise<ProjectTask|null>;
};
export const ProjectContext=createContext<ProjectContextValue|null>(null);
export function useProjects() {
  const context=useContext(ProjectContext);
  if (!context) throw new Error('useProjects must be used within ProjectProvider');
  return context;
}
