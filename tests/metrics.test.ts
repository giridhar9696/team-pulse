import { describe, expect, it } from 'vitest';
import { buildCalendarDays, moveCalendarMonth } from '../src/features/calendar/calendarUtils';
import { getDashboardStats, getDerivedProjectStatus, getProjectProgress } from '../src/features/admin/projectMetrics';
import { getEmployeeMetrics } from '../src/features/admin/employeeMetrics';
import { getEmployeeProjects, getEmployeeTaskMetrics, getEmployeeTasks } from '../src/features/employee/employeeUtils';
import { getSearchResults } from '../src/features/operations/operationsUtils';
import type { ProjectTask, TeamPulseProject } from '../src/data/types';

const pending:ProjectTask={id:'pending',version:1,title:'Work',description:'Task',technology:'Frontend',assigneeId:'EMP001',assignedDate:'2020-01-01',deadline:'2099-12-31',status:'pending',required:true};
const approved:ProjectTask={...pending,id:'approved',status:'approved',review:{decision:'approved',reviewedAt:'2026-10-13',feedback:'Approved'}};
const project:TeamPulseProject={id:'project',name:'Delivery',description:'Project',ownerId:'EMP001',startDate:'2020-01-01',deadline:'2099-12-31',status:'Active',tasks:[pending,approved],activity:[],notifications:[]};
const employee={id:'EMP001',name:'Employee',email:'employee@example.test',role:'Engineer',status:'active' as const,version:1,linked:true,accessRole:'employee' as const,velocity:0};
describe('lifecycle metrics and scoped search',()=>{
  it('counts only approved required work and excludes cancelled optional work',()=>{
    expect(getProjectProgress({...project,tasks:[pending,approved,{...pending,id:'cancelled',status:'cancelled'},{...pending,id:'optional',required:false}]})).toBe(50);
    expect(getProjectProgress({...project,tasks:[]})).toBe(0);
    expect(getDerivedProjectStatus({...project,tasks:[approved]})).toBe('Completed');
    expect(getDerivedProjectStatus({...project,tasks:[{...pending,status:'submitted'}]})).toBe('Review');
    expect(getDerivedProjectStatus({...project,tasks:[{...pending,deadline:'2020-01-02'}]})).toBe('At Risk');
    expect(getDerivedProjectStatus(project)).toBe('Active');
  });
  it('uses authorized global project totals rather than employee-visible task counts',()=>{
    expect(getProjectProgress({...project,tasks:[approved],summary:{progress:25,status:'Review'}})).toBe(25);
    expect(getDerivedProjectStatus({...project,summary:{progress:25,status:'Review'}})).toBe('Review');
  });
  it('keeps dashboard, employee and task metrics consistent for overdue and approved states',()=>{
    const projects=[{...project,tasks:[approved,{...pending,deadline:'2020-01-02'},{...pending,id:'delay',status:'overdue' as const}]}];
    expect(getDashboardStats(projects)).toMatchObject({totalTasks:3,approvedTasks:1,pendingTasks:2,overdueTasks:2});
    expect(getEmployeeMetrics(employee,projects)).toMatchObject({assigned:3,completed:1,pending:2,overdue:2,onTime:1});
    expect(getEmployeeTaskMetrics(getEmployeeTasks(projects,employee.id,[employee]))).toMatchObject({assigned:3,completed:1,overdue:2});
  });
  it('scopes employee tasks/projects/search and rejects unauthenticated task visibility',()=>{
    const projects=[{...project,tasks:[pending,{...approved,assigneeId:'OTHER'}]}];
    const user={id:'user',organizationId:'org',role:'employee' as const,name:employee.name,identifier:employee.id,email:employee.email};
    expect(getEmployeeTasks(projects,employee.id,[employee])).toHaveLength(1);
    expect(getEmployeeProjects(projects,employee.id)[0].tasks).toHaveLength(1);
    const result=getSearchResults(projects,[employee],[],user,'Work');
    expect(result.tasks).toHaveLength(1);expect(result.employees).toEqual([]);
    expect(getSearchResults(projects,[employee],[],null,'Work').tasks).toEqual([]);
    expect(getSearchResults(projects,[employee],[],user,'').tasks).toEqual([]);
  });
});
describe('date-only calendar boundaries',()=>{
  it('aligns month/week grids to Monday without local-time ISO shifts',()=>{
    const month=buildCalendarDays('2026-10-13','month');
    expect(month).toHaveLength(42);expect(month[0]).toBe('2026-09-28');expect(month).toContain('2026-10-01');
    expect(buildCalendarDays('2026-10-13','week')[0]).toBe('2026-10-12');
    expect(buildCalendarDays('2026-10-13','day')).toEqual(['2026-10-13']);
  });
  it('moves by real calendar months across short months and year boundaries',()=>{
    expect(moveCalendarMonth('2026-01-31',1)).toBe('2026-02-01');
    expect(moveCalendarMonth('2026-12-31',1)).toBe('2027-01-01');
    expect(moveCalendarMonth('2026-01-31',-1)).toBe('2025-12-01');
  });
});
