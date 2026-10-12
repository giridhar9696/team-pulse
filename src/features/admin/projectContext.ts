import { createContext, useContext } from "react";
import type { EmployeeInput } from "../../data/employeeDirectory";
import type { ProjectTask, TaskStatus, TeamPulseEmployee, TeamPulseProject, TechnologyArea } from "../../data/demoData";

export type CreateProjectInput = {
  name: string;
  description: string;
  startDate: string;
  deadline: string;
  status: TeamPulseProject["status"];
  tasks: Omit<ProjectTask, "id" | "status" | "required">[];
};

export type ProjectContextValue = {
  projects: TeamPulseProject[];
  employees: TeamPulseEmployee[];
  readNotificationIds: string[];
  settings: TeamPulseSettings;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (ids: string[]) => void;
  updateSettings: (settings: Partial<TeamPulseSettings>) => void;
  createEmployee: (input: EmployeeInput) => TeamPulseEmployee | null;
  updateEmployee: (employeeId: string, input: EmployeeInput) => TeamPulseEmployee | null;
  setEmployeeStatus: (employeeId: string, status: TeamPulseEmployee["status"]) => TeamPulseEmployee | null;
  resetEmployeePassword: (employeeId: string) => TeamPulseEmployee | null;
  updateEmployeePassword: (employeeId: string, password: string) => TeamPulseEmployee | null;
  createProject: (input: CreateProjectInput) => TeamPulseProject;
  createTask: (input: TaskMutationInput) => ProjectTask;
  updateTask: (taskId: string, input: TaskMutationInput) => ProjectTask | null;
  reassignTask: (taskId: string, assigneeId: string) => ProjectTask | null;
  submitTask: (taskId: string, input: { url: string; note: string }) => ProjectTask | null;
  reportDelay: (taskId: string, reason: string) => ProjectTask | null;
  approveTask: (taskId: string, feedback: string) => ProjectTask | null;
  requestChanges: (taskId: string, feedback: string) => ProjectTask | null;
  cancelTask: (taskId: string) => ProjectTask | null;
};

export type TeamPulseSettings = {
  displayName: string;
  email: string;
  password: string;
  notificationDigest: boolean;
  deadlineAlerts: boolean;
  dateFormat: "iso" | "friendly";
  theme: "dark" | "light" | "system";
};

export type TaskMutationInput = {
  projectId: string;
  title: string;
  description: string;
  technology: TechnologyArea;
  assigneeId: string;
  assignedDate: string;
  deadline: string;
  status: TaskStatus;
  required: boolean;
};

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within ProjectProvider");
  }
  return context;
}
