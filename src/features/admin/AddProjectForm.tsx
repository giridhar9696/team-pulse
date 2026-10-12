import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Plus, Save, Trash2, X } from "lucide-react";
import { FieldShell, TextAreaInput, TextInput } from "../../components/ui/FormControls";
import { Toast } from "../../components/ui/Toast";
import { employees as defaultEmployees, type TechnologyArea } from "../../data/demoData";
import { useProjects } from "./projectContext";

type TaskDraft = {
  title: string;
  description: string;
  technology: TechnologyArea;
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
  tasks: TaskDraft[];
};

type ErrorMap = Record<string, string>;

const areas: TechnologyArea[] = ["Frontend", "Backend", "Database"];

const emptyTask = (): TaskDraft => ({
  title: "",
  description: "",
  technology: "Frontend",
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
  tasks: [emptyTask()],
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

  function updateTask(index: number, patch: Partial<TaskDraft>) {
    setForm((current) => ({
      ...current,
      tasks: current.tasks.map((task, taskIndex) => (taskIndex === index ? { ...task, ...patch } : task)),
    }));
  }

  function addTask() {
    setForm((current) => ({
      ...current,
      tasks: [...current.tasks, emptyTask()],
    }));
  }

  function removeTask(index: number) {
    setForm((current) => ({
      ...current,
      tasks: current.tasks.filter((_, taskIndex) => taskIndex !== index),
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

    if (form.tasks.length === 0) {
      nextErrors.tasks = "Add at least one project task.";
    }

    form.tasks.forEach((task, index) => {
      const label = `Task ${index + 1}`;
      if (!task.title.trim()) nextErrors[`tasks.${index}.title`] = `${label} name is required.`;
      if (!task.description.trim()) nextErrors[`tasks.${index}.description`] = `${label} description is required.`;
      if (!task.assignedDate) nextErrors[`tasks.${index}.assignedDate`] = `${label} assigned date is required.`;
      else if (!isIsoDate(task.assignedDate)) nextErrors[`tasks.${index}.assignedDate`] = "Use YYYY-MM-DD format.";
      if (!task.deadline) nextErrors[`tasks.${index}.deadline`] = `${label} deadline is required.`;
      else if (!isIsoDate(task.deadline)) nextErrors[`tasks.${index}.deadline`] = "Use YYYY-MM-DD format.";
      if (task.assignedDate && task.deadline && task.deadline < task.assignedDate) {
        nextErrors[`tasks.${index}.deadline`] = `${label} deadline cannot be before the assigned date.`;
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
      tasks: form.tasks.map((task) => ({
        title: task.title.trim(),
        description: task.description,
        technology: task.technology,
        assigneeId: task.assigneeId,
        assignedDate: task.assignedDate,
        deadline: task.deadline,
      })),
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
          <p>Define the project scope, then add each task with its assignee and dates.</p>
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

        <section className="data-panel task-section">
          <div className="panel-heading">
            <div>
              <h2>Project tasks</h2>
              <p>Add tasks one by one and choose the employee, technology area, assigned date, and deadline for each task.</p>
            </div>
            <button className="button button--secondary" type="button" onClick={addTask}><Plus size={16} /> Add task</button>
          </div>

          {form.tasks.map((task, index) => {
          const taskKey = `tasks.${index}`;
          return (
            <section className="task-draft" key={index}>
              <div className="panel-heading">
                <div>
                  <h3>Task {index + 1}</h3>
                  <p>{task.title || "New project task"}</p>
                </div>
                <button className="icon-button" type="button" aria-label={`Remove task ${index + 1}`} onClick={() => removeTask(index)} disabled={form.tasks.length === 1}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="form-grid">
                  <FieldShell id={`${taskKey}-title`} label="Task name" error={errors[`${taskKey}.title`]}>
                    <TextInput id={`${taskKey}-title`} value={task.title} onChange={(event) => updateTask(index, { title: event.target.value })} error={errors[`${taskKey}.title`]} placeholder="e.g. Authentication screen polish" />
                  </FieldShell>
                  <FieldShell id={`${taskKey}-technology`} label="Technology area">
                    <div className="select-field select-field--full">
                      <select id={`${taskKey}-technology`} name={`${taskKey}-technology`} value={task.technology} onChange={(event) => updateTask(index, { technology: event.target.value as TechnologyArea })}>
                        {areas.map((area) => <option key={area} value={area}>{area}</option>)}
                      </select>
                    </div>
                  </FieldShell>
                  <FieldShell id={`${taskKey}-assignee`} label="Assigned employee">
                    <div className="select-field select-field--full">
                      <select id={`${taskKey}-assignee`} name={`${taskKey}-assignee`} value={task.assigneeId} onChange={(event) => updateTask(index, { assigneeId: event.target.value })}>
                        {assignableEmployees.map((employee) => (
                          <option value={employee.id} key={employee.id}>{employee.name} · {employee.role}</option>
                        ))}
                      </select>
                    </div>
                  </FieldShell>
                  <FieldShell id={`${taskKey}-assigned`} label="Assigned date" error={errors[`${taskKey}.assignedDate`]}>
                    <TextInput id={`${taskKey}-assigned`} value={task.assignedDate} onChange={(event) => updateTask(index, { assignedDate: event.target.value })} error={errors[`${taskKey}.assignedDate`]} placeholder="2026-10-16" />
                  </FieldShell>
                  <FieldShell id={`${taskKey}-deadline`} label="Deadline" error={errors[`${taskKey}.deadline`]}>
                    <TextInput id={`${taskKey}-deadline`} value={task.deadline} onChange={(event) => updateTask(index, { deadline: event.target.value })} error={errors[`${taskKey}.deadline`]} placeholder="2026-11-08" />
                  </FieldShell>
                  <div className="form-grid__wide">
                    <FieldShell id={`${taskKey}-description`} label="Task description" error={errors[`${taskKey}.description`]}>
                      <TextAreaInput id={`${taskKey}-description`} value={task.description} onChange={(event) => updateTask(index, { description: event.target.value })} placeholder="Describe scope, deliverables, and constraints." />
                    </FieldShell>
                  </div>
                </div>
            </section>
          );
        })}
        </section>

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
