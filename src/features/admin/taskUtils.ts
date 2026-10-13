import type { ProjectTask, TeamPulseEmployee, TeamPulseProject } from "../../data/types";
import { todayDate } from '../../lib/validation';

export type TaskRecord = ProjectTask & {
  projectId: string;
  projectName: string;
  assigneeName: string;
  assigneeRole: string;
};

export function getTaskRecords(projects: TeamPulseProject[], employees: TeamPulseEmployee[] = []): TaskRecord[] {
  return projects.flatMap((project) =>
    project.tasks.map((task) => {
      const employee = employees.find((item) => item.id === task.assigneeId);
      return {
        ...task,
        projectId: project.id,
        projectName: project.name,
        assigneeName: employee?.name ?? task.assigneeId,
        assigneeRole: employee?.role ?? "Unassigned",
      };
    }),
  );
}

export function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isTaskOverdue(task: ProjectTask) {
  return task.status !== "approved" && task.status !== "cancelled" && (task.overdue ?? task.deadline < todayDate());
}
