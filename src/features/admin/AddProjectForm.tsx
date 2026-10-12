import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Save, X } from "lucide-react";
import { FieldShell, TextAreaInput, TextInput } from "../../components/ui/FormControls";
import { Toast } from "../../components/ui/Toast";
import { employees as defaultEmployees, type TechnologyArea } from "../../data/demoData";
import { useProjects } from "./projectContext";

type TaskDraft = {
  enabled: boolean;
  title: string;
  description: string;
  assigneeId: string;
  assignedDate: string;
  deadline: string;
};

type FormState = {
  name: string;
  description: string;
  startDate: string;
  deadline: string;
  status: "Active" | "At Risk" | "Review" | "Completed";
  tasks: Record<TechnologyArea, TaskDraft>;
};

type ErrorMap = Record<string, string>;

const areas: TechnologyArea[] = ["Frontend", "Backend", "Database"];

const emptyTask = (): TaskDraft => ({
  enabled: false,
  title: "",
  description: "",
  assigneeId: defaultEmployees[0].id,
  assignedDate: "",
  deadline: "",
});

const initialState: FormState = {
  name: "",
  description: "",
  startDate: "",
  deadline: "",
  status: "Active",
  tasks: {
    Frontend: { ...emptyTask(), enabled: true },
    Backend: emptyTask(),
    Database: emptyTask(),
  },
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

export function AddProjectForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { employees, createProject } = useProjects();
  const assignableEmployees = employees.filter((employee) => employee.status === "active");
  const navigate = useNavigate();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateTask(area: TechnologyArea, patch: Partial<TaskDraft>) {
    setForm((current) => ({
      ...current,
      tasks: {
        ...current.tasks,
        [area]: { ...current.tasks[area], ...patch },
      },
    }));
  }

  function validate() {
    const nextErrors: ErrorMap = {};
    if (!form.name.trim()) nextErrors.name = "Project name is required.";
    if (!form.description.trim()) nextErrors.description = "Project description is required.";
    if (!form.startDate) nextErrors.startDate = "Start date is required.";
    else if (!isIsoDate(form.startDate)) nextErrors.startDate = "Use YYYY-MM-DD format.";
    if (!form.deadline) nextErrors.deadline = "Overall deadline is required.";
    else if (!isIsoDate(form.deadline)) nextErrors.deadline = "Use YYYY-MM-DD format.";
    if (form.startDate && form.deadline && form.deadline < form.startDate) {
      nextErrors.deadline = "Project deadline cannot be before the start date.";
    }

    const enabledTasks = areas.filter((area) => form.tasks[area].enabled);
    if (enabledTasks.length === 0) {
      nextErrors.tasks = "Add at least one technology task section.";
    }

    enabledTasks.forEach((area) => {
      const task = form.tasks[area];
      if (!task.description.trim()) nextErrors[`${area}.description`] = `${area} task description is required.`;
      if (!task.assignedDate) nextErrors[`${area}.assignedDate`] = `${area} assigned date is required.`;
      else if (!isIsoDate(task.assignedDate)) nextErrors[`${area}.assignedDate`] = "Use YYYY-MM-DD format.";
      if (!task.deadline) nextErrors[`${area}.deadline`] = `${area} deadline is required.`;
      else if (!isIsoDate(task.deadline)) nextErrors[`${area}.deadline`] = "Use YYYY-MM-DD format.";
      if (task.assignedDate && task.deadline && task.deadline < task.assignedDate) {
        nextErrors[`${area}.deadline`] = `${area} deadline cannot be before the assigned date.`;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    if (!validate()) return;

    setSaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    const project = createProject({
      name: form.name,
      description: form.description,
      startDate: form.startDate,
      deadline: form.deadline,
      status: form.status,
      tasks: areas
        .filter((area) => form.tasks[area].enabled)
        .map((area) => {
          const task = form.tasks[area];
          return {
            title: task.title.trim() || `${area} implementation task`,
            description: task.description,
            technology: area,
            assigneeId: task.assigneeId,
            assignedDate: task.assignedDate,
            deadline: task.deadline,
          };
        }),
    });
    setSaving(false);
    setToast("Project created successfully.");
    navigate(`/admin/projects/${project.id}`);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">New project architecture</p>
          <h1>Add project</h1>
          <p>Define the project scope and optional technology-wise task sections.</p>
        </div>
        <Link className="button button--secondary" to="/admin/projects">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </section>

      {toast && <Toast tone="success" title="Project saved" message={toast} onDismiss={() => setToast(null)} />}
      {errors.tasks && <Toast tone="error" title="Task section required" message={errors.tasks} onDismiss={() => setErrors((current) => {
        const next = { ...current };
        delete next.tasks;
        return next;
      })} />}

      <form className="project-form" onSubmit={handleSubmit} noValidate>
        <section className="data-panel">
          <div className="panel-heading">
            <div>
              <h2>Core project scope</h2>
              <p>Primary metadata and delivery constraints.</p>
            </div>
            <span className="status-chip">Draft v1.0</span>
          </div>
          <div className="form-grid">
            <FieldShell id="project-name" label="Project name" error={errors.name}>
              <TextInput id="project-name" value={form.name} onChange={(event) => update("name", event.target.value)} error={errors.name} placeholder="e.g. Sprint Review Console" />
            </FieldShell>
            <FieldShell id="project-status" label="Initial status">
              <div className="select-field select-field--full">
                <select id="project-status" name="project-status" value={form.status} onChange={(event) => update("status", event.target.value as FormState["status"])}>
                  <option>Active</option>
                  <option>At Risk</option>
                  <option>Review</option>
                </select>
              </div>
            </FieldShell>
            <FieldShell id="project-start" label="Start date" error={errors.startDate}>
              <TextInput id="project-start" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} error={errors.startDate} placeholder="2026-10-15" />
            </FieldShell>
            <FieldShell id="project-deadline" label="Overall deadline" error={errors.deadline}>
              <TextInput id="project-deadline" value={form.deadline} onChange={(event) => update("deadline", event.target.value)} error={errors.deadline} placeholder="2026-11-30" />
            </FieldShell>
          </div>
          <FieldShell id="project-description" label="Project description" error={errors.description}>
            <TextAreaInput id="project-description" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Clarify goals, scope, risks, and success criteria." />
          </FieldShell>
        </section>

        {areas.map((area) => {
          const task = form.tasks[area];
          return (
            <section className="data-panel task-section" key={area}>
              <div className="panel-heading">
                <div>
                  <h2>{area} task section</h2>
                  <p>Add this section only when relevant to the project.</p>
                </div>
                <label className="toggle-row">
                  <input type="checkbox" checked={task.enabled} onChange={(event) => updateTask(area, { enabled: event.target.checked })} />
                  <span>{task.enabled ? "Included" : "Optional"}</span>
                </label>
              </div>
              {task.enabled && (
                <div className="form-grid">
                  <FieldShell id={`${area}-title`} label="Task title">
                    <TextInput id={`${area}-title`} value={task.title} onChange={(event) => updateTask(area, { title: event.target.value })} placeholder={`${area} implementation task`} />
                  </FieldShell>
                  <FieldShell id={`${area}-assignee`} label="Assigned employee">
                    <div className="select-field select-field--full">
                      <select id={`${area}-assignee`} name={`${area}-assignee`} value={task.assigneeId} onChange={(event) => updateTask(area, { assigneeId: event.target.value })}>
                        {assignableEmployees.map((employee) => (
                          <option value={employee.id} key={employee.id}>{employee.name} · {employee.role}</option>
                        ))}
                      </select>
                    </div>
                  </FieldShell>
                  <FieldShell id={`${area}-assigned`} label="Assigned date" error={errors[`${area}.assignedDate`]}>
                    <TextInput id={`${area}-assigned`} value={task.assignedDate} onChange={(event) => updateTask(area, { assignedDate: event.target.value })} error={errors[`${area}.assignedDate`]} placeholder="2026-10-16" />
                  </FieldShell>
                  <FieldShell id={`${area}-deadline`} label="Deadline" error={errors[`${area}.deadline`]}>
                    <TextInput id={`${area}-deadline`} value={task.deadline} onChange={(event) => updateTask(area, { deadline: event.target.value })} error={errors[`${area}.deadline`]} placeholder="2026-11-08" />
                  </FieldShell>
                  <div className="form-grid__wide">
                    <FieldShell id={`${area}-description`} label="Task description" error={errors[`${area}.description`]}>
                      <TextAreaInput id={`${area}-description`} value={task.description} onChange={(event) => updateTask(area, { description: event.target.value })} placeholder={`Describe ${area.toLowerCase()} scope, deliverables, and constraints.`} />
                    </FieldShell>
                  </div>
                </div>
              )}
            </section>
          );
        })}

        <div className="form-actions">
          <Link className="button button--secondary" to="/admin/projects">
            <X size={16} /> Cancel
          </Link>
          <button className="button button--primary" type="submit" disabled={saving}>
            {saving ? <CheckCircle2 size={16} /> : <Save size={16} />} {saving ? "Saving..." : "Save Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
