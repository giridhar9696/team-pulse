import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../auth/authContext";
import { useProjects } from "../admin/projectContext";
import { isTaskOverdue, statusLabel } from "../admin/taskUtils";

type ViewMode = "month" | "week" | "day";

const today = "2026-10-12";

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function monthLabel(date: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

export function CalendarPage({ panel }: { panel: "admin" | "employee" }) {
  const { user } = useAuth();
  const { projects, employees } = useProjects();
  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState<ViewMode>("month");
  const [projectFilter, setProjectFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState(panel === "employee" ? user?.identifier ?? "" : "all");
  const [techFilter, setTechFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const events = useMemo(() => projects.flatMap((project) =>
    project.tasks.map((task) => ({
      ...task,
      projectId: project.id,
      projectName: project.name,
      assigneeName: employees.find((employee) => employee.id === task.assigneeId)?.name ?? task.assigneeId,
    })),
  ).filter((task) =>
    (panel === "admin" || task.assigneeId === user?.identifier) &&
    (projectFilter === "all" || task.projectId === projectFilter) &&
    (employeeFilter === "all" || task.assigneeId === employeeFilter) &&
    (techFilter === "all" || task.technology === techFilter) &&
    (statusFilter === "all" || task.status === statusFilter)
  ), [employeeFilter, employees, panel, projectFilter, projects, statusFilter, techFilter, user?.identifier]);

  const visibleDays = buildDays(anchor, view);
  const selected = events.find((event) => event.id === selectedId) ?? events.find((event) => visibleDays.includes(event.deadline));

  function move(direction: number) {
    setAnchor(addDays(anchor, direction * (view === "month" ? 30 : view === "week" ? 7 : 1)));
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{panel === "admin" ? "Admin" : "Employee"} calendar</p>
          <h1>Deadline Calendar</h1>
          <p>{panel === "admin" ? "All project task deadlines from the shared task data." : "Only your assigned task deadlines are visible."}</p>
        </div>
        <div className="calendar-controls">
          <button className="icon-button" type="button" aria-label="Previous" onClick={() => move(-1)}><ChevronLeft size={16} /></button>
          <strong>{view === "month" ? monthLabel(anchor) : anchor}</strong>
          <button className="icon-button" type="button" aria-label="Next" onClick={() => move(1)}><ChevronRight size={16} /></button>
          <button className="button button--secondary" type="button" onClick={() => setAnchor(today)}>Today</button>
        </div>
      </section>

      <section className="segmented-control calendar-view-toggle" aria-label="Calendar view">
        {(["month", "week", "day"] as ViewMode[]).map((mode) => (
          <button key={mode} className={view === mode ? "segmented-control__button segmented-control__button--active" : "segmented-control__button"} type="button" onClick={() => setView(mode)}>{mode}</button>
        ))}
      </section>

      <section className="data-panel">
        <div className="filters-grid filters-grid--employee">
          <Select label="Project" value={projectFilter} onChange={setProjectFilter}><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</Select>
          {panel === "admin" && <Select label="Employee" value={employeeFilter} onChange={setEmployeeFilter}><option value="all">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</Select>}
          <Select label="Technology" value={techFilter} onChange={setTechFilter}><option value="all">All tech</option><option>Frontend</option><option>Backend</option><option>Database</option></Select>
          <Select label="Status" value={statusFilter} onChange={setStatusFilter}><option value="all">All statuses</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="submitted">Submitted</option><option value="review">Under Review</option><option value="changes_requested">Changes Requested</option><option value="approved">Approved</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option></Select>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="calendar-grid data-panel">
          <div className="calendar-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          <div className={view === "day" ? "calendar-days calendar-days--day" : "calendar-days"}>
            {visibleDays.map((day) => {
              const dayEvents = events.filter((event) => event.deadline === day);
              return (
                <button className={day === today ? "calendar-cell calendar-cell--today" : "calendar-cell"} key={day} type="button" onClick={() => setSelectedId(dayEvents[0]?.id ?? null)}>
                  <span className="mono">{day.slice(8)}</span>
                  {dayEvents.slice(0, 3).map((event) => <span className={`calendar-event calendar-event--${event.status}`} key={event.id}>{event.title}</span>)}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="data-panel">
          <div className="panel-heading"><h2>Selected task</h2><CalendarClock size={18} /></div>
          {selected ? (
            <div className="activity-list">
              <article>
                <span className="mono">{selected.id}</span>
                <strong>{selected.title}</strong>
                <span>{selected.projectName} / {selected.assigneeName}</span>
                <span className="status-chip">{statusLabel(selected.status)}</span>
                <span className={isTaskOverdue(selected) ? "deadline deadline--late" : "deadline"}>Due {selected.deadline}</span>
                <p>{selected.description}</p>
              </article>
            </div>
          ) : <p>No task on the selected date.</p>}
        </aside>
      </section>
    </div>
  );
}

function buildDays(anchor: string, view: ViewMode) {
  if (view === "day") return [anchor];
  if (view === "week") return Array.from({ length: 7 }, (_, index) => addDays(anchor, index));
  const start = new Date(`${anchor.slice(0, 8)}01T00:00:00`);
  const offset = (start.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() - offset + index);
    return date.toISOString().slice(0, 10);
  });
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="select-field"><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}
