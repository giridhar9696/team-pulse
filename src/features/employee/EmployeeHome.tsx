import { CalendarClock, CheckCircle2, CircleDot, GitPullRequestArrow, ListChecks, Send, TimerReset } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { StateBlock } from "../../components/ui/StateBlock";
import { useProjects } from "../admin/projectContext";
import { isTaskOverdue, statusLabel } from "../admin/taskUtils";
import { useAuth } from "../auth/authContext";
import { getEmployeeTaskMetrics, getEmployeeTasks } from "./employeeUtils";
import { useDateFormat } from '../operations/useDateFormat';

function formatToday(timeZone:string) {
  return new Intl.DateTimeFormat("en", { timeZone, weekday: "long", month: "short", day: "numeric" }).format(new Date());
}

export function EmployeeHome() {
  const formatDate=useDateFormat();
  const { user } = useAuth();
  const { projects, employees, notifications, timeZone } = useProjects();
  const employeeId = user?.identifier ?? "";
  const employeeTasks = getEmployeeTasks(projects, employeeId, employees);
  const metrics = getEmployeeTaskMetrics(employeeTasks);
  const upcoming = [...employeeTasks]
    .filter((task) => task.status !== "approved" && task.status !== "cancelled")
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);
  const recentActivity = employeeTasks
    .flatMap((task) => (task.history ?? []).map((activity) => ({ ...activity, projectName: task.projectName, taskId: task.id })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);
  const recentNotifications = notifications.slice(0, 3);

  return (
    <div className="page-stack">
      <section className="employee-hero">
        <div>
          <p className="eyebrow">Employee dashboard</p>
          <h1>Welcome back, {user?.name ?? "teammate"}.</h1>
          <p>{formatToday(timeZone)} / Every task, one team, on track.</p>
        </div>
        <div className="employee-identity">
          <span className="profile-menu__avatar">{user?.name.split(" ").map((part) => part[0]).join("")}</span>
          <div>
            <strong>{user?.identifier}</strong>
            <span>Frontend workspace</span>
          </div>
        </div>
      </section>

      <section className="metric-grid metric-grid--six" aria-label="Employee task metrics">
        <Metric icon={<ListChecks size={20} />} label="Assigned" value={metrics.assigned} to="/employee/tasks" />
        <Metric icon={<CircleDot size={20} />} label="In Progress" value={metrics.inProgress} to="/employee/tasks?status=in_progress" />
        <Metric icon={<GitPullRequestArrow size={20} />} label="Review" value={metrics.awaitingReview} to="/employee/tasks?status=submitted" />
        <Metric icon={<TimerReset size={20} />} label="Changes" value={metrics.changesRequested} to="/employee/tasks?status=changes_requested" />
        <Metric icon={<CheckCircle2 size={20} />} label="Completed" value={metrics.completed} to="/employee/tasks?status=approved" />
        <Metric danger icon={<CalendarClock size={20} />} label="Overdue" value={metrics.overdue} to="/employee/tasks?overdue=1" />
      </section>

      {employeeTasks.length === 0 ? (
        <StateBlock title="No tasks assigned yet.">Your dashboard will populate once an admin assigns work to you.</StateBlock>
      ) : (
        <section className="dashboard-grid">
          <div className="data-panel dashboard-panel">
            <div className="panel-heading">
              <div>
                <h2>Upcoming deadlines</h2>
                <p>Nearest active work from your assigned tasks.</p>
              </div>
              <Link className="panel-action" to="/employee/tasks">View Tasks</Link>
            </div>
            <div className="compact-list">
              {upcoming.map((task) => (
                <article key={task.id}>
                  <span className="mono">{task.id}</span>
                  <strong>{task.title}</strong>
                  <span className={isTaskOverdue(task) ? "deadline deadline--late" : "deadline"}>{formatDate(task.deadline)}</span>
                  <span className="status-chip">{statusLabel(task.status)}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="data-panel dashboard-panel">
            <div className="panel-heading">
              <div>
                <h2>Quick actions</h2>
                <p>Jump into the workflows that update shared task state.</p>
              </div>
            </div>
            <div className="quick-action-grid">
              <Link className="button button--secondary" to="/employee/tasks"><ListChecks size={16} /> View Tasks</Link>
              <Link className="button button--primary" to={`/employee/tasks/${upcoming[0]?.id ?? employeeTasks[0].id}#submit`}><Send size={16} /> Submit Work</Link>
              <Link className="button button--secondary" to={`/employee/tasks/${upcoming[0]?.id ?? employeeTasks[0].id}#delay`}><TimerReset size={16} /> Report Delay</Link>
            </div>
          </div>

          <div className="data-panel dashboard-panel">
            <div className="panel-heading">
              <div>
                <h2>Recent assignments</h2>
                <p>Tasks most recently assigned to you.</p>
              </div>
            </div>
            <div className="activity-list">
              {[...employeeTasks].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate)).slice(0, 4).map((task) => (
                <article key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{task.projectName} / assigned {formatDate(task.assignedDate)}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="data-panel dashboard-panel">
            <div className="panel-heading">
              <div>
                <h2>Recent notifications</h2>
                <p>Task notices connected to your assignments.</p>
              </div>
            </div>
            <div className="activity-list">
              {recentNotifications.length ? recentNotifications.map((notice) => (
                <article key={notice.id}>
                  <strong>{notice.title}</strong>
                  <span>{notice.message}</span>
                </article>
              )) : <p>No recent notifications.</p>}
            </div>
          </div>

          <div className="data-panel dashboard-panel">
            <div className="panel-heading">
              <div>
                <h2>Recent activity</h2>
                <p>Shared history for projects where you have assigned work.</p>
              </div>
            </div>
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <article key={activity.id}>
                  <strong>{activity.taskId} / {activity.projectName}</strong>
                  <span>{activity.message}</span>
                  <span className="mono">{formatDate(activity.at)}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ icon, label, value, danger, to }: { icon: ReactNode; label: string; value: number; danger?: boolean; to: string }) {
  return (
    <Link className={danger ? "metric-card metric-card--danger metric-card--link" : "metric-card metric-card--link"} to={to}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </Link>
  );
}
