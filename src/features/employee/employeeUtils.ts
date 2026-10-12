import { employees as defaultEmployees, type TeamPulseEmployee, type TeamPulseProject } from "../../data/demoData";
import { getProjectProgress } from "../admin/projectMetrics";
import { getTaskRecords, isTaskOverdue, type TaskRecord } from "../admin/taskUtils";

export function getEmployeeTasks(projects: TeamPulseProject[], employeeId: string, employees: TeamPulseEmployee[] = defaultEmployees) {
  return getTaskRecords(projects, employees).filter((task) => task.assigneeId === employeeId);
}

export function getEmployeeProjects(projects: TeamPulseProject[], employeeId: string) {
  return projects
    .map((project) => ({
      ...project,
      progress: getProjectProgress(project),
      tasks: project.tasks.filter((task) => task.assigneeId === employeeId),
    }))
    .filter((project) => project.tasks.length > 0);
}

export function getEmployeeTaskMetrics(tasks: TaskRecord[]) {
  return {
    assigned: tasks.length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    awaitingReview: tasks.filter((task) => task.status === "submitted" || task.status === "review").length,
    changesRequested: tasks.filter((task) => task.status === "changes_requested").length,
    completed: tasks.filter((task) => task.status === "approved").length,
    overdue: tasks.filter((task) => task.status === "overdue" || isTaskOverdue(task)).length,
  };
}

export function canEmployeeSubmit(task: Pick<TaskRecord, "status">) {
  return task.status !== "approved" && task.status !== "cancelled";
}

export function isValidSubmissionUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
