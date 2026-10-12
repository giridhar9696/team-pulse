import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, Grid2X2, List, Search, Send, TimerReset } from "lucide-react";
import { StateBlock } from "../../components/ui/StateBlock";
import { useAuth } from "../auth/authContext";
import { useProjects } from "../admin/projectContext";
import { isTaskOverdue, statusLabel } from "../admin/taskUtils";
import { canEmployeeSubmit, getEmployeeTasks } from "./employeeUtils";

export function EmployeeTasks() {
  const { user } = useAuth();
  const { projects, employees } = useProjects();
  const [searchParams] = useSearchParams();
  const employeeId = user?.identifier ?? "";
  const tasks = getEmployeeTasks(projects, employeeId, employees);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [deadlineFilter, setDeadlineFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get("overdue") === "1");

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const searchText = `${task.id} ${task.title} ${task.projectName}`.toLowerCase();
      const isOverdue = task.status === "overdue" || isTaskOverdue(task);
      return (
        searchText.includes(query.toLowerCase()) &&
        (projectFilter === "all" || task.projectId === projectFilter) &&
        (techFilter === "all" || task.technology === techFilter) &&
        (statusFilter === "all" || task.status === statusFilter) &&
        (deadlineFilter === "all" || task.deadline <= deadlineFilter) &&
        (!overdueOnly || isOverdue)
      );
    });
  }, [deadlineFilter, overdueOnly, projectFilter, query, statusFilter, tasks, techFilter]);

  const employeeProjects = [...new Map(tasks.map((task) => [task.projectId, task.projectName])).entries()];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Employee workspace</p>
          <h1>My Tasks</h1>
          <p>Personal task cards, review state, delay reporting, and submission access from the shared project store.</p>
        </div>
        <div className="segmented-control" aria-label="Task view">
          <button className={view === "cards" ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"} type="button" onClick={() => setView("cards")}>
            <Grid2X2 size={16} /> Cards
          </button>
          <button className={view === "table" ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"} type="button" onClick={() => setView("table")}>
            <List size={16} /> Table
          </button>
        </div>
      </section>

      <section className="data-panel">
        <div className="filters-grid filters-grid--employee">
          <label className="search-field filters-grid__search" htmlFor="employee-task-search">
            <Search size={16} />
            <input id="employee-task-search" name="employee-task-search" placeholder="Search my tasks or projects" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Select label="Project filter" value={projectFilter} onChange={setProjectFilter}>
            <option value="all">All projects</option>
            {employeeProjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
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
          <label className="select-field">
            <input aria-label="Deadline by" name="deadline-by" type="date" value={deadlineFilter === "all" ? "" : deadlineFilter} onChange={(event) => setDeadlineFilter(event.target.value || "all")} />
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} />
            <span>Overdue only</span>
          </label>
        </div>
      </section>

      {tasks.length === 0 ? (
        <StateBlock title="No tasks assigned yet.">Your assigned work will appear here as soon as an admin assigns a task.</StateBlock>
      ) : filtered.length === 0 ? (
        <StateBlock title="No matching tasks">Adjust search or filters to bring tasks back into view.</StateBlock>
      ) : view === "cards" ? (
        <section className="employee-task-grid">
          {filtered.map((task) => <EmployeeTaskCard key={task.id} task={task} />)}
        </section>
      ) : (
        <section className="task-table">
          {filtered.map((task) => (
            <article className="task-table__row task-table__row--employee" key={task.id}>
              <span className="mono">{task.id}</span>
              <div>
                <strong>{task.title}</strong>
                <span>{task.projectName} / {task.technology}</span>
              </div>
              <span className="status-chip">{statusLabel(task.status)}</span>
              <span className={isTaskOverdue(task) ? "deadline deadline--late" : "deadline"}>{task.deadline}</span>
              <div className="row-actions">
                <Link className="icon-button" aria-label={`View ${task.id}`} to={`/employee/tasks/${task.id}`}><Eye size={16} /></Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function EmployeeTaskCard({ task }: { task: ReturnType<typeof getEmployeeTasks>[number] }) {
  const overdue = task.status === "overdue" || isTaskOverdue(task);
  const actionLabel = task.status === "changes_requested" ? "Resubmit" : task.submission ? "Update Work" : "Submit Work";

  return (
    <article className={overdue ? "employee-task-card employee-task-card--overdue" : "employee-task-card"}>
      <div className="employee-task-card__stripe" aria-hidden="true" />
      <div className="employee-task-card__body">
        <div className="project-card__top">
          <span className={overdue ? "mono deadline--late" : "mono"}>{task.id}</span>
          <span className="status-chip">{statusLabel(task.status)}</span>
        </div>
        <div>
          <h2>{task.title}</h2>
          <p>{task.description}</p>
        </div>
        <div className="chip-row">
          <span className="status-chip status-chip--cyan">{task.technology}</span>
          <span className="status-chip status-chip--violet">{task.projectName}</span>
          <span className={overdue ? "deadline deadline--late" : "deadline"}>Due {task.deadline}</span>
        </div>
        {task.review?.decision === "changes_requested" && <p className="callout callout--warning">Admin feedback: {task.review.feedback}</p>}
        {task.submission && <p className="compact-note">Latest submission: {task.submission.submittedAt}</p>}
        <div className="employee-task-card__actions">
          <Link className="button button--secondary" to={`/employee/tasks/${task.id}`}><Eye size={16} /> Details</Link>
          <Link className="button button--secondary" to={`/employee/tasks/${task.id}#delay`}><TimerReset size={16} /> Report Delay</Link>
          <Link className="button button--primary" aria-disabled={!canEmployeeSubmit(task)} to={`/employee/tasks/${task.id}#submit`}><Send size={16} /> {actionLabel}</Link>
        </div>
      </div>
    </article>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="select-field">
      <select aria-label={label} name={label.toLowerCase().replaceAll(" ", "-")} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  );
}
