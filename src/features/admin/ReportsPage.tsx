import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Download, Search } from "lucide-react";
import { StateBlock } from "../../components/ui/StateBlock";
import { useProjects } from "./projectContext";
import { getDashboardStats, getProjectProgress } from "./projectMetrics";
import { isTaskOverdue, statusLabel } from "./taskUtils";
import { getEmployeeMetrics } from "./employeeMetrics";

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? { Message: "No rows for active filters" });
  const body = rows.length ? rows : [{ Message: "No rows for active filters" }];
  const csv = [headers.join(","), ...body.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { projects, employees } = useProjects();
  const [from, setFrom] = useState("2026-09-01");
  const [to, setTo] = useState("2026-11-30");
  const [projectFilter, setProjectFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const tasks = useMemo(() => projects.flatMap((project) =>
    project.tasks.map((task) => ({
      ...task,
      projectId: project.id,
      projectName: project.name,
      assigneeName: employees.find((employee) => employee.id === task.assigneeId)?.name ?? task.assigneeId,
    })),
  ).filter((task) =>
    task.deadline >= from &&
    task.deadline <= to &&
    (projectFilter === "all" || task.projectId === projectFilter) &&
    (employeeFilter === "all" || task.assigneeId === employeeFilter) &&
    (techFilter === "all" || task.technology === techFilter) &&
    (statusFilter === "all" || task.status === statusFilter)
  ), [employeeFilter, employees, from, projectFilter, projects, statusFilter, techFilter, to]);

  const stats = getDashboardStats(projects);
  const statusRows = countBy(tasks, "status");
  const techRows = countBy(tasks, "technology");
  const employeeRows = employees.map((employee) => ({ employee, metrics: getEmployeeMetrics(employee, projects) }));
  const completed = tasks.filter((task) => task.status === "approved");
  const onTime = completed.filter((task) => !task.review || task.review.reviewedAt.slice(0, 10) <= task.deadline).length;
  const late = completed.length - onTime;

  function exportTasks() {
    downloadCsv(`team-pulse-report-${from}-to-${to}.csv`, tasks.map((task) => ({
      ID: task.id,
      Task: task.title,
      Project: task.projectName,
      Employee: task.assigneeName,
      Technology: task.technology,
      Status: statusLabel(task.status),
      Deadline: task.deadline,
      Overdue: isTaskOverdue(task) ? "Yes" : "No",
    })));
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Admin reports</p>
          <h1>Reports & Analytics</h1>
          <p>All metrics are calculated from the shared project and task records.</p>
        </div>
        <button className="button button--primary" type="button" onClick={exportTasks}><Download size={16} /> Export CSV</button>
      </section>

      <section className="data-panel">
        <div className="filters-grid filters-grid--employee">
          <label className="search-field"><Search size={16} /><input aria-label="Report period from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="search-field"><Search size={16} /><input aria-label="Report period to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <Select label="Project" value={projectFilter} onChange={setProjectFilter}><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</Select>
          <Select label="Employee" value={employeeFilter} onChange={setEmployeeFilter}><option value="all">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</Select>
          <Select label="Technology" value={techFilter} onChange={setTechFilter}><option value="all">All tech</option><option>Frontend</option><option>Backend</option><option>Database</option></Select>
          <Select label="Status" value={statusFilter} onChange={setStatusFilter}><option value="all">All statuses</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="submitted">Submitted</option><option value="review">Under Review</option><option value="changes_requested">Changes Requested</option><option value="approved">Approved</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option></Select>
        </div>
      </section>

      <section className="metric-grid metric-grid--six">
        <Metric label="Projects" value={stats.totalProjects} />
        <Metric label="Tasks" value={tasks.length} />
        <Metric label="Approved" value={tasks.filter((task) => task.status === "approved").length} />
        <Metric label="Overdue" value={tasks.filter((task) => task.status === "overdue" || isTaskOverdue(task)).length} />
        <Metric label="On Time" value={onTime} />
        <Metric label="Late" value={late} />
      </section>

      {tasks.length === 0 ? <StateBlock title="No report rows">Adjust filters or date range to show report data.</StateBlock> : (
        <section className="dashboard-grid">
          <Panel title="Project completion">
            <div className="bar-list">{projects.map((project) => <Bar key={project.id} label={project.name} value={getProjectProgress(project)} suffix="%" />)}</div>
          </Panel>
          <Panel title="Task status distribution"><Chart rows={statusRows} /></Panel>
          <Panel title="Technology-section progress"><Chart rows={techRows} /></Panel>
          <Panel title="Employee performance comparison">
            <div className="bar-list">{employeeRows.map(({ employee, metrics }) => <Bar key={employee.id} label={employee.name} value={metrics.assigned ? Math.round((metrics.completed / metrics.assigned) * 100) : 0} suffix="%" detail={`${metrics.completed}/${metrics.assigned} approved`} />)}</div>
          </Panel>
          <Panel title="Overdue trend">
            <div className="bar-list">{tasks.filter((task) => task.status === "overdue" || isTaskOverdue(task)).map((task) => <Bar key={task.id} label={task.title} value={100} suffix="" detail={`${task.deadline} / ${task.assigneeName}`} />)}</div>
          </Panel>
          <Panel title="Displayed report rows">
            <div className="task-table">{tasks.map((task) => <article className="task-table__row task-table__row--employee" key={task.id}><span className="mono">{task.id}</span><div><strong>{task.title}</strong><span>{task.projectName} / {task.assigneeName}</span></div><span className="status-chip">{statusLabel(task.status)}</span><span className="deadline">{task.deadline}</span></article>)}</div>
          </Panel>
        </section>
      )}
    </div>
  );
}

function countBy<T extends Record<string, string>>(rows: T[], key: keyof T) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row[key]] = (acc[row[key]] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([label, value]) => ({ label: statusLabel(label), value }));
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="data-panel dashboard-panel"><div className="panel-heading"><h2>{title}</h2></div>{children}</section>;
}

function Bar({ label, value, suffix, detail }: { label: string; value: number; suffix: string; detail?: string }) {
  return <div className="bar-row"><div><strong>{label}</strong>{detail && <span>{detail}</span>}</div><div className="progress-meter"><span style={{ width: `${Math.min(value, 100)}%` }} /></div><span className="mono">{value}{suffix}</span></div>;
}

function Chart({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <div className="bar-list">{rows.map((row) => <Bar key={row.label} label={row.label} value={Math.round((row.value / max) * 100)} suffix="" detail={`${row.value} tasks`} />)}</div>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="select-field"><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}
