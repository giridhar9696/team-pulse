import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Edit3, Eye, Plus, Search, XCircle } from "lucide-react";
import { StateBlock } from "../../components/ui/StateBlock";
import { Toast } from "../../components/ui/Toast";
import { TaskForm } from "./TaskForm";
import { useProjects } from "./projectContext";
import type { TaskMutationInput } from "./projectContext";
import { getTaskRecords, isTaskOverdue, statusLabel, type TaskRecord } from "./taskUtils";

export function AdminTasks() {
  const { projects, employees, createTask, updateTask, cancelTask } = useProjects();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get("overdue") === "1");
  const [editing, setEditing] = useState<TaskRecord | "new" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();

  const tasks = getTaskRecords(projects, employees);
  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const text = `${task.id} ${task.title} ${task.projectName} ${task.assigneeName}`.toLowerCase();
      return (
        text.includes(query.toLowerCase()) &&
        (projectFilter === "all" || task.projectId === projectFilter) &&
        (employeeFilter === "all" || task.assigneeId === employeeFilter) &&
        (techFilter === "all" || task.technology === techFilter) &&
        (statusFilter === "all" || task.status === statusFilter) &&
        (!overdueOnly || isTaskOverdue(task))
      );
    });
  }, [employeeFilter, overdueOnly, projectFilter, query, statusFilter, tasks, techFilter]);

  function mutationInput(task: TaskRecord): TaskMutationInput {
    return {
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      technology: task.technology,
      assigneeId: task.assigneeId,
      assignedDate: task.assignedDate,
      deadline: task.deadline,
      status: task.status,
      required: task.required,
    };
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Admin task management</p>
          <h1>Tasks</h1>
          <p>Manage assignments, deadlines, review states, and submission decisions from the shared task store.</p>
        </div>
        <button className="button button--primary" type="button" onClick={() => setEditing("new")}>
          <Plus size={16} /> Create Task
        </button>
      </section>

      {toast && <Toast tone="success" title="Task updated" message={toast} onDismiss={() => setToast(null)} />}

      {editing && (
        <section className="data-panel">
          <div className="panel-heading">
            <h2>{editing === "new" ? "Create task" : `Edit ${editing.id}`}</h2>
          </div>
          <TaskForm
            projects={projects.map((project) => ({ id: project.id, name: project.name }))}
            employees={employees}
            initial={editing === "new" ? undefined : mutationInput(editing)}
            submitLabel={editing === "new" ? "Create Task" : "Save Changes"}
            onCancel={() => setEditing(null)}
            onSubmit={(input) => {
              if (editing === "new") {
                const task = createTask(input);
                setToast(`${task.id} created.`);
              } else {
                updateTask(editing.id, input);
                setToast(`${editing.id} updated.`);
              }
              setEditing(null);
            }}
          />
        </section>
      )}

      <section className="data-panel">
        <div className="filters-grid filters-grid--tasks">
          <label className="search-field filters-grid__search" htmlFor="task-search">
            <Search size={16} />
            <input id="task-search" name="task-search" placeholder="Search task, project, assignee" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Select label="Project filter" value={projectFilter} onChange={setProjectFilter}>
            <option value="all">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </Select>
          <Select label="Employee filter" value={employeeFilter} onChange={setEmployeeFilter}>
            <option value="all">All employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </Select>
          <Select label="Technology filter" value={techFilter} onChange={setTechFilter}>
            <option value="all">All tech</option>
            <option>Frontend</option>
            <option>Backend</option>
            <option>Database</option>
          </Select>
          <Select label="Status filter" value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
            <option value="review">Under Review</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="approved">Approved</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <label className="toggle-row">
            <input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} />
            <span>Overdue only</span>
          </label>
        </div>
      </section>

      {filtered.length === 0 ? (
        <StateBlock title="No matching tasks">Adjust search or filters to find more tasks.</StateBlock>
      ) : (
        <section className="task-table">
          {filtered.map((task) => (
            <article className="task-table__row" key={task.id}>
              <span className="mono">{task.id}</span>
              <div>
                <strong>{task.title}</strong>
                <span>{task.projectName} / {task.technology}</span>
              </div>
              <span>{task.assigneeName}</span>
              <span className="status-chip">{statusLabel(task.status)}</span>
              <span className={isTaskOverdue(task) ? "deadline deadline--late" : "deadline"}>{task.deadline}</span>
              <div className="row-actions">
                <button className="icon-button" type="button" aria-label={`View ${task.id}`} onClick={() => navigate(`/admin/tasks/${task.id}`)}><Eye size={16} /></button>
                <button className="icon-button" type="button" aria-label={`Edit ${task.id}`} onClick={() => setEditing(task)} disabled={task.status === "approved" || task.status === "cancelled"}><Edit3 size={16} /></button>
                <button className="icon-button" type="button" aria-label={`Cancel ${task.id}`} onClick={() => { cancelTask(task.id); setToast(`${task.id} cancelled.`); }} disabled={task.status === "approved" || task.status === "cancelled"}><XCircle size={16} /></button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="select-field">
      <select aria-label={label} name={label.toLowerCase().replaceAll(" ", "-")} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  );
}
