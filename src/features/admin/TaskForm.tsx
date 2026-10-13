import { useMemo, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { FieldShell, TextAreaInput, TextInput } from "../../components/ui/FormControls";
import type { TaskStatus, TeamPulseEmployee, TechnologyArea } from "../../data/types";
import type { TaskMutationInput } from "./projectContext";
import { isoDate } from '../../lib/validation';

type TaskFormProps = {
  projects: { id: string; name: string }[];
  employees?: TeamPulseEmployee[];
  initial?: TaskMutationInput;
  submitLabel: string;
  onSubmit: (input: TaskMutationInput) => Promise<void>;
  onCancel: () => void;
};

type Errors = Record<string, string>;

const statuses: TaskStatus[] = ["pending", "in_progress", "overdue"];
const technologies: TechnologyArea[] = ["Frontend", "Backend", "Database"];

function defaultInput(projectId: string, employees: TeamPulseEmployee[]): TaskMutationInput {
  return {
    projectId,
    title: "",
    description: "",
    technology: "Frontend",
    assigneeId: employees[0]?.id ?? "",
    assignedDate: "",
    deadline: "",
    status: "pending",
    required: true,
  };
}

function isIsoDate(value: string) {
  return isoDate.safeParse(value).success;
}

export function TaskForm({ projects, employees = [], initial, submitLabel, onSubmit, onCancel }: TaskFormProps) {
  const assignableEmployees = useMemo(() => employees.filter((employee) => employee.status === "active"), [employees]);
  const [form, setForm] = useState<TaskMutationInput>(() => initial ?? defaultInput(projects[0]?.id ?? "", assignableEmployees));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  function update<K extends keyof TaskMutationInput>(key: K, value: TaskMutationInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const next: Errors = {};
    if (!form.projectId) next.projectId = "Project is required.";
    if (!assignableEmployees.some(e=>e.id===form.assigneeId)) next.assigneeId = 'Choose an active employee.';
    if (!form.title.trim()) next.title = "Task title is required.";
    if (!form.description.trim()) next.description = "Task description is required.";
    if (!form.assignedDate) next.assignedDate = "Assigned date is required.";
    else if (!isIsoDate(form.assignedDate)) next.assignedDate = "Use YYYY-MM-DD format.";
    if (!form.deadline) next.deadline = "Deadline is required.";
    else if (!isIsoDate(form.deadline)) next.deadline = "Use YYYY-MM-DD format.";
    if (form.assignedDate && form.deadline && form.deadline < form.assignedDate) next.deadline = "Deadline cannot be before assigned date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  }

  return (
    <form className="task-editor" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <FieldShell id="task-project" label="Project" error={errors.projectId}>
          <div className="select-field select-field--full">
            <select id="task-project" name="task-project" value={form.projectId} disabled={Boolean(initial)} onChange={(event) => update("projectId", event.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
        </FieldShell>
        <FieldShell id="task-status" label="Status">
          <div className="select-field select-field--full">
            <select id="task-status" name="task-status" value={form.status} onChange={(event) => update("status", event.target.value as TaskStatus)}>
              {Array.from(new Set([...(initial ? [initial.status] : []),...statuses])).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </FieldShell>
        <FieldShell id="task-title" label="Task title" error={errors.title}>
          <TextInput id="task-title" value={form.title} onChange={(event) => update("title", event.target.value)} error={errors.title} />
        </FieldShell>
        <FieldShell id="task-technology" label="Technology section">
          <div className="select-field select-field--full">
            <select id="task-technology" name="task-technology" value={form.technology} onChange={(event) => update("technology", event.target.value as TechnologyArea)}>
              {technologies.map((tech) => <option key={tech}>{tech}</option>)}
            </select>
          </div>
        </FieldShell>
        <FieldShell id="task-assignee" label="Assigned employee">
          <div className="select-field select-field--full">
            <select id="task-assignee" name="task-assignee" value={form.assigneeId} onChange={(event) => update("assigneeId", event.target.value)}>
              {assignableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.role}</option>)}
            </select>
          </div>
        </FieldShell>
        <FieldShell id="task-required" label="Required for project completion">
          <label className="toggle-row">
            <input type="checkbox" checked={form.required} onChange={(event) => update("required", event.target.checked)} />
            <span>{form.required ? "Required" : "Optional"}</span>
          </label>
        </FieldShell>
        <FieldShell id="task-assigned-date" label="Assigned date" error={errors.assignedDate}>
          <TextInput id="task-assigned-date" value={form.assignedDate} onChange={(event) => update("assignedDate", event.target.value)} error={errors.assignedDate} placeholder="2026-10-12" />
        </FieldShell>
        <FieldShell id="task-deadline" label="Deadline" error={errors.deadline}>
          <TextInput id="task-deadline" value={form.deadline} onChange={(event) => update("deadline", event.target.value)} error={errors.deadline} placeholder="2026-10-30" />
        </FieldShell>
        <div className="form-grid__wide">
          <FieldShell id="task-description" label="Task description" error={errors.description}>
            <TextAreaInput id="task-description" value={form.description} onChange={(event) => update("description", event.target.value)} />
          </FieldShell>
        </div>
      </div>
      <div className="form-actions form-actions--inline">
        <button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button>
        <button className="button button--primary" type="submit" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
