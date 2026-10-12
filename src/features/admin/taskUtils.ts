import { employees as defaultEmployees, type ProjectTask, type TeamPulseEmployee, type TeamPulseProject } from "../../data/demoData";

export type TaskRecord = ProjectTask & {
  projectId: string;
  projectName: string;
  assigneeName: string;
  assigneeRole: string;
};

export function getTaskRecords(projects: TeamPulseProject[], employees: TeamPulseEmployee[] = defaultEmployees): TaskRecord[] {
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
  return task.status !== "approved" && task.status !== "cancelled" && task.deadline < "2026-10-12";
}
