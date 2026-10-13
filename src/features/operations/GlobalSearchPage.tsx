import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { StateBlock } from "../../components/ui/StateBlock";
import { useProjects } from "../admin/projectContext";
import { useAuth } from "../auth/authContext";
import { getSearchResults } from "./operationsUtils";
import { useDateFormat } from './useDateFormat';

export function GlobalSearchPage() {
  const formatDate=useDateFormat();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { projects, employees, notifications } = useProjects();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [type, setType] = useState("all");
  const results = useMemo(() => getSearchResults(projects, employees, notifications, user, query), [employees, notifications, projects, query, user]);
  const empty = !results.projects.length && !results.tasks.length && !results.employees.length && !results.notifications.length;

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Global search</p>
          <h1>Search Team Pulse</h1>
          <p>Results are filtered by your current {user?.role} permissions.</p>
        </div>
      </section>
      <section className="data-panel">
        <div className="filters-grid">
          <label className="search-field filters-grid__search" htmlFor="global-search-page"><Search size={16} /><input id="global-search-page" aria-label="Search Team Pulse" autoFocus placeholder="Search projects, tasks, employees, notifications" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="select-field"><select aria-label="Result type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">All results</option><option value="projects">Projects</option><option value="tasks">Tasks</option><option value="employees">Employees</option><option value="notifications">Notifications</option></select></label>
        </div>
      </section>
      {!query.trim() ? <StateBlock title="Start typing to search">Use a task ID, project name, status, employee, or notification text.</StateBlock> : empty ? <StateBlock title="No results">No permitted results match this query.</StateBlock> : (
        <section className="dashboard-grid">
          {(type === "all" || type === "projects") && <Group title="Projects">{results.projects.map((project) => <Result key={project.id} to={user?.role === "admin" ? `/admin/projects/${project.id}` : "/employee/projects"} label={project.name} meta={project.id} text={project.description} />)}</Group>}
          {(type === "all" || type === "tasks") && <Group title="Tasks">{results.tasks.map((task) => <Result key={task.id} to={user?.role === "admin" ? `/admin/tasks/${task.id}` : `/employee/tasks/${task.id}`} label={task.title} meta={`${task.id} / ${task.projectName}`} text={task.description} />)}</Group>}
          {(type === "all" || type === "employees") && user?.role === "admin" && <Group title="Employees">{results.employees.map((employee) => <Result key={employee.id} to="/admin/employees" label={employee.name} meta={`${employee.id} / ${employee.status}`} text={employee.role} />)}</Group>}
          {(type === "all" || type === "notifications") && <Group title="Notifications">{results.notifications.map((item) => <Result key={item.id} to={item.to} label={item.title} meta={formatDate(item.at)} text={item.message} />)}</Group>}
        </section>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="data-panel"><div className="panel-heading"><h2>{title}</h2></div><div className="activity-list">{children}</div></section>;
}

function Result({ to, label, meta, text }: { to: string; label: string; meta: string; text: string }) {
  return <Link className="search-result" to={to}><strong>{label}</strong><span className="mono">{meta}</span><p>{text}</p></Link>;
}
