import type { ProjectTask, TaskStatus, TeamPulseProject } from "../../data/types";
import { isTaskOverdue } from './taskUtils';

const completeStatuses: TaskStatus[] = ["approved"];
const activeStatuses: TaskStatus[] = ["pending", "in_progress", "submitted", "review", "changes_requested", "overdue"];

export type TaskWithProject = ProjectTask & {
  projectId: string;
  projectName: string;
};

export function getRequiredTasks(project: TeamPulseProject) {
  return project.tasks.filter((task) => task.required);
}

export function getProjectProgress(project: TeamPulseProject) {
  if (project.summary) return project.summary.progress;
  const requiredTasks = getRequiredTasks(project).filter((task) => task.status !== "cancelled");
  if (requiredTasks.length === 0) {
    return 0;
  }

  const approved = requiredTasks.filter((task) => completeStatuses.includes(task.status)).length;
  return Math.round((approved / requiredTasks.length) * 100);
}

export function getDerivedProjectStatus(project: TeamPulseProject): TeamPulseProject['status'] {
  if (project.summary) return project.summary.status;
  const requiredTasks = getRequiredTasks(project).filter((task) => task.status !== "cancelled");
  if (requiredTasks.length > 0 && requiredTasks.every((task) => task.status === "approved")) {
    return "Completed";
  }
  if (requiredTasks.some((task) => task.status === "overdue" || isTaskOverdue(task))) {
    return "At Risk";
  }
  if (requiredTasks.some((task) => task.status === "submitted" || task.status === "review" || task.status === "changes_requested")) {
    return "Review";
  }
  return "Active";
}

export function getTasksByStatus(projects: TeamPulseProject[], statuses: TaskStatus[]): TaskWithProject[] {
  return projects.flatMap((project) =>
    project.tasks
      .filter((task) => statuses.includes(task.status))
      .map((task) => ({ ...task, projectId: project.id, projectName: project.name })),
  );
}

export function getDashboardStats(projects: TeamPulseProject[]) {
  const tasks = projects.flatMap((project) => project.tasks);
  const approved = tasks.filter((task) => task.status === "approved").length;
  const pending = tasks.filter((task) => activeStatuses.includes(task.status)).length;
  const overdue = tasks.filter((task) => task.status === "overdue" || isTaskOverdue(task)).length;

  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => getDerivedProjectStatus(project) !== "Completed").length,
    totalTasks: tasks.length,
    approvedTasks: approved,
    pendingTasks: pending,
    overdueTasks: overdue,
  };
}
