import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Plus,
  UserPlus,
} from "lucide-react";
import { StateBlock } from "../../components/ui/StateBlock";
import { useProjects } from "./projectContext";
import { getDashboardStats, getProjectProgress, getTasksByStatus } from "./projectMetrics";

export function AdminHome() {
  const { projects, employees } = useProjects();
  const navigate = useNavigate();
  const stats = getDashboardStats(projects);
  const reviewTasks = getTasksByStatus(projects, ["submitted", "review"]);
  const overdueTasks = getTasksByStatus(projects, ["overdue"]);
  const upcomingTasks = projects
    .flatMap((project) => project.tasks.map((task) => ({ ...task, projectName: project.name })))
    .filter((task) => task.status !== "approved")
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);
  const recentSubmissions = getTasksByStatus(projects, ["submitted"]).slice(0, 4);
  const recentActivity = projects.flatMap((project) =>
    project.activity.map((activity) => ({ ...activity, projectName: project.name })),
  );

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Admin control surface</p>
          <h1>Operations dashboard</h1>
          <p>Live prototype metrics derived from the shared project and task model.</p>
        </div>
        <div className="action-row">
          <Link className="button button--primary" to="/admin/projects/new">
            <Plus size={16} /> Add Project
          </Link>
          <button className="button button--secondary" type="button" onClick={() => navigate("/admin/employees")}>
            <UserPlus size={16} /> Add Employee
          </button>
          <button className="button button--secondary" type="button" onClick={() => navigate("/admin/tasks")}>
            <ClipboardList size={16} /> Create Task
          </button>
        </div>
      </section>

      <section className="metric-grid metric-grid--six" aria-label="Admin metrics">
        <MetricCard icon={<FolderKanban size={20} />} label="Total Projects" value={stats.totalProjects} to="/admin/projects" />
        <MetricCard icon={<FolderKanban size={20} />} label="Active Projects" value={stats.activeProjects} to="/admin/projects" />
        <MetricCard icon={<ClipboardList size={20} />} label="Total Tasks" value={stats.totalTasks} to="/admin/tasks" />
        <MetricCard icon={<CheckCircle2 size={20} />} label="Approved Tasks" value={stats.approvedTasks} to="/admin/tasks?status=approved" />
        <MetricCard icon={<CalendarClock size={20} />} label="Pending Tasks" value={stats.pendingTasks} to="/admin/tasks" />
        <MetricCard icon={<AlertTriangle size={20} />} label="Overdue Tasks" value={stats.overdueTasks} tone="danger" to="/admin/tasks?overdue=1" />
      </section>

      <section className="dashboard-grid">
        <Panel title="Project progress overview" action={<Link to="/admin/projects">View all</Link>}>
          <div className="progress-list">
            {projects.map((project) => (
              <Link className="progress-row" key={project.id} to={`/admin/projects/${project.id}`}>
                <div>
                  <strong>{project.name}</strong>
                  <span className="mono">{project.id}</span>
                </div>
                <div className="progress-meter" aria-label={`${project.name} progress`}>
                  <span style={{ width: `${getProjectProgress(project)}%` }} />
                </div>
                <span className="status-chip">{getProjectProgress(project)}%</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Employee performance comparison">
          <div className="bar-list">
            {employees.map((employee) => (
              <div className="bar-row" key={employee.id}>
                <div>
                  <strong>{employee.name}</strong>
                  <span>{employee.role}</span>
                </div>
                <div className="progress-meter">
                  <span style={{ width: `${employee.velocity}%` }} />
                </div>
                <span className="mono">{employee.velocity}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Tasks awaiting admin review">
          {reviewTasks.length ? <TaskList tasks={reviewTasks} /> : <StateBlock title="No review tasks">Review queue is clear.</StateBlock>}
        </Panel>

        <Panel title="Overdue tasks requiring attention">
          {overdueTasks.length ? <TaskList tasks={overdueTasks} /> : <StateBlock tone="success" title="No overdue tasks">All deadlines are healthy.</StateBlock>}
        </Panel>

        <Panel title="Upcoming deadlines">
          <TaskList tasks={upcomingTasks} />
        </Panel>

        <Panel title="Recent work submissions">
          {recentSubmissions.length ? <TaskList tasks={recentSubmissions} /> : <StateBlock title="No submissions">Submitted work will appear here after Prompt 4.</StateBlock>}
        </Panel>

        <Panel title="Recent activity">
          <div className="activity-list">
            {recentActivity.map((item) => (
              <article key={item.id}>
                <span className="mono">{item.at}</span>
                <strong>{item.projectName}</strong>
                <p>{item.message}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Important notifications">
          <div className="activity-list">
            {projects.flatMap((project) =>
              project.notifications.map((note) => (
                <article key={`${project.id}-${note}`}>
                  <strong>{project.name}</strong>
                  <p>{note}</p>
                </article>
              )),
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, tone, to }: { icon: React.ReactNode; label: string; value: number; tone?: "danger"; to: string }) {
  return (
    <Link className={tone === "danger" ? "metric-card metric-card--danger metric-card--link" : "metric-card metric-card--link"} to={to}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </Link>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="data-panel dashboard-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {action && <div className="panel-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function TaskList({ tasks }: { tasks: Array<{ id: string; title: string; projectName: string; deadline: string; status: string }> }) {
  return (
    <div className="compact-list">
      {tasks.map((task) => (
        <article key={task.id}>
          <span className="mono">{task.id}</span>
          <strong>{task.title}</strong>
          <span>{task.projectName}</span>
          <span className="status-chip">{task.status}</span>
          <span className="mono">{task.deadline}</span>
        </article>
      ))}
    </div>
  );
}
