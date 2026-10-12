import type { DemoUser } from "../auth/authService";
import type { TeamPulseEmployee, TeamPulseProject } from "../../data/demoData";
import { getTaskRecords, isTaskOverdue, statusLabel } from "../admin/taskUtils";

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
};

export function getVisibleTasks(projects: TeamPulseProject[], employees: TeamPulseEmployee[], user: DemoUser | null) {
  const tasks = getTaskRecords(projects, employees);
  if (user?.role === "employee") return tasks.filter((task) => task.assigneeId === user.identifier);
  return tasks;
}

export function buildNotifications(projects: TeamPulseProject[], employees: TeamPulseEmployee[], user: DemoUser | null): AppNotification[] {
  const tasks = getVisibleTasks(projects, employees, user);
  const taskNotifications = tasks.flatMap<AppNotification>((task) => {
    const items: AppNotification[] = [
      {
        id: `assigned-${task.id}`,
        category: "task",
        title: "Task assigned",
        message: `${task.title} is assigned to ${task.assigneeName}.`,
        at: `${task.assignedDate}T09:00`,
        to: user?.role === "admin" ? `/admin/tasks/${task.id}` : `/employee/tasks/${task.id}`,
        audience: user?.role ?? "admin",
        employeeId: task.assigneeId,
      },
    ];

    if (task.deadline <= "2026-10-14" && task.status !== "approved" && task.status !== "cancelled") {
      items.push({
        id: `deadline-${task.id}`,
        category: "deadline",
        title: isTaskOverdue(task) || task.status === "overdue" ? "Deadline reached" : "Approaching deadline",
        message: `${task.title} is due ${task.deadline}.`,
        at: `${task.deadline}T08:00`,
        to: user?.role === "admin" ? `/admin/tasks/${task.id}` : `/employee/tasks/${task.id}`,
        audience: user?.role ?? "admin",
        employeeId: task.assigneeId,
      });
    }

    if (task.delay) {
      items.push({
        id: `delay-${task.id}-${task.delay.reportedAt}`,
        category: "deadline",
        title: "Delay reported",
        message: task.delay.reason,
        at: task.delay.reportedAt,
        to: user?.role === "admin" ? `/admin/tasks/${task.id}` : `/employee/tasks/${task.id}`,
        audience: user?.role ?? "admin",
        employeeId: task.assigneeId,
      });
    }

    if (task.submission) {
      items.push({
        id: `submission-${task.id}-${task.submission.submittedAt}`,
        category: "submission",
        title: "Work submitted",
        message: `${task.title} was submitted for review.`,
        at: task.submission.submittedAt,
        to: user?.role === "admin" ? `/admin/tasks/${task.id}` : `/employee/tasks/${task.id}`,
        audience: user?.role ?? "admin",
        employeeId: task.assigneeId,
      });
    }

    if (task.review) {
      items.push({
        id: `review-${task.id}-${task.review.reviewedAt}`,
        category: "review",
        title: task.review.decision === "approved" ? "Task approved" : "Changes requested",
        message: task.review.feedback,
        at: task.review.reviewedAt,
        to: user?.role === "admin" ? `/admin/tasks/${task.id}` : `/employee/tasks/${task.id}`,
        audience: user?.role ?? "admin",
        employeeId: task.assigneeId,
      });
    }

    return items;
  });

  const projectNotifications = projects
    .filter(() => user?.role === "admin")
    .flatMap((project) =>
      project.notifications.map<AppNotification>((message, index) => ({
        id: `project-${project.id}-${index}`,
        category: "project",
        title: "Project update",
        message,
        at: `${project.deadline}T10:00`,
        to: user?.role === "admin" ? `/admin/projects/${project.id}` : "/employee/projects",
        audience: user?.role ?? "admin",
      })),
    );

  const employeeNotifications = user?.role === "admin"
    ? employees.map<AppNotification>((employee) => ({
        id: `employee-${employee.id}-${employee.status}`,
        category: "employee",
        title: "Employee account update",
        message: `${employee.name} is ${employee.status}.`,
        at: "2026-10-12T09:00",
        to: "/admin/employees",
        audience: "admin",
        employeeId: employee.id,
      }))
    : [];

  return [...taskNotifications, ...projectNotifications, ...employeeNotifications].sort((a, b) => b.at.localeCompare(a.at));
}

export function buildActivity(projects: TeamPulseProject[], employees: TeamPulseEmployee[], user: DemoUser | null): ActivityRecord[] {
  const visibleTasks = getVisibleTasks(projects, employees, user);
  const taskEvents = visibleTasks.flatMap((task) => (task.history ?? []).map<ActivityRecord>((entry) => ({
    id: entry.id,
    action: entry.message.split(".")[0],
    description: `${task.id} / ${task.title}: ${entry.message}`,
    at: entry.at,
    to: user?.role === "admin" ? `/admin/tasks/${task.id}` : `/employee/tasks/${task.id}`,
    projectId: task.projectId,
    projectName: task.projectName,
    employeeId: task.assigneeId,
    taskId: task.id,
  })));

  const projectEvents = projects
    .filter(() => user?.role === "admin")
    .flatMap((project) => project.activity.map<ActivityRecord>((entry) => ({
      id: entry.id,
      action: "Project update",
      description: entry.message,
      at: entry.at,
      to: user?.role === "admin" ? `/admin/projects/${project.id}` : "/employee/projects",
      projectId: project.id,
      projectName: project.name,
    })));

  const accountEvents = user?.role === "admin"
    ? employees.map<ActivityRecord>((employee) => ({
        id: `account-${employee.id}-${employee.status}`,
        action: "Employee account",
        description: `${employee.name} account is ${employee.status}.`,
        at: "2026-10-12T09:00",
        to: "/admin/employees",
        employeeId: employee.id,
      }))
    : [];

  return [...taskEvents, ...projectEvents, ...accountEvents].sort((a, b) => b.at.localeCompare(a.at));
}

export function getSearchResults(projects: TeamPulseProject[], employees: TeamPulseEmployee[], notifications: AppNotification[], user: DemoUser | null, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { projects: [], tasks: [], employees: [], notifications: [] };
  const visibleProjects = projects.filter((project) => user?.role === "admin" || project.tasks.some((task) => task.assigneeId === user?.identifier));
  const visibleTasks = getVisibleTasks(projects, employees, user);
  return {
    projects: visibleProjects.filter((project) => `${project.id} ${project.name} ${project.description}`.toLowerCase().includes(q)),
    tasks: visibleTasks.filter((task) => `${task.id} ${task.title} ${task.description} ${task.projectName} ${statusLabel(task.status)}`.toLowerCase().includes(q)),
    employees: user?.role === "admin" ? employees.filter((employee) => `${employee.id} ${employee.name} ${employee.email} ${employee.role}`.toLowerCase().includes(q)) : [],
    notifications: notifications.filter((notification) => `${notification.title} ${notification.message}`.toLowerCase().includes(q)),
  };
}
