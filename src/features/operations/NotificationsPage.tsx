import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Filter } from "lucide-react";
import { StateBlock } from "../../components/ui/StateBlock";
import { useProjects } from "../admin/projectContext";
import { useAuth } from "../auth/authContext";
import type { NotificationCategory } from "./operationsUtils";
import { useDateFormat } from './useDateFormat';

export function NotificationsPage() {
  const formatDate=useDateFormat();
  const { user } = useAuth();
  const { notifications, readNotificationIds, markNotificationRead, markAllNotificationsRead } = useProjects();
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [category, setCategory] = useState<"all" | NotificationCategory>("all");
  const filtered = useMemo(() => notifications.filter((item) => {
    const isRead = readNotificationIds.includes(item.id);
    return (readFilter === "all" || (readFilter === "read" ? isRead : !isRead)) && (category === "all" || item.category === category);
  }), [category, notifications, readFilter, readNotificationIds]);
  const unread = notifications.filter((item) => !readNotificationIds.includes(item.id)).length;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{user?.role} notifications</p>
          <h1>Notifications Center</h1>
          <p>{unread} unread notifications from shared task, project, and account events.</p>
        </div>
        <button className="button button--primary" type="button" onClick={() => markAllNotificationsRead(notifications.map((item) => item.id))}>
          <CheckCheck size={16} /> Mark all as read
        </button>
      </section>

      <section className="data-panel">
        <div className="filters-grid">
          <label className="select-field"><Filter size={16} /><select aria-label="Read filter" value={readFilter} onChange={(event) => setReadFilter(event.target.value as typeof readFilter)}><option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option></select></label>
          <label className="select-field"><select aria-label="Category filter" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="all">All categories</option><option value="task">Task</option><option value="deadline">Deadline</option><option value="submission">Submission</option><option value="review">Review</option><option value="project">Project</option><option value="employee">Employee</option><option value="settings">Settings</option></select></label>
        </div>
      </section>

      {filtered.length === 0 ? <StateBlock title="No notifications">No notifications match the active filters.</StateBlock> : (
        <section className="activity-list">
          {filtered.map((item) => {
            const isRead = readNotificationIds.includes(item.id);
            const isRedAlert = item.urgent || item.title.startsWith('Red alert') || item.id.startsWith("red-alert");
            return (
              <Link className={`${isRead ? "notification-item notification-item--read" : "notification-item"}${isRedAlert ? " notification-item--alert" : ""}`} key={item.id} to={item.to} onClick={() => markNotificationRead(item.id)}>
                <Bell size={18} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <span className="mono">{formatDate(item.at)} / {item.category}</span>
                </div>
                {!isRead && <span className="status-chip status-chip--cyan">Unread</span>}
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
