import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { StateBlock } from "../../components/ui/StateBlock";
import { useProjects } from "../admin/projectContext";
import { useAuth } from "../auth/authContext";
import { todayDate, addCalendarDays } from '../../lib/validation';
import { useDateFormat } from './useDateFormat';

export function ActivityLogPage() {
  const formatDate=useDateFormat();
  const { user } = useAuth();
  const { projects, employees, activity } = useProjects();
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [from, setFrom] = useState(addCalendarDays(todayDate(),-30));
  const [to, setTo] = useState(todayDate());
  const filtered = useMemo(() => activity.filter((item) =>
    (item.day??item.at.slice(0,10)) >= from &&
    (item.day??item.at.slice(0,10)) <= to &&
    (employeeFilter === "all" || item.employeeId === employeeFilter) &&
    (projectFilter === "all" || item.projectId === projectFilter) &&
    (actionFilter === "all" || item.action === actionFilter)
  ), [actionFilter, activity, employeeFilter, from, projectFilter, to]);
  const actions = Array.from(new Set(activity.map((item) => item.action)));

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{user?.role} activity</p>
          <h1>Activity Log</h1>
          <p>{user?.role === "admin" ? "Project, task, account, and review activity." : "Your task and project activity only."}</p>
        </div>
      </section>
      <section className="data-panel">
        <div className="filters-grid filters-grid--employee">
          <label className="search-field"><Search size={16} /><input aria-label="Activity from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="search-field"><Search size={16} /><input aria-label="Activity to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          {user?.role === "admin" && <Select label="Employee" value={employeeFilter} onChange={setEmployeeFilter}><option value="all">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</Select>}
          <Select label="Project" value={projectFilter} onChange={setProjectFilter}><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</Select>
          <Select label="Action" value={actionFilter} onChange={setActionFilter}><option value="all">All actions</option>{actions.map((action) => <option key={action} value={action}>{action}</option>)}</Select>
        </div>
      </section>
      {filtered.length === 0 ? <StateBlock title="No activity">No activity matches the active filters.</StateBlock> : (
        <section className="activity-list">
          {filtered.map((item) => <Link className="activity-row" key={item.id} to={item.to}><span className="mono">{formatDate(item.at)}</span><strong>{item.action}</strong><p>{item.description}</p>{item.projectName && <span className="status-chip">{item.projectName}</span>}</Link>)}
        </section>
      )}
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="select-field"><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}
