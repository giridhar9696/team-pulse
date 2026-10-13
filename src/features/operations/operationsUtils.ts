import type { AppUser } from "../auth/authService";
import type { TeamPulseEmployee, TeamPulseProject } from "../../data/types";
import { getTaskRecords, statusLabel } from "../admin/taskUtils";

export type NotificationCategory =
  | "task"
  | "deadline"
  | "submission"
  | "review"
  | "project"
  | "employee"
  | "settings";

export type AppNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  at: string;
  to: string;
  audience: "admin" | "employee";
  urgent?: boolean;
  employeeId?: string;
};

export type ActivityRecord = {
  id: string;
  action: string;
  description: string;
  at: string;
  to: string;
  projectId?: string;
  projectName?: string;
  employeeId?: string;
  taskId?: string;
  day?: string;
};

export function getVisibleTasks(projects: TeamPulseProject[], employees: TeamPulseEmployee[], user: AppUser | null) {
  if (!user) return [];
  const tasks = getTaskRecords(projects, employees);
  return user.role === 'employee' ? tasks.filter(task => task.assigneeId === user.identifier) : tasks;
}
export function getSearchResults(projects: TeamPulseProject[], employees: TeamPulseEmployee[], notifications: AppNotification[], user: AppUser | null, query: string) {
  const q = query.trim().toLowerCase();
  if (!user || !q) return { projects: [], tasks: [], employees: [], notifications: [] };
  const visibleProjects = projects.filter((project) => user?.role === "admin" || project.tasks.some((task) => task.assigneeId === user?.identifier));
  const visibleTasks = getVisibleTasks(projects, employees, user);
  return {
    projects: visibleProjects.filter((project) => `${project.id} ${project.name} ${project.description}`.toLowerCase().includes(q)),
    tasks: visibleTasks.filter((task) => `${task.id} ${task.title} ${task.description} ${task.projectName} ${statusLabel(task.status)}`.toLowerCase().includes(q)),
    employees: user?.role === "admin" ? employees.filter((employee) => `${employee.id} ${employee.name} ${employee.email} ${employee.role}`.toLowerCase().includes(q)) : [],
    notifications: notifications.filter((notification) => `${notification.title} ${notification.message}`.toLowerCase().includes(q)),
  };
}
