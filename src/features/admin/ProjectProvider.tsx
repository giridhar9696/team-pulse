import { useMemo, useState, type ReactNode } from "react";
import { initialProjects, type ProjectTask, type TeamPulseEmployee, type TeamPulseProject } from "../../data/demoData";
import { readEmployeeDirectory, writeEmployeeDirectory } from "../../data/employeeDirectory";
import { ProjectContext, type ProjectContextValue, type TeamPulseSettings } from "./projectContext";
import { getDerivedProjectStatus } from "./projectMetrics";

function slugProjectName(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 18)
    .replace(/(^-|-$)/g, "");
}

function nowStamp() {
  return new Date().toISOString().slice(0, 16);
}

function normalizeProject(project: TeamPulseProject): TeamPulseProject {
  return { ...project, status: getDerivedProjectStatus(project) };
}

function readJson<T>(key: string, fallback: T): T {
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

const defaultSettings: TeamPulseSettings = {
  displayName: "",
  email: "",
  password: "",
  notificationDigest: true,
  deadlineAlerts: true,
  dateFormat: "iso",
  theme: "dark",
};

const projectsStorageKey = "team-pulse-projects";

function readProjects() {
  const parsed = readJson<unknown>(projectsStorageKey, initialProjects);
  return Array.isArray(parsed) && parsed.length ? parsed as TeamPulseProject[] : initialProjects;
}

function readStringArray(key: string) {
  const parsed = readJson<unknown>(key, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function readSettings() {
  const parsed = readJson<Partial<TeamPulseSettings>>("team-pulse-settings", defaultSettings);
  return {
    ...defaultSettings,
    ...parsed,
    notificationDigest: typeof parsed.notificationDigest === "boolean" ? parsed.notificationDigest : defaultSettings.notificationDigest,
    deadlineAlerts: typeof parsed.deadlineAlerts === "boolean" ? parsed.deadlineAlerts : defaultSettings.deadlineAlerts,
    dateFormat: parsed.dateFormat === "friendly" ? "friendly" : "iso",
    theme: parsed.theme === "system" ? "system" : "dark",
  };
}

function appendActivity(project: TeamPulseProject, message: string): TeamPulseProject {
  return {
    ...project,
    activity: [{ id: `${project.id}-ACT-${project.activity.length + 1}`, at: nowStamp(), message }, ...project.activity],
  };
}

function appendTaskHistory(task: ProjectTask, message: string): ProjectTask {
  const history = task.history ?? [];
  return {
    ...task,
    history: [{ id: `${task.id}-H-${history.length + 1}`, at: nowStamp(), message }, ...history],
  };
}

function findTask(projects: TeamPulseProject[], taskId: string) {
  for (const project of projects) {
    const task = project.tasks.find((item) => item.id === taskId);
    if (task) return { project, task };
  }
  return null;
}

function updateTaskInProjects(
  projects: TeamPulseProject[],
  taskId: string,
  updater: (task: ProjectTask, project: TeamPulseProject) => { task: ProjectTask; message: string },
) {
  let updatedTask: ProjectTask | null = null;
  const nextProjects = projects.map((project) => {
    const task = project.tasks.find((item) => item.id === taskId);
    if (!task) return project;

    const result = updater(task, project);
    updatedTask = result.task;
    return normalizeProject(
      appendActivity(
        {
          ...project,
          tasks: project.tasks.map((item) => (item.id === taskId ? result.task : item)),
        },
        result.message,
      ),
    );
  });

  return { projects: nextProjects, task: updatedTask };
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<TeamPulseProject[]>(() => readProjects());
  const [employees, setEmployees] = useState<TeamPulseEmployee[]>(() => readEmployeeDirectory());
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => readStringArray("team-pulse-read-notifications"));
  const [settings, setSettings] = useState<TeamPulseSettings>(() => readSettings());

  function persistEmployees(updater: (current: TeamPulseEmployee[]) => TeamPulseEmployee[]) {
    setEmployees((current) => {
      const next = updater(current);
      writeEmployeeDirectory(next);
      return next;
    });
  }

  function persistProjects(updater: (current: TeamPulseProject[]) => TeamPulseProject[]) {
    setProjects((current) => {
      const next = updater(current);
      window.localStorage.setItem(projectsStorageKey, JSON.stringify(next));
      return next;
    });
  }

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      employees,
      readNotificationIds,
      settings,
      markNotificationRead: (id) => {
        setReadNotificationIds((current) => {
          const next = current.includes(id) ? current : [...current, id];
          window.localStorage.setItem("team-pulse-read-notifications", JSON.stringify(next));
          return next;
        });
      },
      markAllNotificationsRead: (ids) => {
        setReadNotificationIds((current) => {
          const next = Array.from(new Set([...current, ...ids]));
          window.localStorage.setItem("team-pulse-read-notifications", JSON.stringify(next));
          return next;
        });
      },
      updateSettings: (patch) => {
        setSettings((current) => {
          const next = { ...current, ...patch };
          window.localStorage.setItem("team-pulse-settings", JSON.stringify(next));
          return next;
        });
      },
      createEmployee: (input) => {
        if (employees.some((employee) => employee.id === input.id.trim().toUpperCase())) return null;
        const nextEmployee: TeamPulseEmployee = { ...input, id: input.id.trim().toUpperCase(), name: input.name.trim(), email: input.email.trim(), role: input.role.trim() };
        persistEmployees((current) => [...current, nextEmployee]);
        return nextEmployee;
      },
      updateEmployee: (employeeId, input) => {
        const normalizedId = input.id.trim().toUpperCase();
        if (normalizedId !== employeeId && employees.some((employee) => employee.id === normalizedId)) return null;
        let updated: TeamPulseEmployee | null = null;
        persistEmployees((current) =>
          current.map((employee) => {
            if (employee.id !== employeeId) return employee;
            updated = { ...input, id: normalizedId, name: input.name.trim(), email: input.email.trim(), role: input.role.trim() };
            return updated;
          }),
        );
        if (normalizedId !== employeeId) {
          persistProjects((currentProjects) =>
            currentProjects.map((project) => ({
              ...project,
              ownerId: project.ownerId === employeeId ? normalizedId : project.ownerId,
              tasks: project.tasks.map((task) => task.assigneeId === employeeId ? { ...task, assigneeId: normalizedId } : task),
            })),
          );
        }
        return updated;
      },
      setEmployeeStatus: (employeeId, status) => {
        let updated: TeamPulseEmployee | null = null;
        persistEmployees((current) =>
          current.map((employee) => {
            if (employee.id !== employeeId) return employee;
            updated = { ...employee, status };
            return updated;
          }),
        );
        return updated;
      },
      resetEmployeePassword: (employeeId) => {
        let updated: TeamPulseEmployee | null = null;
        persistEmployees((current) =>
          current.map((employee) => {
            if (employee.id !== employeeId) return employee;
            updated = { ...employee, demoPassword: "Employee@123" };
            return updated;
          }),
        );
        return updated;
      },
      updateEmployeePassword: (employeeId, password) => {
        let updated: TeamPulseEmployee | null = null;
        persistEmployees((current) =>
          current.map((employee) => {
            if (employee.id !== employeeId) return employee;
            updated = { ...employee, demoPassword: password };
            return updated;
          }),
        );
        return updated;
      },
      createProject: (input) => {
        const baseId = `PULSE-${slugProjectName(input.name) || "NEW"}`;
        const id = projects.some((project) => project.id === baseId) ? `${baseId}-${projects.length + 1}` : baseId;
        const newProject: TeamPulseProject = {
          id,
          name: input.name.trim(),
          description: input.description.trim(),
          ownerId: input.tasks[0]?.assigneeId ?? "EMP014",
          startDate: input.startDate,
          deadline: input.deadline,
          status: input.status,
          notifications: ["New project draft is ready for task workflow setup."],
          activity: [{ id: `${id}-ACT-01`, at: input.startDate, message: "Project created from admin form." }],
          tasks: input.tasks.map((task, index) => ({
            ...task,
            id: `${id}-${task.technology.slice(0, 2).toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
            status: "pending",
            required: true,
          })),
        };
        const normalized = { ...newProject, status: getDerivedProjectStatus(newProject) };
        persistProjects((current) => [...current, normalized]);
        return normalized;
      },
      createTask: (input) => {
        let created: ProjectTask | null = null;
        persistProjects((current) =>
          current.map((project) => {
            if (project.id !== input.projectId) return project;
            const nextTask: ProjectTask = appendTaskHistory(
              {
                id: `${project.id}-${input.technology.slice(0, 2).toUpperCase()}-${String(project.tasks.length + 1).padStart(2, "0")}`,
                title: input.title,
                description: input.description,
                technology: input.technology,
                assigneeId: input.assigneeId,
                assignedDate: input.assignedDate,
                deadline: input.deadline,
                status: input.status,
                required: input.required,
              },
              "Task created by admin.",
            );
            created = nextTask;
            return normalizeProject(appendActivity({ ...project, tasks: [...project.tasks, nextTask] }, `Task ${nextTask.id} created.`));
          }),
        );
        return created!;
      },
      updateTask: (taskId, input) => {
        const current = findTask(projects, taskId);
        if (!current || current.task.status === "approved" || current.task.status === "cancelled") return null;
        let resultTask: ProjectTask | null = null;
        persistProjects((currentProjects) => {
          const result = updateTaskInProjects(currentProjects, taskId, (task) => {
            const changes: string[] = [];
            if (task.assigneeId !== input.assigneeId) changes.push("assignee changed");
            if (task.deadline !== input.deadline) changes.push("deadline changed");
            const updated = appendTaskHistory(
              {
                ...task,
                title: input.title,
                description: input.description,
                technology: input.technology,
                assigneeId: input.assigneeId,
                assignedDate: input.assignedDate,
                deadline: input.deadline,
                status: input.status,
                required: input.required,
              },
              changes.length ? `Task edited: ${changes.join(", ")}.` : "Task edited by admin.",
            );
            return { task: updated, message: `Task ${taskId} edited.` };
          });
          resultTask = result.task;
          return result.projects;
        });
        return resultTask;
      },
      submitTask: (taskId, input) => {
        const current = findTask(projects, taskId);
        if (!current || current.task.status === "approved" || current.task.status === "cancelled") return null;
        let resultTask: ProjectTask | null = null;
        persistProjects((currentProjects) => {
          const result = updateTaskInProjects(currentProjects, taskId, (task) => {
            const submissions = task.submissions ?? [];
            const submission = {
              id: `${task.id}-SUB-${submissions.length + 1}`,
              submittedAt: nowStamp(),
              url: input.url,
              note: input.note,
            };
            const updated = appendTaskHistory(
              {
                ...task,
                status: "submitted",
                submission,
                submissions: [submission, ...submissions],
              },
              submissions.length ? "Work resubmitted by employee." : "Work submitted by employee.",
            );
            return { task: updated, message: `Task ${taskId} submitted for review.` };
          });
          resultTask = result.task;
          return result.projects;
        });
        return resultTask;
      },
      reportDelay: (taskId, reason) => {
        const current = findTask(projects, taskId);
        if (!current || current.task.status === "approved" || current.task.status === "cancelled") return null;
        let resultTask: ProjectTask | null = null;
        persistProjects((currentProjects) => {
          const result = updateTaskInProjects(currentProjects, taskId, (task) => {
            const delays = task.delays ?? (task.delay ? [task.delay] : []);
            const delay = { reportedAt: nowStamp(), reason };
            const updated = appendTaskHistory(
              {
                ...task,
                status: "overdue",
                delay,
                delays: [delay, ...delays],
              },
              "Delay reported by employee.",
            );
            return { task: updated, message: `Delay reported for ${taskId}.` };
          });
          resultTask = result.task;
          return result.projects;
        });
        return resultTask;
      },
      approveTask: (taskId, feedback) => {
        const current = findTask(projects, taskId);
        if (!current || current.task.status === "approved" || current.task.status === "cancelled" || !current.task.submission) return null;
        let resultTask: ProjectTask | null = null;
        persistProjects((currentProjects) => {
          const result = updateTaskInProjects(currentProjects, taskId, (task) => {
            const updated = appendTaskHistory(
              {
                ...task,
                status: "approved",
                review: { decision: "approved", reviewedAt: nowStamp(), feedback },
              },
              "Task approved by admin.",
            );
            return { task: updated, message: `Task ${taskId} approved.` };
          });
          resultTask = result.task;
          return result.projects;
        });
        return resultTask;
      },
      requestChanges: (taskId, feedback) => {
        const current = findTask(projects, taskId);
        if (!current || current.task.status === "approved" || current.task.status === "cancelled" || !current.task.submission) return null;
        let resultTask: ProjectTask | null = null;
        persistProjects((currentProjects) => {
          const result = updateTaskInProjects(currentProjects, taskId, (task) => {
            const updated = appendTaskHistory(
              {
                ...task,
                status: "changes_requested",
                review: { decision: "changes_requested", reviewedAt: nowStamp(), feedback },
              },
              "Admin requested changes.",
            );
            return { task: updated, message: `Changes requested for ${taskId}.` };
          });
          resultTask = result.task;
          return result.projects;
        });
        return resultTask;
      },
      cancelTask: (taskId) => {
        const current = findTask(projects, taskId);
        if (!current || current.task.status === "approved" || current.task.status === "cancelled") return null;
        let resultTask: ProjectTask | null = null;
        persistProjects((currentProjects) => {
          const result = updateTaskInProjects(currentProjects, taskId, (task) => {
            const updated = appendTaskHistory({ ...task, status: "cancelled" }, "Task cancelled by admin.");
            return { task: updated, message: `Task ${taskId} cancelled.` };
          });
          resultTask = result.task;
          return result.projects;
        });
        return resultTask;
      },
    }),
    [employees, projects, readNotificationIds, settings],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
