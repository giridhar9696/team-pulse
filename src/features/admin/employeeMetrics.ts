import type { TeamPulseEmployee, TeamPulseProject } from "../../data/demoData";
import { isTaskOverdue } from "./taskUtils";

export function getEmployeeMetrics(employee: TeamPulseEmployee, projects: TeamPulseProject[]) {
  const tasks = projects.flatMap((project) => project.tasks.filter((task) => task.assigneeId === employee.id));
  const completed = tasks.filter((task) => task.status === "approved");
  const pending = tasks.filter((task) => ["pending", "in_progress", "submitted", "review", "changes_requested"].includes(task.status));
  const overdue = tasks.filter((task) => task.status === "overdue" || isTaskOverdue(task));
  const onTime = completed.filter((task) => !task.review || task.review.reviewedAt.slice(0, 10) <= task.deadline).length;
  const late = completed.length - onTime;

  return {
    assigned: tasks.length,
    completed: completed.length,
    pending: pending.length,
    overdue: overdue.length,
    onTime,
    late,
    tasks,
  };
}
